import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase.js';

declare global {
  namespace Express {
    interface Request {
      forumPost?: {
        id: string;
        author_id: string;
        project_id?: string | null;
        title: string;
        body: string;
        tags: string[];
        is_pinned: boolean;
        is_locked: boolean;
        [key: string]: any;
      };
      forumAnswer?: {
        id: string;
        post_id: string;
        author_id: string;
        body: string;
        is_accepted: boolean;
        expert_verified_by?: string | null;
        [key: string]: any;
      };
      forumComment?: {
        id: string;
        target_type: string;
        target_id: string;
        author_id: string;
        body: string;
        [key: string]: any;
      };
    }
  }
}

/**
 * Helper to execute post author/admin verification
 */
async function verifyPostAuthor(req: Request, res: Response, next: NextFunction, paramName?: string) {
  const userId = req.userId;
  if (!userId || !req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const postId =
    (paramName ? req.params[paramName] : undefined) ||
    req.params.postId ||
    req.params.id ||
    req.body.postId ||
    req.body.id;

  if (!postId) {
    return res.status(400).json({ error: 'Missing postId parameter' });
  }

  try {
    const { data: post, error } = await supabaseAdmin
      .from('forum_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error || !post) {
      return res.status(404).json({ error: 'Forum post not found' });
    }

    const isAuthor = post.author_id === userId;
    const isAdmin = req.user.role === 'Admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to modify this post' });
    }

    req.forumPost = post;
    return next();
  } catch (err: any) {
    console.error('requirePostAuthorOrAdmin guard error:', err);
    return res.status(500).json({ error: 'Internal server error evaluating post permissions' });
  }
}

/**
 * Guard: requirePostAuthorOrAdmin
 * Can be used as middleware directly or configured with a custom param name.
 */
export function requirePostAuthorOrAdmin(
  paramOrReq?: string | Request,
  maybeRes?: Response,
  maybeNext?: NextFunction
): any {
  if (typeof paramOrReq === 'object' && paramOrReq && 'method' in paramOrReq) {
    return verifyPostAuthor(paramOrReq as Request, maybeRes!, maybeNext!);
  }

  const customParam = typeof paramOrReq === 'string' ? paramOrReq : undefined;
  return (req: Request, res: Response, next: NextFunction) => {
    return verifyPostAuthor(req, res, next, customParam);
  };
}

/**
 * Helper to execute answer author/admin verification
 */
async function verifyAnswerAuthor(req: Request, res: Response, next: NextFunction, paramName?: string) {
  const userId = req.userId;
  if (!userId || !req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const answerId =
    (paramName ? req.params[paramName] : undefined) ||
    req.params.answerId ||
    req.params.id ||
    req.body.answerId ||
    req.body.id;

  if (!answerId) {
    return res.status(400).json({ error: 'Missing answerId parameter' });
  }

  try {
    const { data: answer, error } = await supabaseAdmin
      .from('forum_answers')
      .select('*')
      .eq('id', answerId)
      .single();

    if (error || !answer) {
      return res.status(404).json({ error: 'Forum answer not found' });
    }

    const isAuthor = answer.author_id === userId;
    const isAdmin = req.user.role === 'Admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to modify this answer' });
    }

    req.forumAnswer = answer;
    return next();
  } catch (err: any) {
    console.error('requireAnswerAuthorOrAdmin guard error:', err);
    return res.status(500).json({ error: 'Internal server error evaluating answer permissions' });
  }
}

/**
 * Guard: requireAnswerAuthorOrAdmin
 */
export function requireAnswerAuthorOrAdmin(
  paramOrReq?: string | Request,
  maybeRes?: Response,
  maybeNext?: NextFunction
): any {
  if (typeof paramOrReq === 'object' && paramOrReq && 'method' in paramOrReq) {
    return verifyAnswerAuthor(paramOrReq as Request, maybeRes!, maybeNext!);
  }

  const customParam = typeof paramOrReq === 'string' ? paramOrReq : undefined;
  return (req: Request, res: Response, next: NextFunction) => {
    return verifyAnswerAuthor(req, res, next, customParam);
  };
}

/**
 * Helper to execute comment author/admin verification
 */
async function verifyCommentAuthor(req: Request, res: Response, next: NextFunction, paramName?: string) {
  const userId = req.userId;
  if (!userId || !req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const commentId =
    (paramName ? req.params[paramName] : undefined) ||
    req.params.commentId ||
    req.params.id ||
    req.body.commentId ||
    req.body.id;

  if (!commentId) {
    return res.status(400).json({ error: 'Missing commentId parameter' });
  }

  try {
    const { data: comment, error } = await supabaseAdmin
      .from('forum_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (error || !comment) {
      return res.status(404).json({ error: 'Forum comment not found' });
    }

    const isAuthor = comment.author_id === userId;
    const isAdmin = req.user.role === 'Admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to modify this comment' });
    }

    req.forumComment = comment;
    return next();
  } catch (err: any) {
    console.error('requireCommentAuthorOrAdmin guard error:', err);
    return res.status(500).json({ error: 'Internal server error evaluating comment permissions' });
  }
}

/**
 * Guard: requireCommentAuthorOrAdmin
 */
export function requireCommentAuthorOrAdmin(
  paramOrReq?: string | Request,
  maybeRes?: Response,
  maybeNext?: NextFunction
): any {
  if (typeof paramOrReq === 'object' && paramOrReq && 'method' in paramOrReq) {
    return verifyCommentAuthor(paramOrReq as Request, maybeRes!, maybeNext!);
  }

  const customParam = typeof paramOrReq === 'string' ? paramOrReq : undefined;
  return (req: Request, res: Response, next: NextFunction) => {
    return verifyCommentAuthor(req, res, next, customParam);
  };
}

/**
 * Guard: requireActiveSupervisorForVerify
 * Enforces that only an active supervisor can execute Expert Verification.
 */
export function requireActiveSupervisorForVerify(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'Supervisor') {
    return res.status(403).json({ error: 'Access denied: Expert verification requires Supervisor role' });
  }

  if (req.user.status !== 'Active') {
    return res.status(403).json({ error: 'Access denied: Supervisor account must be Active to expert-verify' });
  }

  return next();
}
