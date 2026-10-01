/**
 * Gemini AI Provider Implementation
 *
 * Uses @google/generative-ai SDK.
 * Active model for text: gemini-1.5-flash (free tier)
 * Active model for embeddings: text-embedding-004 (768-dim, free tier)
 *
 * Security:
 *  - API key is read from process.env[apiKeyRef] at construction time.
 *  - The raw key is never written to or read from the database.
 *  - apiKeyRef is the env var NAME stored in ai_provider_configs.api_key_ref.
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import type { AIProvider, EmbedRequest, EmbedResult, GenerateRequest, GenerateResult } from './types.js';

// Safety settings — keep permissive for research content but block clearly harmful categories
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export class GeminiProvider implements AIProvider {
  readonly providerName = 'Gemini';

  private readonly client: GoogleGenerativeAI;
  private readonly textModel: string;
  private readonly embeddingModel = 'gemini-embedding-001';  // 768-dim via outputDimensionality
  private readonly apiKeyRef: string;

  constructor(apiKeyRef: string, textModel: string) {
    this.apiKeyRef = apiKeyRef;
    const apiKey = process.env[apiKeyRef];
    if (!apiKey) {
      throw new Error(
        `GeminiProvider: environment variable "${apiKeyRef}" is not set. ` +
        `Set GEMINI_API_KEY in the server .env file.`
      );
    }
    this.client = new GoogleGenerativeAI(apiKey);
    
    // Normalize deprecated/sunset model names to active Google API models
    let normalized = textModel;
    if (
      !normalized ||
      normalized.includes('1.5') ||
      normalized === 'gemini-2.5-flash' ||
      normalized === 'gemini-2.5-flash-lite'
    ) {
      normalized = 'gemini-3.5-flash-lite';
    }
    this.textModel = normalized;
  }

  // ─── Embeddings ──────────────────────────────────────────────────────────

  async embed(req: EmbedRequest): Promise<EmbedResult> {
    const embeddings: number[][] = [];
    let totalTokens = 0;

    if (process.env.NODE_ENV === 'test' || !process.env[this.apiKeyRef]) {
      for (const text of req.texts) {
        const mockVec = Array.from({ length: 768 }, (_, i) => Math.sin(i + text.length) * 0.05);
        embeddings.push(mockVec);
        totalTokens += Math.ceil(text.length / 4);
      }
      return { embeddings, tokensUsed: totalTokens };
    }

    try {
      const model = this.client.getGenerativeModel({ model: this.embeddingModel });
      if (req.texts.length === 1) {
        const result = await (model as any).embedContent({
          content: { parts: [{ text: req.texts[0] }] },
          outputDimensionality: 768,
        });
        embeddings.push(result.embedding.values);
        totalTokens += Math.ceil((req.texts[0]?.length || 0) / 4);
      } else {
        const batchRes = await (model as any).batchEmbedContents({
          requests: req.texts.map(text => ({
            content: { role: 'user', parts: [{ text }] },
            outputDimensionality: 768,
          })),
        });
        const returned = batchRes.embeddings || [];
        for (let i = 0; i < returned.length; i++) {
          embeddings.push(returned[i].values);
          totalTokens += Math.ceil((req.texts[i]?.length || 0) / 4);
        }
      }
      return { embeddings, tokensUsed: totalTokens };
    } catch (err) {
      if (process.env.NODE_ENV === 'test') {
        for (const text of req.texts) {
          const mockVec = Array.from({ length: 768 }, (_, i) => Math.sin(i + text.length) * 0.05);
          embeddings.push(mockVec);
          totalTokens += Math.ceil(text.length / 4);
        }
        return { embeddings, tokensUsed: totalTokens };
      }
      throw err;
    }
  }

  // ─── Text Generation ─────────────────────────────────────────────────────

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    if (process.env.NODE_ENV === 'test' || !process.env[this.apiKeyRef]) {
      const mockText = `Scholarly synthesized response for research query: ${req.prompt.slice(0, 60)}...`;
      return {
        text: mockText,
        tokensUsed: Math.max(10, Math.ceil((req.prompt.length + mockText.length) / 4)),
        finishReason: 'STOP',
      };
    }

    try {
      const model = this.client.getGenerativeModel({
        model: this.textModel,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
          maxOutputTokens: req.maxTokens ?? 1024,
          temperature: 0.3,     // lower temperature → more factual, less creative
          topP: 0.9,
        },
        systemInstruction: req.systemPrompt
          ? { role: 'system', parts: [{ text: req.systemPrompt }] }
          : undefined,
      });

      const result = await model.generateContent(req.prompt);
      const response = result.response;
      const text = response.text();

      // Extract token counts from usageMetadata when available
      const meta = response.usageMetadata;
      const tokensUsed = meta
        ? (meta.promptTokenCount ?? 0) + (meta.candidatesTokenCount ?? 0)
        : Math.ceil((req.prompt.length + text.length) / 4);  // fallback: char/4 approximation

      return {
        text,
        tokensUsed,
        finishReason: response.candidates?.[0]?.finishReason?.toString(),
      };
    } catch (err) {
      if (process.env.NODE_ENV === 'test') {
        const mockText = `Scholarly synthesized response for research query: ${req.prompt.slice(0, 60)}...`;
        return {
          text: mockText,
          tokensUsed: Math.max(10, Math.ceil((req.prompt.length + mockText.length) / 4)),
          finishReason: 'STOP',
        };
      }
      throw err;
    }
  }
}
