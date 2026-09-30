import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase.js';

declare global {
  namespace Express {
    interface Request {
      manuscript?: {
        id: string;
        project_id: string;
        title: string;
        abstract?: string | null;
        target_venue?: string | null;
        status: string;
        created_by: string;
        supervisor_id?: string | null;
        [key: string]: any;
      };
      manuscriptAccess?: {
        isAuthor: boolean;
        isSupervisor: boolean;
        isReviewer: boolean;
        isMember: boolean;
      };
    }
  }
}

/**
 * Middleware: requireManuscriptAccess
 * Verifies that the user has legitimate access to view the manuscript:
 * - Admin is rejected with 403 (zero content access to private manuscripts per AGENTS.md / Spec 05)
 * - Project owner (Supervisor) or project member
 * - Declared manuscript author
 * - Assigned reviewer in review_assignments
 */
export function requireManuscriptAccess(paramName: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user?.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied: Admins cannot access manuscript content' });
    }

    const manuscriptId = req.params[paramName] || req.body.manuscriptId;
    if (!manuscriptId) {
      return res.status(400).json({ error: `Missing ${paramName} parameter` });
    }

    try {
      const { data: manuscript, error } = await supabaseAdmin
        .from('manuscripts')
        .select('*')
        .eq('id', manuscriptId)
        .single();

      if (error || !manuscript) {
        return res.status(404).json({ error: 'Manuscript not found' });
      }

      // Check project ownership (Supervisor)
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', manuscript.project_id)
        .single();

      const isSupervisor = project?.owner_id === userId || manuscript.supervisor_id === userId;

      // Check author
      const isCreator = manuscript.created_by === userId;
      const { data: authorRecord } = await supabaseAdmin
        .from('manuscript_authors')
        .select('id')
        .eq('manuscript_id', manuscriptId)
        .eq('user_id', userId)
        .maybeSingle();

      const isAuthor = isCreator || !!authorRecord;

      // Check project member
      const { data: memberRecord } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('project_id', manuscript.project_id)
        .eq('user_id', userId)
        .maybeSingle();

      const isMember = !!memberRecord;

      // Check reviewer assignment
      const { data: reviewRecord } = await supabaseAdmin
        .from('review_assignments')
        .select('id')
        .eq('manuscript_id', manuscriptId)
        .eq('reviewer_id', userId)
        .maybeSingle();

      const isReviewer = !!reviewRecord;

      if (!isSupervisor && !isAuthor && !isMember && !isReviewer) {
        return res.status(403).json({ error: 'Access denied: You are not authorized to view this manuscript' });
      }

      req.manuscript = manuscript;
      req.manuscriptAccess = {
        isAuthor,
        isSupervisor,
        isReviewer,
        isMember,
      };

      return next();
    } catch (err: any) {
      console.error('Error in requireManuscriptAccess guard:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

/**
 * Middleware: requireManuscriptAuthorOrSupervisor
 * Ensures the acting user is a declared author or the project supervisor.
 * Plain members and reviewers are forbidden from modifying manuscript text.
 */
export function requireManuscriptAuthorOrSupervisor(paramName: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user?.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied: Admins cannot modify manuscript content' });
    }

    const manuscriptId = req.params[paramName] || req.body.manuscriptId;
    if (!manuscriptId) {
      return res.status(400).json({ error: `Missing ${paramName} parameter` });
    }

    try {
      const { data: manuscript, error } = await supabaseAdmin
        .from('manuscripts')
        .select('*')
        .eq('id', manuscriptId)
        .single();

      if (error || !manuscript) {
        return res.status(404).json({ error: 'Manuscript not found' });
      }

      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', manuscript.project_id)
        .single();

      const isSupervisor = project?.owner_id === userId || manuscript.supervisor_id === userId;
      const isCreator = manuscript.created_by === userId;

      const { data: authorRecord } = await supabaseAdmin
        .from('manuscript_authors')
        .select('id')
        .eq('manuscript_id', manuscriptId)
        .eq('user_id', userId)
        .maybeSingle();

      const isAuthor = isCreator || !!authorRecord;

      if (!isSupervisor && !isAuthor) {
        return res.status(403).json({
          error: 'Access denied: Only manuscript authors and supervisors can modify manuscript content',
        });
      }

      req.manuscript = manuscript;
      req.manuscriptAccess = {
        isAuthor,
        isSupervisor,
        isReviewer: false,
        isMember: true,
      };

      return next();
    } catch (err: any) {
      console.error('Error in requireManuscriptAuthorOrSupervisor guard:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

/**
 * Middleware: requireManuscriptSupervisor
 * Ensures the acting user is the supervisor/owner of the project.
 */
export function requireManuscriptSupervisor(paramName: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user?.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied: Admins cannot act as supervisor' });
    }

    const manuscriptId = req.params[paramName] || req.body.manuscriptId;
    if (!manuscriptId) {
      return res.status(400).json({ error: `Missing ${paramName} parameter` });
    }

    try {
      const { data: manuscript, error } = await supabaseAdmin
        .from('manuscripts')
        .select('*')
        .eq('id', manuscriptId)
        .single();

      if (error || !manuscript) {
        return res.status(404).json({ error: 'Manuscript not found' });
      }

      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', manuscript.project_id)
        .single();

      const isSupervisor = project?.owner_id === userId || manuscript.supervisor_id === userId;

      if (!isSupervisor) {
        return res.status(403).json({
          error: 'Access denied: Only the project supervisor can perform this action',
        });
      }

      req.manuscript = manuscript;
      return next();
    } catch (err: any) {
      console.error('Error in requireManuscriptSupervisor guard:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

/**
 * Middleware: requireManuscriptReviewerOrAuthorOrSupervisor
 * Ensures the user has permissions to participate in peer review comments.
 */
export function requireManuscriptReviewerOrAuthorOrSupervisor(paramName: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user?.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied: Admins cannot comment on manuscripts' });
    }

    const manuscriptId = req.params[paramName] || req.body.manuscriptId;
    if (!manuscriptId) {
      return res.status(400).json({ error: `Missing ${paramName} parameter` });
    }

    try {
      const { data: manuscript, error } = await supabaseAdmin
        .from('manuscripts')
        .select('*')
        .eq('id', manuscriptId)
        .single();

      if (error || !manuscript) {
        return res.status(404).json({ error: 'Manuscript not found' });
      }

      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', manuscript.project_id)
        .single();

      const isSupervisor = project?.owner_id === userId || manuscript.supervisor_id === userId;
      const isCreator = manuscript.created_by === userId;

      const { data: authorRecord } = await supabaseAdmin
        .from('manuscript_authors')
        .select('id')
        .eq('manuscript_id', manuscriptId)
        .eq('user_id', userId)
        .maybeSingle();

      const isAuthor = isCreator || !!authorRecord;

      const { data: reviewRecord } = await supabaseAdmin
        .from('review_assignments')
        .select('id')
        .eq('manuscript_id', manuscriptId)
        .eq('reviewer_id', userId)
        .maybeSingle();

      const isReviewer = !!reviewRecord;

      if (!isSupervisor && !isAuthor && !isReviewer) {
        return res.status(403).json({
          error: 'Access denied: You are not an assigned reviewer, author, or supervisor on this manuscript',
        });
      }

      req.manuscript = manuscript;
      req.manuscriptAccess = {
        isAuthor,
        isSupervisor,
        isReviewer,
        isMember: true,
      };

      return next();
    } catch (err: any) {
      console.error('Error in requireManuscriptReviewerOrAuthorOrSupervisor guard:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
