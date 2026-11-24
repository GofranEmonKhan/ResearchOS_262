import { supabaseAdmin } from '../supabase.js';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an immutable AuditLog entry in public.audit_logs
 * Always called server-side using the Supabase secret key client.
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      actor_id: params.actorId || null,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId || null,
      ip_address: params.ipAddress || null,
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to create audit log entry:', error);
    }
  } catch (err) {
    console.error('Unexpected error creating audit log:', err);
  }
}
