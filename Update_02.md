# Update 02: Module 4 (Experiment Tracker) & Module 6 (Forum & Community) Folder Structure

This document outlines all **new** and **modified** files introduced for the implementation of **Module 04 (Experiment Tracker)** and **Module 06 (Forum & Community Platform)** in ResearchOS compared to the prior baseline.

---

## 1. Unified Directory Tree (New & Updated Files Only)

```text
ResearchOS/
├── apps/
│   ├── api/
│   │   ├── package.json                                         # [MODIFIED] Added busboy / file upload dependencies
│   │   └── src/
│   │       ├── index.ts                                         # [MODIFIED] Mounted experiment, forum, DM, community routes
│   │       ├── middleware/
│   │       │   ├── experimentGuards.ts                          # [NEW] RBAC & ownership verification for experiments
│   │       │   └── forumGuards.ts                               # [NEW] RBAC, post ownership & DM recipient guards
│   │       ├── routes/
│   │       │   ├── admin.routes.ts                              # [MODIFIED] Added forum moderation endpoints
│   │       │   ├── community.routes.ts                          # [NEW] Community profiles, top contributors & tag follows
│   │       │   ├── directMessage.routes.ts                      # [NEW] Peer-to-peer 1-on-1 direct messaging routes
│   │       │   ├── experiment.routes.ts                         # [NEW] Experiment runs, metrics, artifacts & flags
│   │       │   └── forum.routes.ts                              # [NEW] Questions, discussions, blogs, answers, comments, votes
│   │       ├── scripts/
│   │       │   └── seedBlogs.ts                                 # [NEW] High-quality seed script for technical blog posts
│   │       ├── services/
│   │       │   ├── communityProfile.service.ts                  # [NEW] Reputation score & public profile aggregation
│   │       │   ├── directMessage.service.ts                     # [NEW] Unread tracking & DM thread conversation service
│   │       │   ├── experiment.service.ts                        # [NEW] CRUD, metric logging & comparison logic
│   │       │   ├── experimentComment.service.ts                 # [NEW] Experiment discussion & supervisor feedback
│   │       │   ├── experimentFlag.service.ts                    # [NEW] Supervisor review flags & anomaly tracking
│   │       │   ├── forumAnswer.service.ts                       # [NEW] Q&A answer posting & accepted solution toggling
│   │       │   ├── forumComment.service.ts                      # [NEW] Nested comments on posts & answers
│   │       │   ├── forumPost.service.ts                         # [NEW] Multi-type forum post engine (Question/Discussion/Blog)
│   │       │   ├── forumReport.service.ts                       # [NEW] Community moderation reporting service
│   │       │   ├── forumVote.service.ts                         # [NEW] Multi-emoji reaction & upvote/downvote system
│   │       │   ├── notification.service.ts                      # [MODIFIED] Added experiment flag & forum reply notifications
│   │       │   └── tagFollow.service.ts                         # [NEW] Topic tag subscription & personalized feeds
│   │       └── tests/
│   │           ├── experiment.test.ts                           # [NEW] Unit & integration tests for experiment tracking
│   │           ├── experiment-contracts.test.ts                 # [NEW] Contract validation tests for experiment API
│   │           ├── forum-community.test.ts                      # [NEW] Unit & integration tests for forum, DMs & reputation
│   │           └── forum-community-contracts.test.ts            # [NEW] Contract validation tests for forum API
│   └── web/
│       ├── package.json                                         # [MODIFIED] Added canvas-confetti, markdown-to-jsx, canvas styling
│       ├── vite.config.ts                                       # [MODIFIED] Added public asset aliases & build rules
│       ├── public/
│       │   └── blogs/
│       │       ├── cuda_quantization_memory.jpg                 # [NEW] Cover asset for CUDA quantization blog
│       │       ├── protein_flow_matching.jpg                    # [NEW] Cover asset for flow matching blog
│       │       └── state_space_hybrid_arch.jpg                  # [NEW] Cover asset for SSM hybrid architecture blog
│       └── src/
│           ├── App.tsx                                          # [MODIFIED] Added `/experiments` & `/community` route bindings
│           ├── lib/
│           │   └── api.ts                                       # [MODIFIED] Frontend SDK functions for experiments, forum & DMs
│           ├── components/
│           │   ├── common/
│           │   │   └── ConfirmDeleteDialog.tsx                  # [NEW] Reusable destructive action confirmation modal
│           │   ├── layout/
│           │   │   └── AppSidebar.tsx                           # [MODIFIED] Added sidebar navigation links & badges
│           │   ├── experiments/
│           │   │   ├── CreateExperimentModal.tsx                # [NEW] Form modal for starting experiment runs & hyperparams
│           │   │   ├── ExperimentCard.tsx                       # [NEW] Visual status card for active & finished runs
│           │   │   ├── ExperimentComparisonModal.tsx            # [NEW] Side-by-side metric comparison & chart visualizer
│           │   │   ├── ExperimentDetailModal.tsx                # [NEW] In-depth run viewer with metrics, logs & comments
│           │   │   └── SupervisorFlagModal.tsx                  # [NEW] Supervisor review, flag & annotation modal
│           │   └── community/
│           │       ├── AdminModerationModal.tsx                 # [NEW] Admin queue for resolving reported content
│           │       ├── CommunityProfileModal.tsx                # [NEW] Profile inspector with reputation badges & posts
│           │       ├── CreatePostModal.tsx                      # [NEW] Rich composer for questions, discussions & blogs
│           │       ├── DirectMessagesPanel.tsx                  # [NEW] Real-time 1-on-1 private messaging drawer
│           │       ├── InlineDiscussionTray.tsx                 # [NEW] Collapsible discussion & comment tree
│           │       ├── PostCard.tsx                             # [NEW] Interactive feed card with voting, tags & cover images
│           │       ├── PostDetailModal.tsx                      # [NEW] Full-page modal for reading posts, blogs & accepted answers
│           │       ├── ReactionDetailModal.tsx                  # [NEW] Modal displaying who reacted with each emoji
│           │       └── ReactionPicker.tsx                       # [NEW] Multi-emoji floating reaction selector
│           ├── pages/
│           │   └── dashboards/
│           │       ├── CommunityPage.tsx                        # [NEW] Complete Forum & Community Hub view
│           │       └── ExperimentTrackerPage.tsx                # [NEW] Complete Experiment Tracking & ML Dashboard view
│           └── tests/
│               ├── community-ui.test.tsx                        # [NEW] UI tests for forum feed, post creation & voting
│               └── experiment-tracker-ui.test.tsx               # [NEW] UI tests for experiment dashboard & comparison
├── packages/
│   └── shared-types/
│       └── src/
│           └── index.ts                                         # [MODIFIED] Added types for experiments, forum, DMs & metrics
├── supabase/
│   └── migrations/
│       ├── 20260904000000_experiment_tracker.sql                # [NEW] Tables for experiments, metrics, artifacts, comments, flags
│       ├── 20260904000001_experiments_storage_policies.sql      # [NEW] Supabase Storage RLS policies for experiment artifact bucket
│       └── 20260905000000_forum_community.sql                   # [NEW] Tables for forum posts, answers, comments, votes, reports, DMs
├── docs/
│   └── plans/
│       ├── 04-experiment-tracker-plan.md                        # [NEW] Architectural & implementation plan for Module 04
│       └── 06-forum-community-plan.md                           # [NEW] Architectural & implementation plan for Module 06
├── PROJECT_STRUCTURE.md                                         # [MODIFIED] Updated with new services, components and routes
└── WORKLOG.md                                                   # [MODIFIED] Updated execution logs and acceptance verifications
```

---

## 2. Module 04: Experiment Tracker Breakdown

### Database Migrations
- `supabase/migrations/20260904000000_experiment_tracker.sql` — Schema definition for `experiments`, `experiment_metrics`, `experiment_artifacts`, `experiment_comments`, and `experiment_flags`.
- `supabase/migrations/20260904000001_experiments_storage_policies.sql` — Storage bucket configuration and security policies for model weights, logs, and plots.

### Backend (Express API)
- `apps/api/src/routes/experiment.routes.ts` — REST API routes for experiment runs, metric logging, artifact management, flags, and comments.
- `apps/api/src/middleware/experimentGuards.ts` — Authorization middleware verifying project access, researcher ownership, and supervisor oversight roles.
- `apps/api/src/services/experiment.service.ts` — Business logic for creating runs, pagination, metric history queries, and multi-run comparisons.
- `apps/api/src/services/experimentComment.service.ts` — Service managing collaboration comments on experiment runs.
- `apps/api/src/services/experimentFlag.service.ts` — Service enabling supervisors to flag anomalous runs or request follow-ups.
- `apps/api/src/tests/experiment.test.ts` & `experiment-contracts.test.ts` — Comprehensive automated backend test suite.

### Frontend (React + Vite)
- `apps/web/src/pages/dashboards/ExperimentTrackerPage.tsx` — Main dashboard page featuring status filters, search, analytics summary, and run list.
- `apps/web/src/components/experiments/CreateExperimentModal.tsx` — Run creation modal supporting hyperparameters, dataset selection, and hardware configs.
- `apps/web/src/components/experiments/ExperimentCard.tsx` — Card component displaying status, duration, key metrics, and quick actions.
- `apps/web/src/components/experiments/ExperimentDetailModal.tsx` — Comprehensive run inspector with live metrics, system logs, artifacts, and supervisor feedback.
- `apps/web/src/components/experiments/ExperimentComparisonModal.tsx` — Multi-experiment comparison modal with side-by-side metric tables and loss/accuracy visual graphs.
- `apps/web/src/components/experiments/SupervisorFlagModal.tsx` — Supervisor tool to flag experiments with severity levels and action items.
- `apps/web/src/tests/experiment-tracker-ui.test.tsx` — Frontend UI unit tests verifying run listing, filtering, and modal interaction.

---

## 3. Module 06: Forum & Community Breakdown

### Database Migrations
- `supabase/migrations/20260905000000_forum_community.sql` — Schema definition for `forum_posts`, `forum_answers`, `forum_comments`, `forum_votes`, `forum_reports`, `direct_messages`, `user_reputations`, and `tag_follows`.

### Backend (Express API)
- `apps/api/src/routes/forum.routes.ts` — Endpoints for creating and querying Questions, Discussions, and Technical Blog Posts with nested answers and comments.
- `apps/api/src/routes/community.routes.ts` — Endpoints for researcher community profiles, reputation leaderboards, and topic tag subscriptions.
- `apps/api/src/routes/directMessage.routes.ts` — Secure 1-on-1 direct messaging endpoints with unread count tracking.
- `apps/api/src/routes/admin.routes.ts` — *(Modified)* Added moderation queue endpoints for reviewing and resolving flagged content.
- `apps/api/src/middleware/forumGuards.ts` — Ownership verification for posts, author moderation checks, and DM recipient validation.
- `apps/api/src/services/forumPost.service.ts` — Core posting service with search, category filtering, view counts, and tag indexing.
- `apps/api/src/services/forumAnswer.service.ts` — Q&A service handling accepted answer designations and solution badges.
- `apps/api/src/services/forumComment.service.ts` — Threaded commentary on forum posts and individual answers.
- `apps/api/src/services/forumVote.service.ts` — Reaction engine supporting upvotes, downvotes, and 6 custom emoji reactions (`🚀`, `💡`, `❤️`, `🔥`, `👏`, `👀`).
- `apps/api/src/services/forumReport.service.ts` — Moderation reporting service with auto-flagging thresholds.
- `apps/api/src/services/directMessage.service.ts` — Private messaging service with real-time support and unread indicators.
- `apps/api/src/services/communityProfile.service.ts` — Public profile aggregator with calculated reputation scores and badge badges.
- `apps/api/src/services/tagFollow.service.ts` — Tag follow management for personalized topic streams.
- `apps/api/src/scripts/seedBlogs.ts` — Realistic seed generator with rich markdown blogs, cover images, and structured metadata.
- `apps/api/src/tests/forum-community.test.ts` & `forum-community-contracts.test.ts` — Automated backend test suite.

### Frontend (React + Vite)
- `apps/web/src/pages/dashboards/CommunityPage.tsx` — Full-featured community hub with Q&A tabs, discussion threads, blog viewer, search, tag clouds, and leaderboard.
- `apps/web/src/components/community/CreatePostModal.tsx` — Rich post creator supporting Markdown formatting, preview mode, cover image selection, tags, and category selection.
- `apps/web/src/components/community/PostCard.tsx` — Feed item component featuring voting controls, tag chips, reaction previews, and author info.
- `apps/web/src/components/community/PostDetailModal.tsx` — Detailed post view supporting accepted answer toggling, full markdown rendering, and answer submission.
- `apps/web/src/components/community/InlineDiscussionTray.tsx` — Comment drawer for nested replies and discussions.
- `apps/web/src/components/community/ReactionPicker.tsx` — Floating multi-reaction selector with instant count updates.
- `apps/web/src/components/community/ReactionDetailModal.tsx` — Modal displaying researchers who reacted with each emoji.
- `apps/web/src/components/community/DirectMessagesPanel.tsx` — Slide-over real-time chat interface for peer-to-peer conversations.
- `apps/web/src/components/community/CommunityProfileModal.tsx` — Researcher profile inspector showing reputation, badges, bio, and published posts.
- `apps/web/src/components/community/AdminModerationModal.tsx` — Admin moderation tray for resolving reported content.
- `apps/web/public/blogs/` — High-definition cover artwork for technical blog posts.
- `apps/web/src/tests/community-ui.test.tsx` — Frontend UI unit tests for feed rendering, post composer, and reaction toggling.

---

## 4. Shared & Core Updates

- `packages/shared-types/src/index.ts` — Added TypeScript interfaces for `Experiment`, `ExperimentMetric`, `ExperimentArtifact`, `ExperimentFlag`, `ForumPost`, `ForumAnswer`, `ForumComment`, `ForumVote`, `DirectMessage`, `UserReputation`, and `CommunityProfile`.
- `apps/web/src/App.tsx` — Registered protected routes for `/experiments` (`ExperimentTrackerPage`) and `/community` (`CommunityPage`).
- `apps/web/src/components/layout/AppSidebar.tsx` — Added primary navigation links and dynamic badges for **Experiments** and **Community**.
- `apps/web/src/lib/api.ts` — Added type-safe client methods for all Experiment, Forum, Moderation, and Direct Messaging endpoints.
- `apps/web/src/components/common/ConfirmDeleteDialog.tsx` — Generic reusable modal for confirming destructive deletions across all modules.
- `apps/api/src/index.ts` — Configured Express router mounts for `/api/experiments`, `/api/forum`, `/api/community`, and `/api/direct-messages`.
- `apps/api/src/services/notification.service.ts` — Extended in-app notification triggers for supervisor flags, answer acceptances, and new message alerts.
