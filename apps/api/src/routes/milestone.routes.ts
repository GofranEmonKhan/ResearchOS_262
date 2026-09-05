import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireProjectMember } from '../middleware/workspaceGuards.js';
import {
  listProjectMilestones,
  createMilestone,
  updateMilestone,
  lockMilestone,
  approveMilestoneProposal,
  deleteMilestone,
} from '../services/milestone.service.js';
import { CreateMilestoneDto, UpdateMilestoneDto } from '@researchos/shared-types';

const router: Router = Router();

/**
 * GET /projects/:projectId/milestones
 * List all milestones for a project.
 */
router.get(
  '/projects/:projectId/milestones',
  authenticate,
  requireProjectMember('projectId'),
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const milestones = await listProjectMilestones(req.params.projectId);
      return res.json(milestones);
    } catch (err: any) {
      console.error('Error listing milestones:', err);
      return res.status(500).json({ error: err.message || 'Failed to list milestones' });
    }
  }
);

/**
 * POST /projects/:projectId/milestones
 * Create milestone (or propose milestone if non-owner in supervised project).
 */
router.post(
  '/projects/:projectId/milestones',
  authenticate,
  requireProjectMember('projectId'),
  async (req: Request<{ projectId: string }, {}, CreateMilestoneDto>, res: Response) => {
    try {
      const { name, targetDate, weightPct } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Milestone name is required' });
      }
      if (!targetDate) {
        return res.status(400).json({ error: 'Target date is required' });
      }

      const milestone = await createMilestone(req.user!.id, req.user!.role, req.params.projectId, {
        name,
        targetDate,
        weightPct,
      });

      return res.status(201).json(milestone);
    } catch (err: any) {
      console.error('Error creating milestone:', err);
      return res.status(500).json({ error: err.message || 'Failed to create milestone' });
    }
  }
);

/**
 * PATCH /milestones/:milestoneId
 * Update milestone details.
 * Project Owner Supervisor only.
 */
router.patch(
  '/milestones/:milestoneId',
  authenticate,
  async (req: Request<{ milestoneId: string }, {}, UpdateMilestoneDto>, res: Response) => {
    try {
      const milestone = await updateMilestone(req.user!.id, req.params.milestoneId, req.body);
      return res.json(milestone);
    } catch (err: any) {
      if (err.message?.includes('Forbidden')) {
        return res.status(403).json({ error: err.message });
      }
      if (err.message?.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      console.error('Error updating milestone:', err);
      return res.status(500).json({ error: err.message || 'Failed to update milestone' });
    }
  }
);

/**
 * POST /milestones/:milestoneId/approve-proposal
 * Approve a proposed milestone.
 * Project Owner Supervisor only.
 */
router.post(
  '/milestones/:milestoneId/approve-proposal',
  authenticate,
  async (req: Request<{ milestoneId: string }>, res: Response) => {
    try {
      const milestone = await approveMilestoneProposal(req.user!.id, req.params.milestoneId);
      return res.json(milestone);
    } catch (err: any) {
      if (err.message?.includes('Forbidden')) {
        return res.status(403).json({ error: err.message });
      }
      console.error('Error approving milestone proposal:', err);
      return res.status(500).json({ error: err.message || 'Failed to approve milestone proposal' });
    }
  }
);

/**
 * POST /milestones/:milestoneId/lock
 * Lock or unlock a milestone.
 * Project Owner Supervisor only.
 */
router.post(
  '/milestones/:milestoneId/lock',
  authenticate,
  async (req: Request<{ milestoneId: string }, {}, { isLocked: boolean }>, res: Response) => {
    try {
      const isLocked = req.body.isLocked !== undefined ? Boolean(req.body.isLocked) : true;
      const milestone = await lockMilestone(req.user!.id, req.params.milestoneId, isLocked);
      return res.json(milestone);
    } catch (err: any) {
      if (err.message?.includes('Forbidden')) {
        return res.status(403).json({ error: err.message });
      }
      console.error('Error locking milestone:', err);
      return res.status(500).json({ error: err.message || 'Failed to lock milestone' });
    }
  }
);

/**
 * DELETE /milestones/:milestoneId
 * Delete a milestone.
 * Project Owner Supervisor only.
 */
router.delete(
  '/milestones/:milestoneId',
  authenticate,
  async (req: Request<{ milestoneId: string }>, res: Response) => {
    try {
      await deleteMilestone(req.user!.id, req.params.milestoneId);
      return res.json({ message: 'Milestone deleted successfully' });
    } catch (err: any) {
      if (err.message?.includes('Forbidden')) {
        return res.status(403).json({ error: err.message });
      }
      console.error('Error deleting milestone:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete milestone' });
    }
  }
);

export default router;
