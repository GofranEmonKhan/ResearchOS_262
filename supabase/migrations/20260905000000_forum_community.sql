-- ResearchOS — Spec 06: Discussion Forum & Research Community Migration
-- Single source of truth for community posts, answers, comments, multi-reactions,
-- badges, tag following, direct messaging, user blocks, and moderation reports.

-- 1. Create Enums
do $$ begin
  create type public.forum_target_type as enum ('Post', 'Answer');
exception
  when duplicate_object then null;
end $$;

do $$ begin
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
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.report_target_type as enum ('Post', 'Answer', 'Comment', 'DirectMessage');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.report_status as enum ('Pending', 'ActionTaken', 'Dismissed');
exception
  when duplicate_object then null;
end $$;

-- 2. Extend notification_type enum for Community & Messaging Events
do $$ begin
  alter type public.notification_type add value if not exists 'AnswerAccepted';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.notification_type add value if not exists 'ExpertVerified';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.notification_type add value if not exists 'DirectMessageReceived';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.notification_type add value if not exists 'ContentReported';
exception
  when duplicate_object then null;
end $$;

-- 3. Create public.forum_posts table
create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 3),
  body text not null check (char_length(trim(body)) >= 5),
  tags text[] not null default '{}',
  attachment_ids uuid[] not null default '{}',
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  views_count integer not null default 0 check (views_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Create public.forum_answers table
create table if not exists public.forum_answers (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) >= 5),
  is_accepted boolean not null default false,
  expert_verified_by uuid references public.profiles(id) on delete set null,
  expert_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Create public.forum_comments table
create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  target_type forum_target_type not null,
  target_id uuid not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) >= 1),
  created_at timestamptz not null default now()
);

-- 6. Create public.forum_votes table (Supports Up/Down & LinkedIn Multi-Reactions)
create table if not exists public.forum_votes (
  id uuid primary key default gen_random_uuid(),
  target_type forum_target_type not null,
  target_id uuid not null,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  value forum_vote_value not null,
  created_at timestamptz not null default now(),
  constraint uq_forum_vote unique (target_type, target_id, voter_id)
);

-- 7. Create public.badges table
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  criteria text not null,
  description text not null default '',
  icon text not null default 'Award',
  created_at timestamptz not null default now()
);

-- 8. Create public.user_badges table
create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- 9. Create public.tag_follows table
create table if not exists public.tag_follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tag)
);

-- 10. Create public.direct_messages table (Isolated Peer-to-Peer Chat)
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) >= 1),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint chk_direct_messages_no_self check (sender_id <> recipient_id)
);

-- 11. Create public.user_blocks table
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint chk_user_blocks_no_self check (blocker_id <> blocked_id)
);

-- 12. Create public.forum_reports table (Moderation Queue)
create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  target_type report_target_type not null,
  target_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) >= 3),
  status report_status not null default 'Pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  action_taken text,
  action_note text,
  created_at timestamptz not null default now()
);

-- 13. Auto-update updated_at triggers
drop trigger if exists set_forum_posts_updated_at on public.forum_posts;
create trigger set_forum_posts_updated_at
  before update on public.forum_posts
  for each row execute function public.update_updated_at_column();

drop trigger if exists set_forum_answers_updated_at on public.forum_answers;
create trigger set_forum_answers_updated_at
  before update on public.forum_answers
  for each row execute function public.update_updated_at_column();

-- 14. Performance Indexes
create index if not exists idx_forum_posts_author_id on public.forum_posts(author_id);
create index if not exists idx_forum_posts_project_id on public.forum_posts(project_id);
create index if not exists idx_forum_posts_created_at on public.forum_posts(created_at desc);
create index if not exists idx_forum_posts_tags on public.forum_posts using gin(tags);

create index if not exists idx_forum_answers_post_id on public.forum_answers(post_id);
create index if not exists idx_forum_answers_author_id on public.forum_answers(author_id);
create index if not exists idx_forum_answers_is_accepted on public.forum_answers(is_accepted);

create index if not exists idx_forum_comments_target on public.forum_comments(target_type, target_id);
create index if not exists idx_forum_comments_author_id on public.forum_comments(author_id);

create index if not exists idx_forum_votes_target on public.forum_votes(target_type, target_id);
create index if not exists idx_forum_votes_voter_id on public.forum_votes(voter_id);

create index if not exists idx_tag_follows_user_id on public.tag_follows(user_id);
create index if not exists idx_tag_follows_tag on public.tag_follows(tag);

create index if not exists idx_direct_messages_sender on public.direct_messages(sender_id);
create index if not exists idx_direct_messages_recipient on public.direct_messages(recipient_id);
create index if not exists idx_direct_messages_created_at on public.direct_messages(created_at desc);

create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

create index if not exists idx_forum_reports_status on public.forum_reports(status);
create index if not exists idx_forum_reports_created_at on public.forum_reports(created_at desc);

-- 15. Seed Default Merit Badges
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

-- 16. Row Level Security (RLS) Policies (Defense-in-Depth)
alter table public.forum_posts enable row level security;
alter table public.forum_answers enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_votes enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.tag_follows enable row level security;
alter table public.direct_messages enable row level security;
alter table public.user_blocks enable row level security;
alter table public.forum_reports enable row level security;

-- Public read for community forum content
drop policy if exists "Authenticated users can read forum posts" on public.forum_posts;
create policy "Authenticated users can read forum posts"
  on public.forum_posts for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read forum answers" on public.forum_answers;
create policy "Authenticated users can read forum answers"
  on public.forum_answers for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read forum comments" on public.forum_comments;
create policy "Authenticated users can read forum comments"
  on public.forum_comments for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read forum votes" on public.forum_votes;
create policy "Authenticated users can read forum votes"
  on public.forum_votes for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read badges" on public.badges;
create policy "Authenticated users can read badges"
  on public.badges for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read user badges" on public.user_badges;
create policy "Authenticated users can read user badges"
  on public.user_badges for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read tag follows" on public.tag_follows;
create policy "Authenticated users can read tag follows"
  on public.tag_follows for select
  to authenticated
  using (true);

-- Direct Messages: Strict privacy guard (only sender and recipient can SELECT)
drop policy if exists "Users can only read their own direct messages" on public.direct_messages;
create policy "Users can only read their own direct messages"
  on public.direct_messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- User Blocks: User can read who they have blocked
drop policy if exists "Users can read their own block list" on public.user_blocks;
create policy "Users can read their own block list"
  on public.user_blocks for select
  to authenticated
  using (auth.uid() = blocker_id);

-- Forum Reports: Reporter and Admin can read reports
drop policy if exists "Users can read own reports and Admin can read all" on public.forum_reports;
create policy "Users can read own reports and Admin can read all"
  on public.forum_reports for select
  to authenticated
  using (
    auth.uid() = reporter_id or 
    exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
  );
