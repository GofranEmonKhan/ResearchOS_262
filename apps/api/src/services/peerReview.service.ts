import { supabaseAdmin } from '../supabase.js';
import {
  ReviewAssignment,
  ReviewComment,
  ManuscriptChecklistItem,
  AssignReviewerDto,
  CreateReviewCommentDto,
  FixReviewCommentDto,
  ResolveReviewCommentDto,
  ReopenReviewCommentDto,
  UpdateChecklistItemDto,
  CreateChecklistItemDto,
} from '@researchos/shared-types';
import { createNotification } from './notification.service.js';

export class PeerReviewService {
  /**
   * Helper to map review comment DB row
   */
  private static mapComment(row: any): ReviewComment {
    return {
      id: row.id,
      manuscriptId: row.manuscript_id,
      sectionId: row.section_id,
      reviewerId: row.reviewer_id,
      parentCommentId: row.parent_comment_id,
      highlightedText: row.highlighted_text,
      commentText: row.comment_text,
      severity: row.severity,
      status: row.status,
      fixNote: row.fix_note,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewer: row.reviewer ? {
        id: row.reviewer.id,
        fullName: row.reviewer.full_name,
        photoUrl: row.reviewer.photo_url,
        role: row.reviewer.role,
      } : null,
      resolver: row.resolver ? {
        id: row.resolver.id,
        fullName: row.resolver.full_name,
        photoUrl: row.resolver.photo_url,
      } : null,
      section: row.section ? {
        id: row.section.id,
        title: row.section.title,
        orderIndex: row.section.order_index,
      } : null,
    };
  }

  /**
   * Assign an internal reviewer to a manuscript (Supervisor only)
   */
  static async assignReviewer(
    manuscriptId: string,
    supervisorId: string,
    dto: AssignReviewerDto
  ): Promise<ReviewAssignment> {
    if (!dto.reviewerId) {
      throw new Error('Reviewer ID is required');
    }

    // Verify reviewer profile exists and is Active
    const { data: reviewerProfile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, status')
      .eq('id', dto.reviewerId)
      .single();

    if (profErr || !reviewerProfile) {
      throw new Error('Reviewer profile was not found');
    }

    if (reviewerProfile.status !== 'Active') {
      throw new Error('Reviewer profile is not active');
    }

    const { data: assignment, error } = await supabaseAdmin
      .from('review_assignments')
      .upsert(
        {
          manuscript_id: manuscriptId,
          reviewer_id: dto.reviewerId,
          assigned_by: supervisorId,
          deadline: dto.deadline || null,
          status: 'Assigned',
        },
        { onConflict: 'manuscript_id,reviewer_id' }
      )
      .select('*, reviewer:reviewer_id(id, full_name, photo_url, role, institution), assigner:assigned_by(id, full_name, photo_url)')
      .single();

    if (error || !assignment) {
      throw new Error(`Failed to assign reviewer: ${error?.message}`);
    }

    // Log revision
    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: supervisorId,
      action: 'ReviewerAssigned',
      details: { reviewerId: dto.reviewerId, deadline: dto.deadline },
    });

    // Notify reviewer
    const { data: manuscript } = await supabaseAdmin
      .from('manuscripts')
      .select('title')
      .eq('id', manuscriptId)
      .single();

    await createNotification({
      userId: dto.reviewerId,
      type: 'ReviewerAssigned',
      payload: {
        manuscriptId,
        manuscriptTitle: manuscript?.title,
        deadline: dto.deadline,
        assignedBy: supervisorId,
      },
    });

    return {
      id: assignment.id,
      manuscriptId: assignment.manuscript_id,
      reviewerId: assignment.reviewer_id,
      assignedBy: assignment.assigned_by,
      deadline: assignment.deadline,
      status: assignment.status,
      createdAt: assignment.created_at,
      reviewer: assignment.reviewer,
      assigner: assignment.assigner,
    };
  }

  /**
   * Remove reviewer assignment
   */
  static async removeReviewAssignment(
    manuscriptId: string,
    reviewerId: string,
    supervisorId: string
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('review_assignments')
      .delete()
      .eq('manuscript_id', manuscriptId)
      .eq('reviewer_id', reviewerId);

    if (error) {
      throw new Error(`Failed to remove review assignment: ${error.message}`);
    }

    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: supervisorId,
      action: 'ReviewerRemoved',
      details: { reviewerId },
    });
  }

  /**
   * Create a review comment on a section or general manuscript
   */
  static async createReviewComment(
    manuscriptId: string,
    reviewerId: string,
    dto: CreateReviewCommentDto
  ): Promise<ReviewComment> {
    if (!dto.commentText || !dto.commentText.trim()) {
      throw new Error('Comment text cannot be empty');
    }

    const { data: comment, error } = await supabaseAdmin
      .from('review_comments')
      .insert({
        manuscript_id: manuscriptId,
        section_id: dto.sectionId || null,
        reviewer_id: reviewerId,
        parent_comment_id: dto.parentCommentId || null,
        highlighted_text: dto.highlightedText || null,
        comment_text: dto.commentText.trim(),
        severity: dto.severity || 'MinorScientific',
        status: 'Open',
      })
      .select('*, reviewer:reviewer_id(id, full_name, photo_url, role), section:section_id(id, title, order_index)')
      .single();

    if (error || !comment) {
      throw new Error(`Failed to create review comment: ${error?.message}`);
    }

    // Log revision
    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      section_id: dto.sectionId || null,
      actor_id: reviewerId,
      action: 'ReviewCommentAdded',
      details: { severity: comment.severity, commentId: comment.id },
    });

    // Notify authors
    const { data: authors } = await supabaseAdmin
      .from('manuscript_authors')
      .select('user_id')
      .eq('manuscript_id', manuscriptId);

    const { data: manuscript } = await supabaseAdmin
      .from('manuscripts')
      .select('title, supervisor_id')
      .eq('id', manuscriptId)
      .single();

    const notifyUserIds = new Set<string>();
    authors?.forEach((a) => {
      if (a.user_id !== reviewerId) notifyUserIds.add(a.user_id);
    });
    if (manuscript?.supervisor_id && manuscript.supervisor_id !== reviewerId) {
      notifyUserIds.add(manuscript.supervisor_id);
    }

    for (const recipientId of notifyUserIds) {
      await createNotification({
        userId: recipientId,
        type: 'ReviewCommentAdded',
        payload: {
          manuscriptId,
          manuscriptTitle: manuscript?.title,
          commentId: comment.id,
          severity: comment.severity,
          reviewerId,
        },
      });
    }

    return this.mapComment(comment);
  }

  /**
   * Researcher marks comment as FixedByResearcher with mandatory fixNote (AC-06)
   */
  static async fixReviewComment(
    commentId: string,
    manuscriptId: string,
    researcherId: string,
    dto: FixReviewCommentDto
  ): Promise<ReviewComment> {
    if (!dto.fixNote || !dto.fixNote.trim()) {
      throw new Error('A detailed fix note is required to mark this review comment as addressed');
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('review_comments')
      .select('*')
      .eq('id', commentId)
      .eq('manuscript_id', manuscriptId)
      .single();

    if (fetchErr || !existing) {
      throw new Error('Review comment not found');
    }

    const { data: updated, error } = await supabaseAdmin
      .from('review_comments')
      .update({
        status: 'FixedByResearcher',
        fix_note: dto.fixNote.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select('*, reviewer:reviewer_id(id, full_name, photo_url, role), section:section_id(id, title, order_index)')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update comment status: ${error?.message}`);
    }

    // Log revision
    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: researcherId,
      action: 'CommentMarkedFixed',
      details: { commentId, fixNote: dto.fixNote.trim() },
    });

    // Notify the reviewer who opened it
    if (existing.reviewer_id && existing.reviewer_id !== researcherId) {
      await createNotification({
        userId: existing.reviewer_id,
        type: 'CommentFixed',
        payload: {
          manuscriptId,
          commentId,
          fixNote: dto.fixNote.trim(),
          researcherId,
        },
      });
    }

    return this.mapComment(updated);
  }

  /**
   * Supervisor resolves a review comment
   */
  static async resolveReviewComment(
    commentId: string,
    manuscriptId: string,
    supervisorId: string,
    dto: ResolveReviewCommentDto
  ): Promise<ReviewComment> {
    const { data: updated, error } = await supabaseAdmin
      .from('review_comments')
      .update({
        status: 'Resolved',
        resolved_by: supervisorId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('manuscript_id', manuscriptId)
      .select('*, reviewer:reviewer_id(id, full_name, photo_url, role), resolver:resolved_by(id, full_name, photo_url), section:section_id(id, title, order_index)')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to resolve comment: ${error?.message}`);
    }

    // Log revision
    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: supervisorId,
      action: 'CommentResolved',
      details: { commentId, note: dto.resolutionNote },
    });

    // Notify reviewer if different from supervisor
    if (updated.reviewer_id && updated.reviewer_id !== supervisorId) {
      await createNotification({
        userId: updated.reviewer_id,
        type: 'CommentResolved',
        payload: {
          manuscriptId,
          commentId,
          resolvedBy: supervisorId,
        },
      });
    }

    return this.mapComment(updated);
  }

  /**
   * Reopen a review comment
   */
  static async reopenReviewComment(
    commentId: string,
    manuscriptId: string,
    actorId: string,
    dto: ReopenReviewCommentDto
  ): Promise<ReviewComment> {
    if (!dto.reopenReason || !dto.reopenReason.trim()) {
      throw new Error('Reopen reason is required');
    }

    const { data: updated, error } = await supabaseAdmin
      .from('review_comments')
      .update({
        status: 'Reopened',
        resolved_by: null,
        resolved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('manuscript_id', manuscriptId)
      .select('*, reviewer:reviewer_id(id, full_name, photo_url, role), section:section_id(id, title, order_index)')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to reopen comment: ${error?.message}`);
    }

    // Log revision
    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: actorId,
      action: 'CommentReopened',
      details: { commentId, reopenReason: dto.reopenReason.trim() },
    });

    return this.mapComment(updated);
  }

  /**
   * Update checklist item (enforcing lock check)
   */
  static async updateChecklistItem(
    itemId: string,
    manuscriptId: string,
    userId: string,
    isSupervisor: boolean,
    dto: UpdateChecklistItemDto
  ): Promise<ManuscriptChecklistItem> {
    const { data: item, error: fetchErr } = await supabaseAdmin
      .from('manuscript_checklist_items')
      .select('*')
      .eq('id', itemId)
      .eq('manuscript_id', manuscriptId)
      .single();

    if (fetchErr || !item) {
      throw new Error('Checklist item not found');
    }

    // If item is locked, only supervisor can complete/uncomplete it!
    if (item.is_locked && !isSupervisor && dto.isCompleted !== undefined) {
      throw new Error('This checklist item is locked and requires Supervisor sign-off');
    }

    const updates: Record<string, any> = {};
    if (dto.label !== undefined) updates.label = dto.label.trim();
    if (dto.orderIndex !== undefined) updates.order_index = dto.orderIndex;
    if (dto.isCompleted !== undefined) {
      updates.is_completed = dto.isCompleted;
      updates.completed_by = dto.isCompleted ? userId : null;
      updates.completed_at = dto.isCompleted ? new Date().toISOString() : null;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('manuscript_checklist_items')
      .update(updates)
      .eq('id', itemId)
      .select('*, completedByUser:completed_by(id, full_name, photo_url)')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update checklist item: ${error?.message}`);
    }

    return {
      id: updated.id,
      manuscriptId: updated.manuscript_id,
      label: updated.label,
      isCompleted: updated.is_completed,
      completedBy: updated.completed_by,
      completedAt: updated.completed_at,
      isLocked: updated.is_locked,
      orderIndex: updated.order_index,
      createdAt: updated.created_at,
      completedByUser: updated.completedByUser ? {
        id: updated.completedByUser.id,
        fullName: updated.completedByUser.full_name,
        photoUrl: updated.completedByUser.photo_url,
      } : null,
    };
  }

  /**
   * Create custom checklist item
   */
  static async createChecklistItem(
    manuscriptId: string,
    isSupervisor: boolean,
    dto: CreateChecklistItemDto
  ): Promise<ManuscriptChecklistItem> {
    if (!dto.label || !dto.label.trim()) {
      throw new Error('Checklist item label is required');
    }

    let order = dto.orderIndex;
    if (order === undefined) {
      const { count } = await supabaseAdmin
        .from('manuscript_checklist_items')
        .select('*', { count: 'exact', head: true })
        .eq('manuscript_id', manuscriptId);
      order = count || 0;
    }

    const { data: created, error } = await supabaseAdmin
      .from('manuscript_checklist_items')
      .insert({
        manuscript_id: manuscriptId,
        label: dto.label.trim(),
        is_completed: false,
        is_locked: false,
        order_index: order,
      })
      .select('*, completedByUser:completed_by(id, full_name, photo_url)')
      .single();

    if (error || !created) {
      throw new Error(`Failed to create checklist item: ${error?.message}`);
    }

    return {
      id: created.id,
      manuscriptId: created.manuscript_id,
      label: created.label,
      isCompleted: created.is_completed,
      completedBy: created.completed_by,
      completedAt: created.completed_at,
      isLocked: created.is_locked,
      orderIndex: created.order_index,
      createdAt: created.created_at,
      completedByUser: null,
    };
  }
}
