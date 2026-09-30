-- Migration: 20260903000002_fix_rls_circular_recursion.sql
-- Description: Break reciprocal RLS recursion between projects, project_members, and papers using SECURITY DEFINER functions.

-- 1. Security Definer Helper Functions
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id
  );
$$;

create or replace function public.is_project_owner(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = p_user_id
  );
$$;

-- 2. Projects SELECT Policy
drop policy if exists "Projects viewable by owner and members" on public.projects;
create policy "Projects viewable by owner and members"
  on public.projects for select
  to authenticated
  using (
    owner_id = auth.uid()
    or public.is_project_member(id, auth.uid())
  );

-- 3. Project Members SELECT Policy
drop policy if exists "Project members viewable by project members" on public.project_members;
create policy "Project members viewable by project members"
  on public.project_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_project_owner(project_id, auth.uid())
  );

-- 4. Papers SELECT Policy
drop policy if exists "Papers viewable by uploader or project members" on public.papers;
create policy "Papers viewable by uploader or project members"
  on public.papers for select
  to authenticated
  using (
    uploader_id = auth.uid()
    or (
      project_id is not null and (
        public.is_project_owner(project_id, auth.uid())
        or public.is_project_member(project_id, auth.uid())
      )
    )
  );

-- 5. Paper Sidebar Fields SELECT Policy
drop policy if exists "Sidebar fields viewable by paper viewers" on public.paper_sidebar_fields;
create policy "Sidebar fields viewable by paper viewers"
  on public.paper_sidebar_fields for select
  to authenticated
  using (
    exists (
      select 1 from public.papers p
      where p.id = paper_sidebar_fields.paper_id
        and (
          p.uploader_id = auth.uid()
          or (
            p.project_id is not null and (
              public.is_project_owner(p.project_id, auth.uid())
              or public.is_project_member(p.project_id, auth.uid())
            )
          )
        )
    )
  );

-- 6. Paper Annotations SELECT Policy
drop policy if exists "Annotations viewable by paper viewers" on public.paper_annotations;
create policy "Annotations viewable by paper viewers"
  on public.paper_annotations for select
  to authenticated
  using (
    exists (
      select 1 from public.papers p
      where p.id = paper_annotations.paper_id
        and (
          p.uploader_id = auth.uid()
          or (
            p.project_id is not null and (
              public.is_project_owner(p.project_id, auth.uid())
              or public.is_project_member(p.project_id, auth.uid())
            )
          )
        )
    )
  );
