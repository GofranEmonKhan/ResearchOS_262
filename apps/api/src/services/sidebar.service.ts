import { supabaseAdmin } from '../supabase.js';
import { PaperSidebarFields, UpdateSidebarFieldsDto } from '@researchos/shared-types';
import { getPaperById, PaperError } from './paper.service.js';
import { createAuditLog } from './audit.service.js';

export function mapDbSidebarToSidebar(row: any): PaperSidebarFields {
  return {
    id: row.id,
    paperId: row.paper_id,
    researchGap: row.research_gap || null,
    limitation: row.limitation || null,
    futureWork: row.future_work || null,
    datasetUsed: row.dataset_used || null,
    methodology: row.methodology || null,
    results: row.results || null,
    personalNotes: row.personal_notes || null,
    personalNotesVisible: Boolean(row.personal_notes_visible),
  };
}

/**
 * Retrieves the sidebar fields for a paper.
 * Implements Option A Dynamic Masking:
 * If the requester is not the original uploader and personal_notes_visible is false,
 * personal_notes is masked to null.
 */
export async function getSidebar(
  paperId: string,
  requesterId: string
): Promise<PaperSidebarFields> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  let { data: row, error } = await supabaseAdmin
    .from('paper_sidebar_fields')
    .select('*')
    .eq('paper_id', paperId)
    .maybeSingle();

  if (error) {
    throw new PaperError(error.message, 500);
  }

  // If not found, insert blank row (fallback if trigger was bypassed)
  if (!row) {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('paper_sidebar_fields')
      .insert({ paper_id: paperId })
      .select('*')
      .single();

    if (insertError || !inserted) {
      throw new PaperError(insertError?.message || 'Failed to initialize sidebar fields', 500);
    }
    row = inserted;
  }

  // Option A Dynamic Masking
  const isUploader = paper.uploaderId === requesterId;
  if (!isUploader && !row.personal_notes_visible) {
    row.personal_notes = null;
  }

  return mapDbSidebarToSidebar(row);
}

/**
 * Updates structured sidebar fields.
 * - Any authorized project member/uploader can update structured analysis fields.
 * - Only the original uploader can modify personal_notes or personal_notes_visible.
 */
export async function updateSidebar(
  paperId: string,
  dto: UpdateSidebarFieldsDto,
  requesterId: string
): Promise<PaperSidebarFields> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  const isUploader = paper.uploaderId === requesterId;

  // Protect personal notes: only the uploader can edit personal notes or toggle their visibility
  if (dto.personalNotes !== undefined || dto.personalNotesVisible !== undefined) {
    if (!isUploader) {
      throw new PaperError('Only the original uploader can modify personal notes or visibility', 403);
    }
  }

  const updates: Record<string, any> = {};

  if (dto.researchGap !== undefined) updates.research_gap = dto.researchGap;
  if (dto.limitation !== undefined) updates.limitation = dto.limitation;
  if (dto.futureWork !== undefined) updates.future_work = dto.futureWork;
  if (dto.datasetUsed !== undefined) updates.dataset_used = dto.datasetUsed;
  if (dto.methodology !== undefined) updates.methodology = dto.methodology;
  if (dto.results !== undefined) updates.results = dto.results;

  if (isUploader) {
    if (dto.personalNotes !== undefined) updates.personal_notes = dto.personalNotes;
    if (dto.personalNotesVisible !== undefined) updates.personal_notes_visible = dto.personalNotesVisible;
  }

  if (Object.keys(updates).length === 0) {
    return getSidebar(paperId, requesterId);
  }

  const { data: updatedRow, error } = await supabaseAdmin
    .from('paper_sidebar_fields')
    .update(updates)
    .eq('paper_id', paperId)
    .select('*')
    .single();

  if (error || !updatedRow) {
    throw new PaperError(error?.message || 'Failed to update sidebar fields', 500);
  }

  await createAuditLog({
    actorId: requesterId,
    action: 'update_sidebar_fields',
    targetType: 'paper_sidebar_fields',
    targetId: updatedRow.id,
    metadata: updates,
  });

  // Apply Option A Dynamic Masking before returning
  if (!isUploader && !updatedRow.personal_notes_visible) {
    updatedRow.personal_notes = null;
  }

  return mapDbSidebarToSidebar(updatedRow);
}
