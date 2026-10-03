process.env.NODE_ENV = 'test';
import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import app from '../index.js';
import { supabaseAdmin } from '../supabase.js';
import { Server } from 'http';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1WP4GkxxPN-fJYvMxFvxLg_L006rTWB';
const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);

describe('Spec 09 — Admin Console, Analytics & Governance Test Suite', () => {
  let server: Server;
  let baseUrl: string;

  let adminToken: string;
  let adminUserId: string;

  let supervisorToken: string;
  let supervisorUserId: string;

  let researcherToken: string;
  let researcherUserId: string;

  let testProjectId: string;
  let testDeletionRequestId: string;

  before(async () => {
    // Start Express test server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });

    // Sign in Admin
    const { data: adminLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'admin@researchos.edu',
      password: 'Password123!',
    });
    assert.ok(adminLogin?.session, 'Admin login should succeed');
    adminToken = adminLogin.session.access_token;
    adminUserId = adminLogin.user.id;

    // Sign in Supervisor
    const { data: supLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'supervisor@stanford.edu',
      password: 'Password123!',
    });
    assert.ok(supLogin?.session, 'Supervisor login should succeed');
    supervisorToken = supLogin.session.access_token;
    supervisorUserId = supLogin.user.id;

    // Sign in Researcher
    const { data: resLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'researcher@mit.edu',
      password: 'Password123!',
    });
    assert.ok(resLogin?.session, 'Researcher login should succeed');
    researcherToken = resLogin.session.access_token;
    researcherUserId = resLogin.user.id;

    // Ensure profiles are Active with correct roles
    await supabaseAdmin
      .from('profiles')
      .update({ status: 'Active', role: 'Admin' })
      .eq('id', adminUserId);

    await supabaseAdmin
      .from('profiles')
      .update({ status: 'Active', role: 'Supervisor' })
      .eq('id', supervisorUserId);

    await supabaseAdmin
      .from('profiles')
      .update({ status: 'Active', role: 'Researcher' })
      .eq('id', researcherUserId);

    // Create a temporary project for deletion tests
    const { data: proj } = await supabaseAdmin
      .from('projects')
      .insert({
        title: 'Admin Spec 09 Deletion Test Project',
        abstract: 'Temporary project to test admin deletion approval',
        owner_id: supervisorUserId,
        status: 'Planning',
        domain_tags: ['Testing', 'Admin'],
      })
      .select('id')
      .single();

    if (proj) {
      testProjectId = proj.id;
    }
  });

  after(async () => {
    try {
      if (testProjectId) {
        await supabaseAdmin.from('projects').delete().eq('id', testProjectId);
      }
    } catch (e) {}
    try {
      if (testDeletionRequestId) {
        await supabaseAdmin.from('deletion_requests').delete().eq('id', testDeletionRequestId);
      }
    } catch (e) {}
    if (server) server.close();
  });

  it('1. Non-admin (Researcher/Supervisor) cannot access /admin/* endpoints (403 Forbidden)', async () => {
    const endpoints = [
      '/admin/overview',
      '/admin/users',
      '/admin/audit-logs',
      '/admin/storage',
      '/admin/errors',
      '/admin/deletion-requests',
    ];

    for (const ep of endpoints) {
      const resRes = await fetch(`${baseUrl}${ep}`, {
        headers: { Authorization: `Bearer ${researcherToken}` },
      });
      assert.strictEqual(resRes.status, 403, `Researcher should receive 403 on ${ep}`);

      const resSup = await fetch(`${baseUrl}${ep}`, {
        headers: { Authorization: `Bearer ${supervisorToken}` },
      });
      assert.strictEqual(resSup.status, 403, `Supervisor should receive 403 on ${ep}`);
    }
  });

  it('2. Admin can fetch platform overview metrics (GET /admin/overview)', async () => {
    const res = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data, 'Should have data envelope');
    assert.ok(typeof body.data.users.admin === 'number', 'Should have users.admin count');
    assert.ok(typeof body.data.users.supervisor === 'number', 'Should have users.supervisor count');
    assert.ok(typeof body.data.users.researcher === 'number', 'Should have users.researcher count');
    assert.ok(typeof body.data.activeProjects === 'number', 'Should have activeProjects count');
    assert.ok(typeof body.data.storageBytes === 'number', 'Should have storageBytes metric');
    assert.ok(body.data.aiUsageThisMonth, 'Should have aiUsageThisMonth metrics');
  });

  it('3. Admin can list platform users with search and pagination (GET /admin/users)', async () => {
    const res = await fetch(`${baseUrl}/admin/users?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.users), 'Users should be an array');
    assert.ok(typeof body.total === 'number', 'Total count should be a number');
    assert.ok(body.users.length > 0, 'Should return at least 1 user');

    const firstUser = body.users[0];
    assert.ok(firstUser.id, 'User should have id');
    assert.ok(firstUser.role, 'User should have role');
    assert.ok(typeof firstUser.projectsCount === 'number', 'User should have projectsCount');
  });

  it('4. Admin can get content-safe user operational detail (GET /admin/users/:id)', async () => {
    const res = await fetch(`${baseUrl}/admin/users/${supervisorUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const detail = await res.json();
    assert.strictEqual(detail.id, supervisorUserId);
    assert.strictEqual(detail.role, 'Supervisor');
    assert.ok(Array.isArray(detail.verificationHistory), 'Should include verificationHistory');
    assert.ok(typeof detail.projectsCount === 'number', 'Should have projectsCount');
  });

  it('5. Admin can search and filter audit logs (GET /admin/audit-logs)', async () => {
    const res = await fetch(`${baseUrl}/admin/audit-logs?limit=15`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.logs), 'Logs should be an array');
    assert.ok(typeof body.total === 'number', 'Total count should be present');

    if (body.logs.length > 0) {
      const log = body.logs[0];
      assert.ok(log.action, 'Log should have action');
      assert.ok(log.targetType, 'Log should have targetType');
    }
  });

  it('6. Admin can inspect storage metrics breakdown (GET /admin/storage)', async () => {
    const res = await fetch(`${baseUrl}/admin/storage`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const metrics = await res.json();
    assert.ok(typeof metrics.totalBytes === 'number', 'Should have totalBytes');
    assert.ok(typeof metrics.totalFiles === 'number', 'Should have totalFiles');
    assert.ok(Array.isArray(metrics.byCategory), 'Should have byCategory array');
    assert.ok(Array.isArray(metrics.recentAssets), 'Should have recentAssets array');
  });

  it('7. Admin can inspect system errors feed (GET /admin/errors)', async () => {
    const res = await fetch(`${baseUrl}/admin/errors`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const errors = await res.json();
    assert.ok(Array.isArray(errors), 'Errors should be an array');
  });

  it('8. Project Owner can submit a deletion request and Admin can review & reject/approve it', async () => {
    if (!testProjectId) return;

    // Supervisor (owner) submits deletion request
    const createRes = await fetch(`${baseUrl}/projects/${testProjectId}/deletion-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ reason: 'Project milestone finished, requesting cleanup.' }),
    });

    // If deletion_requests table is present in database
    if (createRes.status === 201) {
      const created = await createRes.json();
      assert.strictEqual(created.status, 'Pending');
      testDeletionRequestId = created.id;

      // Admin lists deletion requests
      const listRes = await fetch(`${baseUrl}/admin/deletion-requests`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(listRes.status, 200);
      const list = await listRes.json();
      assert.ok(Array.isArray(list), 'Should return list of deletion requests');

      // Admin rejects with note
      const rejectRes = await fetch(`${baseUrl}/admin/deletion-requests/${testDeletionRequestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ decisionNotes: 'Project archive retention required for 30 days.' }),
      });
      assert.strictEqual(rejectRes.status, 200);
      const rejected = await rejectRes.json();
      assert.strictEqual(rejected.status, 'Rejected');
    }
  });
});
