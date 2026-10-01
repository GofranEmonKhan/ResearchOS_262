-- =============================================================================
-- Spec 08 — AI Research Assistant (Cross-Cutting Layer)
-- Migration: 20261001000000_ai_assistant.sql
--
-- Creates:
--   4 new enum types
--   7 new tables: embeddings, ai_suggestions, ai_usage_logs,
--                 ai_provider_configs, ai_quotas, blocked_prompt_rules,
--                 progress_reports
--   Indexes on all FK and frequently-filtered columns
--   match_embeddings() pgvector cosine-similarity function (768-dim, Gemini)
--   RLS policies for all 7 tables
--   Default quota seed rows
--
-- Provider: Gemini (text-embedding-004, vector(768))
-- Dependency: pgvector already enabled in 20260814000000_enable_pgvector.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.embedding_source_type as enum (
    'Paper',
    'PaperSidebarFields',
    'ManuscriptSection'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_suggestion_status as enum (
    'Pending',
    'Accepted',
    'Rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_suggestion_target_type as enum (
    'PaperSidebarFields',
    'ManuscriptSection'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_provider_enum as enum (
    'OpenAI',
    'Gemini'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE: embeddings
--    Owner: owner_id (the uploading user)
--    Vector: 768-dim to match Gemini text-embedding-004 (free tier)
-- ---------------------------------------------------------------------------

create table if not exists public.embeddings (
  id           uuid        primary key default gen_random_uuid(),
  source_type  public.embedding_source_type not null,
  source_id    uuid        not null,
  owner_id     uuid        not null references public.profiles(id) on delete cascade,
  chunk_index  int         not null default 0,
  vector       vector(768) not null,
  created_at   timestamptz not null default now()
);

-- Owner-scoped lookup (used in match_embeddings filter)
create index if not exists idx_embeddings_owner
  on public.embeddings(owner_id);

-- Source resolution (used when deleting / re-embedding a paper)
create index if not exists idx_embeddings_source
  on public.embeddings(source_type, source_id);

comment on table public.embeddings is
  'Vector embeddings for Papers, PaperSidebarFields, and ManuscriptSections. '
  'owner_id is always set to the uploading user; match_embeddings() always '
  'filters by owner_id_filter = req.userId — AI never crosses ownership boundaries.';

-- ---------------------------------------------------------------------------
-- 3. TABLE: ai_suggestions
--    Owner: user_id (derived server-side from JWT — never client-supplied)
--    Nothing writes to the target field until status = Accepted (human action).
-- ---------------------------------------------------------------------------

create table if not exists public.ai_suggestions (
  id               uuid                              primary key default gen_random_uuid(),
  user_id          uuid                              not null references public.profiles(id) on delete cascade,
  target_type      public.ai_suggestion_target_type  not null,
  target_id        uuid                              not null,
  field_name       text                              not null,
  suggested_value  text                              not null,
  status           public.ai_suggestion_status       not null default 'Pending',
  created_at       timestamptz                       not null default now()
);

create index if not exists idx_ai_suggestions_user
  on public.ai_suggestions(user_id);

create index if not exists idx_ai_suggestions_target
  on public.ai_suggestions(target_type, target_id);

create index if not exists idx_ai_suggestions_status
  on public.ai_suggestions(status);

comment on table public.ai_suggestions is
  'AI-generated field suggestions awaiting human review. '
  'status=Pending: no mutation to source field. '
  'status=Accepted: Express writes suggested_value to the target field and sets is_ai_assisted=true where applicable. '
  'status=Rejected: no mutation. '
  'user_id is always server-derived from the verified JWT.';

comment on column public.ai_suggestions.user_id is
  'Owner of the suggestion — always set server-side from JWT sub claim. '
  'Never trusted from client. Used for ownership filter on GET /ai/suggestions.';

comment on column public.ai_suggestions.target_type is
  'PaperSidebarFields: suggestion targets a paper sidebar field (researchGap, limitation, etc). '
  'ManuscriptSection: suggestion targets manuscript_sections.content (paraphrase, grammar, outline). '
  'Accepting a ManuscriptSection suggestion also sets is_ai_assisted=true on that section.';

-- ---------------------------------------------------------------------------
-- 4. TABLE: ai_usage_logs
--    Append-only. Written before returning AI results to the caller.
--    Admin reads aggregate (no research content). Users read own rows only.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_usage_logs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  feature      text        not null,  -- 'summarize_short', 'semantic_search', 'writing_assist_paraphrase', 'blocked', etc.
  tokens_used  int         not null default 0,
  cost_usd     numeric(10, 6),        -- estimated cost in USD, provider-dependent
  created_at   timestamptz not null default now()
);

create index if not exists idx_ai_usage_logs_user
  on public.ai_usage_logs(user_id);

-- Monthly-aggregation index (used by quota enforcement query)
create index if not exists idx_ai_usage_logs_user_created
  on public.ai_usage_logs(user_id, created_at);

create index if not exists idx_ai_usage_logs_created
  on public.ai_usage_logs(created_at);

comment on table public.ai_usage_logs is
  'Immutable usage log for all AI feature calls. '
  'tokens_used=0 and feature=''blocked'' when a blocked-prompt rule fires. '
  'Written before returning results; failure to log is non-blocking for the user.';

-- ---------------------------------------------------------------------------
-- 5. TABLE: ai_provider_configs
--    Admin-only. Exactly one row may be active at a time (partial unique index).
--    api_key_ref stores the name of a server env var, NOT the raw API key.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_provider_configs (
  id           uuid                    primary key default gen_random_uuid(),
  provider     public.ai_provider_enum not null,
  api_key_ref  text                    not null,  -- e.g. 'GEMINI_API_KEY' — read via process.env[api_key_ref]
  model        text                    not null,  -- e.g. 'gemini-1.5-flash'
  is_active    boolean                 not null default false,
  updated_by   uuid                    references public.profiles(id) on delete set null,
  updated_at   timestamptz             not null default now()
);

-- Enforce only one active provider at a time
create unique index if not exists idx_ai_provider_configs_single_active
  on public.ai_provider_configs(is_active)
  where is_active = true;

comment on table public.ai_provider_configs is
  'AI provider configuration. Admin-only. '
  'api_key_ref is the server environment variable NAME (e.g. GEMINI_API_KEY), never the raw key. '
  'The raw key is set in the server .env file and never stored in this table. '
  'Only one row may have is_active=true at a time (enforced by partial unique index).';

comment on column public.ai_provider_configs.api_key_ref is
  'Name of the server-side environment variable holding the actual API key. '
  'The Express backend reads process.env[api_key_ref] at call time. '
  'The raw API key is NEVER stored in this column or anywhere in the database.';

-- ---------------------------------------------------------------------------
-- 6. TABLE: ai_quotas
--    Admin-only. One row per role. Seeded with defaults below.
--    Admin quota is 0 — Admins do not use research AI.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_quotas (
  role                  public.user_role  primary key,
  monthly_token_limit   int               not null default 100000,
  updated_at            timestamptz       not null default now()
);

-- Seed default quotas (no-op on conflict)
insert into public.ai_quotas (role, monthly_token_limit) values
  ('Admin',      0),        -- Admin does not use research AI
  ('Supervisor', 500000),
  ('Researcher', 100000)
on conflict (role) do nothing;

comment on table public.ai_quotas is
  'Monthly token limits per application role. Admin-only write. '
  'Admin quota is 0 — Admins configure AI but do not consume it as research users. '
  'Quota is enforced server-side on every AI feature request before the provider call.';

-- ---------------------------------------------------------------------------
-- 7. TABLE: blocked_prompt_rules
--    Admin-only. Patterns matched via case-insensitive substring before provider call.
--    Regex explicitly not supported (ReDoS risk) — plain string match only.
-- ---------------------------------------------------------------------------

create table if not exists public.blocked_prompt_rules (
  id          uuid        primary key default gen_random_uuid(),
  pattern     text        not null,  -- case-insensitive substring to match against assembled prompt
  reason      text        not null,  -- human-readable explanation shown to Admin
  created_by  uuid        not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.blocked_prompt_rules is
  'Blocked-prompt policy rules. Admin-only. '
  'pattern is a plain string matched case-insensitively as a substring of the assembled prompt. '
  'Regex is explicitly NOT supported (ReDoS risk). '
  'If a match is found: return 400, write AiUsageLog with tokens_used=0 and feature=''blocked''.';

comment on column public.blocked_prompt_rules.pattern is
  'Plain text string. Matched via prompt.toLowerCase().includes(pattern.toLowerCase()). '
  'No regex, no wildcards. If regex is needed in a future version, add a pattern_type column.';

-- ---------------------------------------------------------------------------
-- 8. TABLE: progress_reports
--    Owner: generated_by (Supervisor). Scoped to project + student.
--    Cached; re-generated only on explicit request (?regenerate=true).
-- ---------------------------------------------------------------------------

create table if not exists public.progress_reports (
  id            uuid        primary key default gen_random_uuid(),
  project_id    uuid        not null references public.projects(id) on delete cascade,
  student_id    uuid        not null references public.profiles(id) on delete cascade,
  generated_by  uuid        not null references public.profiles(id) on delete cascade,
  period_start  date        not null,
  period_end    date        not null,
  content       text        not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_progress_reports_project
  on public.progress_reports(project_id);

create index if not exists idx_progress_reports_student
  on public.progress_reports(student_id);

create index if not exists idx_progress_reports_generated_by
  on public.progress_reports(generated_by);

-- Unique cache key: one report per (project, student, period)
create unique index if not exists idx_progress_reports_cache_key
  on public.progress_reports(project_id, student_id, period_start, period_end);

comment on table public.progress_reports is
  'Cached AI-generated supervisor progress summaries. '
  'Access: generated_by (Supervisor) who must own the project. '
  'Data assembled from tasks, experiments, papers — never includes personalNotes or Admin-only fields. '
  'Unique constraint on (project_id, student_id, period_start, period_end) enforces one cached report per period.';

-- ---------------------------------------------------------------------------
-- 9. PGVECTOR FUNCTION: match_embeddings
--    Cosine similarity search scoped to a single owner.
--    SECURITY: owner_id_filter is ALWAYS set to req.userId in Express.
--    The frontend never calls this function directly.
--    Oversample with top_k then let Express filter to authorized scope.
-- ---------------------------------------------------------------------------

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
    e.owner_id = owner_id_filter
    and (source_types_in is null or e.source_type = any(source_types_in))
  order by e.vector <=> query_embedding
  limit top_k;
end;
$$;

comment on function public.match_embeddings is
  'Cosine similarity search over embeddings for a single owner. '
  'owner_id_filter MUST be set to req.userId in Express — never a client-supplied value. '
  'Returns rows ordered by ascending vector distance (most similar first). '
  'similarity = 1 - cosine_distance (range: 0..1, higher = more similar). '
  'Express oversamples (top_k * 3) then filters to authorized project scope before returning to client.';

-- ---------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (Defense-in-depth)
--     Express uses the secret key (bypasses RLS), so these policies protect
--     against accidental direct Supabase client access only.
--     The publishable-key frontend client must never reach these tables directly.
-- ---------------------------------------------------------------------------

-- embeddings: owner reads own rows only
alter table public.embeddings enable row level security;

drop policy if exists "embeddings_select_own" on public.embeddings;
create policy "embeddings_select_own"
  on public.embeddings
  for select
  using (owner_id = auth.uid());

-- ai_suggestions: user reads own suggestions only
alter table public.ai_suggestions enable row level security;

drop policy if exists "ai_suggestions_select_own" on public.ai_suggestions;
create policy "ai_suggestions_select_own"
  on public.ai_suggestions
  for select
  using (user_id = auth.uid());

-- ai_usage_logs: user reads own logs only
alter table public.ai_usage_logs enable row level security;

drop policy if exists "ai_usage_logs_select_own" on public.ai_usage_logs;
create policy "ai_usage_logs_select_own"
  on public.ai_usage_logs
  for select
  using (user_id = auth.uid());

-- progress_reports: supervisor (generated_by) reads own reports only
alter table public.progress_reports enable row level security;

drop policy if exists "progress_reports_select_own" on public.progress_reports;
create policy "progress_reports_select_own"
  on public.progress_reports
  for select
  using (generated_by = auth.uid());

-- Admin-only tables: no public select policies (secret-key backend only)
alter table public.ai_provider_configs  enable row level security;
alter table public.ai_quotas            enable row level security;
alter table public.blocked_prompt_rules enable row level security;

-- No select policies for admin-only tables — all access via secret-key Express client
-- Admins access these through /admin/ai/* endpoints which use the secret key
