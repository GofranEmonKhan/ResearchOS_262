/**
 * Suggestion Management Service (Phase 8.5)
 *
 * Handles human-in-the-loop lifecycle for AI-generated field suggestions:
 *  - List own suggestions (filtered by targetType, targetId, status)
 *  - Accept suggestion: writes suggested value to target entity, sets is_ai_assisted=true
 *  - Reject suggestion: marks status='Rejected', no mutation to target entity
 *
 * Security & Ownership:
 *  - All queries enforce user_id = req.userId. Users cannot accept/reject another user's suggestions.
 *  - Double-action on an already Accepted or Rejected suggestion returns 409 Conflict.
 */

import { supabaseAdmin } from '../../supabase.js';
import type {
  AiSuggestion,
  AiSuggestionListParams,
  AiSuggestionListResponse,
  AcceptSuggestionResponse,
  RejectSuggestionResponse,
} from '@researchos/shared-types';

export class SuggestionNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = 'Suggestion not found or access denied.') {
    super(message);
    this.name = 'SuggestionNotFoundError';
  }
}

export class SuggestionConflictError extends Error {
  readonly statusCode = 409;
  constructor(status: string) {
    super(`Suggestion has already been marked as ${status}.`);
    this.name = 'SuggestionConflictError';
  }
}

export class SuggestionForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message = 'You do not have permission to act on this suggestion.') {
    super(message);
    this.name = 'SuggestionForbiddenError';
  }
}

/**
 * List suggestions owned by the requesting user.
 */
export async function listUserSuggestions(
  userId: string,
  params: AiSuggestionListParams = {}
): Promise<AiSuggestionListResponse> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(Math.max(1, Number(params.limit) || 20), 100);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('ai_suggestions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (params.targetType) {
    query = query.eq('target_type', params.targetType);
  }
  if (params.targetId) {
    query = query.eq('target_id', params.targetId);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to list suggestions: ${error.message}`);
  }

  const suggestions: AiSuggestion[] = (data ?? []).map((r) => ({
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
    suggestions,
    total: count ?? suggestions.length,
    page,
    limit,
  };
}

/**
 * Accept a suggestion:
 * Mutates the underlying entity, marks suggestion as Accepted.
 */
export async function acceptSuggestion(
  userId: string,
  suggestionId: string
): Promise<AcceptSuggestionResponse> {
  // 1. Fetch suggestion
  const { data: suggestion, error: fetchErr } = await supabaseAdmin
    .from('ai_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .maybeSingle();

  if (fetchErr || !suggestion) {
    throw new SuggestionNotFoundError();
  }

  // 2. Ownership check
  if (suggestion.user_id !== userId) {
    throw new SuggestionForbiddenError();
  }

  // 2. Reject double-action (Conflict)
  if (suggestion.status !== 'Pending') {
    throw new SuggestionConflictError(suggestion.status);
  }

  // 3. Apply change to target entity
  if (suggestion.target_type === 'PaperSidebarFields') {
    await applyPaperSidebarSuggestion(suggestion.target_id, suggestion.field_name, suggestion.suggested_value);
  } else if (suggestion.target_type === 'ManuscriptSection') {
    await applyManuscriptSectionSuggestion(suggestion.target_id, suggestion.suggested_value, userId);
  } else {
    throw new Error(`Unsupported target type: ${suggestion.target_type}`);
  }

  // 4. Update suggestion status to Accepted
  const { error: updateErr } = await supabaseAdmin
    .from('ai_suggestions')
    .update({ status: 'Accepted' })
    .eq('id', suggestion.id);

  if (updateErr) {
    throw new Error(`Failed to update suggestion status: ${updateErr.message}`);
  }

  return {
    suggestionId: suggestion.id,
    status: 'Accepted',
    targetType: suggestion.target_type,
    targetId: suggestion.target_id,
    fieldName: suggestion.field_name,
    appliedValue: suggestion.suggested_value,
  };
}

/**
 * Reject a suggestion:
 * Sets status to Rejected; does not mutate target entity.
 */
export async function rejectSuggestion(
  userId: string,
  suggestionId: string
): Promise<RejectSuggestionResponse> {
  // 1. Fetch suggestion
  const { data: suggestion, error: fetchErr } = await supabaseAdmin
    .from('ai_suggestions')
    .select('id, user_id, status')
    .eq('id', suggestionId)
    .maybeSingle();

  if (fetchErr || !suggestion) {
    throw new SuggestionNotFoundError();
  }

  // 2. Ownership check
  if (suggestion.user_id !== userId) {
    throw new SuggestionForbiddenError();
  }

  // 2. Reject double-action (Conflict)
  if (suggestion.status !== 'Pending') {
    throw new SuggestionConflictError(suggestion.status);
  }

  // 3. Update status to Rejected
  const { error: updateErr } = await supabaseAdmin
    .from('ai_suggestions')
    .update({ status: 'Rejected' })
    .eq('id', suggestion.id);

  if (updateErr) {
    throw new Error(`Failed to reject suggestion: ${updateErr.message}`);
  }

  return {
    suggestionId: suggestion.id,
    status: 'Rejected',
  };
}

// ─── Target Mutation Helpers ──────────────────────────────────────────────────

async function applyPaperSidebarSuggestion(
  paperId: string,
  fieldName: string,
  suggestedValue: string
): Promise<void> {
  const allowedFields = [
    'research_gap',
    'limitation',
    'future_work',
    'dataset_used',
    'methodology',
    'results',
    'personal_notes',
  ];

  if (!allowedFields.includes(fieldName)) {
    throw new Error(`Field "${fieldName}" is not a valid PaperSidebarFields column.`);
  }

  const { data: existing } = await supabaseAdmin
    .from('paper_sidebar_fields')
    .select('id')
    .eq('paper_id', paperId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from('paper_sidebar_fields')
      .update({ [fieldName]: suggestedValue })
      .eq('id', existing.id);

    if (error) {
      throw new Error(`Failed to update sidebar field: ${error.message}`);
    }
  } else {
    const { error } = await supabaseAdmin
      .from('paper_sidebar_fields')
      .insert({
        paper_id: paperId,
        [fieldName]: suggestedValue,
      });

    if (error) {
      throw new Error(`Failed to insert sidebar field: ${error.message}`);
    }
  }
}

async function applyManuscriptSectionSuggestion(
  sectionId: string,
  suggestedValue: string,
  userId: string
): Promise<void> {
  const wordCount = suggestedValue.trim().split(/\s+/).filter(Boolean).length;

  const { error } = await supabaseAdmin
    .from('manuscript_sections')
    .update({
      content_markdown: suggestedValue,
      word_count: wordCount,
      is_ai_assisted: true,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sectionId);

  if (error) {
    throw new Error(`Failed to update manuscript section: ${error.message}`);
  }
}
