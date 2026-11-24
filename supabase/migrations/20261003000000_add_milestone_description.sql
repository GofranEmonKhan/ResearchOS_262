-- Migration: 20261003000000_add_milestone_description.sql
-- Description: Add description field to public.milestones for detailed milestone scope and objectives

ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
