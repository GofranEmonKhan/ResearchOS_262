import { supabaseAdmin } from '../supabase.js';
import {
  CitationPurpose,
  CreateCitationPurposeDto,
  CitationPurposeType,
  CITATION_PURPOSE_TYPES,
} from '@researchos/shared-types';
import { getPaperById, PaperError } from './paper.service.js';
import { createAuditLog } from './audit.service.js';

export function mapDbCitationPurposeToCitationPurpose(row: any): CitationPurpose {
  return {
    id: row.id,
    paperId: row.paper_id,
    manuscriptId: row.manuscript_id || null,
    purpose: row.purpose as CitationPurposeType,
    note: row.note || null,
  };
}

/**
 * Adds a citation purpose to a paper
 */
export async function addCitationPurpose(
  paperId: string,
  requesterId: string,
  dto: CreateCitationPurposeDto
): Promise<CitationPurpose> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  if (!dto.purpose || !CITATION_PURPOSE_TYPES[dto.purpose]) {
    throw new PaperError(
      `Invalid citation purpose: ${dto.purpose}. Must be one of: Motivation, MethodSource, DatasetSource, ComparisonBaseline, ContradictingEvidence, SupportingEvidence, RelatedWork`,
      400
    );
  }

  const { data: newRow, error } = await supabaseAdmin
    .from('citation_purposes')
    .insert({
      paper_id: paperId,
      manuscript_id: dto.manuscriptId || null,
      purpose: dto.purpose,
      note: dto.note?.trim() || null,
    })
    .select('*')
    .single();

  if (error || !newRow) {
    throw new PaperError(error?.message || 'Failed to add citation purpose', 500);
  }

  await createAuditLog({
    actorId: requesterId,
    action: 'add_citation_purpose',
    targetType: 'citation_purpose',
    targetId: newRow.id,
    metadata: { paperId, purpose: dto.purpose },
  });

  return mapDbCitationPurposeToCitationPurpose(newRow);
}

/**
 * Lists all citation purposes associated with a paper
 */
export async function listCitationPurposes(paperId: string): Promise<CitationPurpose[]> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  const { data: rows, error } = await supabaseAdmin
    .from('citation_purposes')
    .select('*')
    .eq('paper_id', paperId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new PaperError(error.message, 500);
  }

  return (rows || []).map(mapDbCitationPurposeToCitationPurpose);
}

/**
 * Deletes a citation purpose
 */
export async function deleteCitationPurpose(
  purposeId: string,
  requesterId: string
): Promise<void> {
  const { data: purpose, error: findError } = await supabaseAdmin
    .from('citation_purposes')
    .select('*, papers:paper_id(uploader_id, project_id)')
    .eq('id', purposeId)
    .single();

  if (findError || !purpose) {
    throw new PaperError('Citation purpose not found', 404);
  }

  const { error: deleteError } = await supabaseAdmin
    .from('citation_purposes')
    .delete()
    .eq('id', purposeId);

  if (deleteError) {
    throw new PaperError(deleteError.message, 500);
  }

  await createAuditLog({
    actorId: requesterId,
    action: 'delete_citation_purpose',
    targetType: 'citation_purpose',
    targetId: purposeId,
    metadata: { paperId: purpose.paper_id },
  });
}
