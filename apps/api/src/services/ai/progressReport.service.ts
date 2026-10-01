/**
 * Supervisor Progress Report Service (Phase 8.7)
 *
 * Assembles graduate student progress within a supervised project across:
 *  - Approved tasks (status = 'Approved')
 *  - Experiments run and their metrics
 *  - Papers read / deeply analyzed
 *
 * Privacy & Security Constraints:
 *  - Supervisor only (enforced via requireProjectOwnerSupervisor).
 *  - NEVER includes personal_notes or admin-only data.
 *  - Caches generated reports in public.progress_reports.
 *  - Returns cached report unless regenerate=true is specified.
 */

import { supabaseAdmin } from '../../supabase.js';
import type {
  UserRole,
  ProgressReport,
  GenerateProgressReportRequest,
} from '@researchos/shared-types';
import { getActiveProvider } from './provider.factory.js';
import { checkQuota, logUsage } from './quota.service.js';
import { checkPrompt } from './blockedPrompt.service.js';

export async function generateStudentProgressReport(params: {
  userId: string;
  userRole: UserRole;
  projectId: string;
  body: GenerateProgressReportRequest;
}): Promise<ProgressReport> {
  const { userId, userRole, projectId, body } = params;
  const { studentId, periodStart, periodEnd, regenerate = false } = body;

  // 1. Validation
  if (!studentId) {
    throw new Error('studentId is required.');
  }
  if (!periodStart || !periodEnd) {
    throw new Error('periodStart and periodEnd dates are required (YYYY-MM-DD).');
  }
  if (new Date(periodStart) > new Date(periodEnd)) {
    throw new Error('periodStart cannot be after periodEnd.');
  }

  // 2. Check cache first (unless regenerate=true)
  if (!regenerate) {
    const { data: cachedReport } = await supabaseAdmin
      .from('progress_reports')
      .select('*')
      .eq('project_id', projectId)
      .eq('student_id', studentId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle();

    if (cachedReport) {
      return formatProgressReport(cachedReport);
    }
  }

  // 3. Quota check
  await checkQuota(userId, userRole, 2500);

  // 4. Fetch Student Profile
  const { data: student, error: studentErr } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, department, institution')
    .eq('id', studentId)
    .maybeSingle();

  if (studentErr || !student) {
    throw new Error(`Student not found: ${studentErr?.message ?? 'unknown'}`);
  }

  // 5. Fetch Project Title
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('title')
    .eq('id', projectId)
    .single();

  // 6. Assemble Progress Data
  // (a) Approved Tasks only
  const { data: approvedTasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, description, priority, due_date, updated_at')
    .eq('project_id', projectId)
    .eq('assignee_id', studentId)
    .eq('status', 'Approved')
    .gte('updated_at', `${periodStart}T00:00:00.000Z`)
    .lte('updated_at', `${periodEnd}T23:59:59.999Z`);

  // (b) Experiments conducted by student
  const { data: experiments } = await supabaseAdmin
    .from('experiments')
    .select('name, purpose, status, date, hypothesis, metrics, observation')
    .eq('project_id', projectId)
    .eq('owner_id', studentId)
    .gte('date', periodStart)
    .lte('date', periodEnd);

  // (c) Papers read by student
  const { data: papers } = await supabaseAdmin
    .from('papers')
    .select('title, authors, year, reading_status, venue')
    .eq('uploader_id', studentId)
    .in('reading_status', ['Read', 'DeeplyAnalysed'])
    .gte('created_at', `${periodStart}T00:00:00.000Z`)
    .lte('created_at', `${periodEnd}T23:59:59.999Z`);

  // 7. Build LLM Prompts
  const systemPrompt =
    'You are an expert academic research supervisor. Generate an executive progress report summarizing the graduate student\'s achievements, completed milestones, experimental results, and literature reading during the specified reporting period.\n' +
    'Format your response in professional markdown with the following section headings:\n' +
    '### Executive Summary\n' +
    '### Completed Tasks & Milestones\n' +
    '### Experimental Progress & Findings\n' +
    '### Literature & Theoretical Grounding\n' +
    '### Supervisor Assessment & Recommendations for Next Period';

  const userPrompt =
    `Generate a comprehensive student progress report for the following period:\n\n` +
    `- Project: ${project?.title ?? 'Research Project'}\n` +
    `- Student: ${student.full_name} (${student.department ?? ''} ${student.institution ?? ''})\n` +
    `- Reporting Period: ${periodStart} to ${periodEnd}\n\n` +
    `#### Approved Tasks (${approvedTasks?.length ?? 0} completed):\n` +
    (approvedTasks && approvedTasks.length > 0
      ? approvedTasks.map((t) => `* **${t.title}** (Priority: ${t.priority}, Due: ${t.due_date}): ${t.description || 'No description'}`).join('\n')
      : 'No tasks approved in this timeframe.') +
    `\n\n#### Experiments Conducted (${experiments?.length ?? 0}):\n` +
    (experiments && experiments.length > 0
      ? experiments.map((e) => `* **${e.name}** [${e.status}] (${e.purpose}, Date: ${e.date}):\n  - Hypothesis: ${e.hypothesis || 'N/A'}\n  - Metrics: ${JSON.stringify(e.metrics)}\n  - Observations: ${e.observation || 'N/A'}`).join('\n')
      : 'No experiments logged in this timeframe.') +
    `\n\n#### Literature Analyzed (${papers?.length ?? 0}):\n` +
    (papers && papers.length > 0
      ? papers.map((p) => `* *${p.title}* (${p.year ?? 'N/A'}) [Status: ${p.reading_status}] by ${(p.authors ?? []).join(', ') || 'Unknown'}`).join('\n')
      : 'No papers marked Read/DeeplyAnalysed in this timeframe.');

  // 8. Content policy check
  await checkPrompt(userPrompt);

  // 9. Provider call
  const provider = await getActiveProvider();
  const genResult = await provider.generate({
    prompt: userPrompt,
    systemPrompt,
    maxTokens: 2000,
  });

  const content = genResult.text.trim();

  // 10. Upsert into public.progress_reports
  const { data: upsertedReport, error: saveErr } = await supabaseAdmin
    .from('progress_reports')
    .upsert(
      {
        project_id: projectId,
        student_id: studentId,
        generated_by: userId,
        period_start: periodStart,
        period_end: periodEnd,
        content,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: 'project_id,student_id,period_start,period_end',
      }
    )
    .select('*')
    .single();

  if (saveErr || !upsertedReport) {
    throw new Error(`Failed to save progress report: ${saveErr?.message ?? 'unknown'}`);
  }

  // 11. Log usage
  await logUsage({
    userId,
    feature: 'progress_report',
    tokensUsed: genResult.tokensUsed,
  });

  return formatProgressReport(upsertedReport);
}

function formatProgressReport(row: any): ProgressReport {
  return {
    id: row.id,
    projectId: row.project_id,
    studentId: row.student_id,
    generatedBy: row.generated_by,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    content: row.content,
    createdAt: row.created_at,
  };
}
