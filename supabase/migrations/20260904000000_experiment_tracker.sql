-- ResearchOS — Spec 04: Experiment Tracker Migration
-- Single source of truth for experiments, experiment flags, task experiment links, and experiment comments.

-- 1. Create Enums
do $$ begin
  create type public.experiment_purpose as enum (
    'ModelTesting',
    'HyperparameterTuning',
    'DatasetComparison',
    'PerformanceEvaluation',
    'Baseline',
    'Final'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.experiment_status as enum (
    'Draft',
    'Final'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.experiment_flag_type as enum (
    'NeedsRerun',
    'NotReproducible'
  );
exception
  when duplicate_object then null;
end $$;

-- 2. Extend notification_type enum for Experiment Events
do $$ begin
  alter type public.notification_type add value if not exists 'ExperimentFlagged';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.notification_type add value if not exists 'ExperimentCommented';
exception
  when duplicate_object then null;
end $$;

-- 3. Create Tables

-- Table 1: experiments
create table if not exists public.experiments (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  name            text not null check (char_length(trim(name)) > 0),
  purpose         public.experiment_purpose not null,
  hypothesis      text,
  date            date not null default current_date,
  config          jsonb not null default '{}'::jsonb,
  metrics         jsonb not null default '{}'::jsonb,
  output_file_ids uuid[] not null default '{}',
  observation     text,
  status          public.experiment_status not null default 'Draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_experiments_project on public.experiments(project_id);
create index if not exists idx_experiments_owner on public.experiments(owner_id);
create index if not exists idx_experiments_purpose on public.experiments(purpose);
create index if not exists idx_experiments_status on public.experiments(status);
create index if not exists idx_experiments_date on public.experiments(date desc);
create index if not exists idx_experiments_config_gin on public.experiments using gin (config);
create index if not exists idx_experiments_metrics_gin on public.experiments using gin (metrics);

-- Table 2: experiment_flags
create table if not exists public.experiment_flags (
  id              uuid primary key default gen_random_uuid(),
  experiment_id   uuid not null references public.experiments(id) on delete cascade,
  flagged_by      uuid not null references public.profiles(id) on delete cascade,
  type            public.experiment_flag_type not null,
  note            text not null check (char_length(trim(note)) > 0),
  raised_task_id  uuid references public.tasks(id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_experiment_flags_experiment on public.experiment_flags(experiment_id);
create index if not exists idx_experiment_flags_flagged_by on public.experiment_flags(flagged_by);
create index if not exists idx_experiment_flags_raised_task on public.experiment_flags(raised_task_id);

-- Table 3: task_experiment_links (Join Table)
create table if not exists public.task_experiment_links (
  task_id       uuid not null references public.tasks(id) on delete cascade,
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (task_id, experiment_id)
);

create index if not exists idx_task_experiment_links_experiment on public.task_experiment_links(experiment_id);
create index if not exists idx_task_experiment_links_task on public.task_experiment_links(task_id);

-- Table 4: experiment_comments
create table if not exists public.experiment_comments (
  id            uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  body          text not null check (char_length(trim(body)) > 0),
  created_at    timestamptz not null default now()
);

create index if not exists idx_experiment_comments_experiment on public.experiment_comments(experiment_id);
create index if not exists idx_experiment_comments_author on public.experiment_comments(author_id);

-- 4. Triggers & Immutability Enforcement

-- updated_at trigger
drop trigger if exists on_experiments_updated_at on public.experiments;
create trigger on_experiments_updated_at
  before update on public.experiments
  for each row
  execute function public.update_updated_at_column();

-- Scientific Data Immutability Trigger: prevent updates to finalized experiments
create or replace function public.prevent_final_experiment_modification()
returns trigger
language plpgsql
as $$
begin
  if OLD.status = 'Final' then
    if (
      OLD.name is distinct from NEW.name or
      OLD.purpose is distinct from NEW.purpose or
      OLD.hypothesis is distinct from NEW.hypothesis or
      OLD.date is distinct from NEW.date or
      OLD.config is distinct from NEW.config or
      OLD.metrics is distinct from NEW.metrics or
      OLD.output_file_ids is distinct from NEW.output_file_ids or
      OLD.observation is distinct from NEW.observation or
      OLD.status is distinct from NEW.status
    ) then
      raise exception 'Finalized experiments are permanently locked and cannot be modified (Scientific Integrity Rule).';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_experiment_prevent_final_update on public.experiments;
create trigger on_experiment_prevent_final_update
  before update on public.experiments
  for each row
  execute function public.prevent_final_experiment_modification();

-- Scientific Data Immutability Trigger: prevent deletion of finalized experiments
create or replace function public.prevent_final_experiment_deletion()
returns trigger
language plpgsql
as $$
begin
  if OLD.status = 'Final' then
    raise exception 'Finalized experiments are permanently locked and cannot be deleted (Scientific Integrity Rule).';
  end if;
  return OLD;
end;
$$;

drop trigger if exists on_experiment_prevent_final_delete on public.experiments;
create trigger on_experiment_prevent_final_delete
  before delete on public.experiments
  for each row
  execute function public.prevent_final_experiment_deletion();

-- 5. Row Level Security Policies (Defense-in-Depth)

alter table public.experiments enable row level security;
alter table public.experiment_flags enable row level security;
alter table public.task_experiment_links enable row level security;
alter table public.experiment_comments enable row level security;

-- Experiments RLS Policies
drop policy if exists "Project members can read experiments" on public.experiments;
create policy "Project members can read experiments"
  on public.experiments for select
  using (
    public.is_project_owner(project_id, auth.uid()) or
    public.is_project_member(project_id, auth.uid())
  );

drop policy if exists "Members can create experiments" on public.experiments;
create policy "Members can create experiments"
  on public.experiments for insert
  with check (
    auth.uid() = owner_id and (
      public.is_project_owner(project_id, auth.uid()) or
      public.is_project_member(project_id, auth.uid())
    )
  );

drop policy if exists "Owners can update draft experiments" on public.experiments;
create policy "Owners can update draft experiments"
  on public.experiments for update
  using (auth.uid() = owner_id and status = 'Draft')
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete draft experiments" on public.experiments;
create policy "Owners can delete draft experiments"
  on public.experiments for delete
  using (auth.uid() = owner_id and status = 'Draft');

-- Experiment Flags RLS Policies
drop policy if exists "Project members can read experiment flags" on public.experiment_flags;
create policy "Project members can read experiment flags"
  on public.experiment_flags for select
  using (
    exists (
      select 1 from public.experiments e
      where e.id = experiment_flags.experiment_id
      and (public.is_project_owner(e.project_id, auth.uid()) or public.is_project_member(e.project_id, auth.uid()))
    )
  );

drop policy if exists "Supervisors can flag experiments" on public.experiment_flags;
create policy "Supervisors can flag experiments"
  on public.experiment_flags for insert
  with check (
    auth.uid() = flagged_by and
    exists (
      select 1 from public.experiments e
      where e.id = experiment_flags.experiment_id
      and public.is_project_owner(e.project_id, auth.uid())
    )
  );

-- Task Experiment Links RLS Policies
drop policy if exists "Project members can read task experiment links" on public.task_experiment_links;
create policy "Project members can read task experiment links"
  on public.task_experiment_links for select
  using (
    exists (
      select 1 from public.experiments e
      where e.id = task_experiment_links.experiment_id
      and (public.is_project_owner(e.project_id, auth.uid()) or public.is_project_member(e.project_id, auth.uid()))
    )
  );

drop policy if exists "Project members can manage task experiment links" on public.task_experiment_links;
create policy "Project members can manage task experiment links"
  on public.task_experiment_links for all
  using (
    exists (
      select 1 from public.experiments e
      where e.id = task_experiment_links.experiment_id
      and (public.is_project_owner(e.project_id, auth.uid()) or public.is_project_member(e.project_id, auth.uid()))
    )
  );

-- Experiment Comments RLS Policies
drop policy if exists "Project members can read experiment comments" on public.experiment_comments;
create policy "Project members can read experiment comments"
  on public.experiment_comments for select
  using (
    exists (
      select 1 from public.experiments e
      where e.id = experiment_comments.experiment_id
      and (public.is_project_owner(e.project_id, auth.uid()) or public.is_project_member(e.project_id, auth.uid()))
    )
  );

drop policy if exists "Project members can insert experiment comments" on public.experiment_comments;
create policy "Project members can insert experiment comments"
  on public.experiment_comments for insert
  with check (
    auth.uid() = author_id and
    exists (
      select 1 from public.experiments e
      where e.id = experiment_comments.experiment_id
      and (public.is_project_owner(e.project_id, auth.uid()) or public.is_project_member(e.project_id, auth.uid()))
    )
  );
