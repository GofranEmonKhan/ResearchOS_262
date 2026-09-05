import { supabaseAdmin } from '../supabase.js';
import { Notification, NotificationType, NotificationChannel } from '@researchos/shared-types';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  channel?: NotificationChannel;
}

export function mapDbNotificationToNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    payload: row.payload || {},
    channel: (row.channel as NotificationChannel) || 'InApp',
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

/**
 * Dispatch an in-app (and optional email) notification
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification | null> {
  try {
    const { data: newRow, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        payload: params.payload || {},
        channel: params.channel || 'InApp',
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error || !newRow) {
      console.error('Failed to create notification:', error);
      return null;
    }

    return mapDbNotificationToNotification(newRow);
  } catch (err) {
    console.error('Unexpected error creating notification:', err);
    return null;
  }
}

/**
 * List notifications for the authenticated user
 */
export async function listUserNotifications(userId: string): Promise<Notification[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (rows || []).map(mapDbNotificationToNotification);
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

/**
 * Mark all notifications as read for user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new Error(error.message);
}

/**
 * Get count of unread notifications for user
 */
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

