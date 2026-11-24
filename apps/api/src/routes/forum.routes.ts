import { Router, Request, Response } from 'express';
import { authenticate, requireStatus } from '../middleware/auth.js';
import {
  requirePostAuthorOrAdmin,
  requireAnswerAuthorOrAdmin,
  requireCommentAuthorOrAdmin,
  requireActiveSupervisorForVerify,
} from '../middleware/forumGuards.js';
import { ForumPostService } from '../services/forumPost.service.js';
import { ForumAnswerService } from '../services/forumAnswer.service.js';
import { ForumVoteService } from '../services/forumVote.service.js';
import { ForumCommentService } from '../services/forumComment.service.js';
import { TagFollowService } from '../services/tagFollow.service.js';
import { ForumReportService } from '../services/forumReport.service.js';
import { ForumVoteValue, ForumTargetType, ReportTargetType } from '@researchos/shared-types';

export const forumRouter: Router = Router();

// All forum operations require authenticated active user
forumRouter.use(authenticate);
forumRouter.use(requireStatus('Active'));

// ==========================================
// 1. Tag Discovery & Following
// ==========================================

forumRouter.get('/tags/popular', async (_req: Request, res: Response) => {
  try {
    const popular = await TagFollowService.getPopularTags(20);
    return res.json({ tags: popular });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

const handleGetFollowedTags = async (req: Request, res: Response) => {
  try {
    const tags = await TagFollowService.getFollowedTags(req.userId!);
    return res.json(tags);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

forumRouter.get('/tags/followed', handleGetFollowedTags);
forumRouter.get('/tags/following', handleGetFollowedTags);

forumRouter.post('/tags/:tag/follow', async (req: Request, res: Response) => {
  try {
    const tag = req.params.tag as string;
    await TagFollowService.followTag(req.userId!, tag);
    const following = await TagFollowService.getFollowedTags(req.userId!);
    return res.json({ success: true, tag, following });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

forumRouter.delete('/tags/:tag/follow', async (req: Request, res: Response) => {
  try {
    const tag = req.params.tag as string;
    await TagFollowService.unfollowTag(req.userId!, tag);
    const following = await TagFollowService.getFollowedTags(req.userId!);
    return res.json({ success: true, tag, following });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 2. Posts CRUD & Feed
// ==========================================

forumRouter.get('/posts', async (req: Request, res: Response) => {
  try {
    const {
      tag,
      search,
      tab,
      projectId,
      authorId,
      sort,
      page = '1',
      limit = '20',
    } = req.query as any;

    const result = await ForumPostService.listPosts({
      tag: tag ? String(tag) : undefined,
      search: search ? String(search) : undefined,
      tab: tab as any,
      projectId: projectId ? String(projectId) : undefined,
      authorId: authorId ? String(authorId) : undefined,
      sort: sort as any,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      currentUserId: req.userId,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

forumRouter.post('/posts', async (req: Request, res: Response) => {
  try {
    const { title, body, tags, attachmentIds, projectId } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }

    if (!body || typeof body !== 'string' || body.trim().length < 5) {
      return res.status(400).json({ error: 'Body must be at least 5 characters' });
    }

    const post = await ForumPostService.createPost(req.userId!, {
      title,
      body,
      tags: Array.isArray(tags) ? tags : [],
      attachmentIds: Array.isArray(attachmentIds) ? attachmentIds : [],
      projectId: projectId || undefined,
    });

    return res.status(201).json(post);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

forumRouter.get('/posts/:postId', async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const post = await ForumPostService.getPostById(postId, req.userId);

    if (!post) {
      return res.status(404).json({ error: 'Discussion post not found' });
    }

    return res.json(post);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

forumRouter.patch(
  '/posts/:postId',
  requirePostAuthorOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const postId = req.params.postId as string;
      const { title, body, tags, attachmentIds, isPinned, isLocked } = req.body;

      // Only Admin or Supervisor can pin/lock
      const canPinOrLock = req.user?.role === 'Admin' || req.user?.role === 'Supervisor';
      const cleanPinned = canPinOrLock ? isPinned : undefined;
      const cleanLocked = canPinOrLock ? isLocked : undefined;

      const updated = await ForumPostService.updatePost(postId, {
        title,
        body,
        tags,
        attachmentIds,
        isPinned: cleanPinned,
        isLocked: cleanLocked,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

forumRouter.delete(
  '/posts/:postId',
  requirePostAuthorOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const postId = req.params.postId as string;
      await ForumPostService.deletePost(postId);
      return res.json({ success: true, deleted: true, message: 'Post deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ==========================================
// 3. Answers CRUD & Verification Workflows
// ==========================================

forumRouter.get('/posts/:postId/answers', async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const answers = await ForumAnswerService.listAnswersForPost(postId, req.userId);
    return res.json(answers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

forumRouter.post('/posts/:postId/answers', async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const { body } = req.body;

    if (!body || typeof body !== 'string' || body.trim().length < 5) {
      return res.status(400).json({ error: 'Answer body must be at least 5 characters' });
    }

    const answer = await ForumAnswerService.createAnswer(postId, req.userId!, body);
    return res.status(201).json(answer);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

forumRouter.patch(
  '/answers/:answerId',
  requireAnswerAuthorOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const answerId = req.params.answerId as string;
      const { body } = req.body;

      if (!body || typeof body !== 'string' || body.trim().length < 5) {
        return res.status(400).json({ error: 'Answer body must be at least 5 characters' });
      }

      const updated = await ForumAnswerService.updateAnswer(answerId, body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

forumRouter.delete(
  '/answers/:answerId',
  requireAnswerAuthorOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const answerId = req.params.answerId as string;
      await ForumAnswerService.deleteAnswer(answerId);
      return res.json({ success: true, deleted: true, message: 'Answer deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

const handleAcceptAnswer = async (req: Request, res: Response) => {
  try {
    const answerId = req.params.answerId as string;
    const answer = await ForumAnswerService.acceptAnswer(answerId, req.userId!);
    return res.json(answer);
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('authorized') || err.message?.includes('author') ? 403 : 400);
    return res.status(status).json({ error: err.message });
  }
};

forumRouter.post('/answers/:answerId/accept', handleAcceptAnswer);
forumRouter.post('/posts/:postId/accept/:answerId', handleAcceptAnswer);

forumRouter.post('/answers/:answerId/unaccept', async (req: Request, res: Response) => {
  try {
    const answerId = req.params.answerId as string;
    const answer = await ForumAnswerService.unacceptAnswer(answerId, req.userId!);
    return res.json(answer);
  } catch (err: any) {
    const status = err.statusCode || 403;
    return res.status(status).json({ error: err.message });
  }
});

forumRouter.post(
  '/answers/:answerId/expert-verify',
  requireActiveSupervisorForVerify,
  async (req: Request, res: Response) => {
    try {
      const answerId = req.params.answerId as string;
      const answer = await ForumAnswerService.expertVerifyAnswer(answerId, req.userId!);
      return res.json(answer);
    } catch (err: any) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message });
    }
  }
);

forumRouter.post(
  '/answers/:answerId/revoke-verify',
  requireActiveSupervisorForVerify,
  async (req: Request, res: Response) => {
    try {
      const answerId = req.params.answerId as string;
      const answer = await ForumAnswerService.revokeExpertVerification(answerId, req.userId!);
      return res.json(answer);
    } catch (err: any) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message });
    }
  }
);

// ==========================================
// 4. LinkedIn Multi-Reactions & Q&A Voting
// ==========================================

const handleGetVotes = async (req: Request, res: Response) => {
  try {
    const targetType = req.params.targetType as ForumTargetType;
    const targetId = req.params.targetId as string;
    const counts = await ForumVoteService.getReactionCounts(targetType, targetId);
    return res.json(counts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

forumRouter.get('/votes/:targetType/:targetId', handleGetVotes);
forumRouter.get('/:targetType(Post|Answer)/:targetId/votes', handleGetVotes);

const handleGetReactors = async (req: Request, res: Response) => {
  try {
    const targetType = req.params.targetType as ForumTargetType;
    const targetId = req.params.targetId as string;
    const reactors = await ForumVoteService.getReactorsList(targetType, targetId);
    return res.json(reactors);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

forumRouter.get('/votes/:targetType/:targetId/reactors', handleGetReactors);
forumRouter.get('/:targetType(Post|Answer)/:targetId/reactors', handleGetReactors);

const handleCastVote = async (req: Request, res: Response) => {
  try {
    const targetType = req.params.targetType as ForumTargetType;
    const targetId = req.params.targetId as string;
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({ error: 'Vote or reaction value is required' });
    }

    const result = await ForumVoteService.castVote(
      targetType,
      targetId,
      req.userId!,
      value as ForumVoteValue
    );

    return res.json(result);
  } catch (err: any) {
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message });
  }
};

forumRouter.post('/votes/:targetType/:targetId', handleCastVote);
forumRouter.post('/:targetType(Post|Answer)/:targetId/vote', handleCastVote);

const handleRetractVote = async (req: Request, res: Response) => {
  try {
    const targetType = req.params.targetType as ForumTargetType;
    const targetId = req.params.targetId as string;

    const result = await ForumVoteService.retractVote(
      targetType,
      targetId,
      req.userId!
    );

    return res.json(result);
  } catch (err: any) {
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message });
  }
};

forumRouter.delete('/votes/:targetType/:targetId', handleRetractVote);
forumRouter.delete('/:targetType(Post|Answer)/:targetId/vote', handleRetractVote);

// ==========================================
// 5. Comments (Sub-discussions on posts/answers)
// ==========================================

const handleListComments = async (req: Request, res: Response) => {
  try {
    const targetType = req.params.targetType as ForumTargetType;
    const targetId = req.params.targetId as string;
    const comments = await ForumCommentService.listComments(targetType, targetId);
    return res.json(comments);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

forumRouter.get('/comments/:targetType/:targetId', handleListComments);
forumRouter.get('/:targetType(Post|Answer)/:targetId/comments', handleListComments);

const handleAddComment = async (req: Request, res: Response) => {
  try {
    const targetType = req.params.targetType as ForumTargetType;
    const targetId = req.params.targetId as string;
    const { body } = req.body;

    if (!body || typeof body !== 'string' || body.trim().length < 1) {
      return res.status(400).json({ error: 'Comment body cannot be empty' });
    }

    const comment = await ForumCommentService.addComment(
      targetType,
      targetId,
      req.userId!,
      body
    );

    return res.status(201).json(comment);
  } catch (err: any) {
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message });
  }
};

forumRouter.post('/comments/:targetType/:targetId', handleAddComment);
forumRouter.post('/:targetType(Post|Answer)/:targetId/comments', handleAddComment);

forumRouter.patch(
  '/comments/:commentId',
  requireCommentAuthorOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const commentId = req.params.commentId as string;
      const { body } = req.body;
      const isAdmin = req.user?.role === 'Admin';
      const updated = await ForumCommentService.updateComment(commentId, req.userId!, body, isAdmin);
      return res.json(updated);
    } catch (err: any) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message });
    }
  }
);

forumRouter.delete(
  '/comments/:commentId',
  requireCommentAuthorOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const commentId = req.params.commentId as string;
      await ForumCommentService.deleteComment(commentId);
      return res.json({ success: true, deleted: true, message: 'Comment deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ==========================================
// 6. Moderation Reporting
// ==========================================

forumRouter.post('/reports', async (req: Request, res: Response) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'targetType, targetId, and reason are required' });
    }

    const report = await ForumReportService.createReport(req.userId!, {
      targetType: targetType as ReportTargetType,
      targetId,
      reason,
      description,
    });

    return res.status(201).json(report);
  } catch (err: any) {
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message });
  }
});
