import { supabaseAdmin } from '../supabase.js';
import {
  ExperimentFlag,
  CreateExperimentFlagDto,
  EXPERIMENT_FLAG_TYPES,
} from '@researchos/shared-types';

export class ExperimentFlagService {
  /**
   * Create a supervisor reproducibility flag on an experiment
   */
  static async createFlag(
    experimentId: string,
    dto: CreateExperimentFlagDto,
    supervisorId: string
  ): Promise<ExperimentFlag> {
    if (!dto.note || dto.note.trim().length === 0) {
      throw new Error('Flag note is required');
    }

    if (!dto.type || !EXPERIMENT_FLAG_TYPES[dto.type]) {
      throw new Error(`Invalid flag type: ${dto.type}`);
    }

    // Fetch experiment to retrieve project_id, owner_id, and name
    const { data: experiment, error: expError } = await supabaseAdmin
      .from('experiments')
      .select('id, project_id, owner_id, name')
      .eq('id', experimentId)
      .single();

    if (expError || !experiment) {
      throw new Error('Experiment not found');
    }

    let raisedTaskId: string | null = null;
    let raisedTaskTitle: string | null = null;

    // Optional Auto-creation of Revision Task
    if (dto.createRevisionTask) {
      const taskTitle = dto.taskTitle?.trim() || `[Revision] Re-run: ${experiment.name} (${dto.type})`;
      const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: newTask, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert({
          project_id: experiment.project_id,
          title: taskTitle,
          description: `Supervisor Flag (${dto.type}): ${dto.note.trim()}`,
          assignee_id: experiment.owner_id,
          created_by: supervisorId,
          status: 'ToDo',
          priority: 'High',
          due_date: dto.taskDueDate || defaultDueDate,
          is_proposed: false,
        })
        .select('id, title')
        .single();

      if (!taskError && newTask) {
        raisedTaskId = newTask.id;
        raisedTaskTitle = newTask.title;

        // Link the newly created task directly to the experiment
        await supabaseAdmin
          .from('task_experiment_links')
          .insert({
            task_id: newTask.id,
            experiment_id: experiment.id,
          });
      } else if (taskError) {
        console.warn('Non-fatal warning: failed to auto-create revision task:', taskError);
      }
    }

    // Insert experiment flag
    const { data: flagData, error: flagError } = await supabaseAdmin
      .from('experiment_flags')
      .insert({
        experiment_id: experimentId,
        flagged_by: supervisorId,
        type: dto.type,
        note: dto.note.trim(),
        raised_task_id: raisedTaskId,
      })
      .select('*, profiles:flagged_by(full_name), tasks:raised_task_id(title)')
      .single();

    if (flagError || !flagData) {
      console.error('Error creating experiment flag:', flagError);
      throw new Error(`Failed to create experiment flag: ${flagError?.message}`);
    }

    // Dispatch in-app notification to the experiment owner
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: experiment.owner_id,
        type: 'ExperimentFlagged',
        channel: 'InApp',
        payload: {
          experimentId: experiment.id,
          experimentName: experiment.name,
          flagType: dto.type,
          note: dto.note.trim(),
          raisedTaskId,
        },
      });
    } catch (notifErr) {
      console.warn('Non-fatal warning: notification dispatch failed:', notifErr);
    }

    return {
      id: flagData.id,
      experimentId: flagData.experiment_id,
      flaggedBy: flagData.flagged_by,
      type: flagData.type,
      note: flagData.note,
      raisedTaskId: flagData.raised_task_id,
      resolvedAt: flagData.resolved_at,
      resolutionNote: flagData.resolution_note,
      createdAt: flagData.created_at,
      flaggedByName: flagData.profiles?.full_name,
      raisedTaskTitle: flagData.tasks?.title || raisedTaskTitle,
    };
  }

  /**
   * List all flags for an experiment
   */
  static async getExperimentFlags(experimentId: string): Promise<ExperimentFlag[]> {
    const { data, error } = await supabaseAdmin
      .from('experiment_flags')
      .select('*, profiles:flagged_by(full_name), tasks:raised_task_id(title)')
      .eq('experiment_id', experimentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch experiment flags: ${error.message}`);
    }

    return (data || []).map((f: any) => ({
      id: f.id,
      experimentId: f.experiment_id,
      flaggedBy: f.flagged_by,
      type: f.type,
      note: f.note,
      raisedTaskId: f.raised_task_id,
      resolvedAt: f.resolved_at,
      resolutionNote: f.resolution_note,
      createdAt: f.created_at,
      flaggedByName: f.profiles?.full_name,
      raisedTaskTitle: f.tasks?.title,
    }));
  }

  /**
   * Resolve an experiment flag
   */
  static async resolveFlag(
    flagId: string,
    resolutionNote: string
  ): Promise<ExperimentFlag> {
    const { data, error } = await supabaseAdmin
      .from('experiment_flags')
      .update({
        resolved_at: new Date().toISOString(),
        resolution_note: resolutionNote.trim(),
      })
      .eq('id', flagId)
      .select('*, profiles:flagged_by(full_name), tasks:raised_task_id(title)')
      .single();

    if (error || !data) {
      throw new Error(`Failed to resolve experiment flag: ${error?.message}`);
    }

    return {
      id: data.id,
      experimentId: data.experiment_id,
      flaggedBy: data.flagged_by,
      type: data.type,
      note: data.note,
      raisedTaskId: data.raised_task_id,
      resolvedAt: data.resolved_at,
      resolutionNote: data.resolution_note,
      createdAt: data.created_at,
      flaggedByName: data.profiles?.full_name,
      raisedTaskTitle: data.tasks?.title,
    };
  }
}
