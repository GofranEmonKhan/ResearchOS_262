import { supabaseAdmin } from '../supabase.js';
import { DirectMessage, DirectMessageThread, UserBlock, SendDirectMessageDto, UserRole } from '@researchos/shared-types';
import { CommunityError } from './communityProfile.service.js';
import { createAuditLog } from './audit.service.js';
import { createNotification } from './notification.service.js';

/**
 * Lists all direct message conversation threads for a user.
 */
export async function listThreads(userId: string): Promise<DirectMessageThread[]> {
  // 1. Fetch all messages involving the user
  const { data: messages, error } = await supabaseAdmin
    .from('direct_messages')
    .select('*, sender:profiles!sender_id(*), recipient:profiles!recipient_id(*)')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error || !messages) return [];

  // 2. Fetch user's block list and blocks targeting user
  const [{ data: blockedByMe }, { data: blockedMe }] = await Promise.all([
    supabaseAdmin.from('user_blocks').select('blocked_id').eq('blocker_id', userId),
    supabaseAdmin.from('user_blocks').select('blocker_id').eq('blocked_id', userId),
  ]);

  const blockedByMeSet = new Set((blockedByMe || []).map((b) => b.blocked_id));
  const blockedMeSet = new Set((blockedMe || []).map((b) => b.blocker_id));

  // 3. Group by partner
  const threadMap = new Map<string, { partner: any; lastMessage: DirectMessage; unreadCount: number }>();

  for (const m of messages) {
    const isSender = m.sender_id === userId;
    const partnerId = isSender ? m.recipient_id : m.sender_id;
    const partnerProfile = isSender ? m.recipient : m.sender;

    const formattedMsg: DirectMessage = {
      id: m.id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      body: m.body,
      isRead: m.is_read,
      createdAt: m.created_at,
    };

    if (!threadMap.has(partnerId)) {
      threadMap.set(partnerId, {
        partner: partnerProfile,
        lastMessage: formattedMsg,
        unreadCount: !isSender && !m.is_read ? 1 : 0,
      });
    } else {
      const thread = threadMap.get(partnerId)!;
      if (!isSender && !m.is_read) {
        thread.unreadCount++;
      }
    }
  }

  const threads: DirectMessageThread[] = [];
  for (const [partnerId, data] of threadMap.entries()) {
    const p = data.partner || {};
    threads.push({
      partnerId,
      partner: {
        id: partnerId,
        fullName: p.full_name || 'Scholar',
        photoUrl: p.photo_url || null,
        role: p.role as UserRole,
        institution: p.institution || '',
        reputationPoints: p.reputation_points ?? 0,
        isFacultyVerified: p.role === 'Supervisor' && p.status === 'Active',
      },
      lastMessage: data.lastMessage,
      unreadCount: data.unreadCount,
      isBlocked: blockedByMeSet.has(partnerId),
      hasBlockedYou: blockedMeSet.has(partnerId),
    });
  }

  return threads;
}

/**
 * Retrieves conversation messages between current user and partner.
 * Automatically marks unread incoming messages as read.
 */
export async function getConversation(
  userId: string,
  partnerId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: DirectMessage[]; total: number; isBlocked: boolean; hasBlockedYou: boolean }> {
  // 1. Check blocks
  const [{ data: blockedByMe }, { data: blockedMe }] = await Promise.all([
    supabaseAdmin.from('user_blocks').select('blocked_id').eq('blocker_id', userId).eq('blocked_id', partnerId).maybeSingle(),
    supabaseAdmin.from('user_blocks').select('blocker_id').eq('blocker_id', partnerId).eq('blocked_id', userId).maybeSingle(),
  ]);

  const isBlocked = !!blockedByMe;
  const hasBlockedYou = !!blockedMe;

  // 2. Fetch paginated messages between the two users
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: rows, error, count } = await supabaseAdmin
    .from('direct_messages')
    .select('*, sender:profiles!sender_id(id, full_name, photo_url, role), recipient:profiles!recipient_id(id, full_name, photo_url, role)', { count: 'exact' })
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true })
    .range(from, to);

  if (error || !rows) return { messages: [], total: 0, isBlocked, hasBlockedYou };

  // 3. Mark incoming unread messages as read
  await supabaseAdmin
    .from('direct_messages')
    .update({ is_read: true })
    .eq('sender_id', partnerId)
    .eq('recipient_id', userId)
    .eq('is_read', false);

  const messages: DirectMessage[] = rows.map((m: any) => ({
    id: m.id,
    senderId: m.sender_id,
    recipientId: m.recipient_id,
    body: m.body,
    isRead: m.is_read,
    createdAt: m.created_at,
    sender: m.sender
      ? {
          id: m.sender.id,
          fullName: m.sender.full_name,
          photoUrl: m.sender.photo_url,
          role: m.sender.role as UserRole,
        }
      : undefined,
    recipient: m.recipient
      ? {
          id: m.recipient.id,
          fullName: m.recipient.full_name,
          photoUrl: m.recipient.photo_url,
          role: m.recipient.role as UserRole,
        }
      : undefined,
  }));

  return { messages, total: count ?? messages.length, isBlocked, hasBlockedYou };
}

/**
 * Sends a direct message to another user.
 */
export async function sendMessage(
  senderId: string,
  recipientIdOrDto: string | SendDirectMessageDto,
  bodyText?: string,
  attachmentIds?: string[]
): Promise<DirectMessage> {
  const recipientId = typeof recipientIdOrDto === 'string' ? recipientIdOrDto : recipientIdOrDto.recipientId;
  const rawBody = typeof recipientIdOrDto === 'string' ? bodyText : recipientIdOrDto.body;
  const trimmed = rawBody?.trim();

  if (!recipientId) throw new CommunityError('Recipient ID is required', 400);
  if (!trimmed) throw new CommunityError('Message body cannot be empty', 400);
  if (senderId === recipientId) throw new CommunityError('You cannot send a direct message to yourself', 400);


  // 1. Verify recipient exists and is active
  const { data: recipient, error: recipientError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, status')
    .eq('id', recipientId)
    .single();

  if (recipientError || !recipient) {
    throw new CommunityError('Recipient not found', 404);
  }

  if (recipient.status === 'Suspended') {
    throw new CommunityError('Cannot message a suspended account', 400);
  }

  // 2. Check if recipient has blocked sender
  const { data: block } = await supabaseAdmin
    .from('user_blocks')
    .select('*')
    .eq('blocker_id', recipientId)
    .eq('blocked_id', senderId)
    .maybeSingle();

  if (block) {
    throw new CommunityError('Access denied: Cannot send message to this user (Blocked)', 403);
  }

  // 3. Insert direct message
  const { data: newRow, error: insertError } = await supabaseAdmin
    .from('direct_messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      body: trimmed,
      is_read: false,
    })
    .select('*, sender:profiles!sender_id(id, full_name, photo_url, role), recipient:profiles!recipient_id(id, full_name, photo_url, role)')
    .single();

  if (insertError || !newRow) {
    throw new CommunityError(insertError?.message || 'Failed to send message', 500);
  }

  // 4. Send notification to recipient
  try {
    const { data: senderProf } = await supabaseAdmin.from('profiles').select('full_name').eq('id', senderId).single();
    await createNotification({
      userId: recipientId,
      type: 'DirectMessageReceived',
      payload: {
        senderId,
        senderName: senderProf?.full_name || 'A scholar',
        snippet: trimmed.slice(0, 80),
        messageId: newRow.id,
      },
    });
  } catch (err) {
    console.error('Failed to dispatch DM notification:', err);
  }

  return {
    id: newRow.id,
    senderId: newRow.sender_id,
    recipientId: newRow.recipient_id,
    body: newRow.body,
    isRead: newRow.is_read,
    createdAt: newRow.created_at,
    sender: newRow.sender
      ? {
          id: newRow.sender.id,
          fullName: newRow.sender.full_name,
          photoUrl: newRow.sender.photo_url,
          role: newRow.sender.role as UserRole,
        }
      : undefined,
    recipient: newRow.recipient
      ? {
          id: newRow.recipient.id,
          fullName: newRow.recipient.full_name,
          photoUrl: newRow.recipient.photo_url,
          role: newRow.recipient.role as UserRole,
        }
      : undefined,
  };
}

/**
 * Blocks a user from sending direct messages.
 */
export async function blockUser(blockerId: string, targetUserId: string): Promise<UserBlock> {
  if (blockerId === targetUserId) {
    throw new CommunityError('You cannot block yourself', 400);
  }

  const { data: targetUser } = await supabaseAdmin.from('profiles').select('id').eq('id', targetUserId).single();
  if (!targetUser) throw new CommunityError('Target user not found', 404);

  const { data, error } = await supabaseAdmin
    .from('user_blocks')
    .upsert({ blocker_id: blockerId, blocked_id: targetUserId }, { onConflict: 'blocker_id,blocked_id' })
    .select('*, blockedUser:profiles!blocked_id(id, full_name, photo_url, role)')
    .single();

  if (error || !data) {
    throw new CommunityError(error?.message || 'Failed to block user', 500);
  }

  await createAuditLog({
    actorId: blockerId,
    action: 'block_user',
    targetType: 'user_block',
    targetId: targetUserId,
  });

  return {
    blockerId: data.blocker_id,
    blockedId: data.blocked_id,
    createdAt: data.created_at,
    blockedUser: data.blockedUser
      ? {
          id: data.blockedUser.id,
          fullName: data.blockedUser.full_name,
          photoUrl: data.blockedUser.photo_url,
          role: data.blockedUser.role as UserRole,
        }
      : undefined,
  };
}

/**
 * Unblocks a user.
 */
export async function unblockUser(blockerId: string, targetUserId: string): Promise<void> {
  await supabaseAdmin
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', targetUserId);

  await createAuditLog({
    actorId: blockerId,
    action: 'unblock_user',
    targetType: 'user_block',
    targetId: targetUserId,
  });
}

/**
 * Lists all users blocked by the caller.
 */
export async function listBlockedUsers(userId: string): Promise<UserBlock[]> {
  const { data, error } = await supabaseAdmin
    .from('user_blocks')
    .select('*, blockedUser:profiles!blocked_id(id, full_name, photo_url, role)')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((b: any) => ({
    blockerId: b.blocker_id,
    blockedId: b.blocked_id,
    createdAt: b.created_at,
    blockedUser: b.blockedUser
      ? {
          id: b.blockedUser.id,
          fullName: b.blockedUser.full_name,
          photoUrl: b.blockedUser.photo_url,
          role: b.blockedUser.role as UserRole,
        }
      : undefined,
  }));
}

export class DirectMessageService {
  static listThreads = listThreads;
  static getConversation = getConversation;
  static sendMessage = sendMessage;
  static blockUser = blockUser;
  static unblockUser = unblockUser;
  static listBlockedUsers = listBlockedUsers;
}

