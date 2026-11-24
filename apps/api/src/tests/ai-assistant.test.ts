process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import app from '../index.js';
import { supabaseAdmin } from '../supabase.js';
import { Server } from 'http';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1WP4GkxxPN-fJYvMxFvxLg_L006rTWB';

const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);

describe('Spec 08 — AI Research Assistant Test Suite', () => {
  let server: Server;
  let baseUrl: string;

  let adminToken: string;
  let adminUserId: string;

  let supervisorToken: string;
  let supervisorUserId: string;

  let researcherToken: string;
  let researcherUserId: string;

  let otherResearcherToken: string;
  let otherResearcherUserId: string;

  let testProjectId: string;
  let testManuscriptId: string;
  let testSectionId: string;
  let createdBlockedRuleId: string | null = null;

  before(async () => {
    // 1. Start ephemeral HTTP server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });

    // 2. Admin login
    const { data: adminLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'admin@researchos.edu',
      password: 'Password123!',
    });
    assert.ok(adminLogin?.session, 'Admin login should succeed');
    adminToken = adminLogin.session.access_token;
    adminUserId = adminLogin.user.id;

    // 3. Supervisor login
    const { data: supLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'supervisor@stanford.edu',
      password: 'Password123!',
    });
    assert.ok(supLogin?.session, 'Supervisor login should succeed');
    supervisorToken = supLogin.session.access_token;
    supervisorUserId = supLogin.user.id;

    // 4. Primary Researcher login
    const { data: resLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'researcher@mit.edu',
      password: 'Password123!',
    });
    assert.ok(resLogin?.session, 'Researcher login should succeed');
    researcherToken = resLogin.session.access_token;
    researcherUserId = resLogin.user.id;

    // 5. Secondary Researcher login for isolation checks
    const otherEmail = 'other.researcher.ai@mit.edu';
    let { data: otherLogin } = await supabaseClient.auth.signInWithPassword({
      email: otherEmail,
      password: 'Password123!',
    });

    if (!otherLogin?.session) {
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: otherEmail,
        password: 'Password123!',
        email_confirm: true,
      });
      if (!createErr && newUser?.user) {
        await supabaseAdmin.from('profiles').upsert({
          id: newUser.user.id,
          role: 'Researcher',
          status: 'Active',
          full_name: 'Secondary Test Researcher',
        });
        const { data: relogin } = await supabaseClient.auth.signInWithPassword({
          email: otherEmail,
          password: 'Password123!',
        });
        otherLogin = relogin;
      }
    }

    assert.ok(otherLogin?.session, 'Other researcher login should succeed');
    otherResearcherToken = otherLogin.session.access_token;
    otherResearcherUserId = otherLogin.user.id;

    // 6. Ensure active AI provider config exists for tests
    await supabaseAdmin.from('ai_provider_configs').upsert({
      id: '00000000-0000-0000-0000-000000000001',
      provider: 'Gemini',
      api_key_ref: 'GEMINI_API_KEY',
      model: 'gemini-1.5-pro',
      is_active: true,
    });

    // 7. Seed test project, manuscript, and section owned by researcher
    const { data: project, error: pErr } = await supabaseAdmin
      .from('projects')
      .insert({
        owner_id: researcherUserId,
        title: 'Spec 08 AI Test Project',
        abstract: 'Testing AI writing assist and governance boundaries',
        domain_tags: ['AI', 'Genomics'],
        is_personal: false,
        status: 'Writing',
      })
      .select('id')
      .single();

    assert.ok(project?.id, `Project creation should succeed: ${pErr?.message}`);
    testProjectId = project.id;

    const { data: manuscript } = await supabaseAdmin
      .from('manuscripts')
      .insert({
        project_id: testProjectId,
        title: 'AI Assisted Genomic Modeling',
        abstract: 'Test manuscript for AI writing assistance and transparent disclosure.',
        created_by: researcherUserId,
        status: 'Draft',
      })
      .select()
      .single();

    testManuscriptId = manuscript.id;

    const { data: section } = await supabaseAdmin
      .from('manuscript_sections')
      .insert({
        manuscript_id: testManuscriptId,
        title: 'Methodology and Neural Architecture',
        section_type: 'Methodology',
        order_index: 0,
        content_markdown: 'The original baseline methodology for genome prediction.',
        is_ai_assisted: false,
      })
      .select()
      .single();

    testSectionId = section.id;
  });

  after(async () => {
    // Clean up created resources
    if (createdBlockedRuleId) {
      await supabaseAdmin.from('ai_blocked_prompt_rules').delete().eq('id', createdBlockedRuleId);
    }
    if (testSectionId) {
      await supabaseAdmin.from('manuscript_sections').delete().eq('id', testSectionId);
    }
    if (testManuscriptId) {
      await supabaseAdmin.from('manuscripts').delete().eq('id', testManuscriptId);
    }
    if (testProjectId) {
      await supabaseAdmin.from('projects').delete().eq('id', testProjectId);
    }

    // Reset Researcher quota to standard default
    await supabaseAdmin
      .from('ai_quotas')
      .upsert({ role: 'Researcher', monthly_token_limit: 100000 });

    if (server) {
      server.close();
    }
  });

  // ===========================================================================
  // 1. Authentication & RBAC Boundary Tests
  // ===========================================================================
  describe('1. Authentication & RBAC Protection', () => {
    it('rejects unauthenticated requests to AI endpoints with 401', async () => {
      const res = await fetch(`${baseUrl}/ai/usage`);
      assert.equal(res.status, 401);
    });

    it('rejects non-admin requests to /admin/ai/config with 403', async () => {
      const res = await fetch(`${baseUrl}/admin/ai/config`, {
        headers: { Authorization: `Bearer ${researcherToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('allows Admin to retrieve active AI provider configuration', async () => {
      const res = await fetch(`${baseUrl}/admin/ai/config`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.ok(data.provider, 'Provider field should be present');
      assert.equal(typeof data.apiKeyRef, 'string');
      // Verify raw API key is never exposed
      assert.equal(data.rawKey, undefined);
      assert.equal(data.apiKey, undefined);
    });

    it('allows Admin to list and update monthly token quotas', async () => {
      const listRes = await fetch(`${baseUrl}/admin/ai/quotas`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(listRes.status, 200);
      const quotas = (await listRes.json()) as any[];
      assert.ok(Array.isArray(quotas));

      const updateRes = await fetch(`${baseUrl}/admin/ai/quotas/Researcher`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ monthlyTokenLimit: 750000 }),
      });
      assert.equal(updateRes.status, 200);
      const updated = (await updateRes.json()) as any;
      assert.equal(updated.monthlyTokenLimit, 750000);
    });
  });

  // ===========================================================================
  // 2. Content Policy & Blocked Prompt Rules
  // ===========================================================================
  describe('2. Blocked Prompt Policies', () => {
    it('allows Admin to create a blocked prompt rule', async () => {
      const res = await fetch(`${baseUrl}/admin/ai/blocked-rules`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern: 'bypass peer review',
          reason: 'Academic integrity policy violation',
        }),
      });
      assert.equal(res.status, 201);
      const rule = (await res.json()) as any;
      assert.equal(rule.pattern, 'bypass peer review');
      createdBlockedRuleId = rule.id;
    });

    it('rejects user requests containing blocked substrings with 400 without token use', async () => {
      const res = await fetch(`${baseUrl}/ai/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${researcherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'How to bypass peer review in medical journals',
        }),
      });
      assert.equal(res.status, 400);
      const err = (await res.json()) as any;
      assert.equal(err.error, 'PROMPT_BLOCKED');
    });
  });

  // ===========================================================================
  // 3. AI Usage Quotas & Budget Limits
  // ===========================================================================
  describe('3. Token Quotas & Limit Enforcement', () => {
    it('returns 429 Too Many Requests when user exceeds monthly token quota', async () => {
      // Temporarily lower researcher quota to 1 token
      await supabaseAdmin
        .from('ai_quotas')
        .upsert({ role: 'Researcher', monthly_token_limit: 1 });

      // Log 100 used tokens to force over-quota state
      await supabaseAdmin.from('ai_usage_logs').insert({
        user_id: researcherUserId,
        feature: 'test_overage',
        tokens_used: 100,
        cost_usd: 0.0001,
      });

      const res = await fetch(`${baseUrl}/ai/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${researcherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: 'genomic datasets' }),
      });

      assert.equal(res.status, 429);
      const body = (await res.json()) as any;
      assert.equal(body.error, 'QUOTA_EXCEEDED');

      // Restore quota for subsequent tests
      await supabaseAdmin
        .from('ai_quotas')
        .upsert({ role: 'Researcher', monthly_token_limit: 100000 });
    });
  });

  // ===========================================================================
  // 4. Writing Assistance & Transparency Flag (Spec 08 / Phase 8.11)
  // ===========================================================================
  describe('4. Writing Assistance & Human-In-The-Loop Lifecycle', () => {
    let testSuggestionId: string;

    it('creates a Pending suggestion on writing assistance trigger', async () => {
      const res = await fetch(`${baseUrl}/ai/manuscripts/${testManuscriptId}/writing-assist`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${researcherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'paraphrase',
          selectedText: 'The original baseline methodology for genome prediction.',
          sectionId: testSectionId,
        }),
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.ok(data.suggestion);
      assert.equal(data.suggestion.status, 'Pending');
      assert.ok(data.suggestion.suggestedValue);
      testSuggestionId = data.suggestion.id;
    });

    it('prevents non-owner from accepting another user’s suggestion with 403', async () => {
      const res = await fetch(`${baseUrl}/ai/suggestions/${testSuggestionId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${otherResearcherToken}`,
        },
      });
      assert.equal(res.status, 403);
    });

    it('allows suggestion owner to accept, updating status and setting is_ai_assisted = true', async () => {
      const res = await fetch(`${baseUrl}/ai/suggestions/${testSuggestionId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${researcherToken}`,
        },
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.status, 'Accepted');

      // Verify server-side database flag was updated to true
      const { data: updatedSection } = await supabaseAdmin
        .from('manuscript_sections')
        .select('is_ai_assisted')
        .eq('id', testSectionId)
        .single();

      assert.equal(updatedSection?.is_ai_assisted, true);
    });

    it('rejects double-acceptance of an already accepted suggestion with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/ai/suggestions/${testSuggestionId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${researcherToken}`,
        },
      });

      assert.equal(res.status, 409);
    });
  });

  // ===========================================================================
  // 5. Admin Analytics & Usage Telemetry
  // ===========================================================================
  describe('5. Admin Analytics Aggregations', () => {
    it('returns aggregate token and cost analytics for admin', async () => {
      const res = await fetch(`${baseUrl}/admin/ai/usage`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const analytics = (await res.json()) as any;
      assert.ok(typeof analytics.totalTokensThisMonth === 'number');
      assert.ok(typeof analytics.totalCostUsdThisMonth === 'number');
      assert.ok(Array.isArray(analytics.byRole));
      assert.ok(Array.isArray(analytics.topUsers));
    });
  });
});
