-- Migration: 20260904000001_experiments_storage_policies.sql
-- Description: Row-Level Security policies on storage.objects for private 'experiments' bucket

insert into storage.buckets (id, name, public)
values ('experiments', 'experiments', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload experiment files to their own folder" on storage.objects;
create policy "Authenticated users can upload experiment files to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'experiments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read their own experiment storage objects" on storage.objects;
create policy "Users can read their own experiment storage objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'experiments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own experiment storage objects" on storage.objects;
create policy "Users can delete their own experiment storage objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'experiments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
