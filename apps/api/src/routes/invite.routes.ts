import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { acceptInviteCode } from '../services/invite.service.js';

const router: Router = Router();

/**
 * POST /invites/:code/accept
 * Accept an invite join code and become a project Member.
 */
router.post('/:code/accept', authenticate, async (req: Request<{ code: string }>, res: Response) => {
  try {
    const code = req.params.code;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const result = await acceptInviteCode(req.user!.id, code);
    return res.json({
      message: 'Successfully joined project',
      project: result.project,
      memberId: result.memberId,
    });
  } catch (err: any) {
    if (
      err.message?.includes('Invalid invite code') ||
      err.message?.includes('expired') ||
      err.message?.includes('usage limit') ||
      err.message?.includes('revoked')
    ) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message?.includes('already a member')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Error accepting invite:', err);
    return res.status(500).json({ error: err.message || 'Failed to accept invite' });
  }
});

export default router;
