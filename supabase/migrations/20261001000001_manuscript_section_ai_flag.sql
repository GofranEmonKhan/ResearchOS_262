-- =============================================================================
-- Migration: 20261001000001_manuscript_section_ai_flag.sql
-- Add is_ai_assisted boolean flag to manuscript_sections table
-- Used by Module 08 AI writing assistance (Spec 08, docs/data-model.md)
-- =============================================================================

alter table public.manuscript_sections
  add column if not exists is_ai_assisted boolean not null default false;

comment on column public.manuscript_sections.is_ai_assisted is
  'Flag indicating whether this section content was generated or assisted by AI (Spec 08).';
