-- ResearchOS — Spec 01: Authentication, RBAC & Profiles Migration
-- Single source of truth for profiles, verification requests, and audit logs.

-- 1. Create Enums
do $$ begin
  create type user_role as enum ('Admin', 'Supervisor', 'Researcher');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type user_status as enum ('Active', 'PendingVerification', 'Suspended');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type verification_status as enum ('Pending', 'Approved', 'Rejected');
exception
  when duplicate_object then null;
end $$;

-- 2. Create public.profiles table (matches data-model.md §1)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'Researcher',
  status user_status not null default 'Active',
  institution text not null default '',
  department text not null default '',
  research_field_tags text[] not null default '{}',
  photo_url text,
  bio text,
  orcid_url text,
  scholar_url text,
  research_interests text[] not null default '{}',
  skills text[] not null default '{}',
  reputation_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create public.supervisor_verification_requests table
create table if not exists public.supervisor_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_url text not null,
  institution_domain text not null,
  status verification_status not null default 'Pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

-- 4. Create public.audit_logs table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 5. Trigger function on auth.users to auto-populate profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  req_role text;
  initial_role user_role;
  initial_status user_status;
  full_name_val text;
  inst_val text;
  dept_val text;
  tags_val text[];
begin
  full_name_val := coalesce(
    new.raw_user_meta_data->>'fullName',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, ''), '@', 1),
    'Scholar'
  );
  inst_val := coalesce(new.raw_user_meta_data->>'institution', '');
  dept_val := coalesce(new.raw_user_meta_data->>'department', '');
  req_role := coalesce(new.raw_user_meta_data->>'roleRequest', new.raw_user_meta_data->>'role', 'Researcher');
  
  if req_role = 'Supervisor' then
    initial_role := 'Supervisor'::user_role;
    initial_status := 'PendingVerification'::user_status;
  elsif req_role = 'Admin' then
    -- Public sign-up cannot self-grant Admin
    initial_role := 'Researcher'::user_role;
    initial_status := 'Active'::user_status;
  else
    initial_role := 'Researcher'::user_role;
    initial_status := 'Active'::user_status;
  end if;

  insert into public.profiles (
    id,
    full_name,
    role,
    status,
    institution,
    department,
    research_field_tags,
    created_at,
    updated_at
  ) values (
    new.id,
    full_name_val,
    initial_role,
    initial_status,
    inst_val,
    dept_val,
    '{}',
    now(),
    now()
  )
  on conflict (id) do update set
    full_name = case when excluded.full_name <> '' and public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
    updated_at = now();

  return new;
end;
$$;

-- Drop and recreate trigger to guarantee updated trigger definition
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Enable Row-Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.supervisor_verification_requests enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles policies
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Profiles are viewable by anon for public references" on public.profiles;
create policy "Profiles are viewable by anon for public references"
  on public.profiles for select
  to anon
  using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Supervisor verification requests policies
drop policy if exists "Users can view own verification requests" on public.supervisor_verification_requests;
create policy "Users can view own verification requests"
  on public.supervisor_verification_requests for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own verification request" on public.supervisor_verification_requests;
create policy "Users can insert own verification request"
  on public.supervisor_verification_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Audit logs are readable/writable by Express backend (secret key)
