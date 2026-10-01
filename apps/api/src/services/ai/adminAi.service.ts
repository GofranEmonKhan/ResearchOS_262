/**
 * Admin AI Management Service (Phase 8.8)
 *
 * Implements administrative controls for:
 *  - AI Provider Configuration (provider type, env var apiKeyRef, model, active state)
 *  - Monthly Token Quotas per UserRole
 *  - Global AI Usage & Cost Analytics (by role and top users — zero research content)
 *
 * Security:
 *  - Only accessible to users with the Admin application role.
 *  - Never returns raw API keys or research material.
 */

import { supabaseAdmin } from '../../supabase.js';
import { invalidateProviderCache } from './provider.factory.js';
import type {
  AiProviderConfig,
  AiQuota,
  AdminAiUsageAnalytics,
  UpdateAiProviderConfigRequest,
  UserRole,
} from '@researchos/shared-types';

/**
 * Read the active AI provider configuration.
 */
export async function getAiProviderConfig(): Promise<AiProviderConfig | null> {
  const { data, error } = await supabaseAdmin
    .from('ai_provider_configs')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load AI provider config: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    provider: data.provider,
    apiKeyRef: data.api_key_ref,
    model: data.model,
    isActive: data.is_active,
    updatedBy: data.updated_by,
    updatedAt: data.updated_at,
  };
}

/**
 * Update the AI provider configuration and invalidate runtime cache.
 */
export async function updateAiProviderConfig(
  adminId: string,
  params: UpdateAiProviderConfigRequest
): Promise<AiProviderConfig> {
  const { data: existing } = await supabaseAdmin
    .from('ai_provider_configs')
    .select('id')
    .limit(1)
    .maybeSingle();

  const updates: any = {
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  };

  if (params.provider !== undefined) updates.provider = params.provider;
  if (params.apiKeyRef !== undefined) updates.api_key_ref = params.apiKeyRef;
  if (params.model !== undefined) updates.model = params.model;
  if (params.isActive !== undefined) updates.is_active = params.isActive;

  let savedRow;
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('ai_provider_configs')
      .update(updates)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw new Error(`Failed to update AI provider config: ${error.message}`);
    savedRow = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('ai_provider_configs')
      .insert({
        provider: params.provider ?? 'Gemini',
        api_key_ref: params.apiKeyRef ?? 'GEMINI_API_KEY',
        model: params.model ?? 'gemini-1.5-flash',
        is_active: params.isActive ?? true,
        ...updates,
      })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to insert AI provider config: ${error.message}`);
    savedRow = data;
  }

  // Invalidate provider cache so the next request uses the updated config immediately
  invalidateProviderCache();

  return {
    id: savedRow.id,
    provider: savedRow.provider,
    apiKeyRef: savedRow.api_key_ref,
    model: savedRow.model,
    isActive: savedRow.is_active,
    updatedBy: savedRow.updated_by,
    updatedAt: savedRow.updated_at,
  };
}

/**
 * List monthly token quotas for all roles.
 */
export async function listAiQuotas(): Promise<AiQuota[]> {
  const { data, error } = await supabaseAdmin
    .from('ai_quotas')
    .select('role, monthly_token_limit')
    .order('role');

  if (error) throw new Error(`Failed to list AI quotas: ${error.message}`);

  return (data ?? []).map((r) => ({
    role: r.role as UserRole,
    monthlyTokenLimit: r.monthly_token_limit,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Update the monthly token limit for a specific role.
 */
export async function updateAiQuota(role: UserRole, monthlyTokenLimit: number): Promise<AiQuota> {
  if (typeof monthlyTokenLimit !== 'number' || monthlyTokenLimit < 0) {
    throw new Error('monthlyTokenLimit must be a non-negative number.');
  }

  const { data, error } = await supabaseAdmin
    .from('ai_quotas')
    .upsert({
      role,
      monthly_token_limit: monthlyTokenLimit,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update AI quota: ${error.message}`);

  return {
    role: data.role as UserRole,
    monthlyTokenLimit: data.monthly_token_limit,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Compute global AI usage and cost analytics for the current month.
 */
export async function getAdminAiUsageAnalytics(): Promise<AdminAiUsageAnalytics> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: logs, error } = await supabaseAdmin
    .from('ai_usage_logs')
    .select('user_id, tokens_used, cost_usd, profiles:user_id(id, full_name, role)')
    .gte('created_at', monthStart.toISOString());

  if (error) throw new Error(`Failed to fetch AI usage logs: ${error.message}`);

  const allLogs = logs ?? [];
  let totalTokensThisMonth = 0;
  let totalCostUsdThisMonth = 0;

  const roleMap = new Map<UserRole, { tokens: number; cost: number }>();
  const userMap = new Map<string, { fullName: string; tokens: number; cost: number }>();

  for (const log of allLogs) {
    const tokens = log.tokens_used ?? 0;
    const cost = Number(log.cost_usd ?? 0);

    totalTokensThisMonth += tokens;
    totalCostUsdThisMonth += cost;

    const profile = Array.isArray(log.profiles) ? log.profiles[0] : (log.profiles as any);
    const role: UserRole = profile?.role ?? 'Researcher';
    const fullName: string = profile?.full_name ?? 'Scholar';

    // Aggregate by role
    const currentRole = roleMap.get(role) ?? { tokens: 0, cost: 0 };
    currentRole.tokens += tokens;
    currentRole.cost += cost;
    roleMap.set(role, currentRole);

    // Aggregate by user
    const currentUser = userMap.get(log.user_id) ?? { fullName, tokens: 0, cost: 0 };
    currentUser.tokens += tokens;
    currentUser.cost += cost;
    userMap.set(log.user_id, currentUser);
  }

  const byRole = Array.from(roleMap.entries()).map(([role, stats]) => ({
    role,
    tokensUsed: stats.tokens,
    costUsd: Number(stats.cost.toFixed(6)),
  }));

  const topUsers = Array.from(userMap.entries())
    .map(([userId, stats]) => ({
      userId,
      fullName: stats.fullName,
      tokensUsed: stats.tokens,
      costUsd: Number(stats.cost.toFixed(6)),
    }))
    .sort((a, b) => b.tokensUsed - a.tokensUsed)
    .slice(0, 10);

  return {
    totalTokensThisMonth,
    totalCostUsdThisMonth: Number(totalCostUsdThisMonth.toFixed(6)),
    byRole,
    topUsers,
  };
}
