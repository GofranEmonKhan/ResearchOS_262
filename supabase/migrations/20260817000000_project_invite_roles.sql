-- ResearchOS — Add invited_role to project_invites table
-- Supports inviting Researchers (Member) and Co-Supervisors / Internal Reviewers (CoSupervisor)

alter table public.project_invites 
add column if not exists invited_role project_role not null default 'Member';
