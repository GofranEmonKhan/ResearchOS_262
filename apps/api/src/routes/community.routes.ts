import { Router, Request, Response } from 'express';
import { authenticate, requireStatus } from '../middleware/auth.js';
import { CommunityProfileService } from '../services/communityProfile.service.js';

export const communityRouter: Router = Router();

// All community routes require authentication and active status
communityRouter.use(authenticate);
communityRouter.use(requireStatus('Active'));

/**
 * GET /users/:userId/community-profile
 * Fetch public community profile with reputation, faculty badge, and awarded badges
 */
communityRouter.get('/users/:userId/community-profile', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const profile = await CommunityProfileService.getCommunityProfile(userId);

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(profile);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
