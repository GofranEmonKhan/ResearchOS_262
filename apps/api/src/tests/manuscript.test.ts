process.env.NODE_ENV = 'test';
import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import app from '../index.js';
import { supabaseAdmin } from '../supabase.js';
import { Server } from 'http';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_1WP4GkxxPN-fJYvMxFvxLg_L006rTWB';
const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);

describe('Spec 05 — Manuscript Writing & Peer Review Acceptance Criteria Test Suite', () => {
  let server: Server;
  let baseUrl: string;

  let adminToken: string;
  let adminUserId: string;

  let supervisorToken: string;
  let supervisorUserId: string;

  let researcherToken: string;
  let researcherUserId: string;

  let reviewerToken: string;
  let reviewerUserId: string;

  let nonMemberToken: string;
  let nonMemberUserId: string;

  let testProjectId: string;
  let testPaperId: string;
  let testManuscriptId: string;
  let abstractSectionId: string;
  let introSectionId: string;
  let testCommentId: string;
  let testChecklistItemId: string;
  let lockedChecklistItemId: string;

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

    // 3. Researcher login
    const { data: resLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'researcher@mit.edu',
      password: 'Password123!',
    });
    assert.ok(resLogin?.session, 'Researcher login should succeed');
    researcherToken = resLogin.session.access_token;
    researcherUserId = resLogin.user.id;

    // 4. Reviewer login / creation
    const reviewerEmail = 'reviewer.spec05@mit.edu';
    let { data: revLogin } = await supabaseClient.auth.signInWithPassword({
      email: reviewerEmail,
      password: 'Password123!',
    });

    if (!revLogin?.session) {
      const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
        email: reviewerEmail,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { name: 'Dr. External Reviewer' },
      });
      reviewerUserId = newUser.user!.id;

      await supabaseAdmin.from('profiles').upsert({
        id: reviewerUserId,
        full_name: 'Dr. External Reviewer',
        role: 'Researcher',
        status: 'Active',
        institution: 'MIT',
        department: 'CSAIL',
        research_field_tags: ['AI', 'Quantum'],
        reputation_points: 50,
      });

      const { data: relog } = await supabaseClient.auth.signInWithPassword({
        email: reviewerEmail,
        password: 'Password123!',
      });
      reviewerToken = relog!.session!.access_token;
    } else {
      reviewerToken = revLogin.session.access_token;
      reviewerUserId = revLogin.user.id;
    }

    // Create Test Project owned by Supervisor
    const { data: project } = await supabaseAdmin
      .from('projects')
      .insert({
        owner_id: supervisorUserId,
        title: 'Spec 05 Deep Learning Manuscript Project',
        abstract: 'Manuscript writing test workspace',
        domain_tags: ['AI', 'Writing'],
        is_personal: false,
        status: 'Writing',
      })
      .select('id')
      .single();

    testProjectId = project!.id;

    // Add Researcher as project member
    await supabaseAdmin.from('project_members').insert({
      project_id: testProjectId,
      user_id: researcherUserId,
      project_role: 'Member',
    });

    // Create a mock Paper with private sidebar notes for "Why Did I Cite This?" test
    const mockFileUuid = '11111111-2222-3333-4444-555555555555';
    const { data: fileAsset, error: fileErr } = await supabaseAdmin
      .from('file_assets')
      .insert({
        owner_id: researcherUserId,
        storage_path: `${researcherUserId}/${mockFileUuid}.pdf`,
        file_name: 'transformer.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1048576,
      })
      .select('id')
      .single();

    assert.ok(fileAsset, `File asset creation failed: ${fileErr?.message}`);

    const uniqueDoi = `10.5555/spec05.${Date.now()}`;
    const { data: paper, error: paperErr } = await supabaseAdmin
      .from('papers')
      .insert({
        uploader_id: researcherUserId,
        project_id: testProjectId,
        title: 'Attention Is All You Need',
        authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.'],
        year: 2017,
        venue: 'NeurIPS',
        doi: uniqueDoi,
        file_asset_id: fileAsset.id,
        reading_status: 'Read',
      })
      .select('id')
      .single();

    assert.ok(paper, `Paper creation failed: ${paperErr?.message}`);
    testPaperId = paper.id;

    // Upsert sidebar fields with private notes (visible=false)
    const { error: sbErr } = await supabaseAdmin.from('paper_sidebar_fields').upsert({
      paper_id: testPaperId,
      methodology: 'Multi-head self-attention mechanism',
      results: 'State of the art BLEU score of 28.4 on WMT 2014 En-De',
      personal_notes: 'CONFIDENTIAL: Remember to compare our latency against section 4.',
      personal_notes_visible: false,
    }, { onConflict: 'paper_id' });
    assert.ok(!sbErr, `Sidebar creation failed: ${sbErr?.message}`);
  });

  after(async () => {
    if (server) server.close();
    // Cleanup project and cascade
    if (testProjectId) {
      await supabaseAdmin.from('projects').delete().eq('id', testProjectId);
    }
  });

  // ==========================================
  // Test 1: Manuscript Creation & Default Sections (AC-01, AC-02)
  // ==========================================
  it('AC-01 & AC-02: Researcher creates manuscript with default IMRAD sections and checklist items', async () => {
    const res = await fetch(`${baseUrl}/projects/${testProjectId}/manuscripts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        title: 'Scalable Transformers for Quantum Chemistry',
        abstract: 'We present a fast attention formulation for molecular representations.',
        targetVenue: 'Nature Machine Intelligence',
        defaultSections: true,
      }),
    });

    assert.equal(res.status, 201, 'Should successfully create manuscript');
    const manuscript = await res.json();
    testManuscriptId = manuscript.id;

    assert.equal(manuscript.title, 'Scalable Transformers for Quantum Chemistry');
    assert.equal(manuscript.status, 'Draft');
    assert.equal(manuscript.createdBy, researcherUserId);
    assert.ok(manuscript.sections && manuscript.sections.length >= 8, 'Should have created 8 default IMRAD sections');
    assert.ok(manuscript.checklistItems && manuscript.checklistItems.length >= 4, 'Should have created 4 default checklist items');

    const abstractSec = manuscript.sections.find((s: any) => s.sectionType === 'Abstract');
    const introSec = manuscript.sections.find((s: any) => s.sectionType === 'Introduction');
    assert.ok(abstractSec, 'Abstract section exists');
    assert.ok(introSec, 'Introduction section exists');
    abstractSectionId = abstractSec.id;
    introSectionId = introSec.id;

    const lockedItem = manuscript.checklistItems.find((ci: any) => ci.isLocked);
    const unlockedItem = manuscript.checklistItems.find((ci: any) => !ci.isLocked);
    assert.ok(lockedItem, 'Locked item exists');
    assert.ok(unlockedItem, 'Unlocked item exists');
    lockedChecklistItemId = lockedItem.id;
    testChecklistItemId = unlockedItem.id;
  });

  // ==========================================
  // Test 2: RBAC Privacy Rule — Admin Content Access Denied (AC-01)
  // ==========================================
  it('AC-01: Admin is strictly rejected with 403 from reading manuscript content', async () => {
    const res = await fetch(`${baseUrl}/manuscripts/${testManuscriptId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 403, 'Admin must receive 403 Forbidden');
    const body = await res.json();
    assert.ok(body.error.includes('Admins cannot access manuscript content'));
  });

  // ==========================================
  // Test 3: Section Content Update & Word Count Calculation (AC-02, AC-03)
  // ==========================================
  it('AC-02 & AC-03: Section update recalculates word count and updates timestamp', async () => {
    const markdownContent = 'This is an introduction section with exactly ten words now.';
    const res = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/sections/${introSectionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${researcherToken}`,
        },
        body: JSON.stringify({
          contentMarkdown: markdownContent,
        }),
      }
    );

    assert.equal(res.status, 200, 'Section update should succeed');
    const updatedSec = await res.json();
    assert.equal(updatedSec.contentMarkdown, markdownContent);
    assert.equal(updatedSec.wordCount, 10, 'Word count should precisely equal 10');
  });

  // ==========================================
  // Test 4: In-Text Citations & "Why Did I Cite This?" Dynamic Privacy Masking (AC-04)
  // ==========================================
  it('AC-04: Inserts citation and masks confidential sidebar notes for co-reviewers', async () => {
    // 1. Insert Citation
    const insertRes = await fetch(`${baseUrl}/manuscripts/${testManuscriptId}/citations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        paperId: testPaperId,
        citationKey: 'vaswani2017attention',
        sectionId: introSectionId,
        inTextLabel: '[1]',
        contextNote: 'Citing for the baseline multi-head attention architecture.',
      }),
    });

    assert.equal(insertRes.status, 201, 'Should insert citation');
    const citation = await insertRes.json();
    assert.equal(citation.citationKey, 'vaswani2017attention');

    // 2. Assign Reviewer to manuscript
    const assignRes = await fetch(`${baseUrl}/manuscripts/${testManuscriptId}/reviewers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        reviewerId: reviewerUserId,
        deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      }),
    });
    assert.equal(assignRes.status, 201, 'Supervisor assigns reviewer');

    // 3. Reviewer queries "Why Did I Cite This?" -> Personal notes should be masked to null!
    const reviewerWhyRes = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/citations/vaswani2017attention/why`,
      {
        headers: { Authorization: `Bearer ${reviewerToken}` },
      }
    );

    assert.equal(reviewerWhyRes.status, 200, 'Reviewer can access WhyDidICiteThis context');
    const reviewerContext = await reviewerWhyRes.json();
    assert.equal(reviewerContext.citationKey, 'vaswani2017attention');
    assert.equal(reviewerContext.paper.title, 'Attention Is All You Need');
    assert.equal(reviewerContext.sidebarSummary.personalNotes, null, 'Private note must be masked to null for reviewer');
    assert.equal(reviewerContext.isMaskedNote, true, 'isMaskedNote must be true');

    // 4. Uploader (Researcher) queries "Why Did I Cite This?" -> Personal notes remain visible
    const uploaderWhyRes = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/citations/vaswani2017attention/why`,
      {
        headers: { Authorization: `Bearer ${researcherToken}` },
      }
    );
    assert.equal(uploaderWhyRes.status, 200);
    const uploaderContext = await uploaderWhyRes.json();
    assert.ok(uploaderContext.sidebarSummary.personalNotes.includes('CONFIDENTIAL'), 'Uploader sees their private notes');
    assert.equal(uploaderContext.isMaskedNote, false);
  });

  // ==========================================
  // Test 5: Reviewer Role Boundaries (Reviewers Cannot Modify Section Text) (AC-01)
  // ==========================================
  it('AC-01: Assigned Reviewer cannot modify manuscript section text (403)', async () => {
    const res = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/sections/${introSectionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${reviewerToken}`,
        },
        body: JSON.stringify({
          contentMarkdown: 'Malicious modification by reviewer',
        }),
      }
    );

    assert.equal(res.status, 403, 'Reviewer must receive 403 when modifying section text');
    const body = await res.json();
    assert.ok(body.error.includes('Only manuscript authors and supervisors can modify'));
  });

  // ==========================================
  // Test 6: Review Comments State Machine (Open -> FixedByResearcher -> Resolved -> Reopened) (AC-05, AC-06, AC-07)
  // ==========================================
  it('AC-05, AC-06, AC-07: Full review comment lifecycle with mandatory fixNote and supervisor resolve', async () => {
    // 1. Reviewer creates a Major review comment
    const createRes = await fetch(`${baseUrl}/manuscripts/${testManuscriptId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${reviewerToken}`,
      },
      body: JSON.stringify({
        sectionId: introSectionId,
        commentText: 'The computational complexity comparison in paragraph 2 lacks asymptotic bounds.',
        severity: 'MajorScientific',
      }),
    });

    assert.equal(createRes.status, 201, 'Comment created successfully');
    const comment = await createRes.json();
    testCommentId = comment.id;
    assert.equal(comment.status, 'Open');
    assert.equal(comment.severity, 'MajorScientific');

    // 2. Researcher attempts to mark fixed without fixNote -> Rejected 400 (AC-06)
    const badFixRes = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/comments/${testCommentId}/fix`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${researcherToken}`,
        },
        body: JSON.stringify({ fixNote: '   ' }),
      }
    );
    assert.equal(badFixRes.status, 400, 'Fixing without note must fail with 400');

    // 3. Researcher fixes with proper fixNote -> Status becomes FixedByResearcher
    const goodFixRes = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/comments/${testCommentId}/fix`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${researcherToken}`,
        },
        body: JSON.stringify({
          fixNote: 'Added O(N^2 d) vs O(N d^2) asymptotic complexity breakdown in Table 1.',
        }),
      }
    );
    assert.equal(goodFixRes.status, 200, 'Fixing with note should succeed');
    const fixedComment = await goodFixRes.json();
    assert.equal(fixedComment.status, 'FixedByResearcher');
    assert.equal(
      fixedComment.fixNote,
      'Added O(N^2 d) vs O(N d^2) asymptotic complexity breakdown in Table 1.'
    );

    // 4. Plain Researcher attempts to resolve -> 403 Forbidden
    const resResolveRes = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/comments/${testCommentId}/resolve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${researcherToken}`,
        },
        body: JSON.stringify({ resolutionNote: 'Researcher attempting to resolve' }),
      }
    );
    assert.equal(resResolveRes.status, 403, 'Researcher cannot resolve comment');

    // 5. Supervisor resolves comment -> Status becomes Resolved
    const supResolveRes = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/comments/${testCommentId}/resolve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supervisorToken}`,
        },
        body: JSON.stringify({ resolutionNote: 'Verified new complexity table.' }),
      }
    );
    assert.equal(supResolveRes.status, 200, 'Supervisor resolve succeeds');
    const resolvedComment = await supResolveRes.json();
    assert.equal(resolvedComment.status, 'Resolved');
    assert.equal(resolvedComment.resolvedBy, supervisorUserId);
  });

  // ==========================================
  // Test 7: Submission Checklist & Locked Item Governance (AC-08, AC-09)
  // ==========================================
  it('AC-08 & AC-09: Locked checklist items require Supervisor sign-off; incomplete checklist blocks submission', async () => {
    // 1. Researcher toggles unlocked item -> Allowed
    const toggleUnlockedRes = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/checklist/${testChecklistItemId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${researcherToken}`,
        },
        body: JSON.stringify({ isCompleted: true }),
      }
    );
    assert.equal(toggleUnlockedRes.status, 200, 'Researcher can complete unlocked item');

    // 2. Researcher toggles locked item -> 400 Forbidden
    const toggleLockedRes = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/checklist/${lockedChecklistItemId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${researcherToken}`,
        },
        body: JSON.stringify({ isCompleted: true }),
      }
    );
    assert.equal(toggleLockedRes.status, 400, 'Researcher cannot toggle locked checklist item');
    const lockedErr = await toggleLockedRes.json();
    assert.ok(lockedErr.error.includes('locked and requires Supervisor sign-off'));

    // 3. Supervisor attempts ReadyForSubmission while checklist is incomplete -> 400 Error
    const prematureSubmissionRes = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supervisorToken}`,
        },
        body: JSON.stringify({ status: 'ReadyForSubmission' }),
      }
    );
    assert.equal(prematureSubmissionRes.status, 400, 'Incomplete checklist blocks ReadyForSubmission');

    // 4. Supervisor completes all checklist items
    const { data: allItems } = await supabaseAdmin
      .from('manuscript_checklist_items')
      .select('id')
      .eq('manuscript_id', testManuscriptId);

    for (const item of allItems || []) {
      await supabaseAdmin
        .from('manuscript_checklist_items')
        .update({ is_completed: true, completed_by: supervisorUserId, completed_at: new Date().toISOString() })
        .eq('id', item.id);
    }

    // 5. Supervisor transitions status to ReadyForSubmission -> Succeeds!
    const validSubmitRes = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supervisorToken}`,
        },
        body: JSON.stringify({ status: 'ReadyForSubmission' }),
      }
    );
    assert.equal(validSubmitRes.status, 200, 'ReadyForSubmission succeeds when all criteria met');
    const submittedManuscript = await validSubmitRes.json();
    assert.equal(submittedManuscript.status, 'ReadyForSubmission');
  });

  // ==========================================
  // Test 8: Version Snapshot & Rollback Restoration (AC-10)
  // ==========================================
  it('AC-10: Frozen version snapshot preserves state and supports restoration', async () => {
    // 1. Create Version Snapshot v1
    const snapshotRes = await fetch(`${baseUrl}/manuscripts/${testManuscriptId}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ versionName: 'v1.0-pre-review' }),
    });

    assert.equal(snapshotRes.status, 201, 'Version snapshot created');
    const v1 = await snapshotRes.json();
    assert.equal(v1.versionNumber, 1);
    assert.equal(v1.versionName, 'v1.0-pre-review');
    assert.ok(v1.snapshotData.sections.length >= 8);

    // 2. Modify abstract section
    await fetch(`${baseUrl}/manuscripts/${testManuscriptId}/sections/${abstractSectionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ contentMarkdown: 'Temporary mutated abstract text.' }),
    });

    // 3. Restore Version Snapshot v1
    const restoreRes = await fetch(
      `${baseUrl}/manuscripts/${testManuscriptId}/versions/${v1.id}/restore`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${researcherToken}`,
        },
      }
    );
    assert.equal(restoreRes.status, 200, 'Restore version succeeds');
    const restored = await restoreRes.json();
    const restoredAbstract = restored.sections.find((s: any) => s.sectionType === 'Abstract');
    assert.equal(restoredAbstract.contentMarkdown, ''); // restored to empty initial snapshot

    // 4. Verify Revision Logs
    const logsRes = await fetch(`${baseUrl}/manuscripts/${testManuscriptId}/logs`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(logsRes.status, 200);
    const logs = await logsRes.json();
    assert.ok(logs.length > 5, 'Should have multiple revision logs recorded');
  });
});
