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

describe('Spec 02 — Research Workspace & Membership Test Suite', () => {
  let server: Server;
  let baseUrl: string;

  let supervisorToken: string;
  let supervisorUserId: string;

  let researcherToken: string;
  let researcherUserId: string;

  let createdProjectId: string;
  let inviteCode: string;

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

    // Obtain tokens
    const { data: supLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'supervisor@stanford.edu',
      password: 'Password123!',
    });
    assert.ok(supLogin?.session, 'Supervisor login must succeed');
    supervisorToken = supLogin.session.access_token;
    supervisorUserId = supLogin.user.id;

    const { data: resLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'researcher@mit.edu',
      password: 'Password123!',
    });
    assert.ok(resLogin?.session, 'Researcher login must succeed');
    researcherToken = resLogin.session.access_token;
    researcherUserId = resLogin.user.id;

    // Ensure profiles are active
    await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Supervisor' }).eq('id', supervisorUserId);
    await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Researcher' }).eq('id', researcherUserId);
  });

  test.after(async () => {
    if (server) server.close();
    // Cleanup created test project if exists
    if (createdProjectId) {
      await supabaseAdmin.from('projects').delete().eq('id', createdProjectId);
    }
  });

  it('1. POST /projects: Researcher creating personal project succeeds (is_personal = true)', async () => {
    const res = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        title: 'Researcher Personal Study on Attention Mechanisms',
        abstract: 'Investigating sparse multi-head self-attention models.',
        domainTags: ['AI', 'Deep Learning'],
        isPersonal: true,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json() as any;
    assert.equal(data.title, 'Researcher Personal Study on Attention Mechanisms');
    assert.equal(data.isPersonal, true);
    assert.equal(data.ownerId, researcherUserId);

    // Clean up personal test project
    await supabaseAdmin.from('projects').delete().eq('id', data.id);
  });

  it('2. POST /projects: Researcher cannot create supervised collaborative project (returns 403)', async () => {
    const res = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        title: 'Illegal Supervised Project Attempt',
        isPersonal: false,
      }),
    });

    assert.equal(res.status, 403);
    const data = await res.json() as any;
    assert.ok(data.error.includes('Forbidden'));
  });

  it('3. POST /projects: Supervisor creates supervised collaborative project successfully', async () => {
    const res = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        title: 'Stanford Multimodal Reasoning Lab',
        abstract: 'Collaborative lab investigation into vision-language grounding.',
        domainTags: ['Vision', 'NLP', 'Multimodal'],
        isPersonal: false,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json() as any;
    assert.equal(data.title, 'Stanford Multimodal Reasoning Lab');
    assert.equal(data.isPersonal, false);
    assert.equal(data.ownerId, supervisorUserId);
    createdProjectId = data.id;
  });

  it('4. PATCH /projects/:projectId: Project Owner Supervisor can update project metadata', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        abstract: 'Updated abstract with extended benchmark methodologies.',
        status: 'Ongoing',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.abstract, 'Updated abstract with extended benchmark methodologies.');
    assert.equal(data.status, 'Ongoing');
  });

  it('5. GET /projects/:projectId: Non-member cannot access private project (returns 403)', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('6. POST /projects/:projectId/invites: Supervisor creates join code', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/invites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        inviteType: 'Code',
        maxUses: 10,
        expiresInDays: 7,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json() as any;
    assert.ok(data.code.startsWith('RES-'));
    assert.equal(data.status, 'Pending');
    inviteCode = data.code;
  });

  it('7. POST /invites/:code/accept: Researcher accepts invite code and joins as Member', async () => {
    const res = await fetch(`${baseUrl}/invites/${inviteCode}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.message, 'Successfully joined project');
    assert.equal(data.project.id, createdProjectId);
  });

  it('8. GET /projects/:projectId: Researcher now has member access to the project', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.project.id, createdProjectId);
    assert.ok(data.members.some((m: any) => m.userId === researcherUserId && m.projectRole === 'Member'));
  });

  it('9. POST /invites/:code/accept: Joining again returns 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/invites/${inviteCode}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });

    assert.equal(res.status, 409);
  });

  it('10. DELETE /projects/:projectId/members/:userId: Supervisor removes member successfully', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/members/${researcherUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);

    // Verify researcher is no longer a member
    const checkRes = await fetch(`${baseUrl}/projects/${createdProjectId}`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(checkRes.status, 403);
  });

  // Re-add researcher for task & milestone workflows
  let createdMilestoneId: string;
  let proposedMilestoneId: string;
  let assignedTaskId: string;
  let proposedTaskId: string;

  it('11. POST /projects/:projectId/members: Supervisor re-adds researcher as Member', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        userId: researcherUserId,
        projectRole: 'Member',
      }),
    });
    assert.equal(res.status, 201);
  });

  it('12. POST /projects/:projectId/milestones: Supervisor creates active milestone with weight', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/milestones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        name: 'Phase 1: Dataset Preparation & Preprocessing',
        targetDate: '2026-09-30',
        weightPct: 50,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json() as any;
    assert.equal(data.name, 'Phase 1: Dataset Preparation & Preprocessing');
    assert.equal(data.isProposed, false);
    assert.equal(data.weightPct, 50);
    createdMilestoneId = data.id;
  });

  it('13. POST /projects/:projectId/milestones: Researcher creates milestone proposal (isProposed = true)', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/milestones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        name: 'Phase 2: Ablation Experiments',
        targetDate: '2026-10-31',
        weightPct: 50,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json() as any;
    assert.equal(data.isProposed, true);
    assert.equal(data.proposedBy, researcherUserId);
    proposedMilestoneId = data.id;
  });

  it('14. POST /milestones/:id/approve-proposal: Supervisor approves milestone proposal', async () => {
    const res = await fetch(`${baseUrl}/milestones/${proposedMilestoneId}/approve-proposal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.isProposed, false);
  });

  it('15. POST /projects/:projectId/tasks: Supervisor assigns task directly to Researcher', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        title: 'Clean and tokenize multimodal corpus',
        description: 'Run tokenization pipeline on ImageNet-Captions dataset.',
        assigneeId: researcherUserId,
        milestoneId: createdMilestoneId,
        dueDate: '2026-09-15',
        priority: 'High',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json() as any;
    assert.equal(data.title, 'Clean and tokenize multimodal corpus');
    assert.equal(data.isProposed, false);
    assert.equal(data.assigneeId, researcherUserId);
    assert.equal(data.status, 'ToDo');
    assignedTaskId = data.id;
  });

  it('16. POST /projects/:projectId/tasks: Researcher proposes task in supervised project', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        title: 'Run baseline Vision Transformer test',
        dueDate: '2026-09-20',
        priority: 'Medium',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json() as any;
    assert.equal(data.isProposed, true);
    assert.equal(data.proposedBy, researcherUserId);
    proposedTaskId = data.id;
  });

  it('17. POST /tasks/:id/approve-proposal: Supervisor activates proposed task', async () => {
    const res = await fetch(`${baseUrl}/tasks/${proposedTaskId}/approve-proposal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ assigneeId: researcherUserId }),
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.isProposed, false);
    assert.equal(data.assigneeId, researcherUserId);
    assert.equal(data.status, 'ToDo');
  });

  it('18. State Machine: Researcher moves task ToDo -> InProgress -> Submitted', async () => {
    // 1. Move to InProgress
    const inProgressRes = await fetch(`${baseUrl}/tasks/${assignedTaskId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ status: 'InProgress' }),
    });
    assert.equal(inProgressRes.status, 200);
    const inProgData = await inProgressRes.json() as any;
    assert.equal(inProgData.status, 'InProgress');

    // 2. Researcher cannot self-approve (must return 403)
    const selfApproveRes = await fetch(`${baseUrl}/tasks/${assignedTaskId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ status: 'Approved' }),
    });
    assert.equal(selfApproveRes.status, 403);

    // 3. Submit task with progress note
    const submitRes = await fetch(`${baseUrl}/tasks/${assignedTaskId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ progressNote: 'Dataset cleaned and verified against checksums.' }),
    });
    assert.equal(submitRes.status, 200);
    const submitData = await submitRes.json() as any;
    assert.equal(submitData.status, 'Submitted');
    assert.equal(submitData.progressNote, 'Dataset cleaned and verified against checksums.');
  });

  it('19. Supervisor Review: Supervisor requests revision with note (moves to RevisionRequested)', async () => {
    const res = await fetch(`${baseUrl}/tasks/${assignedTaskId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        action: 'RequestRevision',
        revisionNote: 'Please verify token lengths conform to max 512 context limit.',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.status, 'RevisionRequested');
    assert.equal(data.revisionNote, 'Please verify token lengths conform to max 512 context limit.');
  });

  it('20. Supervisor Review: Supervisor approves task & project progress recalculates', async () => {
    // Re-submit
    await fetch(`${baseUrl}/tasks/${assignedTaskId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ progressNote: 'Token length trimmed to 512.' }),
    });

    // Supervisor Approves
    const res = await fetch(`${baseUrl}/tasks/${assignedTaskId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ action: 'Approve' }),
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.status, 'Approved');

    // Verify project progress updated
    const projRes = await fetch(`${baseUrl}/projects/${createdProjectId}`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    const projData = await projRes.json() as any;
    assert.ok(projData.project.progressPercent > 0, 'Project progress must be recalculated upon task approval');
  });

  it('21. Milestone Locking: Locked milestone prevents editing associated tasks', async () => {
    // 1. Lock the milestone
    const lockRes = await fetch(`${baseUrl}/milestones/${createdMilestoneId}/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ isLocked: true }),
    });
    assert.equal(lockRes.status, 200);
    const lockData = await lockRes.json() as any;
    assert.equal(lockData.isLocked, true);

    // 2. Attempt to modify task inside locked milestone (returns 400)
    const modRes = await fetch(`${baseUrl}/tasks/${assignedTaskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ title: 'Attempted edit in locked milestone' }),
    });
    assert.equal(modRes.status, 400);

    // 3. Unlock for cleanup
    await fetch(`${baseUrl}/milestones/${createdMilestoneId}/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ isLocked: false }),
    });
  });

  it('22. Task Comments: Members can post and read comments on task discussion threads', async () => {
    const postRes = await fetch(`${baseUrl}/tasks/${assignedTaskId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ body: 'Attached validation accuracy curves in storage.' }),
    });
    assert.equal(postRes.status, 201);
    const postData = await postRes.json() as any;
    assert.equal(postData.body, 'Attached validation accuracy curves in storage.');
    assert.equal(postData.authorId, researcherUserId);

    const getRes = await fetch(`${baseUrl}/tasks/${assignedTaskId}/comments`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(getRes.status, 200);
    const comments = await getRes.json() as any;
    assert.ok(comments.length >= 1);
    assert.equal(comments[0].body, 'Attached validation accuracy curves in storage.');
  });

  it('23. POST /projects/:projectId/messages: Member sends chat message successfully', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ body: 'Hello team, dataset pre-processing is finished!' }),
    });

    assert.equal(res.status, 201);
    const data = await res.json() as any;
    assert.equal(data.body, 'Hello team, dataset pre-processing is finished!');
    assert.equal(data.projectId, createdProjectId);
    assert.equal(data.senderId, researcherUserId);
  });

  it('24. GET /projects/:projectId/messages: Supervisor views chat stream', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/messages`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
    const messages = await res.json() as any;
    assert.ok(messages.length >= 1);
    assert.ok(messages.some((m: any) => m.body === 'Hello team, dataset pre-processing is finished!'));
  });

  it('25. GET /notifications: Researcher receives notifications from earlier task assignments & reviews', async () => {
    const res = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });

    assert.equal(res.status, 200);
    const notifications = await res.json() as any;
    assert.ok(Array.isArray(notifications));
    assert.ok(notifications.length >= 1, 'Notifications should be recorded for task activities');
  });

  it('26. GET /notifications/unread-count & POST /notifications/read-all: Marks notifications read', async () => {
    // 1. Check unread count
    const countRes = await fetch(`${baseUrl}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(countRes.status, 200);
    const countData = await countRes.json() as any;
    assert.ok(typeof countData.count === 'number');

    // 2. Mark all read
    const readAllRes = await fetch(`${baseUrl}/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(readAllRes.status, 200);

    // 3. Verify unread count is now 0
    const countAfter = await fetch(`${baseUrl}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    const afterData = await countAfter.json() as any;
    assert.equal(afterData.count, 0);
  });

  it('27. Realtime RLS Security: Non-member cannot select private project messages directly', async () => {
    // 1. Create a secret private project owned by supervisor
    const { data: secretProject } = await supabaseAdmin
      .from('projects')
      .insert({
        owner_id: supervisorUserId,
        is_personal: true,
        title: 'Confidential Supervisor Project',
        status: 'Planning',
        progress_percent: 0,
      })
      .select('id')
      .single();

    assert.ok(secretProject?.id);

    // 2. Insert private message
    await supabaseAdmin.from('project_messages').insert({
      project_id: secretProject.id,
      sender_id: supervisorUserId,
      body: 'Top secret supervisor notes',
    });

    // 3. Researcher client attempts to query message via Supabase client with researcher token
    const researcherClient = createClient(supabaseUrl, supabasePublishableKey, {
      global: { headers: { Authorization: `Bearer ${researcherToken}` } },
    });

    const { data: messages } = await researcherClient
      .from('project_messages')
      .select('*')
      .eq('project_id', secretProject.id);

    // RLS policy ensures researcher receives zero unauthorized rows (messages is empty or null)
    assert.ok(!messages || messages.length === 0, 'Unauthorized private messages must not be readable by non-members');

    // Cleanup
    await supabaseAdmin.from('projects').delete().eq('id', secretProject.id);
  });

  it('28. PATCH /projects/:projectId/members/:userId: Supervisor promotes Researcher to CoSupervisor', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/members/${researcherUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ projectRole: 'CoSupervisor' }),
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.projectRole, 'CoSupervisor');
    assert.equal(data.userId, researcherUserId);
  });

  it('29. PATCH /projects/:projectId/members/:userId: Researcher cannot modify member roles (returns 403)', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/members/${supervisorUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ projectRole: 'Member' }),
    });

    assert.equal(res.status, 403);
  });

  let coSupervisorInviteId: string;
  let coSupervisorInviteCode: string;

  it('30. POST /projects/:projectId/invites: Supervisor creates CoSupervisor invite code', async () => {
    const res = await fetch(`${baseUrl}/projects/${createdProjectId}/invites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        inviteType: 'Code',
        invitedRole: 'CoSupervisor',
        maxUses: 5,
        expiresInDays: 30,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json() as any;
    assert.ok(data.code.startsWith('RES-'));
    assert.equal(data.invitedRole, 'CoSupervisor');
    coSupervisorInviteId = data.id;
    coSupervisorInviteCode = data.code;
  });

  it('31. POST /projects/:projectId/invites/:inviteId/revoke: Revoking invite prevents further joins', async () => {
    // 1. Revoke the invite
    const revokeRes = await fetch(`${baseUrl}/projects/${createdProjectId}/invites/${coSupervisorInviteId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(revokeRes.status, 200);

    // 2. Attempting to accept revoked code returns 400
    const acceptRes = await fetch(`${baseUrl}/invites/${coSupervisorInviteCode}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(acceptRes.status, 400);
  });

  it('32. GET /profiles/search: Authenticated user can search active profiles by name', async () => {
    const res = await fetch(`${baseUrl}/profiles/search?q=supervisor`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.ok(Array.isArray(data));
  });
});
