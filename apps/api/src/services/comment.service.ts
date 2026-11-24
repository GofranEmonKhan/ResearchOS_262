import { supabaseAdmin } from '../supabase.js';
import { PaperComment, AddPaperCommentDto } from '@researchos/shared-types';
import { getPaperById, PaperError } from './paper.service.js';
import { createAuditLog } from './audit.service.js';

export function mapDbCommentToComment(row: any): PaperComment {
  return {
    id: row.id,
    paperId: row.paper_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    author: row.profiles
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
 * Adds a collaborative comment to a paper discussion thread.
 * Only allowed for papers shared in a collaborative project.
 */
export async function addComment(
  paperId: string,
  authorId: string,
  dto: AddPaperCommentDto
): Promise<PaperComment> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  if (!paper.projectId) {
    throw new PaperError('Comments can only be added to papers shared in a project', 400);
  }

  const trimmedBody = dto.body?.trim();
  if (!trimmedBody) {
    throw new PaperError('Comment body cannot be empty', 400);
  }

  const { data: newRow, error } = await supabaseAdmin
    .from('paper_comments')
    .insert({
      paper_id: paperId,
      author_id: authorId,
      body: trimmedBody,
    })
    .select('*, profiles:author_id(id, full_name, photo_url, role)')
    .single();

  if (error || !newRow) {
    throw new PaperError(error?.message || 'Failed to add comment', 500);
  }

  await createAuditLog({
    actorId: authorId,
    action: 'add_paper_comment',
    targetType: 'paper_comment',
    targetId: newRow.id,
    metadata: { paperId },
  });

  return mapDbCommentToComment(newRow);
}

/**
 * Lists collaborative comments on a shared paper.
 */
export async function listComments(
  paperId: string
): Promise<PaperComment[]> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  if (!paper.projectId) {
    throw new PaperError('Comments are only available for papers shared in a project', 400);
  }

  const { data: rows, error } = await supabaseAdmin
    .from('paper_comments')
    .select('*, profiles:author_id(id, full_name, photo_url, role)')
    .eq('paper_id', paperId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new PaperError(error.message, 500);
  }

  return (rows || []).map(mapDbCommentToComment);
}
