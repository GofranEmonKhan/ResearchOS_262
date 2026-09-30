import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase.js';

declare global {
  namespace Express {
    interface Request {
      experiment?: {
        id: string;
        project_id: string;
        owner_id: string;
        name: string;
        status: string;
        [key: string]: any;
      };
    }
  }
}

/**
 * Middleware: requireExperimentViewer
 * Verifies that the authenticated user is authorized to inspect the experiment:
 * 1. Authenticated user identity
 * 2. Admin role is rejected with 403 (Admin cannot view experiment content per AC-18)
 * 3. Experiment owner is always allowed
 * 4. Project owner (Supervisor) or project member is allowed
 * 5. All other users receive 403 Forbidden
 */
export function requireExperimentViewer(paramName: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Spec 04 & AC-18: Admin role is forbidden from accessing experimental data payloads
    if (req.user?.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied: Admins cannot access experiment content (AC-18 Privacy Rule)' });
    }

    const experimentId = req.params[paramName] || req.body.experimentId;
    if (!experimentId) {
      return res.status(400).json({ error: `Missing ${paramName} parameter` });
    }

    try {
      const { data: experiment, error } = await supabaseAdmin
        .from('experiments')
        .select('*')
        .eq('id', experimentId)
        .single();

      if (error || !experiment) {
        return res.status(404).json({ error: 'Experiment not found' });
      }

      // 1. Direct owner access
      if (experiment.owner_id === userId) {
        req.experiment = experiment;
        return next();
      }

      // 2. Project Owner access (Supervisor)
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', experiment.project_id)
        .single();

      if (project?.owner_id === userId) {
        req.experiment = experiment;
        return next();
      }

      // 3. Project Member access
      const { data: member } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('project_id', experiment.project_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (member) {
        req.experiment = experiment;
        return next();
      }

      // Unauthorized
      return res.status(403).json({
        error: 'Access denied: You do not have permission to view this experiment',
      });
    } catch (err: any) {
      console.error('Error in requireExperimentViewer guard:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

/**
 * Middleware: requireExperimentOwner
 * Ensures that the acting user is the researcher who created the experiment.
 */
export function requireExperimentOwner(paramName: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user?.role === 'Admin') {
      return res.status(403).json({ error: 'Access denied: Admins cannot modify experiments' });
    }

    try {
      let experiment = req.experiment;
      if (!experiment) {
        const experimentId = req.params[paramName] || req.body.experimentId;
        if (!experimentId) {
          return res.status(400).json({ error: `Missing ${paramName} parameter` });
        }

        const { data, error } = await supabaseAdmin
          .from('experiments')
          .select('*')
          .eq('id', experimentId)
          .single();

        if (error || !data) {
          return res.status(404).json({ error: 'Experiment not found' });
        }
        experiment = data;
        req.experiment = data;
      }

      if (!experiment) {
        return res.status(404).json({ error: 'Experiment not found' });
      }

      if (experiment.owner_id !== userId) {
        return res.status(403).json({
          error: 'Access denied: Only the researcher who created this experiment can modify it',
        });
      }

      return next();
    } catch (err: any) {
      console.error('Error in requireExperimentOwner guard:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

/**
 * Middleware: requireDraftExperiment
 * Ensures that the experiment is in 'Draft' status.
 * Rejects modifications or deletion on 'Final' experiments with 409 Conflict.
 */
export function requireDraftExperiment() {
  return (req: Request, res: Response, next: NextFunction) => {
    const experiment = req.experiment;
    if (!experiment) {
      return res.status(500).json({ error: 'Experiment context missing in guard' });
    }

    if (experiment.status === 'Final') {
      return res.status(409).json({
        error: 'Finalized experiments are permanently locked and cannot be modified or deleted (Scientific Integrity Rule)',
      });
    }

    return next();
  };
}

/**
 * Middleware: requireSupervisorForExperimentFlag
 * Verifies that the user is a supervisor (Project Owner or CoSupervisor) of the project containing the experiment.
 */
export function requireSupervisorForExperimentFlag(paramName: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user?.role !== 'Supervisor') {
      return res.status(403).json({
        error: 'Access denied: Only supervisors can create reproducibility flags',
      });
    }

    try {
      let experiment = req.experiment;
      if (!experiment) {
        const experimentId = req.params[paramName] || req.body.experimentId;
        if (!experimentId) {
          return res.status(400).json({ error: `Missing ${paramName} parameter` });
        }

        const { data, error } = await supabaseAdmin
          .from('experiments')
          .select('*')
          .eq('id', experimentId)
          .single();

        if (error || !data) {
          return res.status(404).json({ error: 'Experiment not found' });
        }
        experiment = data;
        req.experiment = data;
      }

      if (!experiment) {
        return res.status(404).json({ error: 'Experiment not found' });
      }

      // Check if user is Project Owner Supervisor
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', experiment.project_id)
        .single();

      if (project?.owner_id === userId) {
        return next();
      }

      // Check if user is CoSupervisor member
      const { data: member } = await supabaseAdmin
        .from('project_members')
        .select('id, project_role')
        .eq('project_id', experiment.project_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (member && member.project_role === 'CoSupervisor') {
        return next();
      }

      return res.status(403).json({
        error: 'Access denied: You must be a supervisor of this project to flag experiments',
      });
    } catch (err: any) {
      console.error('Error in requireSupervisorForExperimentFlag guard:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
