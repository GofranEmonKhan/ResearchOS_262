process.env.NODE_ENV = 'test';
import test, { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import app from '../index.js';
import { supabaseAdmin } from '../supabase.js';
import { Server } from 'http';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1WP4GkxxPN-fJYvMxFvxLg_L006rTWB';
const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);

describe('Spec 04 — Experiment Tracker API & Acceptance Criteria Test Suite', () => {
  let server: Server;
  let baseUrl: string;

  let adminToken: string;
  let adminUserId: string;

  let supervisorToken: string;
  let supervisorUserId: string;

  let researcherToken: string;
  let researcherUserId: string;

  let secondResearcherToken: string;
  let secondResearcherUserId: string;

  let testProjectId: string;
  let draftExperimentId: string;
  let finalExperimentId: string;
  let compareExpId1: string;
  let compareExpId2: string;
  let compareExpId3: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });

    // 1. Admin login
    const { data: adminLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'admin@researchos.edu',
      password: 'Password123!',
    });
    assert.ok(adminLogin?.session, 'Admin login should succeed');
    adminToken = adminLogin.session.access_token;
    adminUserId = adminLogin.user.id;

    // 2. Supervisor login
    const { data: supLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'supervisor@stanford.edu',
      password: 'Password123!',
    });
    assert.ok(supLogin?.session, 'Supervisor login should succeed');
    supervisorToken = supLogin.session.access_token;
    supervisorUserId = supLogin.user.id;

    // 3. Researcher 1 login
    const { data: resLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'researcher@mit.edu',
      password: 'Password123!',
    });
    assert.ok(resLogin?.session, 'Researcher 1 login should succeed');
    researcherToken = resLogin.session.access_token;
    researcherUserId = resLogin.user.id;

    // 4. Create or ensure Researcher 2 for isolation tests
    const secondEmail = 'researcher2.test@mit.edu';
    let { data: res2Login } = await supabaseClient.auth.signInWithPassword({
      email: secondEmail,
      password: 'Password123!',
    });

    if (!res2Login?.session) {
      const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
        email: secondEmail,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { name: 'Bob Researcher 2' },
      });
      assert.ok(newUser.user, 'Researcher 2 user creation');
      secondResearcherUserId = newUser.user.id;

      await supabaseAdmin.from('profiles').upsert({
        id: secondResearcherUserId,
        full_name: 'Bob Researcher 2',
        role: 'Researcher',
        status: 'Active',
      });

      const { data: loginRes } = await supabaseClient.auth.signInWithPassword({
        email: secondEmail,
        password: 'Password123!',
      });
      assert.ok(loginRes?.session, 'Researcher 2 login');
      secondResearcherToken = loginRes.session.access_token;
    } else {
      secondResearcherToken = res2Login.session.access_token;
      secondResearcherUserId = res2Login.user.id;
    }

    // Ensure profiles are active
    await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Admin' }).eq('id', adminUserId);
    await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Supervisor' }).eq('id', supervisorUserId);
    await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Researcher' }).eq('id', researcherUserId);
    await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Researcher' }).eq('id', secondResearcherUserId);

    // Initialize isolated ephemeral test collaborative project owned by Supervisor
    const { data: proj } = await supabaseAdmin
      .from('projects')
      .insert({
        title: '__Test_Experiment_Suite__',
        owner_id: supervisorUserId,
        is_personal: false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    assert.ok(proj?.id, 'Test project creation');
    testProjectId = proj.id;

    // Add Researcher 1 and Researcher 2 as Members
    await supabaseAdmin.from('project_members').insert([
      {
        project_id: testProjectId,
        user_id: researcherUserId,
        project_role: 'Member',
        joined_at: new Date().toISOString(),
      },
      {
        project_id: testProjectId,
        user_id: secondResearcherUserId,
        project_role: 'Member',
        joined_at: new Date().toISOString(),
      },
    ]);
  });

  test.after(async () => {
    if (server) server.close();
    if (testProjectId) {
      await supabaseAdmin.rpc('cleanup_test_project', { p_project_id: testProjectId });
    }
  });

  // =========================================================================
  // AC-1 & AC-2: Experiment Creation & Role Boundaries
  // =========================================================================

  it('1. AC-1: Researcher creates experiment in project -> 201 Created', async () => {
    const res = await fetch(`${baseUrl}/projects/${testProjectId}/experiments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        name: 'ResNet-50 Baseline Run',
        purpose: 'Baseline',
        hypothesis: 'Baseline model achieves >90% top-1 accuracy on CIFAR-10.',
        config: {
          model: 'ResNet-50',
          hyperparameters: {
            learning_rate: 0.001,
            batch_size: 64,
            optimizer: 'AdamW',
          },
          dataset: 'CIFAR-10',
          hardware: 'NVIDIA RTX 4090',
          codeCommit: 'git-commit-abc123',
        },
        metrics: {
          accuracy: 0.912,
          loss: 0.245,
          latency_ms: 8.5,
        },
        observation: 'Initial baseline converged after 35 epochs.',
        status: 'Draft',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.id);
    assert.equal(body.name, 'ResNet-50 Baseline Run');
    assert.equal(body.purpose, 'Baseline');
    assert.equal(body.status, 'Draft');
    assert.equal(body.config.model, 'ResNet-50');
    assert.equal(body.metrics.accuracy, 0.912);

    draftExperimentId = body.id;
  });

  it('2. AC-2: Supervisor cannot create experiment in supervised project -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/projects/${testProjectId}/experiments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        name: 'Supervisor Direct Run Attempt',
        purpose: 'ModelTesting',
        config: { model: 'BERT' },
        metrics: { loss: 0.5 },
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error.includes('Supervisors cannot create experiments in supervised projects'));
  });

  // =========================================================================
  // AC-3 & AC-4: Researcher Editing, Ownership & Non-Owner Guard
  // =========================================================================

  it('3. AC-3: Researcher edits own Draft experiment -> 200 OK', async () => {
    const res = await fetch(`${baseUrl}/experiments/${draftExperimentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        name: 'ResNet-50 Baseline Run (Fine-tuned)',
        metrics: {
          accuracy: 0.928,
          loss: 0.198,
          latency_ms: 8.2,
        },
        observation: 'Extended training by 10 epochs improved accuracy by 1.6%.',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.name, 'ResNet-50 Baseline Run (Fine-tuned)');
    assert.equal(body.metrics.accuracy, 0.928);
    assert.equal(body.observation, 'Extended training by 10 epochs improved accuracy by 1.6%.');
  });

  it('4. AC-4: Second Researcher cannot edit first researcher experiment -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/experiments/${draftExperimentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secondResearcherToken}`,
      },
      body: JSON.stringify({
        name: 'Malicious Tampering Attempt',
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error.includes('Only the researcher who created this experiment can modify it'));
  });

  // =========================================================================
  // AC-7 & AC-8: Supervisor Read-Only Access & Modification Prohibition
  // =========================================================================

  it('5. AC-7: Supervisor reads experiments in supervised project -> 200 OK', async () => {
    const res = await fetch(`${baseUrl}/experiments/${draftExperimentId}`, {
      headers: {
        Authorization: `Bearer ${supervisorToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, draftExperimentId);
    assert.equal(body.name, 'ResNet-50 Baseline Run (Fine-tuned)');
    assert.ok(body.ownerName);
  });

  it('6. AC-8: Supervisor cannot modify experiment config/metrics -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/experiments/${draftExperimentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        metrics: { accuracy: 0.999 },
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error.includes('Only the researcher who created this experiment can modify it'));
  });

  // =========================================================================
  // AC-5 & AC-6: Finalization & Permanent Immutability Locking
  // =========================================================================

  it('7. AC-5: Finalizing experiment locks it permanently -> 200 OK', async () => {
    const res = await fetch(`${baseUrl}/experiments/${draftExperimentId}/finalize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'Final');
    finalExperimentId = body.id;
  });

  it('8. AC-5: Modifying Finalized experiment is blocked with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/experiments/${finalExperimentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        name: 'Attempt to rename finalized experiment',
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.ok(body.error.includes('permanently locked and cannot be modified or deleted'));
  });

  it('9. AC-6: Deleting Finalized experiment is blocked with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/experiments/${finalExperimentId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.ok(body.error.includes('permanently locked and cannot be modified or deleted'));
  });

  // =========================================================================
  // AC-9 & AC-10: 2-to-5 Experiment Comparison Matrix Engine
  // =========================================================================

  it('10. Setup multiple runs for comparison matrix', async () => {
    // Run 1: ViT with lr=0.0005
    const res1 = await fetch(`${baseUrl}/projects/${testProjectId}/experiments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        name: 'Vision Transformer Run 1',
        purpose: 'HyperparameterTuning',
        config: {
          model: 'ViT-B/16',
          dataset: 'CIFAR-10',
          hyperparameters: {
            learning_rate: 0.0005,
            batch_size: 128,
          },
        },
        metrics: {
          accuracy: 0.935,
          loss: 0.182,
        },
      }),
    });
    const exp1 = await res1.json();
    compareExpId1 = exp1.id;

    // Run 2: ViT with lr=0.0001
    const res2 = await fetch(`${baseUrl}/projects/${testProjectId}/experiments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        name: 'Vision Transformer Run 2',
        purpose: 'HyperparameterTuning',
        config: {
          model: 'ViT-B/16',
          dataset: 'CIFAR-10',
          hyperparameters: {
            learning_rate: 0.0001,
            batch_size: 128,
          },
        },
        metrics: {
          accuracy: 0.948,
          loss: 0.145,
        },
      }),
    });
    const exp2 = await res2.json();
    compareExpId2 = exp2.id;

    // Run 3: Swin Transformer with lr=0.0001
    const res3 = await fetch(`${baseUrl}/projects/${testProjectId}/experiments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        name: 'Swin Transformer Run 3',
        purpose: 'ModelTesting',
        config: {
          model: 'Swin-T',
          dataset: 'CIFAR-10',
          hyperparameters: {
            learning_rate: 0.0001,
            batch_size: 64,
          },
        },
        metrics: {
          accuracy: 0.952,
          loss: 0.138,
        },
      }),
    });
    const exp3 = await res3.json();
    compareExpId3 = exp3.id;

    assert.ok(compareExpId1 && compareExpId2 && compareExpId3);
  });

  it('11. AC-9: Compare 3 experiments returns aligned parameter diff matrix and metric rankings -> 200 OK', async () => {
    const res = await fetch(
      `${baseUrl}/experiments/compare?ids=${compareExpId1},${compareExpId2},${compareExpId3}`,
      {
        headers: {
          Authorization: `Bearer ${researcherToken}`,
        },
      }
    );

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.experiments.length, 3);
    assert.ok(body.parameterMatrix.length > 0);
    assert.ok(body.metricMatrix.length > 0);

    // Verify parameter diff detection:
    // model is differing (ViT-B/16 vs Swin-T)
    const modelRow = body.parameterMatrix.find((p: any) => p.parameterKey === 'model');
    assert.ok(modelRow);
    assert.equal(modelRow.isIdentical, false);

    // dataset is identical ('CIFAR-10')
    const datasetRow = body.parameterMatrix.find((p: any) => p.parameterKey === 'dataset');
    assert.ok(datasetRow);
    assert.equal(datasetRow.isIdentical, true);

    // Verify metric row & best determination:
    const accRow = body.metricMatrix.find((m: any) => m.metricKey === 'accuracy');
    assert.ok(accRow);
    assert.equal(accRow.isNumeric, true);
    assert.equal(accRow.max, 0.952);
    assert.equal(accRow.bestExperimentId, compareExpId3); // Swin-T had highest accuracy
  });

  it('12. AC-10: Compare < 2 experiments is rejected with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/experiments/compare?ids=${compareExpId1}`, {
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('Comparison requires between 2 and 5 experiments'));
  });

  it('13. AC-10: Compare > 5 experiments is rejected with 400 Bad Request', async () => {
    const fakeIds = ['id1', 'id2', 'id3', 'id4', 'id5', 'id6'].join(',');
    const res = await fetch(`${baseUrl}/experiments/compare?ids=${fakeIds}`, {
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('Comparison requires between 2 and 5 experiments'));
  });

  // =========================================================================
  // AC-11: Supervisor Flagging with Auto-Revision Task Creation
  // =========================================================================

  it('14. AC-11: Supervisor creates NeedsRerun flag with auto-created revision task -> 201 Created', async () => {
    const res = await fetch(`${baseUrl}/experiments/${compareExpId1}/flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        type: 'NeedsRerun',
        note: 'High variance detected; rerun with fixed random seed 42.',
        createRevisionTask: true,
        taskTitle: 'Rerun Vision Transformer with Seed 42',
      }),
    });

    assert.equal(res.status, 201);
    const flag = await res.json();
    assert.equal(flag.type, 'NeedsRerun');
    assert.ok(flag.raisedTaskId, 'Flag should reference auto-created task ID');

    // Verify task was created in project
    const { data: createdTask } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', flag.raisedTaskId)
      .single();

    assert.ok(createdTask);
    assert.equal(createdTask.project_id, testProjectId);
    assert.equal(createdTask.assignee_id, researcherUserId);
    assert.equal(createdTask.status, 'ToDo');
    assert.equal(createdTask.priority, 'High');

    // Verify task_experiment_links join table entry exists
    const { data: link } = await supabaseAdmin
      .from('task_experiment_links')
      .select('*')
      .eq('task_id', flag.raisedTaskId)
      .eq('experiment_id', compareExpId1)
      .maybeSingle();

    assert.ok(link, 'task_experiment_links entry must be automatically created');

    // Verify researcher can resolve the flag
    const resolveRes = await fetch(`${baseUrl}/experiments/flags/${flag.id}/resolve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        resolutionNote: 'Completed re-run with seed 42 in experiment exp-2.',
      }),
    });

    assert.equal(resolveRes.status, 200);
    const resolvedFlag = await resolveRes.json();
    assert.ok(resolvedFlag.resolvedAt);
    assert.equal(resolvedFlag.resolutionNote, 'Completed re-run with seed 42 in experiment exp-2.');
  });

  // =========================================================================
  // AC-12: Admin Privacy Rule (AC-18 Equivalent)
  // =========================================================================

  it('15. AC-12: Admin cannot access project experiments -> 403 Forbidden (AC-18 Privacy Rule)', async () => {
    const res = await fetch(`${baseUrl}/projects/${testProjectId}/experiments`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error.includes('Admins cannot access experimental research data'));
  });

  it('16. AC-12: Admin cannot get experiment details by ID -> 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/experiments/${compareExpId1}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error.includes('AC-18 Privacy Rule'));
  });

  // =========================================================================
  // Discussion Comments & Task Linking
  // =========================================================================

  it('17. Members can post and read discussion comments on experiment', async () => {
    const postRes = await fetch(`${baseUrl}/experiments/${compareExpId2}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        body: 'Impressive convergence on Run 2. Let us prepare this for the benchmark paper.',
      }),
    });

    assert.equal(postRes.status, 201);
    const comment = await postRes.json();
    assert.equal(comment.body, 'Impressive convergence on Run 2. Let us prepare this for the benchmark paper.');

    const listRes = await fetch(`${baseUrl}/experiments/${compareExpId2}/comments`, {
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(listRes.status, 200);
    const comments = await listRes.json();
    assert.ok(comments.length >= 1);
    assert.equal(comments[0].body, 'Impressive convergence on Run 2. Let us prepare this for the benchmark paper.');
  });
});
