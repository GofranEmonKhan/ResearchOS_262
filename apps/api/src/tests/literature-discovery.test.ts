process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import app from '../index.js';
import { supabaseAdmin } from '../supabase.js';
import { Server } from 'http';
import { reconstructAbstract } from '../services/metadata/openalex.provider.js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1WP4GkxxPN-fJYvMxFvxLg_L006rTWB';

const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);

describe('AI Literature Discovery & Review Engine Test Suite', () => {
  let server: Server;
  let baseUrl: string;

  let researcherToken: string;
  let researcherUserId: string;

  let otherResearcherToken: string;
  let otherResearcherUserId: string;

  let testProjectId: string;
  let createdPaperId: string | null = null;

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

    // 2. Primary Researcher login (researcher@mit.edu)
    const { data: resLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'researcher@mit.edu',
      password: 'Password123!',
    });
    assert.ok(resLogin?.session, 'Researcher login should succeed');
    researcherToken = resLogin.session.access_token;
    researcherUserId = resLogin.user.id;

    // 3. Secondary Researcher login for isolation checks
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
    assert.ok(otherLogin?.session, 'Secondary researcher session established');
    otherResearcherToken = otherLogin!.session!.access_token;
    otherResearcherUserId = otherLogin!.user.id;

    // 4. Create an isolated project owned by primary researcher
    const { data: proj, error: projErr } = await supabaseAdmin
      .from('projects')
      .insert({
        title: 'AI Discovery Test Project',
        abstract: 'Test project for literature discovery',
        domain_tags: ['AI', 'Literature'],
        is_personal: false,
        status: 'Writing',
        owner_id: researcherUserId,
      })
      .select('id')
      .single();

    assert.ok(!projErr && proj, `Test project creation should succeed: ${projErr?.message}`);
    testProjectId = proj.id;
  });

  after(async () => {
    // Cleanup test artifacts
    if (createdPaperId) {
      await supabaseAdmin.from('embeddings').delete().eq('source_id', createdPaperId);
      await supabaseAdmin.from('papers').delete().eq('id', createdPaperId);
    }
    if (testProjectId) {
      await supabaseAdmin.from('projects').delete().eq('id', testProjectId);
    }
    if (server) {
      server.close();
    }
  });

  // ─── 1. Unit Tests: OpenAlex Abstract Reconstruction ─────────────────────────

  describe('1. OpenAlex Abstract Reconstruction', () => {
    it('correctly reconstructs inverted abstract indices into sequential sentences', () => {
      const inverted = {
        'Spiking': [0],
        'neural': [1],
        'networks': [2],
        'offer': [3],
        'high': [4],
        'energy': [5],
        'efficiency.': [6],
      };
      const result = reconstructAbstract(inverted);
      assert.equal(result, 'Spiking neural networks offer high energy efficiency.');
    });

    it('returns null on empty, undefined, or malformed abstract index', () => {
      assert.equal(reconstructAbstract(null), null);
      assert.equal(reconstructAbstract(undefined), null);
      assert.equal(reconstructAbstract({}), null);
    });
  });

  // ─── 2. POST /ai/discover (Synthesis & Search) ───────────────────────────────

  describe('2. POST /ai/discover', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await fetch(`${baseUrl}/ai/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Transformers' }),
      });
      assert.equal(res.status, 401);
    });

    it('rejects requests with missing or empty topic with 400', async () => {
      const res = await fetch(`${baseUrl}/ai/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${researcherToken}`,
        },
        body: JSON.stringify({ topic: '  ' }),
      });
      assert.equal(res.status, 400);
    });

    it('executes discovery and returns structured synthesis and paper matrix', async () => {
      const res = await fetch(`${baseUrl}/ai/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${researcherToken}`,
        },
        body: JSON.stringify({
          topic: 'Energy efficiency in Large Language Models',
          limit: 3,
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();

      assert.ok(json.topic, 'Should return query topic');
      assert.ok(json.synthesis, 'Should return synthesis');
      assert.ok(typeof json.synthesis.summary === 'string', 'Should return summary string');
      assert.ok(Array.isArray(json.synthesis.keyThemes), 'Should return keyThemes array');
      assert.ok(Array.isArray(json.synthesis.researchGaps), 'Should return researchGaps array');
      assert.ok(Array.isArray(json.papers), 'Should return papers array');
    });

    it('decomposes conversational inquiries and retrieves literature via AI query planner', async () => {
      const res = await fetch(`${baseUrl}/ai/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${researcherToken}`,
        },
        body: JSON.stringify({
          topic: 'Could you please give me some related paper of shared smartphone uses in HCI domain research?',
          limit: 3,
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();

      assert.ok(json.queryPlan, 'Should return AI query plan');
      assert.ok(json.queryPlan.normalizedTopic, 'Should have normalized topic');
      assert.ok(Array.isArray(json.queryPlan.searchQueries), 'Should have keyword search queries');
      assert.ok(json.queryPlan.searchQueries.length > 0, 'Should have at least 1 keyword search query');
      assert.ok(json.synthesis, 'Should return synthesis');
      assert.ok(Array.isArray(json.papers), 'Should return papers array');
    });
  });

  // ─── 3. POST /ai/discover/import (1-Click Ingestion & Project Guard) ──────────

  describe('3. POST /ai/discover/import', () => {
    it('rejects unauthenticated import requests with 401', async () => {
      const res = await fetch(`${baseUrl}/ai/discover/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          title: 'Unauthenticated Import',
        }),
      });
      assert.equal(res.status, 401);
    });

    it('rejects import if user is not an owner or member of the target project (403)', async () => {
      const res = await fetch(`${baseUrl}/ai/discover/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${otherResearcherToken}`, // Other researcher has no access to testProjectId
        },
        body: JSON.stringify({
          projectId: testProjectId,
          title: 'Unauthorized Ingestion Attempt',
          authors: ['Attacker'],
        }),
      });

      assert.equal(res.status, 403, 'Should return 403 Forbidden for unauthorized project');
    });

    it('successfully imports a discovered paper into project library with auto-embedding (201)', async () => {
      const res = await fetch(`${baseUrl}/ai/discover/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${researcherToken}`,
        },
        body: JSON.stringify({
          projectId: testProjectId,
          title: 'GreenAI: Energy-Aware Deep Learning Framework',
          authors: ['Alice Researcher', 'Bob Scientist'],
          year: 2026,
          venue: 'IEEE Transactions on Sustainable Computing',
          doi: `10.1145/test.${Date.now()}`,
          abstract: 'We present an energy-aware deep learning framework achieving 40% reduction in carbon emissions.',
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();

      assert.ok(json.paperId, 'Should return created paperId');
      assert.ok(json.message.includes('added to your project library'), 'Should return confirmation message');
      createdPaperId = json.paperId;

      // Verify record exists in database
      const { data: dbPaper } = await supabaseAdmin
        .from('papers')
        .select('id, title, project_id, uploader_id')
        .eq('id', createdPaperId!)
        .single();

      assert.ok(dbPaper, 'Paper should exist in database');
      assert.equal(dbPaper.project_id, testProjectId);
      assert.equal(dbPaper.uploader_id, researcherUserId);
    });
  });
});
