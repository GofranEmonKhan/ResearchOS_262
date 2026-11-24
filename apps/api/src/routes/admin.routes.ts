import { Router, Request, Response } from 'express';
import { authenticate, requireRole, requireStatus, mapDbProfileToProfile } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';
import { createAuditLog } from '../services/audit.service.js';
import { AdminService } from '../services/admin.service.js';
import { 
  RejectSupervisorVerificationDto, 
  ChangeUserRoleDto, 
  SupervisorVerificationRequest, 
  Profile, 
  USER_ROLES,
  UserRole,
  UpdateAiProviderConfigRequest,
  UpdateAiQuotaRequest,
  CreateBlockedPromptRuleRequest,
  AdminUsersQueryParams,
  AdminAuditLogQueryParams,
} from '@researchos/shared-types';
import {
  getAiProviderConfig,
  updateAiProviderConfig,
  listAiQuotas,
  updateAiQuota,
  getAdminAiUsageAnalytics,
  listBlockedRules,
  createBlockedRule,
  deleteBlockedRule,
} from '../services/ai/index.js';

const router: Router = Router();

// Guard all admin routes with authentication, Active status, and Admin role
router.use(authenticate);
router.use(requireStatus('Active'));
router.use(requireRole('Admin'));

/**
 * GET /admin/overview
 * Aggregate platform overview and high-level governance metrics
 */
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const overview = await AdminService.getPlatformOverview();
    return res.json({ data: overview });
  } catch (err: any) {
    console.error('[Admin] Get platform overview error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch platform overview' });
  }
});

/**
 * GET /admin/users
 * Searchable, filterable, and paginated directory of all platform users
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const query: AdminUsersQueryParams = {
      search: req.query.search as string,
      role: req.query.role as any,
      status: req.query.status as any,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };
    const result = await AdminService.listUsers(query);
    return res.json(result);
  } catch (err: any) {
    console.error('[Admin] List users error:', err);
    return res.status(500).json({ error: err.message || 'Failed to list users' });
  }
});

/**
 * GET /admin/users/:id
 * Content-safe operational detail for a single user
 */
router.get('/users/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const detail = await AdminService.getUserDetail(req.params.id);
    return res.json(detail);
  } catch (err: any) {
    console.error('[Admin] Get user detail error:', err);
    return res.status(404).json({ error: err.message || 'User not found' });
  }
});

/**
 * GET /admin/supervisor-verifications
 * Queue of pending supervisor verification requests
 */
router.get('/supervisor-verifications', async (req: Request, res: Response<SupervisorVerificationRequest[] | { error: string }>) => {

  try {
    const { data: requests, error } = await supabaseAdmin
      .from('supervisor_verification_requests')
      .select('*, profiles:user_id(*)')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch supervisor verifications' });
    }

    const formatted: SupervisorVerificationRequest[] = (requests || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      documentUrl: r.document_url,
      institutionDomain: r.institution_domain,
      status: r.status,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at,
      rejectionReason: r.rejection_reason,
      createdAt: r.created_at,
      user: r.profiles ? mapDbProfileToProfile(r.profiles) : null,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /admin/supervisor-verifications/:id/approve
 * Approves a supervisor verification request, flips user status to Active, writes AuditLog
 */
router.post('/supervisor-verifications/:id/approve', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const adminId = req.userId!;

  // 1. Fetch request
  const { data: request, error: fetchError } = await supabaseAdmin
    .from('supervisor_verification_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !request) {
    return res.status(404).json({ error: 'Verification request not found' });
  }

  // 2. Update request status to Approved
  const now = new Date().toISOString();
  const { error: updateReqError } = await supabaseAdmin
    .from('supervisor_verification_requests')
    .update({
      status: 'Approved',
      reviewed_by: adminId,
      reviewed_at: now,
    })
    .eq('id', id);

  if (updateReqError) {
    return res.status(500).json({ error: 'Failed to approve verification request' });
  }

  // 3. Flip user status to Active
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      status: 'Active',
      updated_at: now,
    })
    .eq('id', request.user_id);

  if (profileError) {
    return res.status(500).json({ error: 'Failed to activate supervisor profile' });
  }

  // 4. Write AuditLog
  await createAuditLog({
    actorId: adminId,
    action: 'approve_supervisor',
    targetType: 'SupervisorVerificationRequest',
    targetId: id,
    ipAddress: req.ip,
    metadata: { userId: request.user_id, approvedAt: now },
  });

  return res.json({ success: true, message: 'Supervisor verification approved' });
});

/**
 * POST /admin/supervisor-verifications/:id/reject
 * Rejects a supervisor verification request with a rejectionReason, writes AuditLog
 */
router.post('/supervisor-verifications/:id/reject', async (req: Request<{ id: string }, {}, RejectSupervisorVerificationDto>, res: Response) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  const adminId = req.userId!;

  if (!rejectionReason || !rejectionReason.trim()) {
    return res.status(400).json({ error: 'rejectionReason is required' });
  }

  const { data: request, error: fetchError } = await supabaseAdmin
    .from('supervisor_verification_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !request) {
    return res.status(404).json({ error: 'Verification request not found' });
  }

  const now = new Date().toISOString();
  const { error: updateReqError } = await supabaseAdmin
    .from('supervisor_verification_requests')
    .update({
      status: 'Rejected',
      rejection_reason: rejectionReason.trim(),
      reviewed_by: adminId,
      reviewed_at: now,
    })
    .eq('id', id);

  if (updateReqError) {
    return res.status(500).json({ error: 'Failed to reject verification request' });
  }

  await createAuditLog({
    actorId: adminId,
    action: 'reject_supervisor',
    targetType: 'SupervisorVerificationRequest',
    targetId: id,
    ipAddress: req.ip,
    metadata: { userId: request.user_id, rejectionReason: rejectionReason.trim() },
  });

  return res.json({ success: true, message: 'Supervisor verification rejected' });
});

/**
 * POST /admin/users/:id/suspend
 * Suspends user account and invalidates live auth sessions
 */
router.post('/users/:id/suspend', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const adminId = req.userId!;

  const now = new Date().toISOString();
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      status: 'Suspended',
      updated_at: now,
    })
    .eq('id', id);

  if (profileError) {
    return res.status(500).json({ error: 'Failed to suspend user profile' });
  }

  // Invalidate Supabase sessions for user
  try {
    await supabaseAdmin.auth.admin.signOut(id);
  } catch (signOutErr) {
    console.warn('Could not invalidate auth sessions for user:', id, signOutErr);
  }

  // Write audit log
  await createAuditLog({
    actorId: adminId,
    action: 'suspend_user',
    targetType: 'User',
    targetId: id,
    ipAddress: req.ip,
    metadata: { suspendedAt: now },
  });

  return res.json({ success: true, message: 'User account suspended' });
});

/**
 * POST /admin/users/:id/force-password-reset
 * Invalidates sessions and triggers password reset email/link
 */
router.post('/users/:id/force-password-reset', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const adminId = req.userId!;

  const { data: authUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(id);
  if (fetchError || !authUser?.user?.email) {
    return res.status(404).json({ error: 'User not found in authentication system' });
  }

  // Trigger reset password email / generate link
  const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: authUser.user.email,
  });

  if (resetError) {
    return res.status(500).json({ error: 'Failed to trigger password reset' });
  }

  // Invalidate current sessions
  try {
    await supabaseAdmin.auth.admin.signOut(id);
  } catch (err) {
    console.warn('Could not invalidate sessions for user:', id, err);
  }

  await createAuditLog({
    actorId: adminId,
    action: 'force_password_reset',
    targetType: 'User',
    targetId: id,
    ipAddress: req.ip,
    metadata: { email: authUser.user.email },
  });

  return res.json({ success: true, message: 'Password reset initiated' });
});

/**
 * PATCH /admin/users/:id/role
 * Changes a user's application role
 */
router.patch('/users/:id/role', async (req: Request<{ id: string }, {}, ChangeUserRoleDto>, res: Response<Profile | { error: string }>) => {
  const { id } = req.params;
  const { role } = req.body;
  const adminId = req.userId!;

  if (!role || !USER_ROLES[role]) {
    return res.status(400).json({ error: `Invalid role. Must be one of [${Object.keys(USER_ROLES).join(', ')}]` });
  }

  const now = new Date().toISOString();
  const { data: updatedProfile, error } = await supabaseAdmin
    .from('profiles')
    .update({
      role,
      updated_at: now,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !updatedProfile) {
    return res.status(500).json({ error: 'Failed to change user role' });
  }

  await createAuditLog({
    actorId: adminId,
    action: 'change_role',
    targetType: 'User',
    targetId: id,
    ipAddress: req.ip,
    metadata: { newRole: role },
  });

  return res.json(mapDbProfileToProfile(updatedProfile));
});

/**
 * GET /admin/forum/reports
 * Moderation queue for reported forum content (DM bodies strictly redacted per AC-13)
 */
router.get('/forum/reports', async (req: Request, res: Response) => {
  try {
    const { status, targetType, page = '1', limit = '50' } = req.query as any;
    const { ForumReportService } = await import('../services/forumReport.service.js');

    const reports = await ForumReportService.listReports({
      status: status as any,
      targetType: targetType as any,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
    });

    return res.json(reports);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/forum/reports/:id/action
 * Resolve or take action on a reported piece of content
 */
router.post('/forum/reports/:id/action', async (req: Request, res: Response) => {
  try {
    const reportId = req.params.id as string;
    const { action, actionNotes, actionTaken, actionNote, status, deleteTarget, lockTarget } = req.body;
    const adminId = req.userId!;

    const { ForumReportService } = await import('../services/forumReport.service.js');
    const resolved = await ForumReportService.resolveReport(reportId, adminId, {
      action,
      actionNotes,
      actionTaken,
      actionNote,
      status,
      deleteTarget,
      lockTarget,
    });

    await createAuditLog({
      actorId: adminId,
      action: 'resolve_forum_report',
      targetType: 'Report',
      targetId: reportId,
      ipAddress: req.ip,
      metadata: { action: action || actionTaken, status: status || resolved.status },
    });

    return res.json(resolved);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =============================================================================
// AI Research Assistant (Spec 08) — Admin Governance Endpoints
// =============================================================================

/**
 * GET /admin/ai/config
 * Read active AI provider configuration (sanitized; never exposes raw secret).
 */
router.get('/ai/config', async (_req: Request, res: Response) => {
  try {
    const config = await getAiProviderConfig();
    return res.status(200).json(config ?? { message: 'No AI provider configured' });
  } catch (err: any) {
    console.error('[Admin] Read AI config error:', err);
    return res.status(500).json({ error: err.message || 'Failed to read AI provider config.' });
  }
});

/**
 * PATCH /admin/ai/config
 * Update active provider, model, apiKeyRef, or active state.
 */
router.patch('/ai/config', async (req: Request<{}, {}, UpdateAiProviderConfigRequest>, res: Response) => {
  const adminId = req.userId!;

  try {
    const updated = await updateAiProviderConfig(adminId, req.body);

    await createAuditLog({
      actorId: adminId,
      action: 'update_ai_provider_config',
      targetType: 'SystemConfig',
      targetId: updated.id,
      ipAddress: req.ip,
      metadata: req.body as Record<string, unknown>,
    });

    return res.status(200).json(updated);
  } catch (err: any) {
    console.error('[Admin] Update AI config error:', err);
    return res.status(400).json({ error: err.message || 'Failed to update AI provider config.' });
  }
});

/**
 * GET /admin/ai/quotas
 * List monthly token quotas for all roles.
 */
router.get('/ai/quotas', async (_req: Request, res: Response) => {
  try {
    const quotas = await listAiQuotas();
    return res.status(200).json(quotas);
  } catch (err: any) {
    console.error('[Admin] List AI quotas error:', err);
    return res.status(500).json({ error: err.message || 'Failed to list AI quotas.' });
  }
});

/**
 * PATCH /admin/ai/quotas/:role
 * Update monthly token limit for a specific role.
 */
router.patch('/ai/quotas/:role', async (req: Request<{ role: string }, {}, UpdateAiQuotaRequest>, res: Response) => {
  const adminId = req.userId!;
  const role = req.params.role as UserRole;
  const { monthlyTokenLimit } = req.body;

  if (monthlyTokenLimit === undefined || typeof monthlyTokenLimit !== 'number' || monthlyTokenLimit < 0) {
    return res.status(400).json({ error: 'monthlyTokenLimit must be a non-negative number.' });
  }

  const validRoles: UserRole[] = ['Admin', 'Supervisor', 'Researcher'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role "${role}". Must be one of: ${validRoles.join(', ')}` });
  }

  try {
    const updated = await updateAiQuota(role, monthlyTokenLimit);

    await createAuditLog({
      actorId: adminId,
      action: 'update_ai_quota',
      targetType: 'SystemConfig',
      targetId: null,
      ipAddress: req.ip,
      metadata: { role, monthlyTokenLimit },
    });

    return res.status(200).json(updated);
  } catch (err: any) {
    console.error('[Admin] Update AI quota error:', err);
    return res.status(400).json({ error: err.message || 'Failed to update AI quota.' });
  }
});

/**
 * GET /admin/ai/usage
 * Global aggregate AI usage and cost analytics for current month.
 */
router.get('/ai/usage', async (_req: Request, res: Response) => {
  try {
    const analytics = await getAdminAiUsageAnalytics();
    return res.status(200).json(analytics);
  } catch (err: any) {
    console.error('[Admin] Read AI usage analytics error:', err);
    return res.status(500).json({ error: err.message || 'Failed to read AI usage analytics.' });
  }
});

/**
 * GET /admin/ai/blocked-rules
 * List all active content policy / blocked prompt rules.
 */
router.get('/ai/blocked-rules', async (_req: Request, res: Response) => {
  try {
    const rules = await listBlockedRules();
    return res.status(200).json(rules);
  } catch (err: any) {
    console.error('[Admin] List blocked rules error:', err);
    return res.status(500).json({ error: err.message || 'Failed to list blocked prompt rules.' });
  }
});

/**
 * POST /admin/ai/blocked-rules
 * Create a new blocked prompt rule (substring pattern match).
 */
router.post('/ai/blocked-rules', async (req: Request<{}, {}, CreateBlockedPromptRuleRequest>, res: Response) => {
  const adminId = req.userId!;
  const { pattern, reason } = req.body;

  if (!pattern || typeof pattern !== 'string' || !pattern.trim()) {
    return res.status(400).json({ error: 'pattern is required and must be a non-empty string.' });
  }
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({ error: 'reason is required.' });
  }

  try {
    const created = await createBlockedRule({
      pattern: pattern.trim(),
      reason: reason.trim(),
      createdBy: adminId,
    });

    await createAuditLog({
      actorId: adminId,
      action: 'create_blocked_prompt_rule',
      targetType: 'PolicyRule',
      targetId: created.id,
      ipAddress: req.ip,
      metadata: { pattern: pattern.trim(), reason: reason.trim() },
    });

    return res.status(201).json(created);
  } catch (err: any) {
    console.error('[Admin] Create blocked rule error:', err);
    return res.status(400).json({ error: err.message || 'Failed to create blocked prompt rule.' });
  }
});

/**
 * DELETE /admin/ai/blocked-rules/:id
 * Delete a blocked prompt rule.
 */
router.delete('/ai/blocked-rules/:id', async (req: Request<{ id: string }>, res: Response) => {
  const adminId = req.userId!;
  const ruleId = req.params.id as string;

  try {
    await deleteBlockedRule(ruleId);

    await createAuditLog({
      actorId: adminId,
      action: 'delete_blocked_prompt_rule',
      targetType: 'PolicyRule',
      targetId: ruleId,
      ipAddress: req.ip,
      metadata: { ruleId },
    });

    return res.status(200).json({ message: 'Blocked prompt rule deleted successfully.' });
  } catch (err: any) {
    console.error(`[Admin] Delete blocked rule error for ${ruleId}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to delete blocked prompt rule.' });
  }
});

// ==========================================
// Marketplace Governance & Moderation (Spec 07)
// ==========================================

import { MarketplaceService } from '../services/marketplace.service.js';
import { EscrowService } from '../services/escrow.service.js';
import { ResolveDisputeDTO } from '@researchos/shared-types';

/**
 * GET /admin/marketplace/listings/pending
 * List all pending listings awaiting approval
 */
router.get('/marketplace/listings/pending', async (_req: Request, res: Response) => {
  try {
    const pending = await MarketplaceService.getPendingListings();
    return res.json(pending);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/marketplace/listings/:id/approve
 * Approve listing and make publicly active
 */
router.post('/marketplace/listings/:id/approve', async (req: Request, res: Response) => {
  try {
    const listingId = req.params.id as string;
    const adminId = req.user!.id;

    const approved = await MarketplaceService.approveListing(listingId, adminId);
    await createAuditLog({
      actorId: adminId,
      action: 'approve_marketplace_listing',
      targetType: 'Listing',
      targetId: listingId,
      ipAddress: req.ip,
      metadata: { title: approved.title },
    });

    return res.json(approved);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /admin/marketplace/listings/:id/reject
 * Reject listing with explanation
 */
router.post('/marketplace/listings/:id/reject', async (req: Request, res: Response) => {
  try {
    const listingId = req.params.id as string;
    const adminId = req.user!.id;
    const { reason } = req.body;

    const rejected = await MarketplaceService.rejectListing(listingId, reason);
    await createAuditLog({
      actorId: adminId,
      action: 'reject_marketplace_listing',
      targetType: 'Listing',
      targetId: listingId,
      ipAddress: req.ip,
      metadata: { reason },
    });

    return res.json(rejected);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /admin/marketplace/listings/:id/delist
 * Delist violating listing
 */
router.post('/marketplace/listings/:id/delist', async (req: Request, res: Response) => {
  try {
    const listingId = req.params.id as string;
    const adminId = req.user!.id;

    const delisted = await MarketplaceService.delistListing(listingId);
    await createAuditLog({
      actorId: adminId,
      action: 'delist_marketplace_listing',
      targetType: 'Listing',
      targetId: listingId,
      ipAddress: req.ip,
      metadata: { listingId },
    });

    return res.json(delisted);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /admin/marketplace/disputes
 * View all open marketplace disputes
 */
router.get('/marketplace/disputes', async (_req: Request, res: Response) => {
  try {
    const ledger = await EscrowService.getAdminLedger();
    return res.json(ledger.disputes);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/marketplace/disputes/:id/resolve
 * Arbitrate and resolve marketplace dispute
 */
router.post('/marketplace/disputes/:id/resolve', async (req: Request, res: Response) => {
  try {
    const disputeId = req.params.id as string;
    const adminId = req.user!.id;
    const dto: ResolveDisputeDTO = req.body;

    const resolved = await EscrowService.resolveDispute(disputeId, adminId, dto);
    await createAuditLog({
      actorId: adminId,
      action: 'resolve_marketplace_dispute',
      targetType: 'Dispute',
      targetId: disputeId,
      ipAddress: req.ip,
      metadata: { action: dto.action, resolutionNote: dto.resolutionNote },
    });

    return res.json(resolved);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /admin/marketplace/ledger
 * Platform financial ledger and key marketplace metrics
 */
router.get('/marketplace/ledger', async (_req: Request, res: Response) => {
  try {
    const ledger = await EscrowService.getAdminLedger();
    return res.json(ledger);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/audit-logs
 * Searchable, filterable audit log reader with actor metadata
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const query: AdminAuditLogQueryParams = {
      search: req.query.search as string,
      actorId: req.query.actorId as string,
      action: req.query.action as string,
      targetType: req.query.targetType as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 25,
    };
    const result = await AdminService.listAuditLogs(query);
    return res.json(result);
  } catch (err: any) {
    console.error('[Admin] List audit logs error:', err);
    return res.status(500).json({ error: err.message || 'Failed to list audit logs' });
  }
});

/**
 * GET /admin/storage
 * Platform storage consumption metrics, breakdown, and recent assets
 */
router.get('/storage', async (_req: Request, res: Response) => {
  try {
    const metrics = await AdminService.getStorageMetrics();
    return res.json(metrics);
  } catch (err: any) {
    console.error('[Admin] Get storage metrics error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get storage metrics' });
  }
});

/**
 * GET /admin/errors
 * Operational / system error logs feed
 */
router.get('/errors', async (_req: Request, res: Response) => {
  try {
    const errors = await AdminService.getSystemErrors();
    return res.json(errors);
  } catch (err: any) {
    console.error('[Admin] Get error logs error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get error logs' });
  }
});

/**
 * GET /admin/deletion-requests
 * List formal deletion requests for admin decision
 */
router.get('/deletion-requests', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const requests = await AdminService.listDeletionRequests(status);
    return res.json(requests);
  } catch (err: any) {
    console.error('[Admin] List deletion requests error:', err);
    return res.status(500).json({ error: err.message || 'Failed to list deletion requests' });
  }
});

/**
 * POST /admin/deletion-requests/:id/approve
 * Approve formal deletion of target entity (e.g. Project)
 */
router.post('/deletion-requests/:id/approve', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { decisionNotes } = req.body;
    const adminId = req.user!.id;
    const approved = await AdminService.approveDeletionRequest(
      req.params.id,
      adminId,
      decisionNotes,
      req.ip
    );
    return res.json(approved);
  } catch (err: any) {
    console.error('[Admin] Approve deletion request error:', err);
    return res.status(400).json({ error: err.message || 'Failed to approve deletion request' });
  }
});

/**
 * POST /admin/deletion-requests/:id/reject
 * Reject formal deletion request with explanation
 */
router.post('/deletion-requests/:id/reject', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { decisionNotes } = req.body;
    const adminId = req.user!.id;
    const rejected = await AdminService.rejectDeletionRequest(
      req.params.id,
      adminId,
      decisionNotes,
      req.ip
    );
    return res.json(rejected);
  } catch (err: any) {
    console.error('[Admin] Reject deletion request error:', err);
    return res.status(400).json({ error: err.message || 'Failed to reject deletion request' });
  }
});

export default router;



