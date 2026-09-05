import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationsCount,
} from '../../../../../aps/api/src/services/notification.service.js';

const router: Router = Router();

/**
 * GET /notifications
 * List notifications for the authenticated user.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const notifications = await listUserNotifications(req.user!.id);
    return res.json(notifications);
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
});

/**
 * GET /notifications/unread-count
 * Get unread notification badge count.
 */
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const count = await getUnreadNotificationsCount(req.user!.id);
    return res.json({ count });
  } catch (err: any) {
    console.error('Error fetching unread notification count:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch unread count' });
  }
});

/**
 * PATCH /notifications/:id/read
 * Mark single notification as read.
 */
router.patch('/:id/read', authenticate, async (req: Request<{ id: string }>, res: Response) => {
  try {
    await markNotificationAsRead(req.user!.id, req.params.id);
    return res.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ error: err.message || 'Failed to mark notification as read' });
  }
});

/**
 * POST /notifications/read-all
 * Mark all notifications as read for current user.
 */
router.post('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    await markAllNotificationsAsRead(req.user!.id);
    return res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    console.error('Error marking all notifications as read:', err);
    return res.status(500).json({ error: err.message || 'Failed to mark all notifications as read' });
  }
});

export default router;
