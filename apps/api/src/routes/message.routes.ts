import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireProjectMember } from '../middleware/workspaceGuards.js';
import { sendProjectMessage, listProjectMessages } from '../services/message.service.js';
import { SendProjectMessageDto } from '@researchos/shared-types';

const router: Router = Router();

/**
 * GET /projects/:projectId/messages
 * List chat messages in a project (project members only).
 */
router.get(
  '/projects/:projectId/messages',
  authenticate,
  requireProjectMember('projectId'),
  async (req: Request<{ projectId: string }, {}, {}, { limit?: string }>, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const messages = await listProjectMessages(req.params.projectId, limit);
      return res.json(messages);
    } catch (err: any) {
      console.error('Error listing project messages:', err);
      return res.status(500).json({ error: err.message || 'Failed to list project messages' });
    }
  }
);

/**
 * POST /projects/:projectId/messages
 * Send a chat message in a project (project members only).
 */
router.post(
  '/projects/:projectId/messages',
  authenticate,
  requireProjectMember('projectId'),
  async (req: Request<{ projectId: string }, {}, SendProjectMessageDto>, res: Response) => {
    try {
      const { body } = req.body;
      if (!body || !body.trim()) {
        return res.status(400).json({ error: 'Message body is required' });
      }

      const message = await sendProjectMessage(req.user!.id, req.params.projectId, body);
      return res.status(201).json(message);
    } catch (err: any) {
      console.error('Error sending project message:', err);
      return res.status(500).json({ error: err.message || 'Failed to send project message' });
    }
  }
);

export default router;
