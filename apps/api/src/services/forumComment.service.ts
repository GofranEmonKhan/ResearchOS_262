import { supabaseAdmin } from '../supabase.js';
import { ForumComment, ForumTargetType, AddForumCommentDto, UserRole } from '@researchos/shared-types';
import { CommunityError } from './communityProfile.service.js';
import { createAuditLog } from './audit.service.js';

/**
 * Adds a comment to a forum post or answer.
 */
export async function addComment(
  targetType: ForumTargetType,
  targetId: string,
  authorId: string,
  bodyOrDto: string | AddForumCommentDto
): Promise<ForumComment> {
  const rawBody = typeof bodyOrDto === 'string' ? bodyOrDto : bodyOrDto.body;
  const trimmed = rawBody?.trim();
  if (!trimmed) {
    throw new CommunityError('Comment body cannot be empty', 400);
  }


  // 1. Verify target exists
  if (targetType === 'Post') {
    const { data: post, error } = await supabaseAdmin.from('forum_posts').select('id, is_locked').eq('id', targetId).single();
    if (error || !post) throw new CommunityError('Post not found', 404);
    if (post.is_locked) throw new CommunityError('Cannot comment on a locked post', 400);
  } else {
    const { data: answer, error } = await supabaseAdmin.from('forum_answers').select('id, post_id').eq('id', targetId).single();
    if (error || !answer) throw new CommunityError('Answer not found', 404);
  }

  // 2. Insert comment
  const { data: newRow, error: insertError } = await supabaseAdmin
    .from('forum_comments')
    .insert({
      target_type: targetType,
      target_id: targetId,
      author_id: authorId,
      body: trimmed,
    })
    .select('*, profiles:author_id(id, full_name, photo_url, role)')
    .single();

  if (insertError || !newRow) {
    throw new CommunityError(insertError?.message || 'Failed to add comment', 500);
  }

  await createAuditLog({
    actorId: authorId,
    action: 'add_forum_comment',
    targetType: 'forum_comment',
    targetId: newRow.id,
    metadata: { targetType, targetId },
  });

  return {
    id: newRow.id,
    targetType: newRow.target_type as ForumTargetType,
    targetId: newRow.target_id,
    authorId: newRow.author_id,
    body: newRow.body,
    createdAt: newRow.created_at,
    author: newRow.profiles
      ? {
          id: newRow.profiles.id,
          fullName: newRow.profiles.full_name,
          photoUrl: newRow.profiles.photo_url,
          role: newRow.profiles.role as UserRole,
        }
      : undefined,
  };
}

/**
 * Lists comments for a target post or answer.
 */
export async function listComments(targetType: ForumTargetType, targetId: string): Promise<ForumComment[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('forum_comments')
    .select('*, profiles:author_id(id, full_name, photo_url, role)')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: true });

  if (error || !rows) return [];

  return rows.map((r: any) => ({
    id: r.id,
    targetType: r.target_type as ForumTargetType,
    targetId: r.target_id,
    authorId: r.author_id,
    body: r.body,
    createdAt: r.created_at,
    author: r.profiles
      ? {
          id: r.profiles.id,
          fullName: r.profiles.full_name,
          photoUrl: r.profiles.photo_url,
          role: r.profiles.role as UserRole,
        }
      : undefined,
  }));
}

/**
 * Deletes a comment.
 */
export async function deleteComment(commentId: string, actingUserId: string, isAdmin: boolean): Promise<void> {
  const { data: comment, error } = await supabaseAdmin
    .from('forum_comments')
    .select('*')
    .eq('id', commentId)
    .single();

  if (error || !comment) {
    throw new CommunityError('Comment not found', 404);
  }

  if (comment.author_id !== actingUserId && !isAdmin) {
    throw new CommunityError('Access denied: You are not authorized to delete this comment', 403);
  }

  await supabaseAdmin.from('forum_comments').delete().eq('id', commentId);

  await createAuditLog({
    actorId: actingUserId,
    action: 'delete_forum_comment',
    targetType: 'forum_comment',
    targetId: commentId,
    metadata: { deletedByAdmin: isAdmin && comment.author_id !== actingUserId },
  });
}

/**
 * Updates a comment's body.
 */
export async function updateComment(
  commentId: string,
  actingUserId: string,
  newBody: string,
  isAdmin: boolean = false
): Promise<ForumComment> {
  const trimmed = newBody?.trim();
  if (!trimmed) {
    throw new CommunityError('Comment body cannot be empty', 400);
  }

  const { data: comment, error } = await supabaseAdmin
    .from('forum_comments')
    .select('*')
    .eq('id', commentId)
    .single();

  if (error || !comment) {
    throw new CommunityError('Comment not found', 404);
  }

  if (comment.author_id !== actingUserId && !isAdmin) {
    throw new CommunityError('Access denied: You are not authorized to edit this comment', 403);
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('forum_comments')
    .update({
      body: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select('*, profiles:author_id(id, full_name, photo_url, role)')
    .single();

  if (updateError || !updated) {
    throw new CommunityError(updateError?.message || 'Failed to update comment', 500);
  }

  await createAuditLog({
    actorId: actingUserId,
    action: 'update_forum_comment',
    targetType: 'forum_comment',
    targetId: commentId,
    metadata: { updatedByAdmin: isAdmin && comment.author_id !== actingUserId },
  });

  return {
    id: updated.id,
    targetType: updated.target_type as ForumTargetType,
    targetId: updated.target_id,
    authorId: updated.author_id,
    body: updated.body,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
    author: updated.profiles
      ? {
          id: updated.profiles.id,
          fullName: updated.profiles.full_name,
          photoUrl: updated.profiles.photo_url,
          role: updated.profiles.role as UserRole,
        }
      : undefined,
  };
}

export class ForumCommentService {
  static addComment = addComment;
  static listComments = listComments;
  static updateComment = updateComment;
  static deleteComment = (commentId: string) => supabaseAdmin.from('forum_comments').delete().eq('id', commentId);
}

