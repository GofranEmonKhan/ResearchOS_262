import { Router, Request, Response } from 'express';
import { authenticate, requireStatus } from '../middleware/auth.js';
import { DirectMessageService } from '../services/directMessage.service.js';

export const directMessageRouter: Router = Router();

// All DM routes require active authenticated user
directMessageRouter.use(authenticate);
directMessageRouter.use(requireStatus('Active'));

/**
 * GET /messages or GET /messages/threads
 * List all conversation threads with latest messages and unread counts
 */
const handleListThreads = async (req: Request, res: Response) => {
  try {
    const threads = await DirectMessageService.listThreads(req.userId!);
    return res.json({ threads });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
};

directMessageRouter.get('/', handleListThreads);
directMessageRouter.get('/threads', handleListThreads);

/**
 * GET /messages/blocks
 * List all users blocked by the current user
 */
directMessageRouter.get('/blocks', async (req: Request, res: Response) => {
  try {
    const blocked = await DirectMessageService.listBlockedUsers(req.userId!);
    return res.json({ blockedUsers: blocked });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /messages/block or POST /messages/blocks
 * Block user with body { targetUserId }
 */
directMessageRouter.post('/block', async (req: Request, res: Response) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }
    await DirectMessageService.blockUser(req.userId!, targetUserId);
    return res.json({ success: true, message: 'User blocked successfully' });
  } catch (err: any) {
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message });
  }
});

directMessageRouter.post('/block/:targetUserId', async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.targetUserId as string;
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }
    await DirectMessageService.blockUser(req.userId!, targetUserId);
    return res.json({ success: true, message: 'User blocked successfully' });
  } catch (err: any) {
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message });
  }
});

directMessageRouter.post('/blocks/:targetUserId', async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.targetUserId as string;
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }
    await DirectMessageService.blockUser(req.userId!, targetUserId);
    return res.json({ success: true, message: 'User blocked successfully' });
  } catch (err: any) {
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * DELETE /messages/block/:targetUserId or /messages/blocks/:targetUserId
 * Unblock a user
 */
const handleUnblock = async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.targetUserId as string;
    await DirectMessageService.unblockUser(req.userId!, targetUserId);
    return res.json({ success: true, message: 'User unblocked successfully' });
  } catch (err: any) {
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message });
  }
};

directMessageRouter.delete('/block/:targetUserId', handleUnblock);
directMessageRouter.delete('/blocks/:targetUserId', handleUnblock);

/**
 * POST /messages or POST /messages/send
 * Send a direct message to another user
 */
const handleSendMessage = async (req: Request, res: Response) => {
  try {
    const { recipientId, body, attachmentIds } = req.body;

    if (!recipientId || typeof recipientId !== 'string') {
      return res.status(400).json({ error: 'recipientId is required' });
    }

    if (!body || typeof body !== 'string' || body.trim().length < 1) {
      return res.status(400).json({ error: 'Message body cannot be empty' });
    }

    const message = await DirectMessageService.sendMessage(
      req.userId!,
      recipientId,
      body,
      Array.isArray(attachmentIds) ? attachmentIds : []
    );

    return res.status(201).json(message);
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('denied') || err.message?.includes('Blocked') ? 403 : 400);
    return res.status(status).json({ error: err.message });
  }
};

directMessageRouter.post('/', handleSendMessage);
directMessageRouter.post('/send', handleSendMessage);

/**
 * GET /messages/:partnerId or GET /messages/threads/:partnerId
 * Get chronological conversation history with a specific user
 */
const handleGetConversation = async (req: Request, res: Response) => {
  try {
    const partnerId = req.params.partnerId as string;
    const { page = '1', limit = '50' } = req.query as any;

    const result = await DirectMessageService.getConversation(
      req.userId!,
      partnerId,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 50
    );

    // Return array of messages (and result object if desired)
    return res.json(result.messages);
  } catch (err: any) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
};

directMessageRouter.get('/:partnerId', handleGetConversation);
directMessageRouter.get('/threads/:partnerId', handleGetConversation);
