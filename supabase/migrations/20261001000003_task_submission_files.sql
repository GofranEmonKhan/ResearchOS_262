-- ResearchOS — Task Submission Files
-- Adds submission_files jsonb column to tasks and creates task-submissions storage bucket.

-- 1. Add submission_files column to tasks table
alter table public.tasks
  add column if not exists submission_files jsonb not null default '[]'::jsonb;

-- 2. Create task-submissions storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-submissions',
  'task-submissions',
  false,
  52428800,  -- 50 MB limit per file
  array[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ]
)
on conflict (id) do nothing;

-- 3. Storage policies for task-submissions bucket

-- Authenticated users can upload their own task submission files
drop policy if exists "Task submission uploads by authenticated users" on storage.objects;
create policy "Task submission uploads by authenticated users"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'task-submissions');

-- Authenticated users can view task submission files (project membership enforced at application level)
drop policy if exists "Task submission reads by authenticated users" on storage.objects;
create policy "Task submission reads by authenticated users"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'task-submissions');

-- Users can delete their own uploaded task submission files
drop policy if exists "Task submission deletes by owner" on storage.objects;
create policy "Task submission deletes by owner"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'task-submissions' and owner = auth.uid());
