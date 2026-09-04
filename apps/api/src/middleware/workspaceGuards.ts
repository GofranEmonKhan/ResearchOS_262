import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase.js';

export interface ProjectAccessContext {
  id: string;
  ownerId: string;
  isPersonal: boolean;
  userProjectRole: 'Owner' | 'CoSupervisor' | 'Member';
}

declare global {
  namespace Express {
    interface Request {
      projectAccess?: ProjectAccessContext;
    }
  }
}

/**
 * Middleware: requireProjectMember
 * Verifies that the authenticated user is either the project owner OR a registered project member.
 * Attaches req.projectAccess for downstream handlers.
 */
export function requireProjectMember(paramName: string = 'projectId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const projectId = req.params[paramName] || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({ error: `Missing ${paramName} parameter` });
    }

    try {
      // 1. Fetch project owner & personal flag
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id, owner_id, is_personal')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user is the direct Project Owner
      if (project.owner_id === userId) {
        req.projectAccess = {
          id: project.id,
          ownerId: project.owner_id,
          isPersonal: project.is_personal,
          userProjectRole: 'Owner',
        };
        return next();
      }

      // 2. Check if user is in project_members
      const { data: member, error: memberError } = await supabaseAdmin
        .from('project_members')
        .select('project_role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle();

      if (memberError || !member) {
        return res.status(403).json({ error: 'Forbidden: You are not a member of this project' });
      }

      req.projectAccess = {
        id: project.id,
        ownerId: project.owner_id,
        isPersonal: project.is_personal,
        userProjectRole: member.project_role === 'CoSupervisor' ? 'CoSupervisor' : 'Member',
      };

      return next();
    } catch (err) {
      console.error('Error verifying project membership:', err);
      return res.status(500).json({ error: 'Failed to verify project access permissions' });
    }
  };
}

/**
 * Middleware: requireProjectOwnerSupervisor
 * Verifies that the authenticated user is the exclusive Project Owner Supervisor (or personal creator).
 * Enforces that CoSupervisors do NOT have Module 02 governance powers.
 */
export function requireProjectOwnerSupervisor(paramName: string = 'projectId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const projectId = req.params[paramName] || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({ error: `Missing ${paramName} parameter` });
    }

    try {
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id, owner_id, is_personal')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.owner_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden: Only the Project Owner Supervisor holds governance authority for this project',
        });
      }

      req.projectAccess = {
        id: project.id,
        ownerId: project.owner_id,
        isPersonal: project.is_personal,
        userProjectRole: 'Owner',
      };

      return next();
    } catch (err) {
      console.error('Error verifying project owner governance:', err);
      return res.status(500).json({ error: 'Failed to verify project owner governance' });
    }
  };
}
