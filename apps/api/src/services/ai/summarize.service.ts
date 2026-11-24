/**
 * Paper Summarization & Sidebar Suggestions Service (Phase 8.5)
 *
 * Implements:
 *  - Multi-mode paper summarization (short, detailed, method-focused)
 *  - AI extraction of structured sidebar fields (researchGap, limitation, futureWork, methodology)
 *  - Persisting sidebar suggestions as Pending AiSuggestion rows
 *
 * Security & Access Rules:
 *  - Caller must have paper read permission (enforced via requirePaperViewer guard)
 *  - Quota is verified before provider call and logged after
 *  - Blocked prompt rules are checked before provider call
 *  - AiSuggestion.user_id is always set to req.userId
 */

import pdfParse from 'pdf-parse';
import { supabaseAdmin } from '../../supabase.js';
import type {
  UserRole,
  SummarizeMode,
  SummarizeResponse,
  SidebarSuggestionsResponse,
  AiSuggestion,
} from '@researchos/shared-types';
import { getActiveProvider } from './provider.factory.js';
import { checkQuota, logUsage } from './quota.service.js';
import { checkPrompt } from './blockedPrompt.service.js';

/**
 * Summarize an accessible paper in one of three modes.
 */
export async function summarizePaper(params: {
  userId: string;
  userRole: UserRole;
  paperId: string;
  mode: SummarizeMode;
}): Promise<SummarizeResponse> {
  const { userId, userRole, paperId, mode } = params;

  const validModes: SummarizeMode[] = ['short', 'detailed', 'method-focused'];
  if (!validModes.includes(mode)) {
    throw new Error(`Invalid summarization mode "${mode}". Must be one of: ${validModes.join(', ')}`);
  }

  // 1. Quota check based on estimated tokens
  const estimatedTokens = mode === 'short' ? 400 : mode === 'detailed' ? 2000 : 1500;
  await checkQuota(userId, userRole, estimatedTokens);

  // 2. Fetch paper text from PDF (or fallback to metadata)
  const paperText = await getPaperText(paperId);

  // 3. Assemble prompt & system prompt
  const { systemPrompt, userPrompt, maxTokens } = buildSummarizePrompts(mode, paperText);

  // 4. Content policy check
  await checkPrompt(userPrompt);

  // 5. Provider call
  const provider = await getActiveProvider();
  const genResult = await provider.generate({
    prompt: userPrompt,
    systemPrompt,
    maxTokens,
  });

  // 6. Log usage
  await logUsage({
    userId,
    feature: `summarize:${mode}`,
    tokensUsed: genResult.tokensUsed,
  });

  return {
    paperId,
    mode,
    summary: genResult.text.trim(),
    tokensUsed: genResult.tokensUsed,
  };
}

/**
 * Generate structured sidebar field suggestions for an accessible paper.
 * Persists 4 AiSuggestion rows with status='Pending'.
 */
export async function generateSidebarSuggestions(params: {
  userId: string;
  userRole: UserRole;
  paperId: string;
}): Promise<SidebarSuggestionsResponse> {
  const { userId, userRole, paperId } = params;

  // 1. Quota check
  await checkQuota(userId, userRole, 1800);

  // 2. Fetch paper text
  const paperText = await getPaperText(paperId);

  // 3. Assemble extraction prompts
  const systemPrompt =
    'You are an expert academic research assistant. Analyze the given research paper and extract structured metadata fields as a JSON object with the following exact keys:\n' +
    '{\n' +
    '  "researchGap": "A clear explanation of the unresolved gap or open problem in existing literature that this paper targets.",\n' +
    '  "limitation": "The key limitations, assumptions, or constraints identified in this work.",\n' +
    '  "futureWork": "Promising extensions, open questions, or directions for future research.",\n' +
    '  "methodology": "The core technical approach, architecture, algorithm, or experimental setup used."\n' +
    '}\n' +
    'Return ONLY the valid JSON object. Do not enclose in markdown code fences.';

  const userPrompt = `Extract the structured research fields from this paper:\n\n${paperText.slice(0, 15000)}`;

  // 4. Content policy check
  await checkPrompt(userPrompt);

  // 5. Provider call
  const provider = await getActiveProvider();
  const genResult = await provider.generate({
    prompt: userPrompt,
    systemPrompt,
    maxTokens: 1200,
  });

  // 6. Parse JSON safely
  const parsed = parseExtractionJson(genResult.text);

  // 7. Delete any existing Pending suggestions for this paper & user to avoid stale clutter
  await supabaseAdmin
    .from('ai_suggestions')
    .delete()
    .eq('user_id', userId)
    .eq('target_type', 'PaperSidebarFields')
    .eq('target_id', paperId)
    .eq('status', 'Pending');

  // 8. Insert 4 new Pending suggestions
  const suggestionRows = [
    {
      user_id: userId,
      target_type: 'PaperSidebarFields' as const,
      target_id: paperId,
      field_name: 'research_gap',
      suggested_value: parsed.researchGap,
      status: 'Pending' as const,
    },
    {
      user_id: userId,
      target_type: 'PaperSidebarFields' as const,
      target_id: paperId,
      field_name: 'limitation',
      suggested_value: parsed.limitation,
      status: 'Pending' as const,
    },
    {
      user_id: userId,
      target_type: 'PaperSidebarFields' as const,
      target_id: paperId,
      field_name: 'future_work',
      suggested_value: parsed.futureWork,
      status: 'Pending' as const,
    },
    {
      user_id: userId,
      target_type: 'PaperSidebarFields' as const,
      target_id: paperId,
      field_name: 'methodology',
      suggested_value: parsed.methodology,
      status: 'Pending' as const,
    },
  ];

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('ai_suggestions')
    .insert(suggestionRows)
    .select('*');

  if (insertErr) {
    throw new Error(`Failed to save AI suggestions: ${insertErr.message}`);
  }

  // 9. Log usage
  await logUsage({
    userId,
    feature: 'sidebar_suggestions',
    tokensUsed: genResult.tokensUsed,
  });

  const formattedSuggestions: AiSuggestion[] = (inserted ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    targetType: r.target_type,
    targetId: r.target_id,
    fieldName: r.field_name,
    suggestedValue: r.suggested_value,
    status: r.status,
    createdAt: r.created_at,
  }));

  return {
    paperId,
    suggestions: formattedSuggestions,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getPaperText(paperId: string): Promise<string> {
  const { data: paper, error: paperErr } = await supabaseAdmin
    .from('papers')
    .select('id, title, file_asset_id, file_assets:file_asset_id(storage_path)')
    .eq('id', paperId)
    .maybeSingle();

  if (paperErr || !paper) {
    throw new Error(`Paper not found: ${paperErr?.message ?? 'unknown'}`);
  }

  const fileAsset = Array.isArray(paper.file_assets)
    ? paper.file_assets[0]
    : (paper.file_assets as any);

  if (!fileAsset?.storage_path) {
    return `Title: ${paper.title}`;
  }

  try {
    const { data: blob, error: dlErr } = await supabaseAdmin
      .storage
      .from('papers')
      .download(fileAsset.storage_path);

    if (dlErr || !blob) {
      console.warn(`[AI] Could not download PDF for paper ${paperId}:`, dlErr?.message);
      return `Title: ${paper.title}`;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await pdfParse(buffer);
    const text = parsed.text?.trim() ?? '';
    return text || `Title: ${paper.title}`;
  } catch (err: any) {
    console.warn(`[AI] PDF text extraction failed for paper ${paperId}:`, err?.message);
    return `Title: ${paper.title}`;
  }
}

function buildSummarizePrompts(mode: SummarizeMode, paperText: string) {
  const snippet = paperText.slice(0, 15000);

  switch (mode) {
    case 'short':
      return {
        systemPrompt:
          'You are an expert academic research assistant. Provide a concise, high-level summary of the research paper in exactly 3-4 clear sentences covering: (1) Core research problem/objective, (2) Key proposed methodology/approach, and (3) Primary finding/contribution. Avoid filler phrases.',
        userPrompt: `Summarize this research paper:\n\n${snippet}`,
        maxTokens: 300,
      };

    case 'detailed':
      return {
        systemPrompt:
          'You are an expert academic research assistant. Provide a comprehensive, structured summary of the research paper. Format your response with clear markdown headings:\n' +
          '### Context & Problem Statement\n' +
          '### Methodology & Implementation\n' +
          '### Key Findings & Experimental Results\n' +
          '### Significance & Limitations',
        userPrompt: `Provide a detailed summary of this paper:\n\n${snippet}`,
        maxTokens: 1500,
      };

    case 'method-focused':
      return {
        systemPrompt:
          'You are an expert academic research assistant specializing in scientific methodology. Provide an in-depth breakdown of the paper\'s methodology and technical approach. Include:\n' +
          '### Theoretical Framework\n' +
          '### Model Architecture & Algorithms\n' +
          '### Datasets & Benchmarks\n' +
          '### Evaluation Metrics & Baselines',
        userPrompt: `Provide a method-focused analysis of this paper:\n\n${snippet}`,
        maxTokens: 1000,
      };
  }
}

function parseExtractionJson(rawText: string): {
  researchGap: string;
  limitation: string;
  futureWork: string;
  methodology: string;
} {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    const obj = JSON.parse(cleaned);
    return {
      researchGap: String(obj.researchGap || obj.research_gap || 'Not clearly specified in text.').trim(),
      limitation: String(obj.limitation || obj.limitations || 'Not clearly specified in text.').trim(),
      futureWork: String(obj.futureWork || obj.future_work || 'Not clearly specified in text.').trim(),
      methodology: String(obj.methodology || obj.methods || 'Not clearly specified in text.').trim(),
    };
  } catch (err) {
    console.warn('[AI] Failed to parse JSON response from provider:', rawText);
    return {
      researchGap: 'Analysis could not extract distinct research gap.',
      limitation: 'Analysis could not extract distinct limitations.',
      futureWork: 'Analysis could not extract distinct future directions.',
      methodology: 'Analysis could not extract distinct methodology.',
    };
  }
}
