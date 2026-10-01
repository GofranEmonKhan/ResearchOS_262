/**
 * AI Provider Factory
 *
 * Resolves the active AI provider at runtime by reading the `ai_provider_configs`
 * table. Caches the resolved provider instance for 5 minutes to avoid hitting
 * the DB on every request; cache is invalidated when Admin updates config.
 *
 * Security:
 *  - Only one row may have is_active=true (enforced by DB partial unique index).
 *  - The raw API key is NEVER stored in the DB; apiKeyRef is the env var name.
 *  - If no active provider is configured, all AI features return 503.
 */

import { supabaseAdmin } from '../../supabase.js';
import { GeminiProvider } from './gemini.provider.js';
import type { AIProvider } from './types.js';

interface ProviderCacheEntry {
  provider: AIProvider;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes

let _cache: ProviderCacheEntry | null = null;

/**
 * Returns the currently active AI provider.
 * Throws a 503-style error if no provider is configured and active.
 */
export async function getActiveProvider(): Promise<AIProvider> {
  const now = Date.now();

  if (_cache && _cache.expiresAt > now) {
    return _cache.provider;
  }

  const { data, error } = await supabaseAdmin
    .from('ai_provider_configs')
    .select('provider, api_key_ref, model')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`AI provider lookup failed: ${error.message}`);
  }

  if (!data) {
    throw new ProviderNotConfiguredError(
      'No active AI provider is configured. ' +
      'An Admin must activate a provider via PATCH /admin/ai/config.'
    );
  }

  const provider = buildProvider(data.provider, data.api_key_ref, data.model);

  _cache = { provider, expiresAt: now + CACHE_TTL_MS };
  return provider;
}

/**
 * Invalidate the provider cache (call after Admin updates ai_provider_configs).
 */
export function invalidateProviderCache(): void {
  _cache = null;
}

// ─── Internal ────────────────────────────────────────────────────────────────

function buildProvider(provider: string, apiKeyRef: string, model: string): AIProvider {
  switch (provider) {
    case 'Gemini':
      return new GeminiProvider(apiKeyRef, model);
    case 'OpenAI':
      // OpenAI implementation can be added here without touching any other file
      throw new Error('OpenAI provider is not yet implemented. Use Gemini.');
    default:
      throw new Error(`Unknown AI provider: "${provider}"`);
  }
}

// ─── Typed error for 503 responses ──────────────────────────────────────────

export class ProviderNotConfiguredError extends Error {
  readonly statusCode = 503;
  constructor(message: string) {
    super(message);
    this.name = 'ProviderNotConfiguredError';
  }
}
