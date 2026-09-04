import { Router, Request, Response } from 'express';
import { authenticate, requireRole, requireStatus, mapDbProfileToProfile } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';
import { createAuditLog } from '../services/audit.service.js';
import { 
  RejectSupervisorVerificationDto, 
  ChangeUserRoleDto, 
  SupervisorVerificationRequest, 
  Profile, 
  USER_ROLES 
} from '@researchos/shared-types';

const router: Router = Router();

// Guard all admin routes with authentication, Active status, and Admin role
router.use(authenticate);
router.use(requireStatus('Active'));
router.use(requireRole('Admin'));

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

export default router;
