import { supabaseAdmin } from '../supabase.js';
import {
  Experiment,
  CreateExperimentDto,
  UpdateExperimentDto,
  ExperimentSearchParams,
  ExperimentListResponse,
  ExperimentComparisonResponse,
  AlignedParameterRow,
  AlignedMetricRow,
  EXPERIMENT_PURPOSES,
} from '@researchos/shared-types';

export class ExperimentService {
  /**
   * Helper to map DB row to shared Experiment type
   */
  private static mapExperiment(row: any): Experiment {
    return {
      id: row.id,
      projectId: row.project_id,
      ownerId: row.owner_id,
      name: row.name,
      purpose: row.purpose,
      hypothesis: row.hypothesis,
      date: row.date,
      config: row.config || {},
      metrics: row.metrics || {},
      outputFileIds: row.output_file_ids || [],
      observation: row.observation,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ownerName: row.profiles?.full_name || row.owner_name,
      ownerAvatarUrl: row.profiles?.photo_url || row.owner_avatar_url,
      projectName: row.projects?.title || row.project_name,
    };
  }

  /**
   * List experiments for a project with optional filters and search
   */
  static async getProjectExperiments(
    projectId: string,
    params: ExperimentSearchParams
  ): Promise<ExperimentListResponse> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('experiments')
      .select('*, profiles:owner_id(full_name, photo_url), projects:project_id(title)', { count: 'exact' })
      .eq('project_id', projectId);

    if (params.purpose) {
      query = query.eq('purpose', params.purpose);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.fromDate) {
      query = query.gte('date', params.fromDate);
    }

    if (params.toDate) {
      query = query.lte('date', params.toDate);
    }

    if (params.search && params.search.trim().length > 0) {
      const term = `%${params.search.trim()}%`;
      query = query.or(`name.ilike.${term},hypothesis.ilike.${term},observation.ilike.${term}`);
    }

    query = query.order('date', { ascending: false }).order('created_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching project experiments:', error);
      throw new Error(`Failed to fetch experiments: ${error.message}`);
    }

    const experiments = (data || []).map(this.mapExperiment);
    const total = count || 0;

    return {
      experiments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single experiment by ID with enriched details (flags, linked tasks, output files)
   */
  static async getExperimentById(experimentId: string): Promise<Experiment> {
    const { data: experimentRow, error } = await supabaseAdmin
      .from('experiments')
      .select('*, profiles:owner_id(full_name, photo_url), projects:project_id(title)')
      .eq('id', experimentId)
      .single();

    if (error || !experimentRow) {
      throw new Error('Experiment not found');
    }

    const experiment = this.mapExperiment(experimentRow);

    // Fetch flags
    const { data: flagsData } = await supabaseAdmin
      .from('experiment_flags')
      .select('*, profiles:flagged_by(full_name), tasks:raised_task_id(title)')
      .eq('experiment_id', experimentId)
      .order('created_at', { ascending: false });

    experiment.flags = (flagsData || []).map((f: any) => ({
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

    // Fetch linked tasks
    const { data: linksData } = await supabaseAdmin
      .from('task_experiment_links')
      .select('task_id, tasks:task_id(id, title, status)')
      .eq('experiment_id', experimentId);

    experiment.linkedTasks = (linksData || [])
      .filter((l: any) => l.tasks)
      .map((l: any) => ({
        id: l.tasks.id,
        title: l.tasks.title,
        status: l.tasks.status,
      }));

    // Fetch output files from file_assets if any
    if (experiment.outputFileIds && experiment.outputFileIds.length > 0) {
      const { data: filesData } = await supabaseAdmin
        .from('file_assets')
        .select('*')
        .in('id', experiment.outputFileIds);

      experiment.outputFiles = (filesData || []).map((f: any) => ({
        id: f.id,
        ownerId: f.owner_id,
        storagePath: f.storage_path,
        fileName: f.file_name,
        mimeType: f.mime_type,
        sizeBytes: Number(f.size_bytes),
        createdAt: f.created_at || f.uploaded_at || new Date().toISOString(),
      }));
    } else {
      experiment.outputFiles = [];
    }

    // Comments count
    const { count: commentsCount } = await supabaseAdmin
      .from('experiment_comments')
      .select('*', { count: 'exact', head: true })
      .eq('experiment_id', experimentId);

    experiment.commentsCount = commentsCount || 0;

    return experiment;
  }

  /**
   * Create a new experiment
   */
  static async createExperiment(
    projectId: string,
    dto: CreateExperimentDto,
    ownerId: string,
    userRole: string
  ): Promise<Experiment> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new Error('Experiment name is required');
    }

    if (!dto.purpose || !EXPERIMENT_PURPOSES[dto.purpose]) {
      throw new Error(`Invalid experiment purpose: ${dto.purpose}`);
    }

    // Check project exists and get ownership/type
    const { data: project, error: projError } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id, is_personal')
      .eq('id', projectId)
      .single();

    if (projError || !project) {
      throw new Error('Project not found');
    }

    // Permission check: In supervised projects, only Researcher can create experiments (AC-2)
    if (!project.is_personal && userRole === 'Supervisor') {
      const error: any = new Error('Supervisors cannot create experiments in supervised projects (Supervisor governs, Researcher executes)');
      error.statusCode = 403;
      throw error;
    }

    // Validate metrics: Must be flat key-value map
    const metrics = dto.metrics || {};
    for (const [key, val] of Object.entries(metrics)) {
      if (typeof val === 'object' && val !== null) {
        throw new Error(`Metric '${key}' must be a numeric or string value, not a nested object`);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('experiments')
      .insert({
        project_id: projectId,
        owner_id: ownerId,
        name: dto.name.trim(),
        purpose: dto.purpose,
        hypothesis: dto.hypothesis?.trim() || null,
        date: dto.date || new Date().toISOString().split('T')[0],
        config: dto.config || {},
        metrics: metrics,
        output_file_ids: dto.outputFileIds || [],
        observation: dto.observation?.trim() || null,
        status: dto.status === 'Final' ? 'Final' : 'Draft',
      })
      .select('*, profiles:owner_id(full_name, photo_url), projects:project_id(title)')
      .single();

    if (error) {
      console.error('Error creating experiment:', error);
      throw new Error(`Failed to create experiment: ${error.message}`);
    }

    return this.mapExperiment(data);
  }

  /**
   * Update an experiment (Draft status only)
   */
  static async updateExperiment(
    experimentId: string,
    dto: UpdateExperimentDto
  ): Promise<Experiment> {
    const updatePayload: Record<string, any> = {};

    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new Error('Experiment name cannot be empty');
      }
      updatePayload.name = dto.name.trim();
    }

    if (dto.purpose !== undefined) {
      if (!EXPERIMENT_PURPOSES[dto.purpose]) {
        throw new Error(`Invalid experiment purpose: ${dto.purpose}`);
      }
      updatePayload.purpose = dto.purpose;
    }

    if (dto.hypothesis !== undefined) {
      updatePayload.hypothesis = dto.hypothesis ? dto.hypothesis.trim() : null;
    }

    if (dto.date !== undefined) {
      updatePayload.date = dto.date;
    }

    if (dto.config !== undefined) {
      updatePayload.config = dto.config;
    }

    if (dto.metrics !== undefined) {
      for (const [key, val] of Object.entries(dto.metrics)) {
        if (typeof val === 'object' && val !== null) {
          throw new Error(`Metric '${key}' must be a numeric or string value, not a nested object`);
        }
      }
      updatePayload.metrics = dto.metrics;
    }

    if (dto.outputFileIds !== undefined) {
      updatePayload.output_file_ids = dto.outputFileIds;
    }

    if (dto.observation !== undefined) {
      updatePayload.observation = dto.observation ? dto.observation.trim() : null;
    }

    const { data, error } = await supabaseAdmin
      .from('experiments')
      .update(updatePayload)
      .eq('id', experimentId)
      .select('*, profiles:owner_id(full_name, photo_url), projects:project_id(title)')
      .single();

    if (error) {
      console.error('Error updating experiment:', error);
      throw new Error(`Failed to update experiment: ${error.message}`);
    }

    return this.mapExperiment(data);
  }

  /**
   * Delete a draft experiment and clean up associated file assets
   */
  static async deleteExperiment(experimentId: string): Promise<void> {
    // Get experiment to check output files
    const { data: experiment } = await supabaseAdmin
      .from('experiments')
      .select('output_file_ids')
      .eq('id', experimentId)
      .single();

    // Clean up output files from Storage & file_assets if any
    if (experiment?.output_file_ids && experiment.output_file_ids.length > 0) {
      try {
        const { data: fileAssets } = await supabaseAdmin
          .from('file_assets')
          .select('id, storage_path')
          .in('id', experiment.output_file_ids);

        if (fileAssets && fileAssets.length > 0) {
          const storagePaths = fileAssets.map((f: any) => f.storage_path);
          await supabaseAdmin.storage.from('experiments').remove(storagePaths);
          await supabaseAdmin.from('file_assets').delete().in('id', experiment.output_file_ids);
        }
      } catch (cleanupErr) {
        console.warn('Non-fatal warning: failed to cleanup storage assets for deleted experiment:', cleanupErr);
      }
    }

    const { error } = await supabaseAdmin
      .from('experiments')
      .delete()
      .eq('id', experimentId);

    if (error) {
      console.error('Error deleting experiment:', error);
      throw new Error(`Failed to delete experiment: ${error.message}`);
    }
  }

  /**
   * Finalize an experiment (permanently locks it from editing/deletion)
   */
  static async finalizeExperiment(experimentId: string): Promise<Experiment> {
    const { data, error } = await supabaseAdmin
      .from('experiments')
      .update({ status: 'Final' })
      .eq('id', experimentId)
      .select('*, profiles:owner_id(full_name, photo_url), projects:project_id(title)')
      .single();

    if (error) {
      console.error('Error finalizing experiment:', error);
      throw new Error(`Failed to finalize experiment: ${error.message}`);
    }

    return this.mapExperiment(data);
  }

  /**
   * Compare 2 to 5 experiments side-by-side
   */
  static async compareExperiments(
    experimentIds: string[],
    userId: string,
    userRole: string
  ): Promise<ExperimentComparisonResponse> {
    // Validation: 2 to 5 experiments required (AC-9, AC-10)
    if (!experimentIds || experimentIds.length < 2 || experimentIds.length > 5) {
      const error: any = new Error('Comparison requires between 2 and 5 experiments.');
      error.statusCode = 400;
      throw error;
    }

    // Admin privacy rule
    if (userRole === 'Admin') {
      const error: any = new Error('Admins cannot access experimental research data (AC-18 Privacy Rule).');
      error.statusCode = 403;
      throw error;
    }

    // Fetch experiments
    const { data: rows, error } = await supabaseAdmin
      .from('experiments')
      .select('*, profiles:owner_id(full_name, photo_url), projects:project_id(title)')
      .in('id', experimentIds);

    if (error || !rows || rows.length !== experimentIds.length) {
      const error: any = new Error('One or more experiments were not found.');
      error.statusCode = 404;
      throw error;
    }

    // Verify access for each experiment's project
    for (const row of rows) {
      if (row.owner_id === userId) continue;

      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', row.project_id)
        .single();

      if (project?.owner_id === userId) continue;

      const { data: member } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('project_id', row.project_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!member) {
        const err: any = new Error('Access denied: You do not have permission to access all selected experiments.');
        err.statusCode = 403;
        throw err;
      }
    }

    const experiments = rows.map(this.mapExperiment);

    // 1. Parameter Alignment Matrix
    const parameterMatrix: AlignedParameterRow[] = [];

    // Core config keys
    const coreParams: { key: string; group: AlignedParameterRow['group'] }[] = [
      { key: 'model', group: 'model' },
      { key: 'dataset', group: 'dataset' },
      { key: 'hardware', group: 'hardware' },
      { key: 'codeCommit', group: 'codeCommit' },
      { key: 'environmentNotes', group: 'environment' },
    ];

    for (const { key, group } of coreParams) {
      const values: Record<string, string | number | boolean | null> = {};
      const distinctValues = new Set<string>();

      for (const exp of experiments) {
        const val = exp.config?.[key] ?? null;
        values[exp.id] = val;
        if (val !== null) distinctValues.add(String(val));
      }

      parameterMatrix.push({
        parameterKey: key,
        group,
        isIdentical: distinctValues.size <= 1,
        values,
      });
    }

    // Hyperparameters Alignment
    const hyperparameterKeys = new Set<string>();
    for (const exp of experiments) {
      if (exp.config?.hyperparameters && typeof exp.config.hyperparameters === 'object') {
        for (const hpKey of Object.keys(exp.config.hyperparameters)) {
          hyperparameterKeys.add(hpKey);
        }
      }
    }

    for (const hpKey of Array.from(hyperparameterKeys).sort()) {
      const values: Record<string, string | number | boolean | null> = {};
      const distinctValues = new Set<string>();

      for (const exp of experiments) {
        const val = exp.config?.hyperparameters?.[hpKey] ?? null;
        values[exp.id] = val;
        if (val !== null) distinctValues.add(String(val));
      }

      parameterMatrix.push({
        parameterKey: hpKey,
        group: 'hyperparameter',
        isIdentical: distinctValues.size <= 1,
        values,
      });
    }

    // 2. Metrics Alignment Matrix
    const metricKeys = new Set<string>();
    for (const exp of experiments) {
      if (exp.metrics && typeof exp.metrics === 'object') {
        for (const mKey of Object.keys(exp.metrics)) {
          metricKeys.add(mKey);
        }
      }
    }

    const metricMatrix: AlignedMetricRow[] = [];
    for (const mKey of Array.from(metricKeys).sort()) {
      const values: Record<string, number | string | null> = {};
      let isNumeric = true;
      const numValues: { expId: string; val: number }[] = [];

      for (const exp of experiments) {
        const rawVal = exp.metrics?.[mKey];
        if (rawVal === undefined || rawVal === null) {
          values[exp.id] = null;
        } else if (typeof rawVal === 'number') {
          values[exp.id] = rawVal;
          numValues.push({ expId: exp.id, val: rawVal });
        } else {
          // Check if string can be parsed as number
          const parsed = Number(rawVal);
          if (!isNaN(parsed) && rawVal.trim().length > 0) {
            values[exp.id] = parsed;
            numValues.push({ expId: exp.id, val: parsed });
          } else {
            isNumeric = false;
            values[exp.id] = String(rawVal);
          }
        }
      }

      let min: number | undefined;
      let max: number | undefined;
      let bestExperimentId: string | undefined;

      if (isNumeric && numValues.length > 0) {
        min = Math.min(...numValues.map((n) => n.val));
        max = Math.max(...numValues.map((n) => n.val));

        // For loss or error metrics, best is min; for accuracy/f1/r2, best is max
        const lowerKey = mKey.toLowerCase();
        const isLossMetric = lowerKey.includes('loss') || lowerKey.includes('error') || lowerKey.includes('rmse') || lowerKey.includes('mae');
        const targetVal = isLossMetric ? min : max;
        bestExperimentId = numValues.find((n) => n.val === targetVal)?.expId;
      }

      metricMatrix.push({
        metricKey: mKey,
        isNumeric,
        values,
        min,
        max,
        bestExperimentId,
      });
    }

    const differingParametersCount = parameterMatrix.filter((p) => !p.isIdentical).length;
    const commonParametersCount = parameterMatrix.filter((p) => p.isIdentical).length;

    // Detect common dataset if identical
    const datasetRow = parameterMatrix.find((p) => p.parameterKey === 'dataset');
    const commonDataset = datasetRow?.isIdentical ? String(Object.values(datasetRow.values)[0] || '') : undefined;

    return {
      experiments,
      parameterMatrix,
      metricMatrix,
      summary: {
        totalCompared: experiments.length,
        differingParametersCount,
        commonParametersCount,
        commonDataset,
      },
    };
  }

  /**
   * Link an experiment to a task
   */
  static async linkTask(taskId: string, experimentId: string, userId: string): Promise<void> {
    // Verify task exists and caller has access
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('id, project_id, assignee_id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new Error('Task not found');
    }

    // Verify experiment exists
    const { data: experiment, error: expError } = await supabaseAdmin
      .from('experiments')
      .select('id, project_id')
      .eq('id', experimentId)
      .single();

    if (expError || !experiment) {
      throw new Error('Experiment not found');
    }

    // Projects must match
    if (task.project_id !== experiment.project_id) {
      throw new Error('Task and Experiment must belong to the same project');
    }

    const { error: insertError } = await supabaseAdmin
      .from('task_experiment_links')
      .insert({ task_id: taskId, experiment_id: experimentId });

    if (insertError && !insertError.message.includes('duplicate key')) {
      throw new Error(`Failed to link task and experiment: ${insertError.message}`);
    }
  }

  /**
   * Unlink an experiment from a task
   */
  static async unlinkTask(taskId: string, experimentId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('task_experiment_links')
      .delete()
      .eq('task_id', taskId)
      .eq('experiment_id', experimentId);

    if (error) {
      throw new Error(`Failed to unlink task and experiment: ${error.message}`);
    }
  }
}
