import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';
import { createAuditLog } from '../services/audit.service.js';
import { SubmitSupervisorVerificationDto, SupervisorVerificationRequest } from '@researchos/shared-types';

const router: Router = Router();

/**
 * POST /supervisor-verification
 * Supervisor in PendingVerification submits verification document storage path + institutionDomain
 */
router.post(
  '/supervisor-verification',
  authenticate,
  requireRole('Supervisor'),
  async (req: Request<{}, {}, SubmitSupervisorVerificationDto>, res: Response<SupervisorVerificationRequest | { error: string }>) => {
    if (!req.user || !req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { documentUrl, institutionDomain } = req.body;

    if (!documentUrl || !institutionDomain) {
      return res.status(400).json({ error: 'Missing documentUrl or institutionDomain' });
    }

    const { data: newRequest, error } = await supabaseAdmin
      .from('supervisor_verification_requests')
      .insert({
        user_id: req.userId,
        document_url: documentUrl,
        institution_domain: institutionDomain,
        status: 'Pending',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error || !newRequest) {
      return res.status(500).json({ error: 'Failed to create verification request' });
    }

    // Write audit log
    await createAuditLog({
      actorId: req.userId,
      action: 'submit_supervisor_verification',
      targetType: 'SupervisorVerificationRequest',
      targetId: newRequest.id,
      ipAddress: req.ip,
      metadata: { institutionDomain, documentUrl },
    });

    const responsePayload: SupervisorVerificationRequest = {
      id: newRequest.id,
      userId: newRequest.user_id,
      documentUrl: newRequest.document_url,
      institutionDomain: newRequest.institution_domain,
      status: newRequest.status,
      reviewedBy: newRequest.reviewed_by,
      reviewedAt: newRequest.reviewed_at,
      rejectionReason: newRequest.rejection_reason,
      createdAt: newRequest.created_at,
      user: req.user,
    };

    return res.status(201).json(responsePayload);
  }
);

export default router;
