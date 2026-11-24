process.env.NODE_ENV = 'test';
import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import app from '../index.js';
import { supabaseAdmin } from '../supabase.js';
import { Server } from 'http';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1WP4GkxxPN-fJYvMxFvxLg_L006rTWB';
const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);

describe('Spec 06 — Discussion Forum & Research Community API & Acceptance Criteria Suite', () => {
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

  let testPostId: string;
  let supervisorPostId: string;
  let testAnswerId: string;
  let testCommentId: string;
  let directMessageId: string;
  let reportId: string;

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

    // 4. Create or ensure Researcher 2 for isolation/DM tests
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

    // Ensure profiles are active with research field tags
    await supabaseAdmin
      .from('profiles')
      .update({ status: 'Active', role: 'Admin' })
      .eq('id', adminUserId);
    await supabaseAdmin
      .from('profiles')
      .update({
        status: 'Active',
        role: 'Supervisor',
        department: 'Computer Science',
        institution: 'Stanford University',
        research_field_tags: ['machine-learning', 'distributed-systems', 'deep-learning'],
      })
      .eq('id', supervisorUserId);
    await supabaseAdmin
      .from('profiles')
      .update({
        status: 'Active',
        role: 'Researcher',
        department: 'EECS',
        institution: 'MIT',
        research_field_tags: ['machine-learning', 'pytorch'],
      })
      .eq('id', researcherUserId);
    await supabaseAdmin
      .from('profiles')
      .update({
        status: 'Active',
        role: 'Researcher',
        department: 'EECS',
        institution: 'MIT',
      })
      .eq('id', secondResearcherUserId);
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // ==========================================
  // AC-01 & AC-02: Post Creation, Search & Feed
  // ==========================================
  it('AC-01: Researcher can create a forum question with tags', async () => {
    const res = await fetch(`${baseUrl}/forum/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        title: 'How to handle CUDA out of memory during gradient checkpointing?',
        body: 'We are training a 70B parameter model with 4-bit quantization and experiencing OOM spikes on layer 28.',
        tags: ['machine-learning', 'pytorch', 'distributed-systems'],
      }),
    });

    assert.equal(res.status, 201);
    const data = (await res.json()) as any;
    assert.ok(data.id);
    assert.equal(data.authorId, researcherUserId);
    assert.equal(data.tags.length, 3);
    assert.equal(data.isLocked, false);
    testPostId = data.id;
  });

  it('AC-02: Supervisor can create a discussion post as a community member', async () => {
    const res = await fetch(`${baseUrl}/forum/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        title: 'Best practices for reproducible PyTorch RNG seeds across CUDA streams',
        body: 'Here is a reference implementation using `torch.cuda.manual_seed_all` and deterministic flags.',
        tags: ['pytorch', 'reproducibility'],
      }),
    });

    assert.equal(res.status, 201);
    const data = (await res.json()) as any;
    assert.ok(data.id);
    assert.equal(data.authorId, supervisorUserId);
    supervisorPostId = data.id;
  });

  it('AC-01b: Authenticated users can list posts with search and tag filters', async () => {
    const res = await fetch(`${baseUrl}/forum/posts?tag=pytorch&search=CUDA`, {
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(Array.isArray(data.posts));
    assert.ok(data.total >= 1);
    const post = data.posts.find((p: any) => p.id === testPostId);
    assert.ok(post, 'Found created post in list');
    assert.equal(post.author.role, 'Researcher');
  });

  it('AC-01c: Authenticated users can retrieve single post with enriched stats', async () => {
    const res = await fetch(`${baseUrl}/forum/posts/${testPostId}`, {
      headers: {
        Authorization: `Bearer ${secondResearcherToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.id, testPostId);
    assert.ok(data.author);
    assert.ok(data.author.fullName);
    assert.equal(data.author.role, 'Researcher');
    assert.equal(data.viewsCount >= 1, true);
  });

  // ==========================================
  // AC-03: Post / Answer Ownership & Modification
  // ==========================================
  it('AC-01d: Post author can update their own post', async () => {
    const res = await fetch(`${baseUrl}/forum/posts/${testPostId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        title: 'How to handle CUDA out of memory during gradient checkpointing? [UPDATED]',
      }),
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(
      data.title,
      'How to handle CUDA out of memory during gradient checkpointing? [UPDATED]'
    );
  });

  it('AC-03: Non-author cannot update another user post (403)', async () => {
    const res = await fetch(`${baseUrl}/forum/posts/${testPostId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secondResearcherToken}`,
      },
      body: JSON.stringify({
        title: 'Hacked title by second researcher',
      }),
    });

    assert.equal(res.status, 403);
  });

  // ==========================================
  // AC-04: Answers & Solution Acceptance
  // ==========================================
  it('AC-04a: Researcher 2 can submit an answer to the question', async () => {
    const res = await fetch(`${baseUrl}/forum/posts/${testPostId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secondResearcherToken}`,
      },
      body: JSON.stringify({
        body: 'Enable `torch.utils.checkpoint.checkpoint` with `use_reentrant=False` and clear activation cache at layer boundaries.',
      }),
    });

    assert.equal(res.status, 201);
    const data = (await res.json()) as any;
    assert.ok(data.id);
    assert.equal(data.authorId, secondResearcherUserId);
    assert.equal(data.isAccepted, false);
    testAnswerId = data.id;
  });

  it('AC-04b: Non-question-author cannot accept an answer (403)', async () => {
    const res = await fetch(`${baseUrl}/forum/posts/${testPostId}/accept/${testAnswerId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secondResearcherToken}`,
      },
    });

    assert.equal(res.status, 403);
  });

  it('AC-04c: Question author can accept an answer, awarding reputation (+15 answerer, +2 asker)', async () => {
    // Get initial reputation of answer author
    const beforeRes = await fetch(
      `${baseUrl}/users/${secondResearcherUserId}/community-profile`,
      {
        headers: { Authorization: `Bearer ${researcherToken}` },
      }
    );
    const beforeProfile = (await beforeRes.json()) as any;
    const initialRep = beforeProfile.reputationPoints || 0;

    const res = await fetch(`${baseUrl}/forum/posts/${testPostId}/accept/${testAnswerId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.isAccepted, true);

    // Verify reputation increased
    const afterRes = await fetch(
      `${baseUrl}/users/${secondResearcherUserId}/community-profile`,
      {
        headers: { Authorization: `Bearer ${researcherToken}` },
      }
    );
    const afterProfile = (await afterRes.json()) as any;
    assert.equal(afterProfile.reputationPoints, initialRep + 15);
    assert.equal(afterProfile.stats.acceptedAnswersCount >= 1, true);
  });

  // ==========================================
  // AC-07: Expert Verification by Faculty/Supervisor
  // ==========================================
  it('AC-07a: Non-supervisor (Researcher) cannot expert verify an answer (403)', async () => {
    const res = await fetch(`${baseUrl}/forum/answers/${testAnswerId}/expert-verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 403);
  });

  it('AC-07b: Active Supervisor can mark answer Expert Verified, awarding +20 reputation', async () => {
    const beforeRes = await fetch(
      `${baseUrl}/users/${secondResearcherUserId}/community-profile`,
      {
        headers: { Authorization: `Bearer ${supervisorToken}` },
      }
    );
    const beforeProfile = (await beforeRes.json()) as any;
    const initialRep = beforeProfile.reputationPoints || 0;

    const res = await fetch(`${baseUrl}/forum/answers/${testAnswerId}/expert-verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supervisorToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.expertVerifiedBy, supervisorUserId);
    assert.ok(data.expertVerifiedAt);
    assert.ok(data.expertVerifier);
    assert.equal(data.expertVerifier.isFacultyVerified, true);

    // Verify reputation increased by 20
    const afterRes = await fetch(
      `${baseUrl}/users/${secondResearcherUserId}/community-profile`,
      {
        headers: { Authorization: `Bearer ${supervisorToken}` },
      }
    );
    const afterProfile = (await afterRes.json()) as any;
    assert.equal(afterProfile.reputationPoints, initialRep + 20);
    assert.equal(afterProfile.stats.expertVerifiedCount >= 1, true);
  });

  // ==========================================
  // AC-05 & AC-06: Voting, LinkedIn Reactions & Deduplication
  // ==========================================
  it('AC-05: User can cast a LinkedIn reaction (Insightful) on post, updating counts', async () => {
    const res = await fetch(`${baseUrl}/forum/Post/${testPostId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ value: 'Insightful' }),
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.currentUserReaction, 'Insightful');
    assert.equal(data.reactions.insightful, 1);
    assert.equal(data.reactions.totalReactions, 1);
  });

  it('AC-06: Casting a different reaction (Love) updates the existing reaction without duplication', async () => {
    const res = await fetch(`${baseUrl}/forum/Post/${testPostId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ value: 'Love' }),
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.currentUserReaction, 'Love');
    assert.equal(data.reactions.love, 1);
    assert.equal(data.reactions.insightful, 0);
    assert.equal(data.reactions.totalReactions, 1);
  });

  it('AC-05b: User can retrieve reactors list with details', async () => {
    const res = await fetch(`${baseUrl}/forum/Post/${testPostId}/reactors`, {
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(Array.isArray(data));
    assert.equal(data.length, 1);
    assert.equal(data[0].userId, supervisorUserId);
    assert.equal(data[0].value, 'Love');
  });

  it('AC-05c: User can cast Q&A Upvote on an Answer, updating score', async () => {
    const res = await fetch(`${baseUrl}/forum/Answer/${testAnswerId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ value: 'Up' }),
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.currentUserVote, 'Up');
    assert.equal(data.upvotesCount, 1);
    assert.equal(data.score, 1);
  });

  // ==========================================
  // Comments on Posts & Answers
  // ==========================================
  it('Users can add comments to posts and answers', async () => {
    const res = await fetch(`${baseUrl}/forum/Post/${testPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secondResearcherToken}`,
      },
      body: JSON.stringify({
        body: 'Did you also check CUDA allocator fragmentation settings?',
      }),
    });

    assert.equal(res.status, 201);
    const data = (await res.json()) as any;
    assert.ok(data.id);
    assert.equal(data.targetType, 'Post');
    assert.equal(data.targetId, testPostId);
    testCommentId = data.id;

    // List comments
    const listRes = await fetch(`${baseUrl}/forum/Post/${testPostId}/comments`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(listRes.status, 200);
    const comments = (await listRes.json()) as any;
    assert.ok(comments.length >= 1);
    assert.equal(comments[0].id, testCommentId);
  });

  // ==========================================
  // AC-08: Tag Following
  // ==========================================
  it('AC-08: User can follow and unfollow tags', async () => {
    // 1. Follow tag
    const followRes = await fetch(`${baseUrl}/forum/tags/distributed-systems/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(followRes.status, 200);
    const followData = (await followRes.json()) as any;
    assert.ok(followData.following.includes('distributed-systems'));

    // 2. Get following tags
    const getRes = await fetch(`${baseUrl}/forum/tags/following`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(getRes.status, 200);
    const tags = (await getRes.json()) as string[];
    assert.ok(tags.includes('distributed-systems'));

    // 3. Unfollow tag
    const unfollowRes = await fetch(`${baseUrl}/forum/tags/distributed-systems/follow`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(unfollowRes.status, 200);
    const unfollowData = (await unfollowRes.json()) as any;
    assert.ok(!unfollowData.following.includes('distributed-systems'));
  });

  // ==========================================
  // AC-09 & AC-10: Direct Messaging & Blocking
  // ==========================================
  it('AC-09: Researcher 1 can send a direct message to Researcher 2', async () => {
    const res = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        recipientId: secondResearcherUserId,
        body: 'Hi Bob, thanks for your help with the gradient checkpointing setup!',
      }),
    });

    assert.equal(res.status, 201);
    const data = (await res.json()) as any;
    assert.ok(data.id);
    assert.equal(data.senderId, researcherUserId);
    assert.equal(data.recipientId, secondResearcherUserId);
    assert.equal(
      data.body,
      'Hi Bob, thanks for your help with the gradient checkpointing setup!'
    );
    directMessageId = data.id;
  });

  it('AC-09b: Direct messages are visible only to conversation participants', async () => {
    // Researcher 2 can view the conversation
    const res2 = await fetch(`${baseUrl}/messages/${researcherUserId}`, {
      headers: { Authorization: `Bearer ${secondResearcherToken}` },
    });
    assert.equal(res2.status, 200);
    const messages = (await res2.json()) as any;
    assert.ok(messages.some((m: any) => m.id === directMessageId));

    // Supervisor (third party) checking messages with Researcher 1 does not see this DM
    const supRes = await fetch(`${baseUrl}/messages/${researcherUserId}`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(supRes.status, 200);
    const supMessages = (await supRes.json()) as any;
    assert.ok(!supMessages.some((m: any) => m.id === directMessageId));
  });

  it('AC-10: Blocked user cannot send DM messages to blocker (403)', async () => {
    // Researcher 2 blocks Researcher 1
    const blockRes = await fetch(`${baseUrl}/messages/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secondResearcherToken}`,
      },
      body: JSON.stringify({ targetUserId: researcherUserId }),
    });
    assert.equal(blockRes.status, 200);

    // Researcher 1 attempts to message Researcher 2 -> 403 Forbidden
    const sendRes = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        recipientId: secondResearcherUserId,
        body: 'Are you there? Why is this blocked?',
      }),
    });
    assert.equal(sendRes.status, 403);

    // Unblock so other tests remain clean
    const unblockRes = await fetch(`${baseUrl}/messages/block/${researcherUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${secondResearcherToken}` },
    });
    assert.equal(unblockRes.status, 200);
  });

  // ==========================================
  // AC-11, AC-12, AC-13 & AC-14: Reports, Moderation & AC-13 Privacy
  // ==========================================
  it('AC-11 & AC-13: User can report a DM, and Admin queue sees only REDACTED metadata', async () => {
    // Researcher 2 reports the direct message
    const reportRes = await fetch(`${baseUrl}/forum/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secondResearcherToken}`,
      },
      body: JSON.stringify({
        targetType: 'DirectMessage',
        targetId: directMessageId,
        reason: 'Unsolicited collaboration outreach',
      }),
    });

    assert.equal(reportRes.status, 201);
    const reportData = (await reportRes.json()) as any;
    assert.ok(reportData.id);
    assert.equal(reportData.targetType, 'DirectMessage');
    reportId = reportData.id;

    // Admin lists moderation queue
    const adminRes = await fetch(`${baseUrl}/admin/forum/reports?status=Pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reportJson = (await adminRes.json()) as any;
    const reportsList = Array.isArray(reportJson) ? reportJson : reportJson.reports || [];
    const dmReport = reportsList.find((r: any) => r.id === reportId);
    assert.ok(dmReport, 'Found DM report in admin queue');

    // CRITICAL AC-13 / AC-18 PRIVACY CHECK:
    // Raw body must NOT be revealed to Admin
    assert.equal(
      dmReport.targetSummary,
      '[METADATA ONLY — PRIVATE DM PROTECTED BY AC-13]'
    );
  });

  it('AC-14: Admin can take moderation action and resolve the report', async () => {
    const res = await fetch(`${baseUrl}/admin/forum/reports/${reportId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'ActionTaken',
        actionTaken: 'WarnedSender',
        actionNote: 'Reminded researcher about messaging guidelines.',
      }),
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.status, 'ActionTaken');
    assert.equal(data.resolvedBy, adminUserId);
    assert.equal(data.actionTaken, 'WarnedSender');
  });

  it('AC-11b: Non-admin attempting to access moderation queue gets 403', async () => {
    const res = await fetch(`${baseUrl}/admin/forum/reports`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(res.status, 403);
  });

  // ==========================================
  // AC-15 & AC-16: Community Profile & Faculty Badge
  // ==========================================
  it('AC-16: Supervisor profile has isFacultyVerified=true derived from role', async () => {
    const res = await fetch(`${baseUrl}/users/${supervisorUserId}/community-profile`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.isFacultyVerified, true);
    assert.equal(data.role, 'Supervisor');
  });

  it('AC-16b: Researcher profile has isFacultyVerified=false', async () => {
    const res = await fetch(`${baseUrl}/users/${researcherUserId}/community-profile`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.isFacultyVerified, false);
    assert.equal(data.role, 'Researcher');
  });

  // ==========================================
  // Thread Locking & Author Delete
  // ==========================================
  it('Post author or Admin can delete their post and associated answers', async () => {
    const res = await fetch(`${baseUrl}/forum/posts/${supervisorPostId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${supervisorToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.deleted, true);

    // Verify 404 on fetch
    const getRes = await fetch(`${baseUrl}/forum/posts/${supervisorPostId}`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(getRes.status, 404);
  });
});
