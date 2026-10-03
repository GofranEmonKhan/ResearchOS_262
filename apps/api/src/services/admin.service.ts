import { supabaseAdmin } from '../supabase.js';
import { createAuditLog } from './audit.service.js';
import {
  AdminPlatformOverview,
  AdminUserListItem,
  AdminUserDetail,
  AdminUsersQueryParams,
  AdminUsersResponse,
  AdminAuditLogQueryParams,
  AdminAuditLogsResponse,
  AdminStorageMetrics,
  AdminSystemErrorLog,
  AuditLog,
  DeletionRequest,
  DeletionRequestStatus,
  DeletionTargetType,
  UserRole,
  UserStatus,
} from '@researchos/shared-types';

export class AdminService {
  /**
   * Aggregate platform overview and high-level health metrics.
   * Admin can view operational metrics without accessing private research content.
   */
  static async getPlatformOverview(): Promise<AdminPlatformOverview> {
    // 1. Users by role
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('role, status');

    if (profilesError) {
      throw new Error(`Failed to fetch profiles for overview: ${profilesError.message}`);
    }

    const usersCount = {
      admin: 0,
      supervisor: 0,
      researcher: 0,
      total: (profiles || []).length,
    };

    (profiles || []).forEach((p: { role: UserRole; status: UserStatus }) => {
      const roleLower = (p.role || 'Researcher').toLowerCase();
      if (roleLower === 'admin') usersCount.admin++;
      else if (roleLower === 'supervisor') usersCount.supervisor++;
      else usersCount.researcher++;
    });

    // 2. Pending supervisor verifications
    const { count: pendingVerificationsCount, error: verifError } = await supabaseAdmin
      .from('supervisor_verification_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pending');

    if (verifError) {
      console.warn('Failed to count supervisor verifications:', verifError.message);
    }

    // 3. Projects (Active vs Total)
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, status');

    let activeProjects = 0;
    let totalProjects = 0;
    if (!projectsError && projects) {
      totalProjects = projects.length;
      activeProjects = projects.filter((proj: any) => proj.status !== 'Completed').length;
    }

    // 4. Storage Footprint from file_assets
    const { data: fileAssets, error: fileAssetsError } = await supabaseAdmin
      .from('file_assets')
      .select('size_bytes');

    let storageBytes = 0;
    let storageFilesCount = 0;
    if (!fileAssetsError && fileAssets) {
      storageFilesCount = fileAssets.length;
      storageBytes = fileAssets.reduce((sum: number, f: any) => sum + (Number(f.size_bytes) || 0), 0);
    }

    // 5. Pending Marketplace listings & Open disputes
    const { count: pendingListingsCount } = await supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'Pending')
      .eq('is_delisted', false);

    const { count: openDisputesCount } = await supabaseAdmin
      .from('disputes')
      .select('id', { count: 'exact', head: true })
      .in('status', ['Open', 'UnderReview']);

    // 6. Pending Forum reports
    const { count: pendingReportsCount } = await supabaseAdmin
      .from('forum_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pending');

    // 7. AI usage in the current calendar month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: aiLogs } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('tokens_used, cost_usd')
      .gte('created_at', startOfMonth);

    let monthlyTokens = 0;
    let monthlyCostUsd = 0;
    let monthlyRequests = 0;
    if (aiLogs) {
      monthlyRequests = aiLogs.length;
      aiLogs.forEach((log: any) => {
        monthlyTokens += log.tokens_used || 0;
        monthlyCostUsd += Number(log.cost_usd) || 0;
      });
    }

    return {
      users: usersCount,
      pendingSupervisorVerifications: pendingVerificationsCount || 0,
      activeProjects,
      totalProjects,
      storageBytes,
      storageFilesCount,
      pendingMarketplaceListings: pendingListingsCount || 0,
      openDisputes: openDisputesCount || 0,
      pendingForumReports: pendingReportsCount || 0,
      aiUsageThisMonth: {
        tokens: monthlyTokens,
        costUsd: Number(monthlyCostUsd.toFixed(4)),
        requestCount: monthlyRequests,
      },
    };
  }

  /**
   * Searchable, filterable, and paginated directory of all platform users.
   */
  static async listUsers(params: AdminUsersQueryParams): Promise<AdminUsersResponse> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' });

    if (params.role) {
      query = query.eq('role', params.role);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      query = query.or(`full_name.ilike.%${s}%,institution.ilike.%${s}%,department.ilike.%${s}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: profiles, count, error } = await query;

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    // Get project counts for the retrieved users
    const userIds = (profiles || []).map((p: any) => p.id);
    const projectCountsMap: Record<string, number> = {};

    if (userIds.length > 0) {
      const { data: ownedProjects } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .in('owner_id', userIds);

      (ownedProjects || []).forEach((proj: any) => {
        projectCountsMap[proj.owner_id] = (projectCountsMap[proj.owner_id] || 0) + 1;
      });

      const { data: memberships } = await supabaseAdmin
        .from('project_members')
        .select('user_id')
        .in('user_id', userIds);

      (memberships || []).forEach((m: any) => {
        projectCountsMap[m.user_id] = (projectCountsMap[m.user_id] || 0) + 1;
      });
    }

    const users: AdminUserListItem[] = (profiles || []).map((p: any) => ({
      id: p.id,
      fullName: p.full_name || 'Scholar',
      email: p.email || undefined,
      role: p.role,
      status: p.status,
      institution: p.institution || '',
      department: p.department || '',
      photoUrl: p.photo_url,
      reputationPoints: p.reputation_points || 0,
      projectsCount: projectCountsMap[p.id] || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return {
      users,
      total: count || 0,
      page,
      limit,
    };
  }

  /**
   * Content-safe operational detail for a single user.
   */
  static async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new Error('User profile not found');
    }

    // Project count
    const { count: ownedCount } = await supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId);

    const { count: memberCount } = await supabaseAdmin
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const projectsCount = (ownedCount || 0) + (memberCount || 0);

    // Tasks count
    const { count: tasksCount } = await supabaseAdmin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', userId);

    // Verification history
    const { data: verifs } = await supabaseAdmin
      .from('supervisor_verification_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Recent audit logs involving user
    const { data: auditEvents } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .or(`actor_id.eq.${userId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      id: profile.id,
      fullName: profile.full_name,
      role: profile.role,
      status: profile.status,
      institution: profile.institution,
      department: profile.department,
      photoUrl: profile.photo_url,
      bio: profile.bio,
      orcidUrl: profile.orcid_url,
      scholarUrl: profile.scholar_url,
      researchFieldTags: profile.research_field_tags || [],
      skills: profile.skills || [],
      reputationPoints: profile.reputation_points || 0,
      projectsCount,
      tasksCount: tasksCount || 0,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      verificationHistory: (verifs || []).map((v: any) => ({
        id: v.id,
        userId: v.user_id,
        documentUrl: v.document_url,
        institutionDomain: v.institution_domain,
        status: v.status,
        reviewedBy: v.reviewed_by,
        reviewedAt: v.reviewed_at,
        rejectionReason: v.rejection_reason,
        createdAt: v.created_at,
      })),
      recentAuditLogs: (auditEvents || []).map((a: any) => ({
        id: a.id,
        actorId: a.actor_id,
        action: a.action,
        targetType: a.target_type,
        targetId: a.target_id,
        ipAddress: a.ip_address,
        metadata: a.metadata || {},
        createdAt: a.created_at,
      })),
    };
  }

  /**
   * Searchable, filterable, and paginated audit log explorer.
   */
  static async listAuditLogs(params: AdminAuditLogQueryParams): Promise<AdminAuditLogsResponse> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 25));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (params.actorId) {
      query = query.eq('actor_id', params.actorId);
    }

    if (params.action) {
      query = query.eq('action', params.action);
    }

    if (params.targetType) {
      query = query.eq('target_type', params.targetType);
    }

    if (params.startDate) {
      query = query.gte('created_at', params.startDate);
    }

    if (params.endDate) {
      query = query.lte('created_at', params.endDate);
    }

    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      query = query.or(`action.ilike.%${s}%,target_type.ilike.%${s}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: logs, count, error } = await query;

    if (error) {
      throw new Error(`Failed to list audit logs: ${error.message}`);
    }

    // Resolve actor names
    const actorIds = Array.from(new Set((logs || []).map((l: any) => l.actor_id).filter(Boolean)));
    const actorsMap: Record<string, { fullName: string; role: UserRole }> = {};

    if (actorIds.length > 0) {
      const { data: actorProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role')
        .in('id', actorIds);

      (actorProfiles || []).forEach((p: any) => {
        actorsMap[p.id] = { fullName: p.full_name, role: p.role };
      });
    }

    const formattedLogs: AuditLog[] = (logs || []).map((l: any) => ({
      id: l.id,
      actorId: l.actor_id,
      actorName: l.actor_id ? (actorsMap[l.actor_id]?.fullName || 'System/Unknown') : 'System/Automation',
      actorRole: l.actor_id ? actorsMap[l.actor_id]?.role : null,
      action: l.action,
      targetType: l.target_type,
      targetId: l.target_id,
      ipAddress: l.ip_address,
      metadata: l.metadata || {},
      createdAt: l.created_at,
    }));

    return {
      logs: formattedLogs,
      total: count || 0,
      page,
      limit,
    };
  }

  /**
   * Storage summary and breakdown across platform buckets.
   */
  static async getStorageMetrics(): Promise<AdminStorageMetrics> {
    const { data: files, error } = await supabaseAdmin
      .from('file_assets')
      .select('id, file_name, mime_type, size_bytes, storage_path, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch storage metrics: ${error.message}`);
    }

    const allFiles = files || [];
    const totalFiles = allFiles.length;
    const totalBytes = allFiles.reduce((sum: number, f: any) => sum + (Number(f.size_bytes) || 0), 0);

    // Group by Category
    const categoriesMap: Record<string, { bytes: number; count: number }> = {
      'Academic Papers (PDF)': { bytes: 0, count: 0 },
      'Experiment Artifacts & Outputs': { bytes: 0, count: 0 },
      'Datasets & Code': { bytes: 0, count: 0 },
      'Images & Visualizations': { bytes: 0, count: 0 },
      'Verification Documents': { bytes: 0, count: 0 },
      'Other': { bytes: 0, count: 0 },
    };

    allFiles.forEach((f: any) => {
      const mime = (f.mime_type || '').toLowerCase();
      const path = (f.storage_path || '').toLowerCase();
      const bytes = Number(f.size_bytes) || 0;

      if (mime.includes('pdf') || path.includes('papers')) {
        categoriesMap['Academic Papers (PDF)'].bytes += bytes;
        categoriesMap['Academic Papers (PDF)'].count += 1;
      } else if (path.includes('experiments') || path.includes('outputs')) {
        categoriesMap['Experiment Artifacts & Outputs'].bytes += bytes;
        categoriesMap['Experiment Artifacts & Outputs'].count += 1;
      } else if (mime.includes('csv') || mime.includes('json') || mime.includes('python') || path.includes('datasets')) {
        categoriesMap['Datasets & Code'].bytes += bytes;
        categoriesMap['Datasets & Code'].count += 1;
      } else if (mime.includes('image')) {
        categoriesMap['Images & Visualizations'].bytes += bytes;
        categoriesMap['Images & Visualizations'].count += 1;
      } else if (path.includes('verification') || path.includes('supervisors')) {
        categoriesMap['Verification Documents'].bytes += bytes;
        categoriesMap['Verification Documents'].count += 1;
      } else {
        categoriesMap['Other'].bytes += bytes;
        categoriesMap['Other'].count += 1;
      }
    });

    const byCategory = Object.entries(categoriesMap).map(([category, stats]) => ({
      category,
      bytes: stats.bytes,
      count: stats.count,
    }));

    const recentAssets = allFiles.slice(0, 10).map((f: any) => ({
      id: f.id,
      fileName: f.file_name || 'asset',
      mimeType: f.mime_type || 'application/octet-stream',
      sizeBytes: Number(f.size_bytes) || 0,
      storagePath: f.storage_path || '',
      uploadedAt: f.created_at,
    }));

    return {
      totalBytes,
      totalFiles,
      byCategory,
      recentAssets,
    };
  }

  /**
   * Feed of operational errors and system logs.
   */
  static async getSystemErrors(): Promise<AdminSystemErrorLog[]> {
    // Collect error-related audit logs and simulated health status
    const { data: logs } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .or('action.ilike.%error%,action.ilike.%fail%,action.ilike.%reject%,action.ilike.%suspend%')
      .order('created_at', { ascending: false })
      .limit(20);

    const errorLogs: AdminSystemErrorLog[] = (logs || []).map((l: any) => ({
      id: l.id,
      service: l.target_type || 'Platform',
      message: `${l.action.replace(/_/g, ' ')} on ${l.target_type} (${l.target_id || 'System'})`,
      level: l.action.includes('fail') || l.action.includes('error') ? 'error' : 'warn',
      timestamp: l.created_at,
      metadata: l.metadata,
    }));

    return errorLogs;
  }

  /**
   * List formal deletion requests for admin review.
   */
  static async listDeletionRequests(status?: string): Promise<DeletionRequest[]> {
    try {
      let query = supabaseAdmin
        .from('deletion_requests')
        .select('*, profiles:requested_by(full_name)');

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: requests, error } = await query.order('created_at', { ascending: false });

      if (error) {
        // Return empty array gracefully if table is fresh
        console.warn('Could not query deletion_requests:', error.message);
        return [];
      }

      // Collect project titles if targetType === 'Project'
      const projectIds = (requests || [])
        .filter((r: any) => r.target_type === 'Project')
        .map((r: any) => r.target_id);

      const projectTitlesMap: Record<string, string> = {};
      if (projectIds.length > 0) {
        const { data: projects } = await supabaseAdmin
          .from('projects')
          .select('id, title')
          .in('id', projectIds);

        (projects || []).forEach((p: any) => {
          projectTitlesMap[p.id] = p.title;
        });
      }

      return (requests || []).map((r: any) => ({
        id: r.id,
        targetType: r.target_type as DeletionTargetType,
        targetId: r.target_id,
        targetTitle: projectTitlesMap[r.target_id] || `Project (${r.target_id})`,
        requestedBy: r.requested_by,
        requestedByName: r.profiles?.full_name || 'Researcher',
        reason: r.reason,
        status: r.status as DeletionRequestStatus,
        decidedBy: r.decided_by,
        decisionNotes: r.decision_notes,
        decidedAt: r.decided_at,
        createdAt: r.created_at,
      }));
    } catch (err) {
      console.warn('Error reading deletion requests:', err);
      return [];
    }
  }

  /**
   * Create a new formal deletion request (e.g. project owner requests project deletion).
   */
  static async createDeletionRequest(
    userId: string,
    targetType: DeletionTargetType,
    targetId: string,
    reason: string,
    ipAddress?: string
  ): Promise<DeletionRequest> {
    if (!reason || !reason.trim()) {
      throw new Error('Reason for deletion request is required.');
    }

    if (targetType === 'Project') {
      const { data: project, error: projErr } = await supabaseAdmin
        .from('projects')
        .select('id, owner_id, title')
        .eq('id', targetId)
        .single();

      if (projErr || !project) {
        throw new Error('Target project not found.');
      }

      if (project.owner_id !== userId) {
        throw new Error('Only the project owner can submit a deletion request for this project.');
      }
    }

    const { data: created, error } = await supabaseAdmin
      .from('deletion_requests')
      .insert({
        target_type: targetType,
        target_id: targetId,
        requested_by: userId,
        reason: reason.trim(),
        status: 'Pending',
      })
      .select('*')
      .single();

    if (error || !created) {
      throw new Error(`Failed to create deletion request: ${error?.message}`);
    }

    await createAuditLog({
      actorId: userId,
      action: 'request_deletion',
      targetType,
      targetId,
      ipAddress,
      metadata: { requestId: created.id, reason: reason.trim() },
    });

    return {
      id: created.id,
      targetType: created.target_type,
      targetId: created.target_id,
      requestedBy: created.requested_by,
      reason: created.reason,
      status: created.status,
      createdAt: created.created_at,
    };
  }

  /**
   * Approve formal deletion request (Admin only).
   */
  static async approveDeletionRequest(
    requestId: string,
    adminId: string,
    decisionNotes?: string,
    ipAddress?: string
  ): Promise<DeletionRequest> {
    const { data: request, error: fetchErr } = await supabaseAdmin
      .from('deletion_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !request) {
      throw new Error('Deletion request not found.');
    }

    if (request.status !== 'Pending') {
      throw new Error(`Deletion request is already ${request.status}.`);
    }

    const now = new Date().toISOString();

    // If Project, execute deletion
    if (request.target_type === 'Project') {
      const { error: delErr } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', request.target_id);

      if (delErr) {
        throw new Error(`Failed to delete target project: ${delErr.message}`);
      }
    }

    // Update request
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('deletion_requests')
      .update({
        status: 'Approved',
        decided_by: adminId,
        decision_notes: decisionNotes || null,
        decided_at: now,
      })
      .eq('id', requestId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      throw new Error(`Failed to update deletion request status: ${updateErr?.message}`);
    }

    await createAuditLog({
      actorId: adminId,
      action: 'approve_deletion_request',
      targetType: request.target_type,
      targetId: request.target_id,
      ipAddress,
      metadata: {
        requestId,
        targetType: request.target_type,
        targetId: request.target_id,
        decisionNotes,
      },
    });

    return {
      id: updated.id,
      targetType: updated.target_type,
      targetId: updated.target_id,
      requestedBy: updated.requested_by,
      reason: updated.reason,
      status: updated.status,
      decidedBy: updated.decided_by,
      decisionNotes: updated.decision_notes,
      decidedAt: updated.decided_at,
      createdAt: updated.created_at,
    };
  }

  /**
   * Reject formal deletion request (Admin only).
   */
  static async rejectDeletionRequest(
    requestId: string,
    adminId: string,
    decisionNotes: string,
    ipAddress?: string
  ): Promise<DeletionRequest> {
    if (!decisionNotes || !decisionNotes.trim()) {
      throw new Error('decisionNotes is required when rejecting a deletion request.');
    }

    const { data: request, error: fetchErr } = await supabaseAdmin
      .from('deletion_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !request) {
      throw new Error('Deletion request not found.');
    }

    if (request.status !== 'Pending') {
      throw new Error(`Deletion request is already ${request.status}.`);
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('deletion_requests')
      .update({
        status: 'Rejected',
        decided_by: adminId,
        decision_notes: decisionNotes.trim(),
        decided_at: now,
      })
      .eq('id', requestId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      throw new Error(`Failed to reject deletion request: ${updateErr?.message}`);
    }

    await createAuditLog({
      actorId: adminId,
      action: 'reject_deletion_request',
      targetType: request.target_type,
      targetId: request.target_id,
      ipAddress,
      metadata: {
        requestId,
        targetType: request.target_type,
        targetId: request.target_id,
        decisionNotes: decisionNotes.trim(),
      },
    });

    return {
      id: updated.id,
      targetType: updated.target_type,
      targetId: updated.target_id,
      requestedBy: updated.requested_by,
      reason: updated.reason,
      status: updated.status,
      decidedBy: updated.decided_by,
      decisionNotes: updated.decision_notes,
      decidedAt: updated.decided_at,
      createdAt: updated.created_at,
    };
  }
}
