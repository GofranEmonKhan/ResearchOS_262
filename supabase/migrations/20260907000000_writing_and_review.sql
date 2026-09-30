-- =====================================================================
-- Migration: 20260907000000_writing_and_review.sql
-- Module 5: Manuscript Writing & Internal Peer Review
-- =====================================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE manuscript_status AS ENUM (
    'Draft',
    'UnderInternalReview',
    'Revising',
    'ReadyForSubmission',
    'Submitted',
    'Published',
    'Archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE manuscript_section_type AS ENUM (
    'Abstract',
    'Introduction',
    'RelatedWork',
    'Methodology',
    'Experiments',
    'Results',
    'Discussion',
    'Conclusion',
    'Custom'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_comment_severity AS ENUM (
    'GrammarOrTypo',
    'MinorScientific',
    'MajorScientific',
    'CriticalFlaw'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_comment_status AS ENUM (
    'Open',
    'FixedByResearcher',
    'Resolved',
    'Reopened'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Manuscripts Table
CREATE TABLE IF NOT EXISTS manuscripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  abstract TEXT,
  target_venue TEXT,
  status manuscript_status NOT NULL DEFAULT 'Draft',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Manuscript Authors Table
CREATE TABLE IF NOT EXISTS manuscript_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_order INT NOT NULL,
  affiliation TEXT,
  is_corresponding BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(manuscript_id, user_id)
);

-- 4. Manuscript Sections Table
CREATE TABLE IF NOT EXISTS manuscript_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  section_type manuscript_section_type NOT NULL DEFAULT 'Custom',
  order_index INT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  content_latex TEXT NOT NULL DEFAULT '',
  word_count INT NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Manuscript Citations Table
CREATE TABLE IF NOT EXISTS manuscript_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  section_id UUID REFERENCES manuscript_sections(id) ON DELETE SET NULL,
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  citation_key TEXT NOT NULL,
  in_text_label TEXT,
  context_note TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(manuscript_id, citation_key)
);

-- 6. Review Assignments Table
CREATE TABLE IF NOT EXISTS review_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'InProgress', 'Completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(manuscript_id, reviewer_id)
);

-- 7. Review Comments Table
CREATE TABLE IF NOT EXISTS review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  section_id UUID REFERENCES manuscript_sections(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES review_comments(id) ON DELETE CASCADE,
  highlighted_text TEXT,
  comment_text TEXT NOT NULL,
  severity review_comment_severity NOT NULL DEFAULT 'MinorScientific',
  status review_comment_status NOT NULL DEFAULT 'Open',
  fix_note TEXT,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Manuscript Versions Table
CREATE TABLE IF NOT EXISTS manuscript_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  version_name TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(manuscript_id, version_number)
);

-- 9. Manuscript Revision Logs Table
CREATE TABLE IF NOT EXISTS manuscript_revision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  section_id UUID REFERENCES manuscript_sections(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Manuscript Checklist Items Table
CREATE TABLE IF NOT EXISTS manuscript_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Create Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_manuscripts_project ON manuscripts(project_id);
CREATE INDEX IF NOT EXISTS idx_manuscripts_status ON manuscripts(status);
CREATE INDEX IF NOT EXISTS idx_manuscripts_created_by ON manuscripts(created_by);
CREATE INDEX IF NOT EXISTS idx_manuscript_authors_manuscript ON manuscript_authors(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_authors_user ON manuscript_authors(user_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_sections_manuscript ON manuscript_sections(manuscript_id, order_index);
CREATE INDEX IF NOT EXISTS idx_manuscript_citations_manuscript ON manuscript_citations(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_citations_paper ON manuscript_citations(paper_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_manuscript ON review_assignments(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_reviewer ON review_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_manuscript ON review_comments(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_section ON review_comments(section_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_status ON review_comments(status);
CREATE INDEX IF NOT EXISTS idx_manuscript_versions_manuscript ON manuscript_versions(manuscript_id, version_number);
CREATE INDEX IF NOT EXISTS idx_manuscript_revision_logs_manuscript ON manuscript_revision_logs(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_checklist_manuscript ON manuscript_checklist_items(manuscript_id, order_index);

-- 12. Enable Row Level Security (RLS)
ALTER TABLE manuscripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscript_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscript_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscript_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscript_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscript_revision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscript_checklist_items ENABLE ROW LEVEL SECURITY;

-- 13. RLS Read Policies for Authenticated Users
-- A user can view manuscripts if they are:
-- (a) A member/owner of the underlying project
-- (b) Or an assigned reviewer in review_assignments
CREATE POLICY "Users can view manuscripts for accessible projects or assignments"
  ON manuscripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = manuscripts.project_id
      AND (p.owner_id = auth.uid() OR pm.user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM review_assignments ra
      WHERE ra.manuscript_id = manuscripts.id
      AND ra.reviewer_id = auth.uid()
    )
  );

CREATE POLICY "Users can view sections of accessible manuscripts"
  ON manuscript_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM manuscripts m
      WHERE m.id = manuscript_sections.manuscript_id
      AND (
        EXISTS (
          SELECT 1 FROM projects p
          LEFT JOIN project_members pm ON pm.project_id = p.id
          WHERE p.id = m.project_id
          AND (p.owner_id = auth.uid() OR pm.user_id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM review_assignments ra
          WHERE ra.manuscript_id = m.id
          AND ra.reviewer_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can view authors of accessible manuscripts"
  ON manuscript_authors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM manuscripts m
      WHERE m.id = manuscript_authors.manuscript_id
    )
  );

CREATE POLICY "Users can view citations of accessible manuscripts"
  ON manuscript_citations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM manuscripts m
      WHERE m.id = manuscript_citations.manuscript_id
    )
  );

CREATE POLICY "Users can view review assignments of accessible manuscripts"
  ON review_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM manuscripts m
      WHERE m.id = review_assignments.manuscript_id
    )
  );

CREATE POLICY "Users can view comments of accessible manuscripts"
  ON review_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM manuscripts m
      WHERE m.id = review_comments.manuscript_id
    )
  );

CREATE POLICY "Users can view versions of accessible manuscripts"
  ON manuscript_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM manuscripts m
      WHERE m.id = manuscript_versions.manuscript_id
    )
  );

CREATE POLICY "Users can view revision logs of accessible manuscripts"
  ON manuscript_revision_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM manuscripts m
      WHERE m.id = manuscript_revision_logs.manuscript_id
    )
  );

CREATE POLICY "Users can view checklist items of accessible manuscripts"
  ON manuscript_checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM manuscripts m
      WHERE m.id = manuscript_checklist_items.manuscript_id
    )
  );
