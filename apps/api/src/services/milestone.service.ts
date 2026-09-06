import { supabaseAdmin } from '../supabase.js';
import {
  Milestone,
  MilestoneStatus,
  UserRole,
  CreateMilestoneDto,
  UpdateMilestoneDto,
} from '@researchos/shared-types';
import { createAuditLog } from './audit.service.js';
import { recalculateProgress } from './project.service.js';

export function mapDbMilestoneToMilestone(row: any): Milestone {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name || '',
    targetDate: row.target_date,
    weightPct: row.weight_pct ?? 0,
    status: row.status as MilestoneStatus,
    isLocked: Boolean(row.is_locked),
    isProposed: Boolean(row.is_proposed),
    proposedBy: row.proposed_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tasksCount: row.tasks?.[0]?.count ?? undefined,
  };
}

/**
 * List milestones for a project
 */
export async function listProjectMilestones(projectId: string): Promise<Milestone[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('milestones')
    .select('*, tasks(count)')
    .eq('project_id', projectId)
    .order('target_date', { ascending: true });

  if (error) throw new Error(error.message);
  return (rows || []).map(mapDbMilestoneToMilestone);
}

/**
 * Create milestone:
 * - In supervised projects: Project Owner Supervisor creates active milestone; Researcher creates proposal (is_proposed = true).
 * - In personal projects: Creator creates active milestone.
 */
export async function createMilestone(
  userId: string,
  role: UserRole,
  projectId: string,
  dto: CreateMilestoneDto
): Promise<Milestone> {
  const { data: project, error: projErr } = await supabaseAdmin
    .from('projects')
    .select('id, owner_id, is_personal')
    .eq('id', projectId)
    .single();

  if (projErr || !project) {
    throw new Error('Project not found');
  }

  const isOwner = project.owner_id === userId;
  const isPersonal = project.is_personal;

  let isProposed = false;
  let proposedBy: string | null = null;

  if (!isOwner && !isPersonal) {
    // Researcher creating milestone in supervised project creates a proposal
    isProposed = true;
    proposedBy = userId;
  }

  const { data: newRow, error } = await supabaseAdmin
    .from('milestones')
    .insert({
      project_id: projectId,
      name: dto.name.trim(),
      target_date: dto.targetDate,
      weight_pct: dto.weightPct ?? 0,
      status: 'Pending',
      is_locked: false,
      is_proposed: isProposed,
      proposed_by: proposedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !newRow) {
    throw new Error(error?.message || 'Failed to create milestone');
  }

  await createAuditLog({
    actorId: userId,
    action: isProposed ? 'propose_milestone' : 'create_milestone',
    targetType: 'milestone',
    targetId: newRow.id,
    metadata: { projectId, isProposed, name: newRow.name },
  });

  return mapDbMilestoneToMilestone(newRow);
}

/**
 * Update milestone:
 * Project Owner Supervisor only (or personal project owner).
 */
export async function updateMilestone(
  userId: string,
  milestoneId: string,
  dto: UpdateMilestoneDto
): Promise<Milestone> {
  // Check if milestone is locked
  const { data: current, error: curErr } = await supabaseAdmin
    .from('milestones')
    .select('*, projects:project_id(owner_id, is_personal)')
    .eq('id', milestoneId)
    .single();

  if (curErr || !current) throw new Error('Milestone not found');

  const project = current.projects as any;
  if (project.owner_id !== userId) {
    throw new Error('Forbidden: Only the Project Owner Supervisor can edit milestones');
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (dto.name !== undefined) updates.name = dto.name.trim();
  if (dto.targetDate !== undefined) updates.target_date = dto.targetDate;
  if (dto.weightPct !== undefined) updates.weight_pct = dto.weightPct;
  if (dto.status !== undefined) updates.status = dto.status;

  const { data: updatedRow, error } = await supabaseAdmin
    .from('milestones')
    .update(updates)
    .eq('id', milestoneId)
    .select('*')
    .single();

  if (error || !updatedRow) throw new Error(error?.message || 'Failed to update milestone');

  // If weights or status changed, recalculate project progress
  if (dto.weightPct !== undefined || dto.status !== undefined) {
    await recalculateProgress(current.project_id);
  }

  await createAuditLog({
    actorId: userId,
    action: 'update_milestone',
    targetType: 'milestone',
    targetId: milestoneId,
    metadata: updates,
  });

  return mapDbMilestoneToMilestone(updatedRow);
}

/**
 * Lock/Unlock milestone:
 * Project Owner Supervisor only.
 */
export async function lockMilestone(
  supervisorId: string,
  milestoneId: string,
  isLocked: boolean
): Promise<Milestone> {
  const { data: current, error: curErr } = await supabaseAdmin
    .from('milestones')
    .select('*, projects:project_id(owner_id)')
    .eq('id', milestoneId)
    .single();

  if (curErr || !current) throw new Error('Milestone not found');
  const project = current.projects as any;
  if (project.owner_id !== supervisorId) {
    throw new Error('Forbidden: Only the Project Owner Supervisor can lock or unlock milestones');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('milestones')
    .update({
      is_locked: isLocked,
      updated_at: new Date().toISOString(),
    })
    .eq('id', milestoneId)
    .select('*')
    .single();

  if (error || !updated) throw new Error(error?.message || 'Failed to update milestone lock status');

  await createAuditLog({
    actorId: supervisorId,
    action: isLocked ? 'lock_milestone' : 'unlock_milestone',
    targetType: 'milestone',
    targetId: milestoneId,
    metadata: { isLocked },
  });

  return mapDbMilestoneToMilestone(updated);
}

/**
 * Approve milestone proposal:
 * Project Owner Supervisor only.
 */
export async function approveMilestoneProposal(
  supervisorId: string,
  milestoneId: string
): Promise<Milestone> {
  const { data: current, error: curErr } = await supabaseAdmin
    .from('milestones')
    .select('*, projects:project_id(owner_id)')
    .eq('id', milestoneId)
    .single();

  if (curErr || !current) throw new Error('Milestone not found');
  const project = current.projects as any;
  if (project.owner_id !== supervisorId) {
    throw new Error('Forbidden: Only the Project Owner Supervisor can approve milestone proposals');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('milestones')
    .update({
      is_proposed: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', milestoneId)
    .select('*')
    .single();

  if (error || !updated) throw new Error(error?.message || 'Failed to approve milestone proposal');

  await createAuditLog({
    actorId: supervisorId,
    action: 'approve_milestone_proposal',
    targetType: 'milestone',
    targetId: milestoneId,
    metadata: { proposedBy: current.proposed_by },
  });

  return mapDbMilestoneToMilestone(updated);
}

/**
 * Delete milestone:
 * Project Owner Supervisor only.
 */
export async function deleteMilestone(supervisorId: string, milestoneId: string): Promise<void> {
  const { data: current, error: curErr } = await supabaseAdmin
    .from('milestones')
    .select('*, projects:project_id(owner_id)')
    .eq('id', milestoneId)
    .single();

  if (curErr || !current) throw new Error('Milestone not found');
  const project = current.projects as any;
  if (project.owner_id !== supervisorId) {
    throw new Error('Forbidden: Only the Project Owner Supervisor can delete milestones');
  }

  const { error } = await supabaseAdmin.from('milestones').delete().eq('id', milestoneId);
  if (error) throw new Error(error.message);

  await recalculateProgress(current.project_id);

  await createAuditLog({
    actorId: supervisorId,
    action: 'delete_milestone',
    targetType: 'milestone',
    targetId: milestoneId,
    metadata: { projectId: current.project_id },
  });
}
