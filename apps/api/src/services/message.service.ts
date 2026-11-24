import { supabaseAdmin } from '../supabase.js';
import { ProjectMessage } from '@researchos/shared-types';
import { createAuditLog } from './audit.service.js';
import { mapDbProfileToProfile } from '../middleware/auth.js';

export function mapDbMessageToMessage(row: any): ProjectMessage {
  return {
    id: row.id,
    projectId: row.project_id,
    senderId: row.sender_id,
    body: row.body || '',
    createdAt: row.created_at,
    sender: row.profiles ? mapDbProfileToProfile(row.profiles) : undefined,
  };
}

/**
 * Send a project message (Project Chat)
 * Caller must be a project member or project owner.
 */
export async function sendProjectMessage(
  senderId: string,
  projectId: string,
  body: string
): Promise<ProjectMessage> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Message body cannot be empty');
  }

  const { data: newRow, error } = await supabaseAdmin
    .from('project_messages')
    .insert({
      project_id: projectId,
      sender_id: senderId,
      body: trimmed,
      created_at: new Date().toISOString(),
    })
    .select('*, profiles:sender_id(*)')
    .single();

  if (error || !newRow) {
    throw new Error(error?.message || 'Failed to send project message');
  }

  await createAuditLog({
    actorId: senderId,
    action: 'send_project_message',
    targetType: 'project_message',
    targetId: newRow.id,
    metadata: { projectId },
  });

  return mapDbMessageToMessage(newRow);
}

/**
 * List project messages ordered by timestamp ascending
 */
export async function listProjectMessages(
  projectId: string,
  limit: number = 100
): Promise<ProjectMessage[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('project_messages')
    .select('*, profiles:sender_id(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (rows || []).map(mapDbMessageToMessage);
}
