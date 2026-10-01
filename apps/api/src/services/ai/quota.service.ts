/**
 * Quota Service
 *
 * Enforces monthly per-role token quotas server-side.
 * Quota check always runs BEFORE the provider call.
 * Quota deduction (via usage log) runs AFTER a successful provider call.
 *
 * Never trusts a client-supplied quota value.
 */

import { supabaseAdmin } from '../../supabase.js';
import type { UserRole } from '@researchos/shared-types';

export class QuotaExceededError extends Error {
  readonly statusCode = 429;
  constructor(used: number, limit: number, role: UserRole) {
    super(
      `Monthly AI token quota exceeded for role "${role}". ` +
      `Used: ${used.toLocaleString()}, Limit: ${limit.toLocaleString()}.`
    );
    this.name = 'QuotaExceededError';
  }
}

/**
 * Check if the user has sufficient token quota remaining for the current month.
 * Throws QuotaExceededError (429) if quota is exceeded.
 *
 * @param userId  - verified user id from JWT
 * @param role    - current role from live profiles lookup
 * @param needed  - estimated tokens needed for this request (0 = just check)
 */
export async function checkQuota(
  userId: string,
  role: UserRole,
  needed = 0
): Promise<void> {
  // 1. Load the monthly limit for this role
  const { data: quotaRow, error: quotaErr } = await supabaseAdmin
    .from('ai_quotas')
    .select('monthly_token_limit')
    .eq('role', role)
    .maybeSingle();

  if (quotaErr) throw new Error(`Quota lookup failed: ${quotaErr.message}`);

  const limit = quotaRow?.monthly_token_limit ?? 0;

  // Admin quota is 0 — Admins do not use research AI features
  if (limit === 0) {
    throw new QuotaExceededError(0, 0, role);
  }

  // 2. Sum tokens used this calendar month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: usageRows, error: usageErr } = await supabaseAdmin
    .from('ai_usage_logs')
    .select('tokens_used')
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString());

  if (usageErr) throw new Error(`Usage lookup failed: ${usageErr.message}`);

  const totalUsed = (usageRows ?? []).reduce((sum, r) => sum + (r.tokens_used ?? 0), 0);

  if (totalUsed + needed > limit) {
    throw new QuotaExceededError(totalUsed, limit, role);
  }
}

/**
 * Append a usage log row.
 * Call AFTER a successful provider call (or for a blocked-prompt event).
 * Failure to log is non-blocking — errors are logged to console but not thrown.
 */
export async function logUsage(params: {
  userId: string;
  feature: string;
  tokensUsed: number;
  costUsd?: number;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from('ai_usage_logs')
    .insert({
      user_id:     params.userId,
      feature:     params.feature,
      tokens_used: params.tokensUsed,
      cost_usd:    params.costUsd ?? null,
    });

  if (error) {
    // Non-fatal: log to console but do not surface to user
    console.error('[AI] Failed to write usage log:', error.message);
  }
}

/**
 * Return the usage summary for a single user.
 * Used by GET /ai/usage.
 */
export async function getUserUsageSummary(userId: string, role: UserRole) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [quotaResult, usageResult] = await Promise.all([
    supabaseAdmin
      .from('ai_quotas')
      .select('monthly_token_limit')
      .eq('role', role)
      .maybeSingle(),
    supabaseAdmin
      .from('ai_usage_logs')
      .select('id, feature, tokens_used, cost_usd, created_at')
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const limit = quotaResult.data?.monthly_token_limit ?? 0;
  const logs = usageResult.data ?? [];
  const tokensUsedThisMonth = logs.reduce((sum, r) => sum + (r.tokens_used ?? 0), 0);

  return {
    tokensUsedThisMonth,
    monthlyLimit: limit,
    percentUsed: limit > 0 ? Math.round((tokensUsedThisMonth / limit) * 100) : 0,
    recentLogs: logs.map(r => ({
      id:          r.id,
      userId,
      feature:     r.feature,
      tokensUsed:  r.tokens_used,
      costUsd:     r.cost_usd,
      createdAt:   r.created_at,
    })),
  };
}
