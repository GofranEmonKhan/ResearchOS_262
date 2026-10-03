-- ResearchOS — Spec 09: Admin Deletion Requests Migration
-- Single source of truth for formal deletion requests (projects, resources)

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  target_type text not null default 'Project',
  target_id uuid not null,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  decided_by uuid references public.profiles(id) on delete set null,
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.deletion_requests enable row level security;

-- Policies
drop policy if exists "Users can view own deletion requests" on public.deletion_requests;
create policy "Users can view own deletion requests"
  on public.deletion_requests for select
  to authenticated
  using (auth.uid() = requested_by);

drop policy if exists "Users can insert own deletion requests" on public.deletion_requests;
create policy "Users can insert own deletion requests"
  on public.deletion_requests for insert
  to authenticated
  with check (auth.uid() = requested_by);
