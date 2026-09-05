import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireProjectMember } from '../middleware/workspaceGuards.js';
import {
  listProjectTasks,
  getTaskById,
  createTask,
  updateTask,
  setTaskStatus,
  submitTask,
  reviewTask,
  approveTaskProposal,
  deleteTask,
  addTaskComment,
  listTaskComments,
} from '../services/task.service.js';
import {
  CreateTaskDto,
  UpdateTaskDto,
  SubmitTaskDto,
  RequestTaskRevisionDto,
  AddTaskCommentDto,
  TaskStatus,
} from '@researchos/shared-types';

const router: Router = Router();

/**
 * GET /projects/:projectId/tasks
 * List all tasks for a project with optional query filters (status, milestoneId, assigneeId, isProposed).
 */
router.get(
  '/projects/:projectId/tasks',
  authenticate,
  requireProjectMember('projectId'),
  async (req: Request<{ projectId: string }, {}, {}, { status?: TaskStatus; milestoneId?: string; assigneeId?: string; isProposed?: string }>, res: Response) => {
    try {
      const isProposed = req.query.isProposed !== undefined ? req.query.isProposed === 'true' : undefined;
      const tasks = await listProjectTasks(req.user!.id, req.user!.role, req.params.projectId, {
        status: req.query.status,
        milestoneId: req.query.milestoneId,
        assigneeId: req.query.assigneeId,
        isProposed,
      });

      return res.json(tasks);
    } catch (err: any) {
      console.error('Error listing tasks:', err);
      return res.status(500).json({ error: err.message || 'Failed to list tasks' });
    }
  }
);

/**
 * POST /projects/:projectId/tasks
 * Create task (or propose task if non-owner in supervised project).
 */
router.post(
  '/projects/:projectId/tasks',
  authenticate,
  requireProjectMember('projectId'),
  async (req: Request<{ projectId: string }, {}, CreateTaskDto>, res: Response) => {
    try {
      const { title, description, assigneeId, milestoneId, dueDate, priority } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Task title is required' });
      }
      if (!dueDate) {
        return res.status(400).json({ error: 'Task due date is required' });
      }

      const task = await createTask(req.user!.id, req.user!.role, req.params.projectId, {
        title,
        description,
        assigneeId,
        milestoneId,
        dueDate,
        priority,
      });

      return res.status(201).json(task);
    } catch (err: any) {
      if (err.message?.includes('locked milestone')) {
        return res.status(400).json({ error: err.message });
      }
      console.error('Error creating task:', err);
      return res.status(500).json({ error: err.message || 'Failed to create task' });
    }
  }
);

/**
 * GET /tasks/:taskId
 * Get single task details.
 */
router.get('/tasks/:taskId', authenticate, async (req: Request<{ taskId: string }>, res: Response) => {
  try {
    const task = await getTaskById(req.params.taskId);
    return res.json(task);
  } catch (err: any) {
    if (err.message === 'Task not found') {
      return res.status(404).json({ error: err.message });
    }
    console.error('Error fetching task:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch task' });
  }
});

/**
 * PATCH /tasks/:taskId
 * Update task metadata.
 */
router.patch('/tasks/:taskId', authenticate, async (req: Request<{ taskId: string }, {}, UpdateTaskDto>, res: Response) => {
  try {
    const task = await updateTask(req.user!.id, req.user!.role, req.params.taskId, req.body);
    return res.json(task);
  } catch (err: any) {
    if (err.message?.includes('locked')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message?.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    console.error('Error updating task:', err);
    return res.status(500).json({ error: err.message || 'Failed to update task' });
  }
});

/**
 * PATCH /tasks/:taskId/status
 * State transition (e.g. ToDo <-> InProgress).
 */
router.patch('/tasks/:taskId/status', authenticate, async (req: Request<{ taskId: string }, {}, { status: TaskStatus }>, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const task = await setTaskStatus(req.user!.id, req.params.taskId, status);
    return res.json(task);
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message?.includes('locked')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error updating task status:', err);
    return res.status(500).json({ error: err.message || 'Failed to update task status' });
  }
});

/**
 * POST /tasks/:taskId/submit
 * Submit task for review (moves to Submitted status).
 */
router.post('/tasks/:taskId/submit', authenticate, async (req: Request<{ taskId: string }, {}, SubmitTaskDto>, res: Response) => {
  try {
    const task = await submitTask(req.user!.id, req.params.taskId, req.body);
    return res.json(task);
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    console.error('Error submitting task:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit task' });
  }
});

/**
 * POST /tasks/:taskId/review
 * Review task (Approve or RequestRevision).
 * Project Owner Supervisor only.
 */
router.post(
  '/tasks/:taskId/review',
  authenticate,
  async (req: Request<{ taskId: string }, {}, { action: 'Approve' | 'RequestRevision'; revisionNote?: string }>, res: Response) => {
    try {
      const { action, revisionNote } = req.body;
      if (!action || !['Approve', 'RequestRevision'].includes(action)) {
        return res.status(400).json({ error: 'Action must be "Approve" or "RequestRevision"' });
      }

      const task = await reviewTask(req.user!.id, req.params.taskId, action, {
        revisionNote: revisionNote || '',
      });

      return res.json(task);
    } catch (err: any) {
      if (err.message?.includes('Forbidden')) {
        return res.status(403).json({ error: err.message });
      }
      if (err.message?.includes('required')) {
        return res.status(400).json({ error: err.message });
      }
      console.error('Error reviewing task:', err);
      return res.status(500).json({ error: err.message || 'Failed to review task' });
    }
  }
);

/**
 * POST /tasks/:taskId/approve-proposal
 * Approve a proposed task.
 * Project Owner Supervisor only.
 */
router.post(
  '/tasks/:taskId/approve-proposal',
  authenticate,
  async (req: Request<{ taskId: string }, {}, { assigneeId?: string }>, res: Response) => {
    try {
      const task = await approveTaskProposal(req.user!.id, req.params.taskId, req.body.assigneeId);
      return res.json(task);
    } catch (err: any) {
      if (err.message?.includes('Forbidden')) {
        return res.status(403).json({ error: err.message });
      }
      console.error('Error approving task proposal:', err);
      return res.status(500).json({ error: err.message || 'Failed to approve task proposal' });
    }
  }
);

/**
 * DELETE /tasks/:taskId
 * Delete a task.
 * Project Owner Supervisor only.
 */
router.delete('/tasks/:taskId', authenticate, async (req: Request<{ taskId: string }>, res: Response) => {
  try {
    await deleteTask(req.user!.id, req.params.taskId);
    return res.json({ message: 'Task deleted successfully' });
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    console.error('Error deleting task:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete task' });
  }
});

/**
 * GET /tasks/:taskId/comments
 * List comments for a task.
 */
router.get('/tasks/:taskId/comments', authenticate, async (req: Request<{ taskId: string }>, res: Response) => {
  try {
    const comments = await listTaskComments(req.params.taskId);
    return res.json(comments);
  } catch (err: any) {
    console.error('Error listing task comments:', err);
    return res.status(500).json({ error: err.message || 'Failed to list task comments' });
  }
});

/**
 * POST /tasks/:taskId/comments
 * Add a comment to a task.
 */
router.post('/tasks/:taskId/comments', authenticate, async (req: Request<{ taskId: string }, {}, AddTaskCommentDto>, res: Response) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Comment body is required' });
    }

    const comment = await addTaskComment(req.user!.id, req.params.taskId, body);
    return res.status(201).json(comment);
  } catch (err: any) {
    console.error('Error adding task comment:', err);
    return res.status(500).json({ error: err.message || 'Failed to add task comment' });
  }
});

export default router;