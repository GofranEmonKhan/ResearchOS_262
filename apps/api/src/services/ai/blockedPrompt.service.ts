/**
 * Blocked-Prompt Service
 *
 * Evaluates assembled prompts against admin-defined rules BEFORE sending
 * to the AI provider. Matching is case-insensitive substring only (no regex,
 * to avoid ReDoS risk).
 *
 * If a rule matches:
 *  - Return 400 with a generic "content policy" message
 *  - Log a usage row with tokens_used=0 and feature='blocked:<ruleId>'
 *  - Never reveal the specific rule pattern to the caller
 *
 * Rules are cached for 2 minutes to avoid hitting the DB on every call.
 */

import { supabaseAdmin } from '../../supabase.js';

interface CachedRules {
  rules: Array<{ id: string; pattern: string }>;
  expiresAt: number;
}

const CACHE_TTL_MS = 2 * 60 * 1000;  // 2 minutes
let _ruleCache: CachedRules | null = null;

export class PromptBlockedError extends Error {
  readonly statusCode = 400;
  readonly ruleId: string;
  constructor(ruleId: string) {
    super('Request blocked by content policy.');
    this.name = 'PromptBlockedError';
    this.ruleId = ruleId;
  }
}

/**
 * Load blocked-prompt rules from DB (with cache).
 */
async function loadRules(): Promise<Array<{ id: string; pattern: string }>> {
  const now = Date.now();
  if (_ruleCache && _ruleCache.expiresAt > now) {
    return _ruleCache.rules;
  }

  const { data, error } = await supabaseAdmin
    .from('blocked_prompt_rules')
    .select('id, pattern');

  if (error) {
    console.error('[AI] Failed to load blocked-prompt rules:', error.message);
    return [];  // fail-open: don't block all AI requests if DB is briefly unavailable
  }

  const rules = (data ?? []).map(r => ({ id: r.id, pattern: r.pattern }));
  _ruleCache = { rules, expiresAt: now + CACHE_TTL_MS };
  return rules;
}

/**
 * Check the assembled prompt against all active blocked-prompt rules.
 * Throws PromptBlockedError if a rule matches.
 *
 * @param prompt  - The full assembled prompt string to evaluate
 */
export async function checkPrompt(prompt: string): Promise<void> {
  const rules = await loadRules();
  const lower = prompt.toLowerCase();

  for (const rule of rules) {
    if (lower.includes(rule.pattern.toLowerCase())) {
      throw new PromptBlockedError(rule.id);
    }
  }
}

/**
 * Invalidate the rule cache (call after Admin creates/deletes a rule).
 */
export function invalidateRuleCache(): void {
  _ruleCache = null;
}

// ─── Admin CRUD ──────────────────────────────────────────────────────────────

export async function listBlockedRules() {
  const { data, error } = await supabaseAdmin
    .from('blocked_prompt_rules')
    .select('id, pattern, reason, created_by, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createBlockedRule(params: {
  pattern: string;
  reason: string;
  createdBy: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('blocked_prompt_rules')
    .insert({
      pattern:    params.pattern,
      reason:     params.reason,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Invalidate cache so new rule is applied immediately
  invalidateRuleCache();
  return data;
}

export async function deleteBlockedRule(ruleId: string) {
  const { error } = await supabaseAdmin
    .from('blocked_prompt_rules')
    .delete()
    .eq('id', ruleId);

  if (error) throw new Error(error.message);

  invalidateRuleCache();
}
