import { supabaseAdmin } from '../supabase.js';
import {
  Project,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
  UserRole,
  Profile,
  CreateProjectDto,
  UpdateProjectDto,
  AddProjectMemberDto,
} from '@researchos/shared-types';
import { createAuditLog } from './audit.service.js';
import { mapDbProfileToProfile } from '../middleware/auth.js';

export function mapDbProjectToProject(row: any): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    isPersonal: Boolean(row.is_personal),
    title: row.title || '',
    abstract: row.abstract || '',
    domainTags: row.domain_tags || [],
    startDate: row.start_date,
    endDate: row.end_date || null,
    status: row.status as ProjectStatus,
    progressPercent: row.progress_percent ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: row.profiles ? mapDbProfileToProfile(row.profiles) : undefined,
    membersCount: row.project_members?.[0]?.count ?? undefined,
    tasksCount: row.tasks?.[0]?.count ?? undefined,
  };
}

/**
 * List projects accessible to the caller:
 * - Admin: Sees all projects with aggregate metadata.
 * - Supervisor/Researcher: Sees projects they own OR are registered members of.
 */
export async function listUserProjects(userId: string, role: UserRole): Promise<Project[]> {
  if (role === 'Admin') {
    const { data: rows, error } = await supabaseAdmin
      .from('projects')
      .select('*, profiles:owner_id(*), project_members(count), tasks(count)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (rows || []).map(mapDbProjectToProject);
  }

  // 1. Get IDs of projects where user is a member
  const { data: memberRows, error: memberErr } = await supabaseAdmin
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  if (memberErr) throw new Error(memberErr.message);

  const memberProjectIds = (memberRows || []).map((r) => r.project_id);

  // 2. Query projects owned by user OR in memberProjectIds
  let query = supabaseAdmin
    .from('projects')
    .select('*, profiles:owner_id(*), project_members(count), tasks(count)');

  if (memberProjectIds.length > 0) {
    query = query.or(`owner_id.eq.${userId},id.in.(${memberProjectIds.join(',')})`);
  } else {
    query = query.eq('owner_id', userId);
  }

  const { data: projects, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (projects || []).map(mapDbProjectToProject);
}

/**
 * Get detailed project information by ID with members list and access verification
 */
export async function getProjectById(userId: string, role: UserRole, projectId: string) {
  const { data: projectRow, error } = await supabaseAdmin
    .from('projects')
    .select('*, profiles:owner_id(*)')
    .eq('id', projectId)
    .single();

  if (error || !projectRow) {
    throw new Error('Project not found');
  }

  // Access check
  if (role !== 'Admin' && projectRow.owner_id !== userId) {
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('project_members')
      .select('project_role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberErr || !member) {
      throw new Error('Forbidden: You do not have access to this project');
    }
  }

  // Fetch project members with user profiles
  const { data: members, error: membersErr } = await supabaseAdmin
    .from('project_members')
    .select('*, profiles:user_id(*)')
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true });

  if (membersErr) throw new Error(membersErr.message);

  const formattedMembers: ProjectMember[] = (members || []).map((m: any) => ({
    id: m.id,
    projectId: m.project_id,
    userId: m.user_id,
    projectRole: m.project_role as ProjectRole,
    addedBy: m.added_by,
    joinedAt: m.joined_at,
    user: m.profiles ? mapDbProfileToProfile(m.profiles) : undefined,
  }));

  return {
    project: mapDbProjectToProject(projectRow),
    members: formattedMembers,
  };
}

/**
 * Create a project:
 * - Researcher: can only create personal projects (is_personal = true).
 * - Supervisor: creates supervised projects (or personal projects).
 */
export async function createProject(
  userId: string,
  role: UserRole,
  dto: CreateProjectDto
): Promise<Project> {
  const isPersonal = role === 'Researcher' ? true : Boolean(dto.isPersonal);

  if (role === 'Researcher' && dto.isPersonal === false) {
    throw new Error('Forbidden: Researchers cannot create supervised collaborative projects');
  }

  const { data: newRow, error } = await supabaseAdmin
    .from('projects')
    .insert({
      owner_id: userId,
      is_personal: isPersonal,
      title: dto.title.trim(),
      abstract: dto.abstract?.trim() || '',
      domain_tags: dto.domainTags || [],
      start_date: dto.startDate || new Date().toISOString().split('T')[0],
      end_date: dto.endDate || null,
      status: 'Planning',
      progress_percent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*, profiles:owner_id(*)')
    .single();

  if (error || !newRow) {
    throw new Error(error?.message || 'Failed to create project');
  }

  // Auto-add owner to project_members for consistent join lookups
  await supabaseAdmin.from('project_members').insert({
    project_id: newRow.id,
    user_id: userId,
    project_role: isPersonal ? 'Member' : 'CoSupervisor',
    added_by: userId,
    joined_at: new Date().toISOString(),
  });

  await createAuditLog({
    actorId: userId,
    action: 'create_project',
    targetType: 'project',
    targetId: newRow.id,
    metadata: { isPersonal, title: newRow.title },
  });

  return mapDbProjectToProject(newRow);
}

/**
 * Update project metadata:
 * Only the Project Owner Supervisor (or personal creator) may update.
 */
export async function updateProject(
  userId: string,
  projectId: string,
  dto: UpdateProjectDto
): Promise<Project> {
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (dto.title !== undefined) updates.title = dto.title.trim();
  if (dto.abstract !== undefined) updates.abstract = dto.abstract.trim();
  if (dto.domainTags !== undefined) updates.domain_tags = dto.domainTags;
  if (dto.startDate !== undefined) updates.start_date = dto.startDate;
  if (dto.endDate !== undefined) updates.end_date = dto.endDate;
  if (dto.status !== undefined) updates.status = dto.status;

  const { data: updatedRow, error } = await supabaseAdmin
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select('*, profiles:owner_id(*)')
    .single();

  if (error || !updatedRow) {
    throw new Error(error?.message || 'Failed to update project metadata');
  }

  await createAuditLog({
    actorId: userId,
    action: 'update_project',
    targetType: 'project',
    targetId: projectId,
    metadata: updates,
  });

  return mapDbProjectToProject(updatedRow);
}

/**
 * Add a member directly:
 * Project Owner Supervisor only.
 */
export async function addProjectMember(
  ownerId: string,
  projectId: string,
  dto: AddProjectMemberDto
): Promise<ProjectMember> {
  // Check target user profile
  const { data: targetProfile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', dto.userId)
    .single();

  if (profileErr || !targetProfile) {
    throw new Error('Target user does not exist');
  }

  const projectRole: ProjectRole = dto.projectRole || 'Member';

  const { data: newMember, error } = await supabaseAdmin
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: dto.userId,
      project_role: projectRole,
      added_by: ownerId,
      joined_at: new Date().toISOString(),
    })
    .select('*, profiles:user_id(*)')
    .single();

  if (error || !newMember) {
    if (error?.code === '23505') {
      throw new Error('User is already a member of this project');
    }
    throw new Error(error?.message || 'Failed to add project member');
  }

  await createAuditLog({
    actorId: ownerId,
    action: 'add_project_member',
    targetType: 'project_member',
    targetId: newMember.id,
    metadata: { projectId, userId: dto.userId, projectRole },
  });

  return {
    id: newMember.id,
    projectId: newMember.project_id,
    userId: newMember.user_id,
    projectRole: newMember.project_role as ProjectRole,
    addedBy: newMember.added_by,
    joinedAt: newMember.joined_at,
    user: newMember.profiles ? mapDbProfileToProfile(newMember.profiles) : undefined,
  };
}

/**
 * Remove a member:
 * Project Owner Supervisor only. Cannot remove the owner.
 */
export async function removeProjectMember(
  ownerId: string,
  projectId: string,
  targetUserId: string
): Promise<void> {
  if (ownerId === targetUserId) {
    throw new Error('Project Owner cannot be removed from their own project');
  }

  const { error } = await supabaseAdmin
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', targetUserId);

  if (error) throw new Error(error.message);

  await createAuditLog({
    actorId: ownerId,
    action: 'remove_project_member',
    targetType: 'project_member',
    targetId: targetUserId,
    metadata: { projectId, targetUserId },
  });
}

/**
 * Update a project member's role (e.g. Member <-> CoSupervisor):
 * Project Owner Supervisor only. Cannot modify the project owner.
 */
export async function updateProjectMemberRole(
  ownerId: string,
  projectId: string,
  targetUserId: string,
  newRole: ProjectRole
): Promise<ProjectMember> {
  if (ownerId === targetUserId) {
    throw new Error('Project Owner role cannot be modified');
  }

  if (!['Member', 'CoSupervisor'].includes(newRole)) {
    throw new Error('Invalid project role');
  }

  const { data: updatedMember, error } = await supabaseAdmin
    .from('project_members')
    .update({ project_role: newRole })
    .eq('project_id', projectId)
    .eq('user_id', targetUserId)
    .select('*, profiles:user_id(*)')
    .single();

  if (error || !updatedMember) {
    throw new Error(error?.message || 'Member not found in this project');
  }

  await createAuditLog({
    actorId: ownerId,
    action: 'update_project_member_role',
    targetType: 'project_member',
    targetId: updatedMember.id,
    metadata: { projectId, targetUserId, newRole },
  });

  return {
    id: updatedMember.id,
    projectId: updatedMember.project_id,
    userId: updatedMember.user_id,
    projectRole: updatedMember.project_role as ProjectRole,
    addedBy: updatedMember.added_by,
    joinedAt: updatedMember.joined_at,
    user: updatedMember.profiles ? mapDbProfileToProfile(updatedMember.profiles) : undefined,
  };
}

/**
 * Search profiles for member invitation:
 * Search active users by full_name, institution, or department.
 */
export async function searchProfiles(query: string, excludeUserId?: string): Promise<Profile[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  let queryBuilder = supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('status', 'Active')
    .ilike('full_name', `%${trimmed}%`)
    .limit(10);

  if (excludeUserId) {
    queryBuilder = queryBuilder.neq('id', excludeUserId);
  }

  const { data, error } = await queryBuilder;
  if (error) throw new Error(error.message);

  return (data || []).map(mapDbProfileToProfile);
}

/**
 * List all members of a project with user profile details
 */
export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data: members, error: membersErr } = await supabaseAdmin
    .from('project_members')
    .select('*, profiles:user_id(*)')
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true });

  if (membersErr) throw new Error(membersErr.message);

  return (members || []).map((m: any) => ({
    id: m.id,
    projectId: m.project_id,
    userId: m.user_id,
    projectRole: m.project_role as ProjectRole,
    addedBy: m.added_by,
    joinedAt: m.joined_at,
    user: m.profiles ? mapDbProfileToProfile(m.profiles) : undefined,
  }));
}

/**
 * Recalculate progress for a project:
 * Progress formula:
 * - If weighted milestones exist: sum(milestone.weight_pct * (approved_tasks / total_tasks))
 * - Else: round((approved_tasks / total_tasks) * 100)
 */
export async function recalculateProgress(projectId: string): Promise<number> {
  try {
    // 1. Fetch milestones
    const { data: milestones } = await supabaseAdmin
      .from('milestones')
      .select('id, weight_pct')
      .eq('project_id', projectId)
      .eq('is_proposed', false);

    // 2. Fetch active tasks
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('id, milestone_id, status')
      .eq('project_id', projectId)
      .eq('is_proposed', false);

    if (!tasks || tasks.length === 0) {
      await supabaseAdmin.from('projects').update({ progress_percent: 0 }).eq('id', projectId);
      return 0;
    }

    let progress = 0;
    const totalTasks = tasks.length;
    const approvedTasks = tasks.filter((t) => t.status === 'Approved').length;

    const hasWeightedMilestones = milestones && milestones.some((m) => m.weight_pct > 0);

    if (hasWeightedMilestones && milestones.length > 0) {
      let weightedSum = 0;
      let totalMilestoneWeight = 0;

      for (const m of milestones) {
        const mTasks = tasks.filter((t) => t.milestone_id === m.id);
        if (mTasks.length > 0) {
          const mApproved = mTasks.filter((t) => t.status === 'Approved').length;
          weightedSum += m.weight_pct * (mApproved / mTasks.length);
        }
        totalMilestoneWeight += m.weight_pct;
      }

      progress = totalMilestoneWeight > 0 ? Math.round(weightedSum) : Math.round((approvedTasks / totalTasks) * 100);
    } else {
      progress = Math.round((approvedTasks / totalTasks) * 100);
    }

    progress = Math.min(100, Math.max(0, progress));

    await supabaseAdmin
      .from('projects')
      .update({ progress_percent: progress, updated_at: new Date().toISOString() })
      .eq('id', projectId);

    return progress;
  } catch (err) {
    console.error('Error recalculating progress:', err);
    return 0;
  }
}
