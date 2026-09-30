import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FORUM_TARGET_TYPES,
  FORUM_VOTE_VALUES,
  REPORT_TARGET_TYPES,
  REPORT_STATUSES,
  ForumPost,
  ForumAnswer,
  ForumComment,
  ForumVote,
  Badge,
  UserBadge,
  TagFollow,
  DirectMessage,
  DirectMessageThread,
  UserBlock,
  ForumReport,
  CommunityProfile,
  CreateForumPostDto,
  UpdateForumPostDto,
  CreateForumAnswerDto,
  UpdateForumAnswerDto,
  AddForumCommentDto,
  VoteForumDto,
  CreateReportDto,
  ActionReportDto,
  SendDirectMessageDto,
  BlockUserDto,
  ForumPostSearchParams,
  ForumPostListResponse,
  ReactionCounts,
  ReactionUser,
} from '@researchos/shared-types';

describe('Phase 6.2 — Forum & Research Community Shared Contracts & Enums', () => {
  it('1. should define all forum target types (Post, Answer)', () => {
    assert.equal(FORUM_TARGET_TYPES.Post, 'Post');
    assert.equal(FORUM_TARGET_TYPES.Answer, 'Answer');
    assert.deepEqual(Object.keys(FORUM_TARGET_TYPES).sort(), ['Answer', 'Post']);
  });

  it('2. should define all forum vote and LinkedIn reaction values', () => {
    assert.equal(FORUM_VOTE_VALUES.Up, 'Up');
    assert.equal(FORUM_VOTE_VALUES.Down, 'Down');
    assert.equal(FORUM_VOTE_VALUES.Like, 'Like');
    assert.equal(FORUM_VOTE_VALUES.Love, 'Love');
    assert.equal(FORUM_VOTE_VALUES.Insightful, 'Insightful');
    assert.equal(FORUM_VOTE_VALUES.Celebrate, 'Celebrate');
    assert.equal(FORUM_VOTE_VALUES.Curious, 'Curious');
    assert.equal(FORUM_VOTE_VALUES.Support, 'Support');
    assert.equal(Object.keys(FORUM_VOTE_VALUES).length, 8);
  });

  it('3. should define all report target types including DirectMessage', () => {
    assert.equal(REPORT_TARGET_TYPES.Post, 'Post');
    assert.equal(REPORT_TARGET_TYPES.Answer, 'Answer');
    assert.equal(REPORT_TARGET_TYPES.Comment, 'Comment');
    assert.equal(REPORT_TARGET_TYPES.DirectMessage, 'DirectMessage');
    assert.deepEqual(Object.keys(REPORT_TARGET_TYPES).sort(), [
      'Answer',
      'Comment',
      'DirectMessage',
      'Post',
    ]);
  });

  it('4. should define report statuses (Pending, ActionTaken, Dismissed)', () => {
    assert.equal(REPORT_STATUSES.Pending, 'Pending');
    assert.equal(REPORT_STATUSES.ActionTaken, 'ActionTaken');
    assert.equal(REPORT_STATUSES.Dismissed, 'Dismissed');
  });

  it('5. should correctly type ReactionCounts and ReactionUser structures', () => {
    const counts: ReactionCounts = {
      like: 10,
      love: 5,
      insightful: 8,
      celebrate: 3,
      curious: 2,
      support: 4,
      up: 15,
      down: 1,
      totalReactions: 32,
    };
    assert.equal(counts.totalReactions, 32);
    assert.equal(counts.up, 15);

    const userReact: ReactionUser = {
      userId: '11111111-1111-1111-1111-111111111111',
      fullName: 'Dr. Jane Doe',
      role: 'Supervisor',
      value: 'Love',
      createdAt: new Date().toISOString(),
    };
    assert.equal(userReact.value, 'Love');
    assert.equal(userReact.role, 'Supervisor');
  });

  it('6. should construct valid ForumPost and ForumAnswer objects', () => {
    const post: ForumPost = {
      id: 'post-1',
      authorId: 'user-1',
      title: 'How to optimize PyTorch DDP on H100s?',
      body: 'Looking for best practices with gradient accumulation.',
      tags: ['machine-learning', 'pytorch', 'distributed-training'],
      attachmentIds: [],
      isPinned: false,
      isLocked: false,
      viewsCount: 42,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'user-1',
        fullName: 'Alice Researcher',
        role: 'Researcher',
        reputationPoints: 120,
        institution: 'MIT',
        isFacultyVerified: false,
      },
      answersCount: 1,
      hasAcceptedAnswer: true,
    };
    assert.equal(post.title, 'How to optimize PyTorch DDP on H100s?');
    assert.equal(post.tags.length, 3);
    assert.equal(post.hasAcceptedAnswer, true);

    const answer: ForumAnswer = {
      id: 'ans-1',
      postId: 'post-1',
      authorId: 'user-2',
      body: 'Use torch.distributed with FlashAttention-2 and enable TF32 precision.',
      isAccepted: true,
      expertVerifiedBy: 'sup-1',
      expertVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'user-2',
        fullName: 'Dr. Bob Supervisor',
        role: 'Supervisor',
        reputationPoints: 450,
        institution: 'Stanford University',
        isFacultyVerified: true,
      },
    };
    assert.equal(answer.isAccepted, true);
    assert.equal(answer.author?.isFacultyVerified, true);
  });

  it('7. should construct valid DirectMessageThread and UserBlock DTOs', () => {
    const dm: DirectMessage = {
      id: 'dm-1',
      senderId: 'user-1',
      recipientId: 'user-2',
      body: 'Hello, could you share the dataset link?',
      isRead: true,
      createdAt: new Date().toISOString(),
    };
    assert.equal(dm.body, 'Hello, could you share the dataset link?');

    const thread: DirectMessageThread = {
      partnerId: 'user-2',
      partner: {
        id: 'user-2',
        fullName: 'Bob Smith',
        role: 'Researcher',
        reputationPoints: 50,
      },
      lastMessage: dm,
      unreadCount: 0,
      isBlocked: false,
      hasBlockedYou: false,
    };
    assert.equal(thread.isBlocked, false);
    assert.equal(thread.unreadCount, 0);

    const blockDto: BlockUserDto = {
      targetUserId: 'user-spammer',
    };
    assert.equal(blockDto.targetUserId, 'user-spammer');
  });

  it('8. should construct valid CommunityProfile contract', () => {
    const profile: CommunityProfile = {
      userId: 'user-1',
      fullName: 'Alice Researcher',
      institution: 'Stanford',
      department: 'CS',
      role: 'Researcher',
      status: 'Active',
      isFacultyVerified: false,
      reputationPoints: 230,
      researchFieldTags: ['NLP', 'Transformers'],
      badges: [
        {
          userId: 'user-1',
          badgeId: 'badge-scholar',
          awardedAt: new Date().toISOString(),
          badge: {
            id: 'badge-scholar',
            name: 'Prolific Scholar',
            criteria: '5+ published posts',
            description: 'Active contributor to forum knowledge base',
            icon: 'award',
            createdAt: new Date().toISOString(),
          },
        },
      ],
      stats: {
        postsCount: 6,
        answersCount: 12,
        acceptedAnswersCount: 4,
        expertVerifiedCount: 2,
        upvotesReceived: 45,
      },
      recentPosts: [],
      recentAnswers: [],
    };
    assert.equal(profile.reputationPoints, 230);
    assert.equal(profile.stats.postsCount, 6);
    assert.equal(profile.badges.length, 1);
  });
});
