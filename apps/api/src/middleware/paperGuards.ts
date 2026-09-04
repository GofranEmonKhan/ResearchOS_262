import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase.js';

declare global {
  namespace Express {
    interface Request {
      paper?: {
        id: string;
        uploader_id: string;
        project_id?: string | null;
        file_asset_id: string;
        [key: string]: any;
      };
    }
  }
}

/**
 * Middleware: requirePaperViewer
 * Verifies that the authenticated user is authorized to view the paper:
 * 1. Authenticated user identity
 * 2. Admin role is rejected with 403 (Admin cannot view paper content per AC-18)
 * 3. Uploader is always allowed
 * 4. Project member is allowed if paper is shared with a project
 * 5. All other users receive 403 Forbidden
 */
export function requirePaperViewer(paramName: string = 'paperId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Spec 03 & AC-18: Admin role is forbidden from accessing research paper content
    if (req.user?.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied: Admins cannot access paper content' });
    }

    const paperId = req.params[paramName] || req.body.paperId;
    if (!paperId) {
      return res.status(400).json({ error: `Missing ${paramName} parameter` });
    }

    try {
      const { data: paper, error } = await supabaseAdmin
        .from('papers')
        .select('*')
        .eq('id', paperId)
        .single();

      if (error || !paper) {
        return res.status(404).json({ error: 'Paper not found' });
      }

      // 1. Direct uploader access
      if (paper.uploader_id === userId) {
        req.paper = paper;
        return next();
      }

      // 2. Project membership access (if shared)
      if (paper.project_id) {
        const { data: project } = await supabaseAdmin
          .from('projects')
          .select('owner_id')
          .eq('id', paper.project_id)
          .single();

        if (project?.owner_id === userId) {
          req.paper = paper;
          return next();
        }

        const { data: member } = await supabaseAdmin
          .from('project_members')
          .select('id')
          .eq('project_id', paper.project_id)
          .eq('user_id', userId)
          .maybeSingle();

        if (member) {
          req.paper = paper;
          return next();
        }
      }

      // Not authorized
      return res.status(403).json({
        error: 'Access denied: You do not have permission to access this paper',
      });
    } catch (err: any) {
      console.error('Error in requirePaperViewer guard:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

/**
 * Middleware: requirePaperUploader
 * Ensures that the acting user is the original uploader of the paper.
 */
export function requirePaperUploader(paramName: string = 'paperId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.paper) {
      const paperId = req.params[paramName] || req.body.paperId;
      if (!paperId) {
        return res.status(400).json({ error: `Missing ${paramName} parameter` });
      }

      const { data: paper, error } = await supabaseAdmin
        .from('papers')
        .select('*')
        .eq('id', paperId)
        .single();

      if (error || !paper) {
        return res.status(404).json({ error: 'Paper not found' });
      }
      req.paper = paper;
    }

    const paper = req.paper;
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    if (paper.uploader_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden: Only the paper uploader can perform this action',
      });
    }

    return next();
  };
}

/**
 * Middleware: requirePaperProjectSupervisor
 * Ensures that the acting user is a Supervisor / CoSupervisor in the project associated with the paper.
 */
export function requirePaperProjectSupervisor(paramName: string = 'paperId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.paper) {
      const paperId = req.params[paramName] || req.body.paperId;
      if (!paperId) {
        return res.status(400).json({ error: `Missing ${paramName} parameter` });
      }

      const { data: paper, error } = await supabaseAdmin
        .from('papers')
        .select('*')
        .eq('id', paperId)
        .single();

      if (error || !paper) {
        return res.status(404).json({ error: 'Paper not found' });
      }
      req.paper = paper;
    }

    const paper = req.paper;
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    if (!paper.project_id) {
      return res.status(400).json({
        error: 'Paper is not shared with any project',
      });
    }

    // Check project owner
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', paper.project_id)
      .single();

    if (project?.owner_id === userId) {
      return next();
    }

    // Check CoSupervisor in project_members
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('project_role')
      .eq('project_id', paper.project_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (member?.project_role === 'CoSupervisor') {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden: Supervisor or CoSupervisor authorization required in this project',
    });
  };
}
