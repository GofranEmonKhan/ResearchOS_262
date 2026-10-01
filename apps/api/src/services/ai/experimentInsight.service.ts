/**
 * Experiment Insight Service (Phase 8.6)
 *
 * Implements natural-language analysis and interpretation of experiment data:
 *  - Metric outcomes and trends
 *  - Hypothesis validation and anomaly detection
 *  - Scientific interpretation
 *  - Actionable suggestions for subsequent experimental iterations
 *
 * Security & Access Rules:
 *  - User must be the experiment owner or project supervisor (enforced via requireExperimentViewer).
 *  - Output is plain informational text (no AiSuggestion row created).
 *  - Quota and content policy rules are strictly enforced.
 */

import { supabaseAdmin } from '../../supabase.js';
import type { UserRole, ExperimentInsightResponse } from '@researchos/shared-types';
import { getActiveProvider } from './provider.factory.js';
import { checkQuota, logUsage } from './quota.service.js';
import { checkPrompt } from './blockedPrompt.service.js';

export async function generateExperimentInsight(params: {
  userId: string;
  userRole: UserRole;
  experimentId: string;
}): Promise<ExperimentInsightResponse> {
  const { userId, userRole, experimentId } = params;

  // 1. Quota check (~1200 estimated tokens)
  await checkQuota(userId, userRole, 1200);

  // 2. Fetch experiment record
  const { data: experiment, error: expErr } = await supabaseAdmin
    .from('experiments')
    .select('id, name, purpose, hypothesis, status, config, metrics, observation, date')
    .eq('id', experimentId)
    .maybeSingle();

  if (expErr || !experiment) {
    throw new Error(`Experiment not found: ${expErr?.message ?? 'unknown'}`);
  }

  // 3. Assemble prompts
  const systemPrompt =
    'You are an expert scientific research advisor and quantitative data analyst. ' +
    'Analyze the provided experiment configuration, hypothesis, observations, and metrics. ' +
    'Provide a structured, rigorous scientific interpretation with clear markdown headings:\n' +
    '### Metric Outcomes & Trends\n' +
    '### Hypothesis Evaluation & Anomalies\n' +
    '### Scientific Interpretation\n' +
    '### Recommended Next Iterations';

  const userPrompt =
    `Analyze this scientific experiment:\n\n` +
    `- Name: ${experiment.name}\n` +
    `- Purpose: ${experiment.purpose}\n` +
    `- Status: ${experiment.status}\n` +
    `- Date: ${experiment.date}\n` +
    `- Hypothesis: ${experiment.hypothesis || 'None specified'}\n` +
    `- Observations: ${experiment.observation || 'None recorded'}\n` +
    `- Configuration / Hyperparameters: ${JSON.stringify(experiment.config, null, 2)}\n` +
    `- Recorded Metrics: ${JSON.stringify(experiment.metrics, null, 2)}\n`;

  // 4. Content policy check
  await checkPrompt(userPrompt);

  // 5. Provider call
  const provider = await getActiveProvider();
  const genResult = await provider.generate({
    prompt: userPrompt,
    systemPrompt,
    maxTokens: 1000,
  });

  const insight = genResult.text.trim();

  // 6. Log usage
  await logUsage({
    userId,
    feature: 'experiment_insight',
    tokensUsed: genResult.tokensUsed,
  });

  return {
    experimentId,
    insight,
    tokensUsed: genResult.tokensUsed,
  };
}
