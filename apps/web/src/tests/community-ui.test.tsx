import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';

import { PostCard } from '../components/community/PostCard.js';
import { ReactionPicker } from '../components/community/ReactionPicker.js';
import { ReactionDetailModal } from '../components/community/ReactionDetailModal.js';
import { CreatePostModal } from '../components/community/CreatePostModal.js';
import { CommunityProfileModal } from '../components/community/CommunityProfileModal.js';
import { AdminModerationModal } from '../components/community/AdminModerationModal.js';
import {
  ForumPost,
  CommunityProfile,
  ForumReport,
} from '@researchos/shared-types';

describe('Spec 06 — Discussion Forum & Research Community UI Component Tests', () => {
  const mockPost: ForumPost = {
    id: 'post-101',
    authorId: 'user-researcher',
    title: 'How to scale FlashAttention-3 across multi-node H100 clusters?',
    body: 'We are observing memory divergence on node 4 when batch size exceeds 128.',
    tags: ['machine-learning', 'pytorch', 'distributed-systems'],
    attachmentIds: [],
    isPinned: true,
    isLocked: false,
    viewsCount: 142,
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
    author: {
      id: 'user-researcher',
      fullName: 'Alice Researcher',
      photoUrl: null,
      role: 'Researcher',
      reputationPoints: 340,
      institution: 'MIT',
      isFacultyVerified: false,
    },
    upvotesCount: 12,
    downvotesCount: 1,
    score: 11,
    answersCount: 3,
    hasAcceptedAnswer: true,
    reactions: {
      like: 8,
      love: 4,
      insightful: 6,
      celebrate: 2,
      curious: 1,
      support: 3,
      up: 12,
      down: 1,
      totalReactions: 24,
    },
    currentUserReaction: 'Love',
    currentUserVote: 'Up',
  };

  const mockProfile: CommunityProfile = {
    userId: 'sup-1',
    fullName: 'Dr. Sarah Connor',
    photoUrl: null,
    bio: 'Associate Professor of Computer Science specializing in Distributed ML Systems',
    institution: 'Stanford University',
    department: 'Computer Science',
    role: 'Supervisor',
    status: 'Active',
    isFacultyVerified: true,
    reputationPoints: 850,
    researchFieldTags: ['machine-learning', 'distributed-systems', 'gpu-clusters'],
    badges: [
      {
        userId: 'sup-1',
        badgeId: 'b-1',
        awardedAt: '2026-01-10T00:00:00.000Z',
        badge: {
          id: 'b-1',
          name: 'Accepted Authority',
          criteria: 'accepted_answer',
          description: 'Had an answer accepted as the definitive solution',
          icon: 'Sparkles',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
      {
        userId: 'sup-1',
        badgeId: 'b-2',
        awardedAt: '2026-02-15T00:00:00.000Z',
        badge: {
          id: 'b-2',
          name: 'Community Pillar',
          criteria: 'reputation_100',
          description: 'Surpassed 100 reputation points through helpful contributions',
          icon: 'Award',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ],
    stats: {
      postsCount: 14,
      answersCount: 38,
      acceptedAnswersCount: 16,
      expertVerifiedCount: 9,
      upvotesReceived: 210,
    },
    recentPosts: [],
    recentAnswers: [],
  };

  const mockReports: ForumReport[] = [
    {
      id: 'rep-1',
      targetType: 'DirectMessage',
      targetId: 'dm-101',
      reporterId: 'user-1',
      reason: 'Spamming collaboration requests',
      description: null,
      status: 'Pending',
      createdAt: '2026-09-18T14:00:00.000Z',
      targetSummary: '[METADATA ONLY — PRIVATE DM PROTECTED BY AC-13]',
      targetAuthorId: 'user-spammer',
      targetAuthorName: 'Spam User ➔ Alice Researcher',
      reporter: {
        id: 'user-1',
        fullName: 'Alice Researcher',
        role: 'Researcher',
      },
    },
  ];

  it('1. PostCard renders question title, tags, answer badge, and pinned badge', () => {
    const html = renderToString(
      <PostCard
        post={mockPost}
        currentUserId="user-viewer"
        onOpenDetail={() => {}}
        onVote={() => {}}
        onRetractVote={() => {}}
        onOpenReactors={() => {}}
        onReport={() => {}}
      />
    );

    assert.ok(html.includes('How to scale FlashAttention-3 across multi-node H100 clusters?'));
    assert.ok(html.includes('machine-learning'));
    assert.ok(html.includes('distributed-systems'));
    assert.ok(html.includes('Solved'));
    assert.ok(html.includes('Pinned'));
    assert.ok(html.includes('Alice Researcher'));
    assert.ok(html.includes('MIT'));
  });

  it('2. ReactionPicker renders all 6 LinkedIn reactions including Love ❤️', () => {
    const html = renderToString(
      <ReactionPicker
        currentReaction="Love"
        onSelectReaction={() => {}}
      />
    );

    assert.ok(html.includes('Like'));
    assert.ok(html.includes('Love'));
    assert.ok(html.includes('Insightful'));
    assert.ok(html.includes('Celebrate'));
    assert.ok(html.includes('Curious'));
    assert.ok(html.includes('Support'));
  });

  it('3. ReactionDetailModal renders reaction breakdown tabs and reactor profiles', () => {
    const html = renderToString(
      <ReactionDetailModal
        isOpen={true}
        onClose={() => {}}
        targetType="Post"
        targetId="post-101"
        initialReactors={[
          {
            userId: 'sup-1',
            fullName: 'Dr. Sarah Connor',
            role: 'Supervisor',
            value: 'Love',
            createdAt: '2026-09-18T12:00:00.000Z',
          },
          {
            userId: 'res-2',
            fullName: 'Bob Smith',
            role: 'Researcher',
            value: 'Insightful',
            createdAt: '2026-09-18T13:00:00.000Z',
          },
        ]}
      />
    );

    assert.ok(html.includes('Reactions &amp; Endorsements'));
    assert.ok(html.includes('Dr. Sarah Connor'));
    assert.ok(html.includes('Bob Smith'));
    assert.ok(html.includes('Insightful'));
    assert.ok(html.includes('Love'));
  });

  it('4. CreatePostModal renders question composer with tag selection pills', () => {
    const html = renderToString(
      <CreatePostModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={async () => {}}
        popularTags={[
          { tag: 'pytorch', count: 15 },
          { tag: 'transformers', count: 9 },
        ]}
      />
    );

    assert.ok(html.includes('Ask Question or Start Discussion'));
    assert.ok(html.includes('pytorch'));
    assert.ok(html.includes('transformers'));
    assert.ok(html.includes('Publish Discussion'));
  });

  it('5. CommunityProfileModal renders derived faculty badge, reputation points, and merit badges', () => {
    const html = renderToString(
      <CommunityProfileModal
        userId="sup-1"
        isOpen={true}
        onClose={() => {}}
        initialProfile={mockProfile}
      />
    );

    assert.ok(html.includes('Dr. Sarah Connor'));
    assert.ok(html.includes('Faculty Verified'));
    assert.ok(html.includes('850'));
    assert.ok(html.includes('Accepted Authority'));
    assert.ok(html.includes('Community Pillar'));
    assert.ok(html.includes('Stanford University'));
  });

  it('6. AdminModerationModal renders reports with AC-13 metadata-only privacy redaction for DMs', () => {
    const html = renderToString(
      <AdminModerationModal
        isOpen={true}
        onClose={() => {}}
        initialReports={mockReports}
      />
    );

    assert.ok(html.includes('Community Moderation Queue'));
    assert.ok(html.includes('DirectMessage'));
    assert.ok(html.includes('Spamming collaboration requests'));
    // CRITICAL: AC-13 Redacted body check
    assert.ok(html.includes('[METADATA ONLY — PRIVATE DM PROTECTED BY AC-13]'));
    assert.ok(html.includes('Delete Content'));
    assert.ok(html.includes('Dismiss'));
  });

  it('7. CreatePostModal allows attaching image/screenshot and displays attachment upload option', () => {
    const html = renderToString(
      <CreatePostModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    );

    assert.ok(html.includes('Attach Image / Screenshot / Diagram'));
    assert.ok(html.includes('Upload Screenshot or Diagram'));
  });

  it('8. PostCard renders clean text and attached screenshot/diagram', () => {
    const blogPost: ForumPost = {
      ...mockPost,
      id: 'blog-post-01',
      title: 'Architectural Paradigms for Scaled Foundation Models',
      tags: ['scientific-blog', 'deep-learning'],
      body: `In this discussion, we observe that key-value caches scale to 53.7 gigabytes on long sequences.\n\n![Architectural schematic of hybrid layers](/blogs/state_space_hybrid_arch.jpg)`,
    };

    const html = renderToString(
      <PostCard
        post={blogPost}
        currentUserId="test-user"
        onOpenDetail={() => {}}
        onVote={() => {}}
        onRetractVote={() => {}}
        onOpenReactors={() => {}}
        onReport={() => {}}
      />
    );

    // Blog badge
    assert.ok(html.includes('Scientific Blog'));

    // Clean text preview
    assert.ok(html.includes('In this discussion, we observe that key-value caches'));

    // Attached Image Preview
    assert.ok(html.includes('src="/blogs/state_space_hybrid_arch.jpg"'));
    assert.ok(html.includes('Architectural schematic of hybrid layers'));
  });
});
