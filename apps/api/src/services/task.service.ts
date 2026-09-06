import { supabaseAdmin } from '../supabase.js';
import {
  Task,
  TaskComment,
  TaskPriority,
  TaskStatus,
  UserRole,
  CreateTaskDto,
  UpdateTaskDto,
  SubmitTaskDto,
  RequestTaskRevisionDto,
} from '@researchos/shared-types';
import { createAuditLog } from './audit.service.js';
import { recalculateProgress } from './project.service.js';
import { createNotification } from './notification.service.js';
import { mapDbProfileToProfile } from '../middleware/auth.js';
import { mapDbMilestoneToMilestone } from './milestone.service.js';

export function mapDbTaskToTask(row: any): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    milestoneId: row.milestone_id || null,
    title: row.title || '',
    description: row.description || '',
    assigneeId: row.assignee_id,
    createdBy: row.created_by,
    dueDate: row.due_date,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    progressNote: row.progress_note || null,
    revisionNote: row.revision_note || null,
    isProposed: Boolean(row.is_proposed),
    proposedBy: row.proposed_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignee: row.assignee ? mapDbProfileToProfile(row.assignee) : undefined,
    creator: row.creator ? mapDbProfileToProfile(row.creator) : undefined,
    milestone: row.milestones ? mapDbMilestoneToMilestone(row.milestones) : undefined,
    commentsCount: row.task_comments?.[0]?.count ?? undefined,
  };
}

export function mapDbCommentToComment(row: any): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    authorId: row.author_id,
    body: row.body || '',
    createdAt: row.created_at,
    author: row.profiles ? mapDbProfileToProfile(row.profiles) : undefined,
  };
}

/**
 * List tasks for a project with optional filters
 */
export async function listProjectTasks(
  userId: string,
  role: UserRole,
  projectId: string,
  filters?: { status?: TaskStatus; milestoneId?: string; assigneeId?: string; isProposed?: boolean }
): Promise<Task[]> {
  let query = supabaseAdmin
    .from('tasks')
    .select('*, assignee:assignee_id(*), creator:created_by(*), milestones:milestone_id(*), task_comments(count)')
    .eq('project_id', projectId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.milestoneId) {
    query = query.eq('milestone_id', filters.milestoneId);
  }
  if (filters?.assigneeId) {
    query = query.eq('assignee_id', filters.assigneeId);
  }
  if (filters?.isProposed !== undefined) {
    query = query.eq('is_proposed', filters.isProposed);
  }

  const { data: rows, error } = await query.order('due_date', { ascending: true });
  if (error) throw new Error(error.message);

  return (rows || []).map(mapDbTaskToTask);
}

/**
 * Get task by ID with full details
 */
export async function getTaskById(taskId: string): Promise<Task> {
  const { data: row, error } = await supabaseAdmin
    .from('tasks')
    .select('*, assignee:assignee_id(*), creator:created_by(*), milestones:milestone_id(*)')
    .eq('id', taskId)
    .single();

  if (error || !row) throw new Error('Task not found');
  return mapDbTaskToTask(row);
}

/**
 * Create task:
 * - Project Owner Supervisor: assigns task directly (`is_proposed = false`, sets `assigneeId`).
 * - Personal Project Owner: self-assigns task directly (`is_proposed = false`, `assigneeId = userId`).
 * - Researcher in supervised project: creates proposal (`is_proposed = true`, `proposed_by = userId`).
 */
export async function createTask(
  userId: string,
  role: UserRole,
  projectId: string,
  dto: CreateTaskDto
): Promise<Task> {
  const { data: project, error: projErr } = await supabaseAdmin
    .from('projects')
    .select('id, owner_id, is_personal')
    .eq('id', projectId)
    .single();

  if (projErr || !project) throw new Error('Project not found');

  const isOwner = project.owner_id === userId;
  const isPersonal = project.is_personal;

  let isProposed = false;
  let proposedBy: string | null = null;
  let finalAssigneeId = dto.assigneeId || userId;

  if (isPersonal) {
    // In personal projects, tasks are assigned to the project owner
    finalAssigneeId = userId;
    isProposed = false;
  } else if (isOwner) {
    // Supervisor assigning task to a member
    finalAssigneeId = dto.assigneeId || userId;
    isProposed = false;
  } else {
    // Researcher creating task in supervised project -> Proposal
    isProposed = true;
    proposedBy = userId;
    finalAssigneeId = userId;
  }

  // Validate milestone if provided
  if (dto.milestoneId) {
    const { data: milestone, error: mErr } = await supabaseAdmin
      .from('milestones')
      .select('id, is_locked')
      .eq('id', dto.milestoneId)
      .single();

    if (mErr || !milestone) throw new Error('Milestone not found');
    if (milestone.is_locked) throw new Error('Cannot add tasks to a locked milestone');
  }

  const { data: newRow, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      project_id: projectId,
      milestone_id: dto.milestoneId || null,
      title: dto.title.trim(),
      description: dto.description?.trim() || '',
      assignee_id: finalAssigneeId,
      created_by: userId,
      due_date: dto.dueDate,
      priority: dto.priority || 'Medium',
      status: 'ToDo',
      is_proposed: isProposed,
      proposed_by: proposedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*, assignee:assignee_id(*), creator:created_by(*), milestones:milestone_id(*)')
    .single();

  if (error || !newRow) throw new Error(error?.message || 'Failed to create task');

  // If assigned to another member by supervisor, dispatch TaskAssigned notification
  if (!isProposed && finalAssigneeId !== userId) {
    await createNotification({
      userId: finalAssigneeId,
      type: 'TaskAssigned',
      payload: {
        taskId: newRow.id,
        projectId,
        title: newRow.title,
        dueDate: newRow.due_date,
      },
    });
  }

  await createAuditLog({
    actorId: userId,
    action: isProposed ? 'propose_task' : 'create_task',
    targetType: 'task',
    targetId: newRow.id,
    metadata: { projectId, isProposed, assigneeId: finalAssigneeId },
  });

  return mapDbTaskToTask(newRow);
}

/**
 * Update task metadata:
 * - Blocked if milestone is locked.
 * - Allowed for Assignee or Project Owner Supervisor.
 */
export async function updateTask(
  userId: string,
  role: UserRole,
  taskId: string,
  dto: UpdateTaskDto
): Promise<Task> {
  const { data: task, error: tErr } = await supabaseAdmin
    .from('tasks')
    .select('*, projects:project_id(owner_id, is_personal), milestones:milestone_id(is_locked)')
    .eq('id', taskId)
    .single();

  if (tErr || !task) throw new Error('Task not found');

  const project = task.projects as any;
  const milestone = task.milestones as any;

  if (milestone?.is_locked) {
    throw new Error('Milestone is locked: tasks in locked milestones cannot be modified');
  }

  const isOwner = project.owner_id === userId;
  const isAssignee = task.assignee_id === userId;

  if (!isOwner && !isAssignee && role !== 'Admin') {
    throw new Error('Forbidden: You are not authorized to update this task');
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (dto.title !== undefined) updates.title = dto.title.trim();
  if (dto.description !== undefined) updates.description = dto.description.trim();
  if (dto.dueDate !== undefined) updates.due_date = dto.dueDate;
  if (dto.priority !== undefined) updates.priority = dto.priority;
  if (dto.milestoneId !== undefined) updates.milestone_id = dto.milestoneId;
  if (dto.progressNote !== undefined) updates.progress_note = dto.progressNote;

  const { data: updatedRow, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select('*, assignee:assignee_id(*), creator:created_by(*), milestones:milestone_id(*)')
    .single();

  if (error || !updatedRow) throw new Error(error?.message || 'Failed to update task');

  await createAuditLog({
    actorId: userId,
    action: 'update_task',
    targetType: 'task',
    targetId: taskId,
    metadata: updates,
  });

  return mapDbTaskToTask(updatedRow);
}

/**
 * Task state transition: InProgress <-> ToDo
 */
export async function setTaskStatus(
  userId: string,
  taskId: string,
  newStatus: TaskStatus
): Promise<Task> {
  const { data: task, error: tErr } = await supabaseAdmin
    .from('tasks')
    .select('*, projects:project_id(owner_id), milestones:milestone_id(is_locked)')
    .eq('id', taskId)
    .single();

  if (tErr || !task) throw new Error('Task not found');
  if (task.milestones?.is_locked) {
    throw new Error('Milestone is locked: cannot change task status');
  }

  const isOwner = task.projects?.owner_id === userId;
  const isAssignee = task.assignee_id === userId;

  // Researchers can only switch ToDo <-> InProgress directly
  if (!isOwner && !isAssignee) {
    throw new Error('Forbidden: Only the task assignee or project owner can change task status');
  }

  if (!isOwner) {
    if (newStatus === 'Approved') {
      throw new Error('Forbidden: Researchers cannot self-approve tasks');
    }
    if (newStatus === 'UnderReview' || newStatus === 'RevisionRequested') {
      throw new Error('Forbidden: Only the Project Owner Supervisor can review tasks');
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from('tasks')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('*, assignee:assignee_id(*), creator:created_by(*), milestones:milestone_id(*)')
    .single();

  if (error || !updated) throw new Error(error?.message || 'Failed to change task status');

  if (newStatus === 'Approved') {
    await recalculateProgress(task.project_id);
  }

  await createAuditLog({
    actorId: userId,
    action: 'set_task_status',
    targetType: 'task',
    targetId: taskId,
    metadata: { oldStatus: task.status, newStatus },
  });

  return mapDbTaskToTask(updated);
}

/**
 * Submit Task for Review:
 * Assignee moves task to 'Submitted' with an optional progress note.
 */
export async function submitTask(
  userId: string,
  taskId: string,
  dto: SubmitTaskDto
): Promise<Task> {
  const { data: task, error: tErr } = await supabaseAdmin
    .from('tasks')
    .select('*, projects:project_id(owner_id)')
    .eq('id', taskId)
    .single();

  if (tErr || !task) throw new Error('Task not found');
  if (task.assignee_id !== userId && task.projects?.owner_id !== userId) {
    throw new Error('Forbidden: Only the assigned researcher can submit this task');
  }

  const updates: Record<string, any> = {
    status: 'Submitted',
    updated_at: new Date().toISOString(),
  };

  if (dto.progressNote) {
    updates.progress_note = dto.progressNote.trim();
  }

  const { data: updated, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select('*, assignee:assignee_id(*), creator:created_by(*), milestones:milestone_id(*)')
    .single();

  if (error || !updated) throw new Error(error?.message || 'Failed to submit task');

  await createAuditLog({
    actorId: userId,
    action: 'submit_task',
    targetType: 'task',
    targetId: taskId,
    metadata: { projectId: task.project_id },
  });

  return mapDbTaskToTask(updated);
}

/**
 * Review Task (Approve or Request Revision):
 * Project Owner Supervisor only.
 */
export async function reviewTask(
  supervisorId: string,
  taskId: string,
  action: 'Approve' | 'RequestRevision',
  dto?: RequestTaskRevisionDto
): Promise<Task> {
  const { data: task, error: tErr } = await supabaseAdmin
    .from('tasks')
    .select('*, projects:project_id(owner_id)')
    .eq('id', taskId)
    .single();

  if (tErr || !task) throw new Error('Task not found');
  if (task.projects?.owner_id !== supervisorId) {
    throw new Error('Forbidden: Only the Project Owner Supervisor can approve or request revisions');
  }

  if (action === 'Approve') {
    const { data: updated, error } = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'Approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select('*, assignee:assignee_id(*), creator:created_by(*), milestones:milestone_id(*)')
      .single();

    if (error || !updated) throw new Error(error?.message || 'Failed to approve task');

    // Recalculate project progress
    await recalculateProgress(task.project_id);

    // Dispatch TaskApproved notification to assignee
    await createNotification({
      userId: task.assignee_id,
      type: 'TaskApproved',
      payload: {
        taskId,
        projectId: task.project_id,
        title: task.title,
      },
    });

    await createAuditLog({
      actorId: supervisorId,
      action: 'approve_task',
      targetType: 'task',
      targetId: taskId,
      metadata: { projectId: task.project_id },
    });

    return mapDbTaskToTask(updated);
  } else {
    // Request revision: feedback note is required
    const note = dto?.revisionNote?.trim();
    if (!note) {
      throw new Error('Revision note is required when requesting revisions');
    }

    const { data: updated, error } = await supabaseAdmin
      .from('tasks')
      .update({
        status: 'RevisionRequested',
        revision_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select('*, assignee:assignee_id(*), creator:created_by(*), milestones:milestone_id(*)')
      .single();

    if (error || !updated) throw new Error(error?.message || 'Failed to request task revision');

    // Dispatch RevisionRequested notification to assignee
    await createNotification({
      userId: task.assignee_id,
      type: 'RevisionRequested',
      payload: {
        taskId,
        projectId: task.project_id,
        title: task.title,
        revisionNote: note,
      },
    });

    await createAuditLog({
      actorId: supervisorId,
      action: 'request_task_revision',
      targetType: 'task',
      targetId: taskId,
      metadata: { projectId: task.project_id, revisionNote: note },
    });

    return mapDbTaskToTask(updated);
  }
}

/**
 * Approve Task Proposal:
 * Project Owner Supervisor activates proposed task and assigns it.
 */
export async function approveTaskProposal(
  supervisorId: string,
  taskId: string,
  assigneeId?: string
): Promise<Task> {
  const { data: task, error: tErr } = await supabaseAdmin
    .from('tasks')
    .select('*, projects:project_id(owner_id)')
    .eq('id', taskId)
    .single();

  if (tErr || !task) throw new Error('Task not found');
  if (task.projects?.owner_id !== supervisorId) {
    throw new Error('Forbidden: Only the Project Owner Supervisor can approve task proposals');
  }

  const finalAssigneeId = assigneeId || task.proposed_by || task.assignee_id;

  const { data: updated, error } = await supabaseAdmin
    .from('tasks')
    .update({
      is_proposed: false,
      assignee_id: finalAssigneeId,
      status: 'ToDo',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('*, assignee:assignee_id(*), creator:created_by(*), milestones:milestone_id(*)')
    .single();

  if (error || !updated) throw new Error(error?.message || 'Failed to approve task proposal');

  // Dispatch TaskAssigned notification
  await createNotification({
    userId: finalAssigneeId,
    type: 'TaskAssigned',
    payload: {
      taskId,
      projectId: task.project_id,
      title: task.title,
      dueDate: task.due_date,
    },
  });

  await createAuditLog({
    actorId: supervisorId,
    action: 'approve_task_proposal',
    targetType: 'task',
    targetId: taskId,
    metadata: { proposedBy: task.proposed_by, assigneeId: finalAssigneeId },
  });

  return mapDbTaskToTask(updated);
}

/**
 * Delete task:
 * Project Owner Supervisor only.
 */
export async function deleteTask(supervisorId: string, taskId: string): Promise<void> {
  const { data: task, error: tErr } = await supabaseAdmin
    .from('tasks')
    .select('*, projects:project_id(owner_id)')
    .eq('id', taskId)
    .single();

  if (tErr || !task) throw new Error('Task not found');
  if (task.projects?.owner_id !== supervisorId) {
    throw new Error('Forbidden: Only the Project Owner Supervisor can delete tasks');
  }

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);

  await recalculateProgress(task.project_id);

  await createAuditLog({
    actorId: supervisorId,
    action: 'delete_task',
    targetType: 'task',
    targetId: taskId,
    metadata: { projectId: task.project_id },
  });
}

/**
 * Add comment to task
 */
export async function addTaskComment(
  authorId: string,
  taskId: string,
  body: string
): Promise<TaskComment> {
  if (!body || !body.trim()) throw new Error('Comment body cannot be empty');

  const { data: newRow, error } = await supabaseAdmin
    .from('task_comments')
    .insert({
      task_id: taskId,
      author_id: authorId,
      body: body.trim(),
      created_at: new Date().toISOString(),
    })
    .select('*, profiles:author_id(*)')
    .single();

  if (error || !newRow) throw new Error(error?.message || 'Failed to add task comment');

  return mapDbCommentToComment(newRow);
}

/**
 * List comments for a task
 */
export async function listTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('task_comments')
    .select('*, profiles:author_id(*)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (rows || []).map(mapDbCommentToComment);
}
