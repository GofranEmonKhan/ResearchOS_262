import { Router, Request, Response } from 'express';
import { authenticate, requireStatus } from '../middleware/auth.js';
import {
  requireExperimentViewer,
  requireExperimentOwner,
  requireDraftExperiment,
  requireSupervisorForExperimentFlag,
} from '../middleware/experimentGuards.js';
import { ExperimentService } from '../services/experiment.service.js';
import { ExperimentFlagService } from '../services/experimentFlag.service.js';
import { ExperimentCommentService } from '../services/experimentComment.service.js';
import { supabaseAdmin } from '../supabase.js';

export const experimentRouter: Router = Router();

// All routes require authentication and active status
experimentRouter.use(authenticate);
experimentRouter.use(requireStatus('Active'));

// ==========================================
// 1. Project Experiments Listing & Creation
// ==========================================

/**
 * GET /projects/:projectId/experiments
 * List experiments for a project with optional filters
 */
experimentRouter.get(
  '/projects/:projectId/experiments',
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.userId!;

      // AC-18: Admin privacy rule
      if (req.user?.role === 'Admin') {
        return res.status(403).json({ error: 'Admins cannot access experimental research data (AC-18 Privacy Rule)' });
      }

      // Verify user has access to this project
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single();

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.owner_id !== userId) {
        const { data: member } = await supabaseAdmin
          .from('project_members')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!member) {
          return res.status(403).json({ error: 'Access denied: You are not a member of this project' });
        }
      }

      const params = {
        purpose: req.query.purpose as any,
        status: req.query.status as any,
        search: req.query.search as string,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await ExperimentService.getProjectExperiments(projectId, params);
      return res.json(result);
    } catch (err: any) {
      console.error('Error listing project experiments:', err);
      return res.status(err.statusCode || 500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * POST /projects/:projectId/experiments
 * Create a new experiment (Researcher only in supervised projects)
 */
experimentRouter.post(
  '/projects/:projectId/experiments',
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.userId!;
      const userRole = req.user!.role;

      // AC-18: Admin privacy rule
      if (userRole === 'Admin') {
        return res.status(403).json({ error: 'Admins cannot create or access experiments' });
      }

      // Verify project membership
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id, is_personal')
        .eq('id', projectId)
        .single();

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const isOwner = project.owner_id === userId;
      if (!isOwner) {
        const { data: member } = await supabaseAdmin
          .from('project_members')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!member) {
          return res.status(403).json({ error: 'Access denied: You must be a project member to create experiments' });
        }
      }

      const experiment = await ExperimentService.createExperiment(
        projectId,
        req.body,
        userId,
        userRole
      );

      return res.status(201).json(experiment);
    } catch (err: any) {
      console.error('Error creating experiment:', err);
      return res.status(err.statusCode || 400).json({ error: err.message || 'Failed to create experiment' });
    }
  }
);

// ==========================================
// 2. Comparison Engine (2 to 5 Experiments)
// ==========================================

/**
 * GET /experiments/compare
 * Compare 2 to 5 experiments side-by-side
 */
experimentRouter.get(
  '/experiments/compare',
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const userRole = req.user!.role;

      // Extract IDs from ?ids=id1,id2 or ?ids[]=id1&ids[]=id2
      let ids: string[] = [];
      if (typeof req.query.ids === 'string') {
        ids = req.query.ids.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (Array.isArray(req.query.ids)) {
        ids = req.query.ids.map(String).filter(Boolean);
      }

      const result = await ExperimentService.compareExperiments(ids, userId, userRole);
      return res.json(result);
    } catch (err: any) {
      console.error('Error in compareExperiments route:', err);
      return res.status(err.statusCode || 400).json({ error: err.message || 'Comparison failed' });
    }
  }
);

// ==========================================
// 3. Single Experiment Operations
// ==========================================

/**
 * GET /experiments/:id
 * Retrieve experiment by ID
 */
experimentRouter.get(
  '/experiments/:id',
  requireExperimentViewer('id'),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const experiment = await ExperimentService.getExperimentById(id);
      return res.json(experiment);
    } catch (err: any) {
      return res.status(404).json({ error: err.message || 'Experiment not found' });
    }
  }
);

/**
 * PATCH /experiments/:id
 * Update draft experiment (Owner only, Draft status only)
 */
experimentRouter.patch(
  '/experiments/:id',
  requireExperimentViewer('id'),
  requireExperimentOwner('id'),
  requireDraftExperiment(),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const updated = await ExperimentService.updateExperiment(id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update experiment' });
    }
  }
);

/**
 * DELETE /experiments/:id
 * Delete draft experiment (Owner only, Draft status only)
 */
experimentRouter.delete(
  '/experiments/:id',
  requireExperimentViewer('id'),
  requireExperimentOwner('id'),
  requireDraftExperiment(),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await ExperimentService.deleteExperiment(id);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.message || 'Failed to delete experiment' });
    }
  }
);

/**
 * POST /experiments/:id/finalize
 * Finalize & permanently lock experiment from modification
 */
experimentRouter.post(
  '/experiments/:id/finalize',
  requireExperimentViewer('id'),
  requireExperimentOwner('id'),
  requireDraftExperiment(),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const finalized = await ExperimentService.finalizeExperiment(id);
      return res.json(finalized);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to finalize experiment' });
    }
  }
);

// ==========================================
// 4. Supervisor Reproducibility Flags
// ==========================================

/**
 * POST /experiments/:id/flags
 * Create a supervisor reproducibility flag (Supervisor only)
 */
experimentRouter.post(
  '/experiments/:id/flags',
  requireExperimentViewer('id'),
  requireSupervisorForExperimentFlag('id'),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const supervisorId = req.userId!;
      const flag = await ExperimentFlagService.createFlag(id, req.body, supervisorId);
      return res.status(201).json(flag);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create flag' });
    }
  }
);

/**
 * GET /experiments/:id/flags
 * List flags for an experiment
 */
experimentRouter.get(
  '/experiments/:id/flags',
  requireExperimentViewer('id'),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const flags = await ExperimentFlagService.getExperimentFlags(id);
      return res.json(flags);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch flags' });
    }
  }
);

/**
 * PATCH /experiments/flags/:flagId/resolve
 * Resolve an experiment flag
 */
experimentRouter.patch(
  '/experiments/flags/:flagId/resolve',
  async (req: Request, res: Response) => {
    try {
      const flagId = req.params.flagId as string;
      const { resolutionNote } = req.body;
      if (!resolutionNote || resolutionNote.trim().length === 0) {
        return res.status(400).json({ error: 'Resolution note is required' });
      }

      const flag = await ExperimentFlagService.resolveFlag(flagId, resolutionNote);
      return res.json(flag);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to resolve flag' });
    }
  }
);

// ==========================================
// 5. Discussion Comments
// ==========================================

/**
 * POST /experiments/:id/comments
 * Post comment on experiment
 */
experimentRouter.post(
  '/experiments/:id/comments',
  requireExperimentViewer('id'),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const authorId = req.userId!;
      const comment = await ExperimentCommentService.addComment(id, req.body, authorId);
      return res.status(201).json(comment);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to add comment' });
    }
  }
);

/**
 * GET /experiments/:id/comments
 * List discussion comments
 */
experimentRouter.get(
  '/experiments/:id/comments',
  requireExperimentViewer('id'),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const comments = await ExperimentCommentService.getComments(id);
      return res.json(comments);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch comments' });
    }
  }
);

// ==========================================
// 6. Task-Experiment Linking
// ==========================================

/**
 * POST /tasks/:taskId/experiments
 * Link experiment to task
 */
experimentRouter.post(
  '/tasks/:taskId/experiments',
  async (req: Request, res: Response) => {
    try {
      const taskId = req.params.taskId as string;
      const { experimentId } = req.body;
      const userId = req.userId!;

      if (!experimentId) {
        return res.status(400).json({ error: 'experimentId is required' });
      }

      await ExperimentService.linkTask(taskId, experimentId, userId);
      return res.status(200).json({ success: true, message: 'Experiment linked to task' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to link task and experiment' });
    }
  }
);

/**
 * DELETE /tasks/:taskId/experiments/:experimentId
 * Unlink experiment from task
 */
experimentRouter.delete(
  '/tasks/:taskId/experiments/:experimentId',
  async (req: Request, res: Response) => {
    try {
      const taskId = req.params.taskId as string;
      const experimentId = req.params.experimentId as string;
      await ExperimentService.unlinkTask(taskId, experimentId);
      return res.status(200).json({ success: true, message: 'Experiment unlinked from task' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to unlink task and experiment' });
    }
  }
);

/**
 * GET /tasks/:taskId/experiments
 * Get all experiments linked to a task
 */
experimentRouter.get(
  '/tasks/:taskId/experiments',
  async (req: Request, res: Response) => {
    try {
      const taskId = req.params.taskId as string;

      const { data: links, error } = await supabaseAdmin
        .from('task_experiment_links')
        .select('experiment_id, experiments(*)')
        .eq('task_id', taskId);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const experiments = (links || []).map((l: any) => l.experiments);
      return res.json(experiments);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch linked experiments' });
    }
  }
);
