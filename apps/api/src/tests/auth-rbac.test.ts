process.env.NODE_ENV = 'test';
import test, { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import app from '../index.js';
import { supabaseAdmin } from '../supabase.js';
import { Server } from 'http';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1WP4GkxxPN-fJYvMxFvxLg_L006rTWB';

// Public frontend client to simulate user login
const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);

describe('Spec 01 — Authentication, RBAC & Admin API Test Suite', () => {
  let server: Server;
  let baseUrl: string;

  let adminToken: string;
  let adminUserId: string;

  let supervisorToken: string;
  let supervisorUserId: string;

  let pendingSupervisorToken: string;
  let pendingSupervisorUserId: string;

  let researcherToken: string;
  let researcherUserId: string;

  before(async () => {
    // Start Express test server on ephemeral port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });

    // Obtain real test JWT tokens from Supabase Auth
    const { data: adminLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'admin@researchos.edu',
      password: 'Password123!',
    });
    assert.ok(adminLogin?.session, 'Admin login should succeed');
    adminToken = adminLogin.session.access_token;
    adminUserId = adminLogin.user.id;

    const { data: supLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'supervisor@stanford.edu',
      password: 'Password123!',
    });
    assert.ok(supLogin?.session, 'Supervisor login should succeed');
    supervisorToken = supLogin.session.access_token;
    supervisorUserId = supLogin.user.id;

    const { data: pendingLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'supervisor.pending@oxford.edu',
      password: 'Password123!',
    });
    assert.ok(pendingLogin?.session, 'Pending supervisor login should succeed');
    pendingSupervisorToken = pendingLogin.session.access_token;
    pendingSupervisorUserId = pendingLogin.user.id;

    const { data: resLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'researcher@mit.edu',
      password: 'Password123!',
    });
    researcherToken = resLogin.session.access_token;
    researcherUserId = resLogin.user.id;

    // Ensure researcher is Active before running tests
    await supabaseAdmin
      .from('profiles')
      .update({ status: 'Active', role: 'Researcher' })
      .eq('id', researcherUserId);
  });

  test.after(() => {
    if (server) server.close();
  });

  it('1. GET /me should return 401 Unauthorized when no Authorization header is provided', async () => {
    const res = await fetch(`${baseUrl}/me`);
    assert.equal(res.status, 401);
  });

  it('2. GET /me should return 200 OK with live profile for authenticated researcher', async () => {
    const res = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(res.status, 200);
    const profile = await res.json() as any;
    assert.equal(profile.id, researcherUserId);
    assert.equal(profile.role, 'Researcher');
    assert.equal(profile.status, 'Active');
  });

  it('3. PATCH /me should allow updating profile bio and skills, but strictly ignore role/status tampering', async () => {
    const res = await fetch(`${baseUrl}/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        bio: 'Updated doctoral research bio.',
        skills: ['PyTorch', 'Transformer Scaling'],
        role: 'Admin', // Malicious attempt to escalate role
        status: 'Suspended', // Malicious attempt to alter status
        id: '00000000-0000-0000-0000-000000000000',
      }),
    });

    assert.equal(res.status, 200);
    const updated = await res.json() as any;
    assert.equal(updated.bio, 'Updated doctoral research bio.');
    assert.deepEqual(updated.skills, ['PyTorch', 'Transformer Scaling']);
    assert.equal(updated.role, 'Researcher', 'Role must remain Researcher (tampering rejected)');
    assert.equal(updated.status, 'Active', 'Status must remain Active (tampering rejected)');
    assert.equal(updated.id, researcherUserId, 'ID must remain unchanged');
  });

  it('4. Admin routes (/admin/*) should return 403 Forbidden for non-Admin tokens (Researcher / Supervisor)', async () => {
    const researcherAttempt = await fetch(`${baseUrl}/admin/supervisor-verifications`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(researcherAttempt.status, 403);

    const supervisorAttempt = await fetch(`${baseUrl}/admin/supervisor-verifications`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(supervisorAttempt.status, 403);
  });

  it('5. GET /admin/supervisor-verifications should return 200 OK for Admin', async () => {
    const res = await fetch(`${baseUrl}/admin/supervisor-verifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const list = await res.json();
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 1, 'Should contain at least the seeded pending supervisor request');
  });

  it('6. POST /supervisor-verification should allow Supervisor to submit faculty verification', async () => {
    const res = await fetch(`${baseUrl}/supervisor-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pendingSupervisorToken}`,
      },
      body: JSON.stringify({
        documentUrl: 'storage/faculty-credentials/oxford-card.pdf',
        institutionDomain: 'ox.ac.uk',
      }),
    });

    assert.equal(res.status, 201);
    const created = await res.json();
    assert.equal(created.userId, pendingSupervisorUserId);
    assert.equal(created.status, 'Pending');
  });

  it('7. Admin approval of Supervisor verification should flip profile status to Active and record AuditLog', async () => {
    // 1. Fetch pending verification request
    const queueRes = await fetch(`${baseUrl}/admin/supervisor-verifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const queue = await queueRes.json();
    const targetReq = queue.find((r: any) => r.userId === pendingSupervisorUserId && r.status === 'Pending');
    assert.ok(targetReq, 'Pending verification request must exist for test');

    // 2. Approve request
    const approveRes = await fetch(`${baseUrl}/admin/supervisor-verifications/${targetReq.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(approveRes.status, 200);

    // 3. Verify profile flipped to Active in live profiles table
    const { data: updatedProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', pendingSupervisorUserId)
      .single();
    assert.equal(updatedProfile?.status, 'Active');

    // 4. Verify AuditLog written
    const { data: auditRows } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('target_id', targetReq.id)
      .eq('action', 'approve_supervisor');
    assert.ok(auditRows && auditRows.length >= 1, 'Audit log row must exist for supervisor approval');
    assert.equal(auditRows![0].actor_id, adminUserId);
  });

  it('8. Immediate rejection of Suspended users: Suspending a user blocks their next request immediately', async () => {
    // 1. Suspend researcher
    const suspendRes = await fetch(`${baseUrl}/admin/users/${researcherUserId}/suspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(suspendRes.status, 200);

    // 2. Immediate next request with the STILL-VALID JWT must be rejected with 403
    const blockedRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(blockedRes.status, 403, 'Suspended user must be blocked on their immediate next request');

    // 3. Restore researcher to Active for cleanup
    await supabaseAdmin
      .from('profiles')
      .update({ status: 'Active' })
      .eq('id', researcherUserId);
  });

  it('9. PATCH /admin/users/:id/role should allow Admin to promote/change roles and record AuditLog', async () => {
    const res = await fetch(`${baseUrl}/admin/users/${researcherUserId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'Supervisor' }),
    });

    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.role, 'Supervisor');

    // Restore to Researcher
    await supabaseAdmin
      .from('profiles')
      .update({ role: 'Researcher' })
      .eq('id', researcherUserId);
  });
});
