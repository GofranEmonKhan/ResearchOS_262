-- ResearchOS — Spec 02: Research Workspace Migration
-- Single source of truth for projects, members, invites, milestones, tasks, comments, messages, and notifications.

-- 1. Create Enums
do $$ begin
  create type project_status as enum ('Planning', 'Ongoing', 'Writing', 'Submitted', 'Completed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type project_role as enum ('Member', 'CoSupervisor');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type project_invite_type as enum ('Email', 'Code');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type project_invite_status as enum ('Pending', 'Accepted', 'Revoked');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type milestone_status as enum ('Pending', 'InProgress', 'Completed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type task_priority as enum ('Low', 'Medium', 'High');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type task_status as enum ('ToDo', 'InProgress', 'Submitted', 'UnderReview', 'Approved', 'RevisionRequested');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type notification_type as enum (
    'TaskAssigned',
    'DeadlineIn48h',
    'RevisionRequested',
    'TaskApproved',
    'ReviewDeadline',
    'BookingRequest',
    'ForumReply',
    'MilestoneDue'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type notification_channel as enum ('InApp', 'Email');
exception
  when duplicate_object then null;
end $$;

-- 2. Projects table (matches data-model.md §2)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  is_personal boolean not null default false,
  title text not null,
  abstract text not null default '',
  domain_tags text[] not null default '{}',
  start_date date not null default current_date,
  end_date date,
  status project_status not null default 'Planning',
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Project Members table
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_role project_role not null default 'Member',
  added_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- 4. Project Invites table
create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  invite_type project_invite_type not null default 'Code',
  invited_email text,
  invited_role project_role not null default 'Member',
  code text unique,
  max_uses integer,
  uses_count integer not null default 0,
  expires_at timestamptz,
  status project_invite_status not null default 'Pending',
  created_at timestamptz not null default now()
);

-- 5. Milestones table
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  target_date date not null,
  weight_pct integer not null default 0 check (weight_pct >= 0 and weight_pct <= 100),
  status milestone_status not null default 'Pending',
  is_locked boolean not null default false,
  is_proposed boolean not null default false,
  proposed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null,
  description text not null default '',
  assignee_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  due_date date not null,
  priority task_priority not null default 'Medium',
  status task_status not null default 'ToDo',
  progress_note text,
  revision_note text,
  is_proposed boolean not null default false,
  proposed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Task Comments table
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- 8. Project Messages table (Project Chat)
create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- 9. Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  channel notification_channel not null default 'InApp',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 10. Performance Indexes
create index if not exists idx_projects_owner_id on public.projects(owner_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_project_members_project_id on public.project_members(project_id);
create index if not exists idx_project_members_user_id on public.project_members(user_id);
create index if not exists idx_project_invites_code on public.project_invites(code);
create index if not exists idx_milestones_project_id on public.milestones(project_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists idx_tasks_milestone_id on public.tasks(milestone_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_task_comments_task_id on public.task_comments(task_id);
create index if not exists idx_project_messages_project_id on public.project_messages(project_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read) where is_read = false;

-- 11. Triggers for updated_at timestamps
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.update_updated_at_column();

drop trigger if exists set_milestones_updated_at on public.milestones;
create trigger set_milestones_updated_at
  before update on public.milestones
  for each row execute function public.update_updated_at_column();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at_column();

-- 12. Enable Row-Level Security (RLS)
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.project_messages enable row level security;
alter table public.notifications enable row level security;

-- Defense-in-depth RLS Policies
-- Projects: viewable by project owner, project members, or personal creator
drop policy if exists "Projects viewable by owner and members" on public.projects;
create policy "Projects viewable by owner and members"
  on public.projects for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = public.projects.id and pm.user_id = auth.uid()
    )
  );

-- Project Members: viewable by members of that project
drop policy if exists "Project members viewable by project members" on public.project_members;
create policy "Project members viewable by project members"
  on public.project_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = public.project_members.project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.project_members pm2
      where pm2.project_id = public.project_members.project_id and pm2.user_id = auth.uid()
    )
  );

-- Project Messages: viewable by project members and owner (Realtime subscriber access)
drop policy if exists "Project messages viewable by project members and owner" on public.project_messages;
create policy "Project messages viewable by project members and owner"
  on public.project_messages for select
  to authenticated
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = public.project_messages.project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = public.project_messages.project_id and pm.user_id = auth.uid()
    )
  );

-- Notifications: strictly viewable and updatable by the recipient user
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tasks: viewable by project members and project owner
drop policy if exists "Tasks viewable by project members and owner" on public.tasks;
create policy "Tasks viewable by project members and owner"
  on public.tasks for select
  to authenticated
  using (
    assignee_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = public.tasks.project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = public.tasks.project_id and pm.user_id = auth.uid()
    )
  );

-- Task Comments: viewable by project members and owner
drop policy if exists "Task comments viewable by project members and owner" on public.task_comments;
create policy "Task comments viewable by project members and owner"
  on public.task_comments for select
  to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = public.task_comments.task_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.tasks t
      join public.project_members pm on pm.project_id = t.project_id
      where t.id = public.task_comments.task_id and pm.user_id = auth.uid()
    )
  );

-- Milestones: viewable by project members and owner
drop policy if exists "Milestones viewable by project members and owner" on public.milestones;
create policy "Milestones viewable by project members and owner"
  on public.milestones for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = public.milestones.project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = public.milestones.project_id and pm.user_id = auth.uid()
    )
  );

-- 13. Enable Realtime Publications
do $$ begin
  alter publication supabase_realtime add table public.project_messages;
exception
  when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception
  when others then null;
end $$;
