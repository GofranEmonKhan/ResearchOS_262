-- =============================================================================
-- Migration: 20261001000002_match_embeddings_project_scope.sql
-- Updates match_embeddings to include accessible research materials from
-- projects the requesting user owns or is a member of (Spec 08 & AGENTS.md Sec 5).
-- =============================================================================

create or replace function public.match_embeddings(
  query_embedding   vector(768),
  owner_id_filter   uuid,
  top_k             int                              default 8,
  source_types_in   public.embedding_source_type[]  default null
)
returns table (
  id          uuid,
  source_type public.embedding_source_type,
  source_id   uuid,
  chunk_index int,
  similarity  float
)
language plpgsql
stable
security definer
as $$
begin
  return query
  select
    e.id,
    e.source_type,
    e.source_id,
    e.chunk_index,
    (1 - (e.vector <=> query_embedding))::float as similarity
  from public.embeddings e
  where
    (
      -- Direct owner scope
      e.owner_id = owner_id_filter
      -- Shared project papers
      or (
        e.source_type = 'Paper' and e.source_id in (
          select p.id from public.papers p
          where p.project_id is not null and (
            p.project_id in (select pm.project_id from public.project_members pm where pm.user_id = owner_id_filter)
            or p.project_id in (select pr.id from public.projects pr where pr.owner_id = owner_id_filter)
          )
        )
      )
      -- Shared paper sidebar fields
      or (
        e.source_type = 'PaperSidebarFields' and e.source_id in (
          select psf.id from public.paper_sidebar_fields psf
          join public.papers p on p.id = psf.paper_id
          where p.project_id is not null and (
            p.project_id in (select pm.project_id from public.project_members pm where pm.user_id = owner_id_filter)
            or p.project_id in (select pr.id from public.projects pr where pr.owner_id = owner_id_filter)
          )
        )
      )
      -- Shared manuscript sections
      or (
        e.source_type = 'ManuscriptSection' and e.source_id in (
          select ms.id from public.manuscript_sections ms
          join public.manuscripts m on m.id = ms.manuscript_id
          where m.project_id is not null and (
            m.project_id in (select pm.project_id from public.project_members pm where pm.user_id = owner_id_filter)
            or m.project_id in (select pr.id from public.projects pr where pr.owner_id = owner_id_filter)
          )
        )
      )
    )
    and (source_types_in is null or e.source_type = any(source_types_in))
  order by e.vector <=> query_embedding
  limit top_k;
end;
$$;

comment on function public.match_embeddings is
  'Cosine similarity search over embeddings for a user and their authorized shared project scope. '
  'Returns rows ordered by ascending vector distance (most similar first).';
