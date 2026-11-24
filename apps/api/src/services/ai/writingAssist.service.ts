/**
 * Writing Assistance Service (Phase 8.6)
 *
 * Implements:
 *  - Paraphrasing academic text
 *  - Grammar and phrasing improvement
 *  - Section outline generation
 *
 * Security & Ownership:
 *  - User must be a declared author or project supervisor (requireManuscriptAuthorOrSupervisor).
 *  - Output is saved as a Pending AiSuggestion row attached to target section (ManuscriptSection).
 *  - User identity is always server-derived from JWT.
 *  - Token quota and content policy checks are performed.
 */

import { supabaseAdmin } from '../../supabase.js';
import type {
  UserRole,
  WritingAssistAction,
  WritingAssistResponse,
  AiSuggestion,
} from '@researchos/shared-types';
import { getActiveProvider } from './provider.factory.js';
import { checkQuota, logUsage } from './quota.service.js';
import { checkPrompt } from './blockedPrompt.service.js';

export async function assistWriting(params: {
  userId: string;
  userRole: UserRole;
  manuscriptId: string;
  action: WritingAssistAction;
  selectedText?: string;
  sectionType?: string;
  sectionId?: string;
}): Promise<WritingAssistResponse> {
  const { userId, userRole, manuscriptId, action, selectedText, sectionType, sectionId } = params;

  // 1. Validation
  const validActions: WritingAssistAction[] = ['paraphrase', 'grammar', 'outline'];
  if (!validActions.includes(action)) {
    throw new Error(`Invalid writing assist action "${action}". Must be one of: ${validActions.join(', ')}`);
  }

  if ((action === 'paraphrase' || action === 'grammar') && (!selectedText || !selectedText.trim())) {
    throw new Error(`Action "${action}" requires selectedText to be provided.`);
  }

  // 2. Resolve target sectionId
  let targetSectionId = sectionId;
  if (!targetSectionId) {
    let query = supabaseAdmin
      .from('manuscript_sections')
      .select('id, section_type')
      .eq('manuscript_id', manuscriptId)
      .order('order_index', { ascending: true });

    if (sectionType) {
      query = query.eq('section_type', sectionType);
    }

    const { data: matchingSections } = await query.limit(1);
    targetSectionId = matchingSections?.[0]?.id;

    if (!targetSectionId) {
      const { data: firstSec } = await supabaseAdmin
        .from('manuscript_sections')
        .select('id')
        .eq('manuscript_id', manuscriptId)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      targetSectionId = firstSec?.id;
    }
  }

  if (!targetSectionId) {
    throw new Error('No section found in this manuscript to attach suggestion to.');
  }

  // 3. Quota check
  await checkQuota(userId, userRole, 800);

  // 4. Assemble prompts
  const { systemPrompt, userPrompt, maxTokens } = buildWritingPrompts(action, selectedText, sectionType);

  // 5. Content policy check
  await checkPrompt(userPrompt);

  // 6. Provider call
  const provider = await getActiveProvider();
  const genResult = await provider.generate({
    prompt: userPrompt,
    systemPrompt,
    maxTokens,
  });

  const generatedText = genResult.text.trim();

  // 7. Save as AiSuggestion (Pending)
  const { data: suggestionRow, error: insertErr } = await supabaseAdmin
    .from('ai_suggestions')
    .insert({
      user_id: userId,
      target_type: 'ManuscriptSection',
      target_id: targetSectionId,
      field_name: 'content_markdown',
      suggested_value: generatedText,
      status: 'Pending',
    })
    .select('*')
    .single();

  if (insertErr || !suggestionRow) {
    throw new Error(`Failed to create writing assist suggestion: ${insertErr?.message ?? 'unknown'}`);
  }

  // 8. Log usage
  await logUsage({
    userId,
    feature: `writing_assist:${action}`,
    tokensUsed: genResult.tokensUsed,
  });

  const suggestion: AiSuggestion = {
    id: suggestionRow.id,
    userId: suggestionRow.user_id,
    targetType: suggestionRow.target_type,
    targetId: suggestionRow.target_id,
    fieldName: suggestionRow.field_name,
    suggestedValue: suggestionRow.suggested_value,
    status: suggestionRow.status,
    createdAt: suggestionRow.created_at,
  };

  return {
    manuscriptId,
    sectionId: targetSectionId,
    suggestion,
  };
}

function buildWritingPrompts(
  action: WritingAssistAction,
  selectedText?: string,
  sectionType?: string
): {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
} {
  switch (action) {
    case 'paraphrase':
      return {
        systemPrompt:
          'You are an expert academic editor and research assistant. Paraphrase the provided academic text to elevate clarity, rigor, flow, and scholarly diction while strictly preserving its original meaning, citations, and quantitative claims. Output ONLY the paraphrased text without code fences or conversational preamble.',
        userPrompt: `Paraphrase the following academic text:\n\n${selectedText}`,
        maxTokens: 800,
      };

    case 'grammar':
      return {
        systemPrompt:
          'You are an expert academic copyeditor. Correct grammatical errors, typos, spelling, punctuation, and awkward phrasing in the provided academic text while keeping the author\'s original tone and terminology intact. Output ONLY the corrected text.',
        userPrompt: `Correct grammar and enhance phrasing for the following text:\n\n${selectedText}`,
        maxTokens: 800,
      };

    case 'outline':
      return {
        systemPrompt:
          'You are an expert academic research advisor. Create a structured, cohesive bullet-point outline for the specified manuscript section. Include appropriate subheadings, logical argument flow, and typical content expected in peer-reviewed publication.',
        userPrompt: `Generate a detailed bullet-point outline for the "${sectionType || 'Section'}" of a research manuscript.${
          selectedText ? `\n\nContext:\n${selectedText}` : ''
        }`,
        maxTokens: 800,
      };
  }
}
