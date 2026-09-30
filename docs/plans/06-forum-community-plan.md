# Implementation Plan — Module 06: Discussion Forum & Research Community (Phased Execution)

> **Document:** Module 06 Implementation Plan  
> **Location:** `docs/plans/06-forum-community-plan.md`  
> **Status:** Awaiting Approval (Revision 3 — Exhaustive Technical Specification with LinkedIn-Style Multi-Reactions & Love React)  
> **Reference Specs:** [docs/specs/06-forum-community.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/specs/06-forum-community.md), [docs/data-model.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/data-model.md), [docs/feature-plan.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/feature-plan.md), [AGENTS.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/AGENTS.md)  
> **Depends on:** Spec 00 (Foundation), Spec 01 (Auth/RBAC)  

---

## Table of Contents

1. [Core Architectural & Community Integrity Rules](#1-core-architectural--community-integrity-rules)
2. [Sub-Feature Phasing Map](#2-sub-feature-phasing-map)
3. [Phase 6.1: Database Schema, Enums, Seed Badges & Defense-in-Depth RLS Policies](#phase-61-database-schema-enums-seed-badges--defense-in-depth-rls-policies)
4. [Phase 6.2: Shared Contracts & TypeScript Interfaces (`packages/shared-types`)](#phase-62-shared-contracts--typescript-interfaces)
5. [Phase 6.3: Backend — Access Middleware & Permission Guards (`apps/api`)](#phase-63-backend--access-middleware--permission-guards)
6. [Phase 6.4: Backend — Post CRUD, Tagging, Pinning & Search Service](#phase-64-backend--post-crud-tagging-pinning--search-service)
7. [Phase 6.5: Backend — Answer Service, Acceptance & Supervisor Expert Verification](#phase-65-backend--answer-service-acceptance--supervisor-expert-verification)
8. [Phase 6.6: Backend — Voting & LinkedIn Multi-Reaction Engine (+ Love React)](#phase-66-backend--voting--linkedin-multi-reaction-engine--love-react)
9. [Phase 6.7: Backend — Discussion Comments Service](#phase-67-backend--discussion-comments-service)
10. [Phase 6.8: Backend — Tag Following & Personalized Feed Generator](#phase-68-backend--tag-following--personalized-feed-generator)
11. [Phase 6.9: Backend — Direct Messaging, Conversation Threads & User Blocking](#phase-69-backend--direct-messaging-conversation-threads--user-blocking)
12. [Phase 6.10: Backend — Moderation Queue, Report Actions & DM Metadata Isolation](#phase-610-backend--moderation-queue-report-actions--dm-metadata-isolation)
13. [Phase 6.11: Backend — Community Profile, Reputation Ranks & Badge Award Engine](#phase-611-backend--community-profile-reputation-ranks--badge-award-engine)
14. [Phase 6.12: Backend — Route Controllers & Central Mounting](#phase-612-backend--route-controllers--central-mounting)
15. [Phase 6.13: Frontend — Community Hub, Search, Filter Chips & Post Cards](#phase-613-frontend--community-hub-search-filter-chips--post-cards)
16. [Phase 6.14: Frontend — Post Detail View, Answers Thread & Expert Badge](#phase-614-frontend--post-detail-view-answers-thread--expert-badge)
17. [Phase 6.15: Frontend — LinkedIn-Style Floating Multi-Reaction Bar & Modal](#phase-615-frontend--linkedin-style-floating-multi-reaction-bar--modal)
18. [Phase 6.16: Frontend — Direct Messaging Split-Pane, Realtime Chat & User Blocking](#phase-616-frontend--direct-messaging-split-pane-realtime-chat--user-blocking)
19. [Phase 6.17: Frontend — Community Profile, Badges Showcase & Admin Moderation Queue](#phase-617-frontend--community-profile-badges-showcase--admin-moderation-queue)
20. [Phase 6.18: Automated Test Suite & Acceptance Criteria Verification](#phase-618-automated-test-suite--acceptance-criteria-verification)
21. [Phase 6.19: Documentation, WORKLOG & Milestone Completion](#phase-619-documentation-worklog--milestone-completion)
22. [Verification Plan & Acceptance Criteria Matrix](#22-verification-plan--acceptance-criteria-matrix)
23. [Execution Progress & Activity Checklist](#23-execution-progress--activity-checklist)

---

## 1. Core Architectural & Community Integrity Rules

### Ownership & Role Hierarchy

```text
+---------------------------------------------------------------------------------------------------+
|                                     COMMUNITY ECOSYSTEM                                           |
|                                                                                                   |
|   +--------------------------+                         +--------------------------------------+   |
|   |   Researcher (Member)    |                         |        Supervisor (Faculty)          |   |
|   +--------------------------+                         +--------------------------------------+   |
|   | • Create / Edit / Del Post|                        | • Create / Edit / Del Post (Member)  |   |
|   | • Create / Edit / Del Ans |                        | • Create / Edit / Del Ans (Member)   |   |
|   | • Multi-React (👍❤️💡👏🤔🤝) |                     | • Multi-React (👍❤️💡👏🤔🤝)          |   |
|   | • Upvote / Downvote Q&A  |                         | • Upvote / Downvote Q&A              |   |
|   | • Accept Answer (own Q)  |                         | • Accept Answer (own Q)              |   |
|   | • Send / Receive DMs     |                         | • Send / Receive DMs                 |   |
|   | • Block / Report Users   |                         | • Block / Report Users               |   |
|   | • Build Public Reputation|                         | • Expert Verify Answers (Field Scope)|   |
|   | ✘ No Faculty badge       |                         | • Derived Faculty / Supervisor Badge |   |
|   +--------------------------+                         | • Pin Posts in Project Group         |   |
|                                                        +--------------------------------------+   |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   |                                    Admin (Platform Safety)                                |   |
|   +-------------------------------------------------------------------------------------------+   |
|   | • Review Moderation Queue (Reports)          • Hide / Delete Violating Content            |   |
|   | • Lock Abusive Threads                       • Tag Taxonomy & Guidelines Management       |   |
|   | ✘ CANNOT READ PRIVATE DIRECT MESSAGE BODIES  (Metadata only on reported conversations!)   |   |
|   +-------------------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------------------+
```

| Entity | Owner Column | Access Path & Permissions |
| :--- | :--- | :--- |
| `ForumPost` | `author_id` | **Author**: Full CRUD over own post. Cannot edit other users' posts.<br>**Supervisor**: Equal community rights; can pin in project-scoped context.<br>**Admin**: Can delete violating posts and lock threads. Cannot arbitrarily edit author content. |
| `ForumAnswer` | `author_id` | **Author**: Full CRUD over own answer.<br>**Question Author**: Can mark one answer as `is_accepted = true`.<br>**Supervisor**: Can mark `expert_verified_by` if active Supervisor and domain/field tags match.<br>**Admin**: Can delete violating answers. |
| `ForumComment` | `author_id` | Discussion comments on Post or Answer. Author or Admin can delete. |
| `ForumVote` | `voter_id` | Unique per `(target_type, target_id, voter_id)`. Multi-Reactions (`Like`, `Love`, `Insightful`, `Celebrate`, `Curious`, `Support`) and Q&A votes (`Up`, `Down`). Retraction removes vote and reverses points. |
| `DirectMessage` | `sender_id` | Only `sender_id` and `recipient_id` can read DM records. Blocked recipient rejects incoming DMs (`403 Forbidden`).<br>**Admin**: `403 Forbidden` on ordinary DM contents. On reported DMs, API returns **metadata only** (sender, recipient, date, report reason) with redacted body. |
| `UserBlock` | `blocker_id` | Blocker manages block list. Prevents blocked user from sending DMs. |
| `ForumReport` | `reporter_id` | Authenticated users can report Post, Answer, Comment, or DM. Admin moderates (`Pending → ActionTaken / Dismissed`). |
| `Badge` / `UserBadge` | `user_id` | Badges awarded by server-side triggers based on verified milestones. Supervisor/Faculty badge is **derived** from active Supervisor status, not self-awarded. |
| `TagFollow` | `user_id` | Subscriptions to research field tags for personalized feeds. |

---

### The Five Inviolable Principles of Module 06

1. **Direct Message Privacy Protection (The Inviolable DM Privacy Rule)**:
   - Ordinary private direct messages are strictly confidential between the sender and recipient.
   - Normal endpoints return `403 Forbidden` if any third party (including Admin) attempts to read conversation messages between two users.
   - When a user submits a `Report` on a `DirectMessage`, the Admin moderation queue exposes **only metadata** (sender ID, recipient ID, timestamp, report reason, conversation ID).
   - The message body is **strictly redacted** (`[REDACTED: PRIVATE DIRECT MESSAGE - METADATA ONLY]`) to protect researcher privacy under all circumstances.

2. **Author Content Ownership & Non-Tampering**:
   - Researchers and Supervisors own their intellectual contributions.
   - No user may edit another user's post, answer, or comment.
   - Express guards verify `author_id === req.user.id` on all update mutations (`403 Forbidden` on mismatch).
   - Admins possess deletion/moderation powers to remove abusive content, but cannot stealthily edit another user's words.

3. **Question Author Authority on Accepted Answers**:
   - Only the author of a question (`post.author_id`) has the authority to accept an answer on their own question.
   - Non-authors attempting to accept an answer are rejected with `403 Forbidden`.
   - Accepting an answer triggers server-side reputation rewards (+15 to answerer, +2 to question author) and dispatches a notification.

4. **Single Reaction Invariant & Atomic Server-Side Reputation Accounting**:
   - Each user may cast at most one reaction/vote per target (`unique(target_type, target_id, voter_id)`).
   - Reacting on own content is forbidden (`400 Bad Request: Cannot react to your own content`).
   - Changing a reaction (e.g. from `Like` to `Love` or `Insightful`) updates the existing reaction and recalculates the reputation delta atomically.
   - Positive reactions (`Like`, `Love`, `Insightful`, `Celebrate`, `Support`, `Up`) reward the author with **+10 reputation points**.
   - All reputation updates are executed server-side; client-supplied reputation adjustments are discarded.

5. **Supervisor Field-Scoped Trust & Derived Faculty Identity**:
   - The "Supervisor / Faculty" badge is **derived** from active Supervisor account status (`role === 'Supervisor' && status === 'Active'`). It is never stored as an arbitrary, self-awardable `UserBadge` row.
   - Expert Verification of answers requires:
     1. Caller is an authenticated user with `role === 'Supervisor'` and `status === 'Active'`.
     2. The post/answer is within the Supervisor's academic field scope (overlap between Supervisor's `research_field_tags` and post tags/domain).
   - Unauthorized or out-of-field verification attempts are rejected with `403 Forbidden`.

---

### Resolved Ambiguities & Cross-Module Safeguards

1. **Direct Messages vs. Project Messages Isolation**:
   - *Requirement*: `data-model.md` explicitly mandates three separate messaging systems: `ProjectMessage` (Module 02), `DirectMessage` (Module 06), and `ListingInquiry` (Module 07).
   - *Resolution*: Direct messages are housed in a dedicated table `direct_messages`, completely decoupled from `project_messages`. No columns or tables are shared.
2. **Project-Scoped vs. Global Forum Discussions**:
   - *Requirement*: Spec 06 mentions `projectId FK→Project?` on Post, and allows Supervisors to pin announcements in project group discussions.
   - *Resolution*: Posts with `project_id IS NULL` are global community discussions visible to all authenticated scholars. Posts with `project_id` attached are scoped to project members and inherit project access rules, allowing Supervisors to pin discussions within their labs.
3. **Reputation Floor**:
   - *Issue*: Can downvotes drive user reputation into negative numbers?
   - *Resolution*: Server-side reputation calculations enforce a lower bound of 0 (`reputation_points = GREATEST(0, reputation_points + delta)`).
4. **Cascade Deletion of Deleted Posts/Answers**:
   - *Issue*: If a post is deleted by author or Admin, what happens to votes and comments?
   - *Resolution*: Foreign keys specify `ON DELETE CASCADE` for answers, comments, and votes. Reputation points associated with deleted votes are retained or normalized.
5. **Realtime Subscriptions on Direct Messages**:
   - *Issue*: How do DMs update in real-time without violating privacy?
   - *Resolution*: Supabase Realtime Postgres Changes listeners are attached by the frontend. The `direct_messages` RLS policy restricts `SELECT` to `auth.uid() IN (sender_id, recipient_id)`, ensuring the Realtime WebSocket server only streams messages to verified participants.

---

## 2. Sub-Feature Phasing Map

```text
+---------------------------------------------------------------------------------------------+
| Phase 6.1: Database Schema, Enums, Seed Badges & Defense-in-Depth RLS Policies              |
|  -- 9 tables, 4 enums, composite unique constraints, indexes, RLS policies, seed badges      |
+---------------------------------------------------------------------------------------------+
| Phase 6.2: Shared Contracts & TypeScript Interfaces (`packages/shared-types`)               |
|  -- ForumPost, ForumAnswer, ForumVote, DirectMessage, UserBlock, ForumReport, DTOs, Enums   |
+---------------------------------------------------------------------------------------------+
| Phase 6.3: Backend — Access Middleware & Permission Guards (`apps/api`)                     |
|  -- requirePostAuthorOrAdmin, requireAnswerAuthorOrAdmin, requireActiveSupervisorForVerify  |
+---------------------------------------------------------------------------------------------+
| Phase 6.4: Backend — Post CRUD, Tagging, Pinning & Search Service                           |
|  -- Feed queries, tag filtering, full-text search, post creation, pinning, lock, delete     |
+---------------------------------------------------------------------------------------------+
| Phase 6.5: Backend — Answer Service, Acceptance & Supervisor Expert Verification           |
|  -- Add answer, accept answer (author only), field-scoped expert verification               |
+---------------------------------------------------------------------------------------------+
| Phase 6.6: Backend — Voting & LinkedIn Multi-Reaction Engine (+ Love React)                 |
|  -- Upsert reactions (Like, Love, Insightful, Celebrate, Curious, Support, Up, Down), delta |
+---------------------------------------------------------------------------------------------+
| Phase 6.7: Backend — Discussion Comments Service                                            |
|  -- Comments on posts and answers, author/admin deletion                                    |
+---------------------------------------------------------------------------------------------+
| Phase 6.8: Backend — Tag Following & Personalized Feed Generator                            |
|  -- Follow/unfollow tags, personalized feed matching followed tags, popular tags aggregation |
+---------------------------------------------------------------------------------------------+
| Phase 6.9: Backend — Direct Messaging, Conversation Threads & User Blocking                 |
|  -- DM thread aggregation, message history, block check (403), send message, mark read     |
+---------------------------------------------------------------------------------------------+
| Phase 6.10: Backend — Moderation Queue, Report Actions & DM Metadata Isolation              |
|  -- Report submission, Admin moderation queue, strict DM body redaction, action transitions  |
+---------------------------------------------------------------------------------------------+
| Phase 6.11: Backend — Community Profile, Reputation Ranks & Badge Award Engine              |
|  -- Profile stats, earned badges, derived supervisor badge, automatic badge award rules     |
+---------------------------------------------------------------------------------------------+
| Phase 6.12: Backend — Route Controllers & Central Mounting                                  |
|  -- /forum/*, /messages/*, /users/:userId/community-profile, /admin/forum/*                 |
+---------------------------------------------------------------------------------------------+
| Phase 6.13: Frontend — Community Hub, Search, Filter Chips & Post Cards                     |
|  -- CommunityPage, feed tabs, search input, tag chips, PostCard component                   |
+---------------------------------------------------------------------------------------------+
| Phase 6.14: Frontend — Post Detail View, Answers Thread & Expert Badge                      |
|  -- PostDetailModal, voting controls, accepted answer pin, expert verification seal, comments|
+---------------------------------------------------------------------------------------------+
| Phase 6.15: Frontend — LinkedIn-Style Floating Multi-Reaction Bar & Modal                   |
|  -- ReactionPicker component, emoji animations, reactor list modal                          |
+---------------------------------------------------------------------------------------------+
| Phase 6.16: Frontend — Direct Messaging Split-Pane, Realtime Chat & User Blocking           |
|  -- DirectMessagesPanel, contact list, live message stream, block/unblock, report dialog    |
+---------------------------------------------------------------------------------------------+
| Phase 6.17: Frontend — Community Profile, Badges Showcase & Admin Moderation Queue          |
|  -- CommunityProfileModal, reputation tier progress, AdminModerationModal, AppSidebar link  |
+---------------------------------------------------------------------------------------------+
| Phase 6.18: Automated Test Suite & Acceptance Criteria Verification                         |
|  -- 16-point integration suite (forum-community.test.ts) + frontend tests (community.test)  |
+---------------------------------------------------------------------------------------------+
| Phase 6.19: Documentation, WORKLOG & Milestone Completion                                   |
|  -- Update WORKLOG.md, PROJECT_STRUCTURE.md, and mark Phase 6 Complete                      |
+---------------------------------------------------------------------------------------------+
```

---

## Phase 6.1: Database Schema, Enums, Seed Badges & Defense-in-Depth RLS Policies

**Target File:** `supabase/migrations/20260905000000_forum_community.sql`

### 1. Enums
```sql
create type public.forum_target_type as enum ('Post', 'Answer');
create type public.forum_vote_value as enum (
  'Up', 
  'Down', 
  'Like', 
  'Love', 
  'Insightful', 
  'Celebrate', 
  'Curious', 
  'Support'
);
create type public.report_target_type as enum ('Post', 'Answer', 'Comment', 'DirectMessage');
create type public.report_status as enum ('Pending', 'ActionTaken', 'Dismissed');
```

### 2. Tables & Constraints

1. **`forum_posts`**:
   - `id`: `uuid primary key default gen_random_uuid()`
   - `author_id`: `uuid not null references public.profiles(id) on delete cascade`
   - `project_id`: `uuid references public.projects(id) on delete cascade` (nullable)
   - `title`: `text not null check (char_length(trim(title)) >= 3)`
   - `body`: `text not null check (char_length(trim(body)) >= 5)`
   - `tags`: `text[] not null default '{}'`
   - `attachment_ids`: `uuid[] not null default '{}'`
   - `is_pinned`: `boolean not null default false`
   - `is_locked`: `boolean not null default false`
   - `views_count`: `integer not null default 0 check (views_count >= 0)`
   - `created_at`: `timestamptz not null default now()`
   - `updated_at`: `timestamptz not null default now()`

2. **`forum_answers`**:
   - `id`: `uuid primary key default gen_random_uuid()`
   - `post_id`: `uuid not null references public.forum_posts(id) on delete cascade`
   - `author_id`: `uuid not null references public.profiles(id) on delete cascade`
   - `body`: `text not null check (char_length(trim(body)) >= 5)`
   - `is_accepted`: `boolean not null default false`
   - `expert_verified_by`: `uuid references public.profiles(id) on delete set null`
   - `expert_verified_at`: `timestamptz`
   - `created_at`: `timestamptz not null default now()`
   - `updated_at`: `timestamptz not null default now()`

3. **`forum_comments`**:
   - `id`: `uuid primary key default gen_random_uuid()`
   - `target_type`: `forum_target_type not null`
   - `target_id`: `uuid not null`
   - `author_id`: `uuid not null references public.profiles(id) on delete cascade`
   - `body`: `text not null check (char_length(trim(body)) >= 1)`
   - `created_at`: `timestamptz not null default now()`

4. **`forum_votes`**:
   - `id`: `uuid primary key default gen_random_uuid()`
   - `target_type`: `forum_target_type not null`
   - `target_id`: `uuid not null`
   - `voter_id`: `uuid not null references public.profiles(id) on delete cascade`
   - `value`: `forum_vote_value not null`
   - `created_at`: `timestamptz not null default now()`
   - `constraint uq_forum_vote unique (target_type, target_id, voter_id)`

5. **`badges`**:
   - `id`: `uuid primary key default gen_random_uuid()`
   - `name`: `text not null unique`
   - `criteria`: `text not null`
   - `description`: `text not null default ''`
   - `icon`: `text not null default 'Award'`
   - `created_at`: `timestamptz not null default now()`

6. **`user_badges`**:
   - `user_id`: `uuid not null references public.profiles(id) on delete cascade`
   - `badge_id`: `uuid not null references public.badges(id) on delete cascade`
   - `awarded_at`: `timestamptz not null default now()`
   - `primary key (user_id, badge_id)`

7. **`tag_follows`**:
   - `user_id`: `uuid not null references public.profiles(id) on delete cascade`
   - `tag`: `text not null`
   - `created_at`: `timestamptz not null default now()`
   - `primary key (user_id, tag)`

8. **`direct_messages`**:
   - `id`: `uuid primary key default gen_random_uuid()`
   - `sender_id`: `uuid not null references public.profiles(id) on delete cascade`
   - `recipient_id`: `uuid not null references public.profiles(id) on delete cascade`
   - `body`: `text not null check (char_length(trim(body)) >= 1)`
   - `is_read`: `boolean not null default false`
   - `created_at`: `timestamptz not null default now()`
   - `check (sender_id <> recipient_id)`

9. **`user_blocks`**:
   - `blocker_id`: `uuid not null references public.profiles(id) on delete cascade`
   - `blocked_id`: `uuid not null references public.profiles(id) on delete cascade`
   - `created_at`: `timestamptz not null default now()`
   - `primary key (blocker_id, blocked_id)`
   - `check (blocker_id <> blocked_id)`

10. **`forum_reports`**:
    - `id`: `uuid primary key default gen_random_uuid()`
    - `target_type`: `report_target_type not null`
    - `target_id`: `uuid not null`
    - `reporter_id`: `uuid not null references public.profiles(id) on delete cascade`
    - `reason`: `text not null check (char_length(trim(reason)) >= 3)`
    - `status`: `report_status not null default 'Pending'`
    - `reviewed_by`: `uuid references public.profiles(id) on delete set null`
    - `reviewed_at`: `timestamptz`
    - `action_taken`: `text`
    - `action_note`: `text`
    - `created_at`: `timestamptz not null default now()`

### 3. Notification Types Extension
```sql
alter type public.notification_type add value if not exists 'AnswerAccepted';
alter type public.notification_type add value if not exists 'ExpertVerified';
alter type public.notification_type add value if not exists 'DirectMessageReceived';
alter type public.notification_type add value if not exists 'ContentReported';
```

### 4. Seed Badges
```sql
insert into public.badges (name, criteria, description, icon) values
  ('Curious Mind', 'first_question', 'Asked your first research question in the community', 'HelpCircle'),
  ('Discussion Leader', 'five_questions', 'Created 5 thoughtful research discussions', 'MessageSquare'),
  ('Problem Solver', 'first_answer', 'Contributed your first solution to a peer question', 'CheckCircle2'),
  ('Accepted Authority', 'accepted_answer', 'Had an answer accepted as the definitive solution', 'Sparkles'),
  ('Expert Verified', 'expert_verified', 'Received official Expert Verification from a faculty Supervisor', 'ShieldCheck'),
  ('Community Pillar', 'reputation_100', 'Surpassed 100 reputation points through helpful contributions', 'Award'),
  ('Topic Specialist', 'follow_five_tags', 'Followed 5 research tags in your specialized domains', 'Bookmark'),
  ('Deep Thinker', 'ten_upvotes', 'Received 10 or more upvotes on a single contribution', 'TrendingUp')
on conflict (name) do nothing;
```

### 5. Performance Indexes
- `idx_forum_posts_author_id`, `idx_forum_posts_project_id`, `idx_forum_posts_created_at`, GIN index on `tags`.
- `idx_forum_answers_post_id`, `idx_forum_answers_author_id`.
- `idx_forum_votes_target`, `idx_forum_votes_voter_id`.
- `idx_direct_messages_participants`: `(least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at)`.
- `idx_user_blocks_lookup`: `(blocker_id, blocked_id)`.
- `idx_forum_reports_status`: `(status, created_at)`.

### 6. Row Level Security Policies
- Public read on `forum_posts`, `forum_answers`, `forum_comments`, `forum_votes`, `badges`, `user_badges`, `tag_follows`.
- `direct_messages`: `SELECT` restricted strictly to `auth.uid() = sender_id OR auth.uid() = recipient_id`.
- `user_blocks`: `SELECT` restricted to `auth.uid() = blocker_id`.
- `forum_reports`: `SELECT` restricted to `auth.uid() = reporter_id OR is_admin(auth.uid())`.

---

## Phase 6.2: Shared Contracts & TypeScript Interfaces

**Target File:** `packages/shared-types/src/index.ts`

```typescript
export type ForumTargetType = 'Post' | 'Answer';
export const FORUM_TARGET_TYPES: Record<ForumTargetType, ForumTargetType> = {
  Post: 'Post',
  Answer: 'Answer',
};

export type ForumVoteValue =
  | 'Up'
  | 'Down'
  | 'Like'
  | 'Love'
  | 'Insightful'
  | 'Celebrate'
  | 'Curious'
  | 'Support';

export const FORUM_VOTE_VALUES: Record<ForumVoteValue, ForumVoteValue> = {
  Up: 'Up',
  Down: 'Down',
  Like: 'Like',
  Love: 'Love',
  Insightful: 'Insightful',
  Celebrate: 'Celebrate',
  Curious: 'Curious',
  Support: 'Support',
};

export interface ReactionCounts {
  like: number;
  love: number;
  insightful: number;
  celebrate: number;
  curious: number;
  support: number;
  up: number;
  down: number;
  totalReactions: number;
}

export interface ReactionUser {
  userId: string;
  fullName: string;
  photoUrl?: string | null;
  role: UserRole;
  value: ForumVoteValue;
  createdAt: string;
}
```

---

## Phase 6.15: Frontend — LinkedIn-Style Floating Multi-Reaction Bar & Modal

**Target Component:** `apps/web/src/components/community/ReactionPicker.tsx`

- Floating interactive pill on hover/tap:
  - 👍 **Like** (`Like`)
  - ❤️ **Love** (`Love`)
  - 💡 **Insightful** (`Insightful`)
  - 👏 **Celebrate** (`Celebrate`)
  - 🤔 **Curious** (`Curious`)
  - 🤝 **Support** (`Support`)
- Micro-animations: Scale up on hover, animated emoji bounce, active state glowing ring.
- Summary bar: Top 3 emoji bubbles + count (e.g. `👍❤️💡 38`).
- Clicking reaction summary opens `ReactionDetailModal` showing full tabbed list of reactors with names, roles, and avatars.

---

## 22. Verification Plan & Acceptance Criteria Matrix

| Criterion | Test Description | Expected Result |
| :--- | :--- | :--- |
| **AC-1** | Researcher creates, edits, and deletes their own post | `201 Created`, `200 OK`, `200 OK` |
| **AC-2** | Supervisor creates, edits, and deletes their own post as community member | `201 Created`, `200 OK`, `200 OK` |
| **AC-3** | User attempts to edit another user's post or answer | `403 Forbidden` (no mutation) |
| **AC-4** | Question author accepts answer; non-author attempts to accept | Author: `200 OK`; Non-author: `403 Forbidden` |
| **AC-5** | User reacts with `Love` ❤️; changes to `Insightful` 💡 | Vote updated; reaction breakdown updates; reputation points maintained |
| **AC-6** | User reacts to own post | Rejected with `400 Bad Request: Cannot react to your own content` |
| **AC-7** | Active Supervisor in matching field marks answer Expert Verified | `200 OK`; answer decorated with verified seal; author gets +20 rep |
| **AC-8** | User follows and unfollows tags | `POST /forum/tags/:tag/follow` -> `200 OK`; `DELETE` -> `200 OK` |
| **AC-9** | Third party attempts to retrieve direct messages between two users | `403 Forbidden` or empty thread |
| **AC-10** | Blocked user attempts to send direct message to blocker | `403 Forbidden: Blocked` |
| **AC-11** | Admin reviews report and deletes violating forum post | `POST /admin/forum/reports/:id/action` deletes post |
| **AC-12** | Admin calls ordinary direct message history endpoint | `403 Forbidden` (privacy guard) |
| **AC-13** | Admin reviews reported direct message in moderation queue | Report details show metadata only; message body is `[REDACTED]` |
| **AC-14** | Report lifecycle transitions from `Pending` to `ActionTaken` | Reviewed by Admin user, sets `reviewed_by` and `reviewed_at` |
## 23. Execution Progress & Activity Checklist

- [x] **Phase 6.1**: Database Schema, Enums, Seed Badges & RLS Policies (`20260905000000_forum_community.sql`)
- [x] **Phase 6.2**: Shared Contracts & TypeScript Interfaces (`packages/shared-types`)
- [x] **Phase 6.3**: Backend Access Middleware & Permission Guards (`forumGuards.ts`)
- [x] **Phase 6.4**: Backend Forum Post CRUD & Search Service (`forumPost.service.ts`)
- [x] **Phase 6.5**: Backend Answer Service & Expert Verification (`forumAnswer.service.ts`)
- [x] **Phase 6.6**: Backend Voting & LinkedIn Multi-Reaction Engine (+ Love React) (`forumVote.service.ts`)
- [x] **Phase 6.7**: Backend Discussion Comments Service (`forumComment.service.ts`)
- [x] **Phase 6.8**: Backend Tag Following Service (`tagFollow.service.ts`)
- [x] **Phase 6.9**: Backend Direct Messaging & User Blocking Service (`directMessage.service.ts`)
- [x] **Phase 6.10**: Backend Moderation Queue & Report Service (`forumReport.service.ts`)
- [x] **Phase 6.11**: Backend Community Profile & Badge Award Engine (`communityProfile.service.ts`)
- [x] **Phase 6.12**: Backend Route Controllers & Central Mounting (`apps/api/src/routes/`)
- [x] **Phase 6.13**: Frontend Community Hub, Search & Post Cards (`CommunityPage.tsx`, `PostCard.tsx`, `CreatePostModal.tsx`)
- [x] **Phase 6.14**: Frontend Post Detail View, Answers Thread & Expert Verification (`PostDetailModal.tsx`)
- [x] **Phase 6.15**: Frontend LinkedIn-Style Floating Multi-Reaction Bar & Modal (`ReactionPicker.tsx`)
- [x] **Phase 6.16**: Frontend Direct Messaging Split-Pane & Live Chat (`DirectMessagesPanel.tsx`)
- [x] **Phase 6.17**: Frontend Community Profile, Badges Showcase & Admin Moderation (`CommunityProfileModal.tsx`, `AdminModerationModal.tsx`)
- [x] **Phase 6.18**: Automated Integration & Acceptance Test Suite (`apps/api/src/tests/forum-community.test.ts`, `apps/web/src/tests/community-ui.test.tsx`)
- [x] **Phase 6.19**: Documentation, WORKLOG & Full Regression Verification
