import { supabaseAdmin } from '../supabase.js';
import { ForumReport, ReportStatus, ReportTargetType } from '@researchos/shared-types';
import { NotificationService } from './notification.service.js';

export class ForumReportService {
  /**
   * Submit a new moderation report
   */
  static async createReport(
    reporterId: string,
    params: {
      targetType: ReportTargetType;
      targetId: string;
      reason: string;
      description?: string;
    }
  ): Promise<ForumReport> {
    const { targetType, targetId, reason, description } = params;

    // Direct Message Privacy Verification:
    // If reporting a DM, verify the reporter is a participant in that DM
    if (targetType === 'DirectMessage') {
      const { data: dm, error: dmErr } = await supabaseAdmin
        .from('direct_messages')
        .select('id, sender_id, recipient_id')
        .eq('id', targetId)
        .single();

      if (dmErr || !dm) {
        throw new Error('Direct message not found');
      }

      if (dm.sender_id !== reporterId && dm.recipient_id !== reporterId) {
        throw new Error('You can only report direct messages you are a participant of');
      }
    }

    const effectiveReason = description && description.trim()
      ? `${reason.trim()} — ${description.trim()}`
      : reason.trim();

    const { data: report, error } = await supabaseAdmin
      .from('forum_reports')
      .insert({
        reporter_id: reporterId,
        target_type: targetType,
        target_id: targetId,
        reason: effectiveReason,
        status: 'Pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create report: ${error.message}`);
    }

    return {
      id: report.id,
      reporterId: report.reporter_id,
      targetType: report.target_type,
      targetId: report.target_id,
      reason: report.reason,
      description: report.reason,
      status: report.status,
      actionTaken: report.action_taken,
      actionNote: report.action_note,
      reviewedBy: report.reviewed_by,
      reviewedAt: report.reviewed_at,
      resolvedBy: report.reviewed_by,
      resolvedAt: report.reviewed_at,
      createdAt: report.created_at,
    };
  }

  /**
   * List reports for Admin Moderation Queue
   * Strictly enforces AC-13 DM Privacy Rule: DM message body is NEVER displayed to Admin!
   */
  static async listReports(options: {
    status?: ReportStatus;
    targetType?: ReportTargetType;
    page?: number;
    limit?: number;
  }): Promise<{ reports: ForumReport[]; total: number }> {
    const { status, targetType, page = 1, limit = 20 } = options;

    let query = supabaseAdmin
      .from('forum_reports')
      .select(`
        id,
        reporter_id,
        target_type,
        target_id,
        reason,
        status,
        action_taken,
        action_note,
        reviewed_by,
        reviewed_at,
        created_at,
        reporter:profiles!forum_reports_reporter_id_fkey(
          id,
          full_name,
          role,
          photo_url
        ),
        reviewer:profiles!forum_reports_reviewed_by_fkey(
          id,
          full_name,
          role
        )
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }
    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: rawReports, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list reports: ${error.message}`);
    }

    if (!rawReports || rawReports.length === 0) {
      return { reports: [], total: count || 0 };
    }

    // Enrich target details respecting privacy boundaries
    const enrichedReports = await Promise.all(
      rawReports.map(async r => {
        let targetSummary = '';
        let targetAuthorId: string | undefined;
        let targetAuthorName: string | undefined;

        if (r.target_type === 'Post') {
          const { data: post } = await supabaseAdmin
            .from('forum_posts')
            .select('title, author_id, author:profiles!forum_posts_author_id_fkey(full_name)')
            .eq('id', r.target_id)
            .single();

          if (post) {
            targetSummary = `Post: "${post.title}"`;
            targetAuthorId = post.author_id;
            targetAuthorName = (post as any).author?.full_name;
          } else {
            targetSummary = '[Deleted Post]';
          }
        } else if (r.target_type === 'Answer') {
          const { data: answer } = await supabaseAdmin
            .from('forum_answers')
            .select('body, author_id, author:profiles!forum_answers_author_id_fkey(full_name)')
            .eq('id', r.target_id)
            .single();

          if (answer) {
            targetSummary = `Answer: "${answer.body.slice(0, 80)}..."`;
            targetAuthorId = answer.author_id;
            targetAuthorName = (answer as any).author?.full_name;
          } else {
            targetSummary = '[Deleted Answer]';
          }
        } else if (r.target_type === 'Comment') {
          const { data: comment } = await supabaseAdmin
            .from('forum_comments')
            .select('body, author_id, author:profiles!forum_comments_author_id_fkey(full_name)')
            .eq('id', r.target_id)
            .single();

          if (comment) {
            targetSummary = `Comment: "${comment.body.slice(0, 80)}..."`;
            targetAuthorId = comment.author_id;
            targetAuthorName = (comment as any).author?.full_name;
          } else {
            targetSummary = '[Deleted Comment]';
          }
        } else if (r.target_type === 'DirectMessage') {
          // =========================================================================
          // CRITICAL SECURITY & AC-13 REQUIREMENT:
          // Admins CANNOT read private DM message bodies. Only metadata is exposed.
          // =========================================================================
          const { data: dm } = await supabaseAdmin
            .from('direct_messages')
            .select('id, sender_id, recipient_id, created_at, sender:profiles!direct_messages_sender_id_fkey(full_name), recipient:profiles!direct_messages_recipient_id_fkey(full_name)')
            .eq('id', r.target_id)
            .single();

          if (dm) {
            const senderName = (dm as any).sender?.full_name || 'Unknown Sender';
            const recipientName = (dm as any).recipient?.full_name || 'Unknown Recipient';
            targetSummary = '[METADATA ONLY — PRIVATE DM PROTECTED BY AC-13]';
            targetAuthorId = dm.sender_id;
            targetAuthorName = `${senderName} ➔ ${recipientName}`;
          } else {
            targetSummary = '[Deleted Direct Message]';
          }
        }

        const report: ForumReport = {
          id: r.id,
          reporterId: r.reporter_id,
          targetType: r.target_type,
          targetId: r.target_id,
          reason: r.reason,
          description: r.reason,
          status: r.status,
          actionTaken: r.action_taken,
          actionNote: r.action_note,
          reviewedBy: r.reviewed_by,
          reviewedAt: r.reviewed_at,
          resolvedBy: r.reviewed_by,
          resolvedAt: r.reviewed_at,
          createdAt: r.created_at,
          reporter: (r as any).reporter ? {
            id: (r as any).reporter.id,
            fullName: (r as any).reporter.full_name,
            role: (r as any).reporter.role,
            photoUrl: (r as any).reporter.photo_url,
          } : undefined,
          resolver: (r as any).reviewer ? {
            id: (r as any).reviewer.id,
            fullName: (r as any).reviewer.full_name,
            role: (r as any).reviewer.role,
          } : undefined,
          reviewedByUser: (r as any).reviewer ? {
            id: (r as any).reviewer.id,
            fullName: (r as any).reviewer.full_name,
            role: (r as any).reviewer.role,
          } : undefined,
          targetSummary,
          targetAuthorId,
          targetAuthorName,
        };

        return report;
      })
    );

    return {
      reports: enrichedReports,
      total: count || enrichedReports.length,
    };
  }

  /**
   * Action / Resolve a report
   */
  static async resolveReport(
    reportId: string,
    moderatorId: string,
    params: {
      action?: 'DeleteContent' | 'WarnUser' | 'Dismiss' | string;
      actionTaken?: string;
      actionNotes?: string;
      actionNote?: string;
      status?: ReportStatus;
      deleteTarget?: boolean;
      lockTarget?: boolean;
    }
  ): Promise<ForumReport> {
    const { action, actionTaken, actionNotes, actionNote, status, deleteTarget, lockTarget } = params;

    const { data: report, error: repErr } = await supabaseAdmin
      .from('forum_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (repErr || !report) {
      throw new Error('Report not found');
    }

    const now = new Date().toISOString();
    let newStatus: ReportStatus = status || (action === 'Dismiss' ? 'Dismissed' : 'ActionTaken');
    const finalActionTaken = actionTaken || actionNotes || actionNote || (action ? `Action: ${action}` : 'ActionTaken');
    const finalActionNote = actionNote || actionNotes || null;

    // Execute target action if requested
    if (action === 'DeleteContent' || deleteTarget) {
      if (report.target_type === 'Post') {
        await supabaseAdmin.from('forum_posts').delete().eq('id', report.target_id);
      } else if (report.target_type === 'Answer') {
        await supabaseAdmin.from('forum_answers').delete().eq('id', report.target_id);
      } else if (report.target_type === 'Comment') {
        await supabaseAdmin.from('forum_comments').delete().eq('id', report.target_id);
      } else if (report.target_type === 'DirectMessage') {
        await supabaseAdmin.from('direct_messages').delete().eq('id', report.target_id);
      }
    }

    if (lockTarget && report.target_type === 'Post') {
      await supabaseAdmin.from('forum_posts').update({ is_locked: true }).eq('id', report.target_id);
    }

    // Update report
    const { data: updated, error } = await supabaseAdmin
      .from('forum_reports')
      .update({
        status: newStatus,
        action_taken: finalActionTaken,
        action_note: finalActionNote,
        reviewed_by: moderatorId,
        reviewed_at: now,
      })
      .eq('id', reportId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to resolve report: ${error.message}`);
    }

    return {
      id: updated.id,
      reporterId: updated.reporter_id,
      targetType: updated.target_type,
      targetId: updated.target_id,
      reason: updated.reason,
      status: updated.status,
      actionTaken: updated.action_taken,
      actionNote: updated.action_note,
      reviewedBy: updated.reviewed_by,
      reviewedAt: updated.reviewed_at,
      resolvedBy: updated.reviewed_by,
      resolvedAt: updated.reviewed_at,
      createdAt: updated.created_at,
    };
  }
}
