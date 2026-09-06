import { supabaseAdmin } from '../supabase.js';
import {
  PaperAnnotation,
  CreateAnnotationDto,
  UpdateAnnotationDto,
  AnnotationPositionData,
} from '@researchos/shared-types';
import { getPaperById, PaperError } from './paper.service.js';
import { createAuditLog } from './audit.service.js';

export function mapDbAnnotationToAnnotation(row: any): PaperAnnotation {
  return {
    id: row.id,
    paperId: row.paper_id,
    userId: row.user_id,
    page: row.page,
    highlightedText: row.highlighted_text,
    positionData: row.position_data as AnnotationPositionData,
    stickyNote: row.sticky_note || null,
    linkedSidebarField: row.linked_sidebar_field || null,
    createdAt: row.created_at,
    user: row.profiles
      ? {
          id: row.profiles.id,
          fullName: row.profiles.full_name,
          photoUrl: row.profiles.photo_url,
          role: row.profiles.role,
        }
      : undefined,
  };
}

/**
 * Validates zoom-invariant normalized percentage coordinates
 */
function validatePositionData(pos: any): AnnotationPositionData {
  if (!pos || typeof pos !== 'object') {
    throw new PaperError('positionData must be an object', 400);
  }
  if (typeof pos.page !== 'number' || pos.page < 1) {
    throw new PaperError('positionData.page must be a positive integer', 400);
  }
  if (!Array.isArray(pos.rects) || pos.rects.length === 0) {
    throw new PaperError('positionData.rects must be a non-empty array', 400);
  }

  for (const rect of pos.rects) {
    if (
      typeof rect.x !== 'number' ||
      typeof rect.y !== 'number' ||
      typeof rect.width !== 'number' ||
      typeof rect.height !== 'number'
    ) {
      throw new PaperError('Each rect in positionData must have numeric x, y, width, and height', 400);
    }
  }

  return pos as AnnotationPositionData;
}

/**
 * Creates an annotation with zoom-invariant coordinates.
 */
export async function createAnnotation(
  paperId: string,
  userId: string,
  dto: CreateAnnotationDto
): Promise<PaperAnnotation> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  if (typeof dto.page !== 'number' || dto.page < 1) {
    throw new PaperError('Page number must be a positive integer', 400);
  }

  const trimmedText = dto.highlightedText?.trim();
  if (!trimmedText) {
    throw new PaperError('highlightedText is required', 400);
  }

  const validPosition = validatePositionData(dto.positionData);

  const { data: newRow, error } = await supabaseAdmin
    .from('paper_annotations')
    .insert({
      paper_id: paperId,
      user_id: userId,
      page: dto.page,
      highlighted_text: trimmedText,
      position_data: validPosition,
      sticky_note: dto.stickyNote?.trim() || null,
      linked_sidebar_field: dto.linkedSidebarField || null,
    })
    .select('*, profiles:user_id(id, full_name, photo_url, role)')
    .single();

  if (error || !newRow) {
    throw new PaperError(error?.message || 'Failed to create annotation', 500);
  }

  await createAuditLog({
    actorId: userId,
    action: 'create_annotation',
    targetType: 'paper_annotation',
    targetId: newRow.id,
    metadata: { paperId, page: dto.page },
  });

  return mapDbAnnotationToAnnotation(newRow);
}

/**
 * Lists annotations on a paper.
 * - Collaborative: On shared papers (project_id != null), returns all annotations.
 * - Personal: On unshared papers (project_id == null), returns only requester's annotations.
 */
export async function listAnnotations(
  paperId: string,
  requesterId: string
): Promise<PaperAnnotation[]> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  let query = supabaseAdmin
    .from('paper_annotations')
    .select('*, profiles:user_id(id, full_name, photo_url, role)')
    .eq('paper_id', paperId);

  // If paper is personal (unshared), only show requester's annotations
  if (!paper.projectId) {
    query = query.eq('user_id', requesterId);
  }

  query = query.order('created_at', { ascending: true });

  const { data: rows, error } = await query;
  if (error) {
    throw new PaperError(error.message, 500);
  }

  return (rows || []).map(mapDbAnnotationToAnnotation);
}

/**
 * Updates an annotation (Author-only).
 */
export async function updateAnnotation(
  annotationId: string,
  userId: string,
  dto: UpdateAnnotationDto
): Promise<PaperAnnotation> {
  const { data: existing, error: findError } = await supabaseAdmin
    .from('paper_annotations')
    .select('*')
    .eq('id', annotationId)
    .single();

  if (findError || !existing) {
    throw new PaperError('Annotation not found', 404);
  }

  if (existing.user_id !== userId) {
    throw new PaperError('Only the annotation author can edit this annotation', 403);
  }

  const updates: Record<string, any> = {};
  if (dto.stickyNote !== undefined) updates.sticky_note = dto.stickyNote?.trim() || null;
  if (dto.linkedSidebarField !== undefined) updates.linked_sidebar_field = dto.linkedSidebarField;

  const { data: updatedRow, error: updateError } = await supabaseAdmin
    .from('paper_annotations')
    .update(updates)
    .eq('id', annotationId)
    .select('*, profiles:user_id(id, full_name, photo_url, role)')
    .single();

  if (updateError || !updatedRow) {
    throw new PaperError(updateError?.message || 'Failed to update annotation', 500);
  }

  return mapDbAnnotationToAnnotation(updatedRow);
}

/**
 * Deletes an annotation (Author-only).
 */
export async function deleteAnnotation(annotationId: string, userId: string): Promise<void> {
  const { data: existing, error: findError } = await supabaseAdmin
    .from('paper_annotations')
    .select('*')
    .eq('id', annotationId)
    .single();

  if (findError || !existing) {
    throw new PaperError('Annotation not found', 404);
  }

  if (existing.user_id !== userId) {
    throw new PaperError('Only the annotation author can delete this annotation', 403);
  }

  const { error: deleteError } = await supabaseAdmin
    .from('paper_annotations')
    .delete()
    .eq('id', annotationId);

  if (deleteError) {
    throw new PaperError(deleteError.message, 500);
  }

  await createAuditLog({
    actorId: userId,
    action: 'delete_annotation',
    targetType: 'paper_annotation',
    targetId: annotationId,
    metadata: { paperId: existing.paper_id },
  });
}
