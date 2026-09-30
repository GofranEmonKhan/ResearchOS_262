-- ResearchOS — Spec 03: Literature Review & Paper Manager Migration
-- Single source of truth for file_assets, papers, sidebar fields, annotations,
-- collections, citation purposes, paper comments, and Option A personal notes masking view.

-- 1. Create Enums
do $$ begin
  create type reading_status as enum ('Unread', 'Reading', 'Read', 'DeeplyAnalysed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type sidebar_field_type as enum (
    'ResearchGap',
    'Limitation',
    'FutureWork',
    'DatasetUsed',
    'Methodology',
    'Results'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type citation_purpose_type as enum (
    'Motivation',
    'MethodSource',
    'DatasetSource',
    'ComparisonBaseline',
    'ContradictingEvidence',
    'SupportingEvidence',
    'RelatedWork'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type metadata_source as enum ('crossref', 'openalex', 'pdf_extraction', 'user');
exception
  when duplicate_object then null;
end $$;

-- 2. Create Table: file_assets
create table if not exists public.file_assets (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  storage_path    text not null,          -- Object path in 'papers' bucket: {userId}/{uuid}.pdf
  file_name       text not null,
  mime_type       text not null,
  size_bytes      bigint not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_file_assets_owner on public.file_assets(owner_id);

-- 3. Create Table: papers
create table if not exists public.papers (
  id                        uuid primary key default gen_random_uuid(),
  uploader_id               uuid not null references public.profiles(id) on delete cascade,
  project_id                uuid references public.projects(id) on delete set null,
  title                     text not null,
  authors                   text[] not null default '{}',
  year                      int,
  doi                       text,                   -- Normalized DOI (e.g. 10.1145/1234567)
  venue                     text,
  file_asset_id             uuid not null references public.file_assets(id) on delete cascade,
  reading_status            reading_status not null default 'Unread',
  is_required_reading       boolean not null default false,
  assigned_by_supervisor_id uuid references public.profiles(id),
  linked_task_id            uuid references public.tasks(id) on delete set null,
  metadata_source           metadata_source not null default 'user',
  metadata_confidence       float not null default 0.0,
  metadata_last_refreshed_at timestamptz,
  created_at                timestamptz not null default now()
);
create index if not exists idx_papers_uploader on public.papers(uploader_id);
create index if not exists idx_papers_project on public.papers(project_id);
create index if not exists idx_papers_reading_status on public.papers(reading_status);
create unique index if not exists idx_papers_doi_unique
  on public.papers(doi) where doi is not null;

-- 4. Create Table: paper_sidebar_fields
create table if not exists public.paper_sidebar_fields (
  id                       uuid primary key default gen_random_uuid(),
  paper_id                 uuid not null unique references public.papers(id) on delete cascade,
  research_gap             text,
  limitation               text,
  future_work              text,
  dataset_used             text,
  methodology              text,
  results                  text,
  personal_notes           text,
  personal_notes_visible   boolean not null default false
);

-- 5. Create Table: paper_annotations
create table if not exists public.paper_annotations (
  id                    uuid primary key default gen_random_uuid(),
  paper_id              uuid not null references public.papers(id) on delete cascade,
  user_id               uuid not null references public.profiles(id) on delete cascade,
  page                  int not null,
  highlighted_text      text not null,
  position_data         jsonb not null default '{}',    -- Zoom-invariant normalized coordinates
  sticky_note           text,
  linked_sidebar_field  sidebar_field_type,
  created_at            timestamptz not null default now()
);
create index if not exists idx_annotations_paper_user on public.paper_annotations(paper_id, user_id);
create index if not exists idx_annotations_paper on public.paper_annotations(paper_id);

-- 6. Create Table: collections
create table if not exists public.collections (
  id        uuid primary key default gen_random_uuid(),
  owner_id  uuid not null references public.profiles(id) on delete cascade,
  name      text not null,
  color_hex text not null default '#4F46E5',
  created_at timestamptz not null default now()
);
create index if not exists idx_collections_owner on public.collections(owner_id);

-- 7. Create Table: paper_collections (join table)
create table if not exists public.paper_collections (
  paper_id      uuid not null references public.papers(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  primary key (paper_id, collection_id)
);
create index if not exists idx_paper_collections_collection on public.paper_collections(collection_id);

-- 8. Create Table: citation_purposes
create table if not exists public.citation_purposes (
  id            uuid primary key default gen_random_uuid(),
  paper_id      uuid not null references public.papers(id) on delete cascade,
  manuscript_id uuid,                                   -- untyped until Module 05
  purpose       citation_purpose_type not null,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_citation_purposes_paper on public.citation_purposes(paper_id);

-- 9. Create Table: paper_comments
create table if not exists public.paper_comments (
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid not null references public.papers(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_paper_comments_paper on public.paper_comments(paper_id);

-- 10. Trigger: Auto-create blank paper_sidebar_fields row on Paper creation
create or replace function public.handle_new_paper()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.paper_sidebar_fields (paper_id)
  values (new.id)
  on conflict (paper_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_paper_created on public.papers;
create trigger on_paper_created
  after insert on public.papers
  for each row
  execute function public.handle_new_paper();

-- 11. Full-text / Metadata Search Support (Title, Authors, Venue)
alter table public.papers
  add column if not exists search_vector tsvector;

create or replace function public.handle_papers_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.venue, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.authors, ' '), '')), 'C');
  return new;
end;
$$;

drop trigger if exists on_papers_search_vector_update on public.papers;
create trigger on_papers_search_vector_update
  before insert or update on public.papers
  for each row
  execute function public.handle_papers_search_vector();

create index if not exists idx_papers_search_vector
  on public.papers using gin (search_vector);

-- 12. Enable Row-Level Security (RLS) on all Module 03 tables
alter table public.file_assets enable row level security;
alter table public.papers enable row level security;
alter table public.paper_sidebar_fields enable row level security;
alter table public.paper_annotations enable row level security;
alter table public.collections enable row level security;
alter table public.paper_collections enable row level security;
alter table public.citation_purposes enable row level security;
alter table public.paper_comments enable row level security;

-- 13. RLS Policies (Defense-in-Depth)

-- file_assets: only the owner can SELECT
drop policy if exists "File assets viewable by owner" on public.file_assets;
create policy "File assets viewable by owner"
  on public.file_assets for select to authenticated
  using (owner_id = auth.uid());

-- papers: viewable by uploader OR project members (when shared)
drop policy if exists "Papers viewable by uploader or project members" on public.papers;
create policy "Papers viewable by uploader or project members"
  on public.papers for select to authenticated
  using (
    uploader_id = auth.uid()
    or (
      project_id is not null and (
        exists (
          select 1 from public.projects p
          where p.id = papers.project_id and p.owner_id = auth.uid()
        )
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = papers.project_id and pm.user_id = auth.uid()
        )
      )
    )
  );

-- paper_sidebar_fields: viewable by paper viewers (row-level isolation)
drop policy if exists "Sidebar fields viewable by paper viewers" on public.paper_sidebar_fields;
create policy "Sidebar fields viewable by paper viewers"
  on public.paper_sidebar_fields for select to authenticated
  using (
    exists (
      select 1 from public.papers p
      where p.id = paper_sidebar_fields.paper_id
        and (
          p.uploader_id = auth.uid()
          or (
            p.project_id is not null and (
              exists (select 1 from public.projects pr where pr.id = p.project_id and pr.owner_id = auth.uid())
              or exists (select 1 from public.project_members pm where pm.project_id = p.project_id and pm.user_id = auth.uid())
            )
          )
        )
    )
  );

-- Option A: Dynamic Column Masking View (guarantees hidden personal notes are NEVER exposed via direct Supabase queries)
create or replace view public.paper_sidebar_fields_view
with (security_invoker = true) as
select
  id,
  paper_id,
  research_gap,
  limitation,
  future_work,
  dataset_used,
  methodology,
  results,
  personal_notes_visible,
  case
    when exists (
      select 1 from public.papers p
      where p.id = paper_sidebar_fields.paper_id
        and p.uploader_id = auth.uid()
    ) then personal_notes
    when personal_notes_visible then personal_notes
    else null
  end as personal_notes
from public.paper_sidebar_fields;

-- paper_annotations: collaborative — all project members see all annotations on shared papers
-- For personal (unshared) papers, only the annotation creator sees their annotations
drop policy if exists "Annotations viewable by authorized paper viewers" on public.paper_annotations;
create policy "Annotations viewable by authorized paper viewers"
  on public.paper_annotations for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.papers p
      where p.id = paper_annotations.paper_id
        and p.project_id is not null
        and (
          p.uploader_id = auth.uid()
          or exists (select 1 from public.projects pr where pr.id = p.project_id and pr.owner_id = auth.uid())
          or exists (select 1 from public.project_members pm where pm.project_id = p.project_id and pm.user_id = auth.uid())
        )
    )
  );

-- collections: owner-only
drop policy if exists "Collections viewable by owner" on public.collections;
create policy "Collections viewable by owner"
  on public.collections for select to authenticated
  using (owner_id = auth.uid());

-- paper_collections: viewable by collection owner
drop policy if exists "Paper-collection links viewable by collection owner" on public.paper_collections;
create policy "Paper-collection links viewable by collection owner"
  on public.paper_collections for select to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = paper_collections.collection_id and c.owner_id = auth.uid()
    )
  );

-- citation_purposes: viewable by paper viewers
drop policy if exists "Citation purposes viewable by paper viewers" on public.citation_purposes;
create policy "Citation purposes viewable by paper viewers"
  on public.citation_purposes for select to authenticated
  using (
    exists (
      select 1 from public.papers p
      where p.id = citation_purposes.paper_id
        and (
          p.uploader_id = auth.uid()
          or (
            p.project_id is not null and (
              exists (select 1 from public.projects pr where pr.id = p.project_id and pr.owner_id = auth.uid())
              or exists (select 1 from public.project_members pm where pm.project_id = p.project_id and pm.user_id = auth.uid())
            )
          )
        )
    )
  );

-- paper_comments: viewable by shared-project members
drop policy if exists "Paper comments viewable by shared-project members" on public.paper_comments;
create policy "Paper comments viewable by shared-project members"
  on public.paper_comments for select to authenticated
  using (
    exists (
      select 1 from public.papers p
      where p.id = paper_comments.paper_id
        and p.project_id is not null
        and (
          p.uploader_id = auth.uid()
          or exists (select 1 from public.projects pr where pr.id = p.project_id and pr.owner_id = auth.uid())
          or exists (select 1 from public.project_members pm where pm.project_id = p.project_id and pm.user_id = auth.uid())
        )
    )
  );

-- 14. Realtime Publications
do $$ begin
  alter publication supabase_realtime add table public.paper_comments;
exception
  when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.paper_annotations;
exception
  when others then null;
end $$;
