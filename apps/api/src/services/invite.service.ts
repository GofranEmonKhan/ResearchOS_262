import crypto from 'crypto';
import { supabaseAdmin } from '../supabase.js';
import {
  ProjectInvite,
  ProjectInviteStatus,
  ProjectInviteType,
  ProjectRole,
  CreateProjectInviteDto,
  Project,
} from '@researchos/shared-types';
import { createAuditLog } from './audit.service.js';
import { mapDbProjectToProject } from './project.service.js';

export function mapDbInviteToInvite(row: any): ProjectInvite {
  return {
    id: row.id,
    projectId: row.project_id,
    createdBy: row.created_by,
    inviteType: row.invite_type as ProjectInviteType,
    invitedEmail: row.invited_email || null,
    invitedRole: (row.invited_role || 'Member') as ProjectRole,
    code: row.code || null,
    maxUses: row.max_uses ?? null,
    usesCount: row.uses_count ?? 0,
    expiresAt: row.expires_at || null,
    status: row.status as ProjectInviteStatus,
    createdAt: row.created_at,
  };
}

/**
 * Generate a unique, readable invite code (e.g. RES-9A2F4E1B)
 */
function generateInviteCode(): string {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `RES-${rand}`;
}

/**
 * Create a Project Invite (Email or Code):
 * Project Owner Supervisor only.
 */
export async function createProjectInvite(
  ownerId: string,
  projectId: string,
  dto: CreateProjectInviteDto
): Promise<ProjectInvite> {
  const inviteCode = dto.inviteType === 'Code' ? generateInviteCode() : null;
  const invitedRole: ProjectRole = dto.invitedRole || 'Member';

  let expiresAt: string | null = null;
  if (dto.expiresInDays && dto.expiresInDays > 0) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + dto.expiresInDays);
    expiresAt = expDate.toISOString();
  } else if (dto.expiresInDays === -1) {
    // -1 signifies Never expires
    expiresAt = null;
  } else {
    // Default 7 days expiry
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 7);
    expiresAt = expDate.toISOString();
  }

  const { data: newInvite, error } = await supabaseAdmin
    .from('project_invites')
    .insert({
      project_id: projectId,
      created_by: ownerId,
      invite_type: dto.inviteType,
      invited_email: dto.invitedEmail?.toLowerCase().trim() || null,
      invited_role: invitedRole,
      code: inviteCode,
      max_uses: dto.maxUses !== undefined ? dto.maxUses : (dto.inviteType === 'Code' ? 50 : 1),
      uses_count: 0,
      expires_at: expiresAt,
      status: 'Pending',
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !newInvite) {
    throw new Error(error?.message || 'Failed to create project invite');
  }

  await createAuditLog({
    actorId: ownerId,
    action: 'create_project_invite',
    targetType: 'project_invite',
    targetId: newInvite.id,
    metadata: { projectId, inviteType: dto.inviteType, invitedRole, code: inviteCode },
  });

  return mapDbInviteToInvite(newInvite);
}

/**
 * List invites for a project:
 * Project Owner Supervisor only.
 */
export async function listProjectInvites(projectId: string): Promise<ProjectInvite[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('project_invites')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (rows || []).map(mapDbInviteToInvite);
}

/**
 * Revoke an active project invite:
 * Project Owner Supervisor only.
 */
export async function revokeProjectInvite(
  ownerId: string,
  projectId: string,
  inviteId: string
): Promise<void> {
  const { data: invite, error } = await supabaseAdmin
    .from('project_invites')
    .select('*')
    .eq('id', inviteId)
    .eq('project_id', projectId)
    .single();

  if (error || !invite) {
    throw new Error('Invite not found');
  }

  if (invite.status === 'Revoked') {
    return;
  }

  const { error: updateErr } = await supabaseAdmin
    .from('project_invites')
    .update({ status: 'Revoked' })
    .eq('id', inviteId);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  await createAuditLog({
    actorId: ownerId,
    action: 'revoke_project_invite',
    targetType: 'project_invite',
    targetId: inviteId,
    metadata: { projectId, code: invite.code },
  });
}

/**
 * Accept an invite join code:
 * Authenticated user joins project with the invited role (Member or CoSupervisor).
 */
export async function acceptInviteCode(userId: string, code: string): Promise<{ project: Project; memberId: string }> {
  const normalizedCode = code.trim().toUpperCase();

  // 1. Look up invite by code
  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from('project_invites')
    .select('*')
    .eq('code', normalizedCode)
    .single();

  if (inviteErr || !invite) {
    throw new Error('Invalid invite code');
  }

  if (invite.status === 'Revoked') {
    throw new Error('This invite code has been revoked');
  }

  // Check expiration
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    throw new Error('This invite code has expired');
  }

  // Check max uses
  if (invite.max_uses && invite.uses_count >= invite.max_uses) {
    throw new Error('This invite code has reached its maximum usage limit');
  }

  // 2. Check if user is already a member
  const { data: existingMember } = await supabaseAdmin
    .from('project_members')
    .select('id')
    .eq('project_id', invite.project_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMember) {
    throw new Error('You are already a member of this project');
  }

  // 3. Add user to project_members with the assigned role
  const projectRole: ProjectRole = (invite.invited_role || 'Member') as ProjectRole;

  const { data: newMember, error: memberErr } = await supabaseAdmin
    .from('project_members')
    .insert({
      project_id: invite.project_id,
      user_id: userId,
      project_role: projectRole,
      added_by: invite.created_by,
      joined_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (memberErr || !newMember) {
    throw new Error(memberErr?.message || 'Failed to join project');
  }

  // 4. Increment uses_count
  const newUsesCount = (invite.uses_count || 0) + 1;
  const isNowExhausted = invite.max_uses && newUsesCount >= invite.max_uses;

  await supabaseAdmin
    .from('project_invites')
    .update({
      uses_count: newUsesCount,
      status: isNowExhausted ? 'Accepted' : 'Pending',
    })
    .eq('id', invite.id);

  // 5. Fetch project details
  const { data: projectRow } = await supabaseAdmin
    .from('projects')
    .select('*, profiles:owner_id(*)')
    .eq('id', invite.project_id)
    .single();

  await createAuditLog({
    actorId: userId,
    action: 'accept_project_invite',
    targetType: 'project_invite',
    targetId: invite.id,
    metadata: { projectId: invite.project_id, code: normalizedCode, role: projectRole },
  });

  return {
    project: mapDbProjectToProject(projectRow),
    memberId: newMember.id,
  };
}
