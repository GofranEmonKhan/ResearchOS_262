/**
 * AI Provider Adapter — Provider-Agnostic Interface
 *
 * All AI provider implementations (Gemini, OpenAI, …) must implement this
 * interface. No route or service outside this `ai/` directory should import
 * provider-specific packages directly.
 */

// ─── Embedding ─────────────────────────────────────────────────────────────

export interface EmbedRequest {
  texts: string[];
}

export interface EmbedResult {
  embeddings: number[][];   // parallel array — embeddings[i] matches texts[i]
  tokensUsed: number;
}

// ─── Text Generation ────────────────────────────────────────────────────────

export interface GenerateRequest {
  prompt: string;
  /** Optional system instruction (injected as the first turn for Gemini) */
  systemPrompt?: string;
  /** Max tokens to generate. Default: 1024. */
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  tokensUsed: number;       // input + output tokens
  finishReason?: string;
}

// ─── Provider Adapter Contract ──────────────────────────────────────────────

export interface AIProvider {
  readonly providerName: string;

  /**
   * Generate dense vector embeddings for one or more text chunks.
   * Output dimensionality must match the `vector(N)` column in `embeddings`.
   * Gemini text-embedding-004 → 768-dim.
   */
  embed(req: EmbedRequest): Promise<EmbedResult>;

  /**
   * Generate a text completion from a prompt (and optional system prompt).
   * Used for summarization, suggestions, writing assistance, and progress
   * report generation.
   */
  generate(req: GenerateRequest): Promise<GenerateResult>;
}

// ─── Cost Estimation ────────────────────────────────────────────────────────

/**
 * Estimate cost in USD from token counts.
 * Gemini 1.5-Flash free tier: $0 — returns 0 for all free-tier calls.
 * Extend this when paid providers are added.
 */
export type CostEstimator = (tokens: number, provider: string, model: string) => number;
