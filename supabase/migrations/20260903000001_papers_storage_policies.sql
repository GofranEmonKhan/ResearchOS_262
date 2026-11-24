-- Migration: 20260903000001_papers_storage_policies.sql
-- Description: Row-Level Security policies on storage.objects for private 'papers' bucket

create policy "Authenticated users can upload papers to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'papers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read their own paper storage objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'papers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own paper storage objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'papers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
