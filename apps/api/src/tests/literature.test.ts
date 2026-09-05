process.env.NODE_ENV = 'test';
import test, { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import app from '../index.js';
import { supabaseAdmin } from '../supabase.js';
import { Server } from 'http';
import * as fileAssetService from '../services/fileAsset.service.js';
import { normalizeDoi, calculateConfidence } from '../services/metadata/types.js';
import { crossRefProvider } from '../services/metadata/crossref.provider.js';
import { openAlexProvider } from '../services/metadata/openalex.provider.js';
import { extractDoiFromText } from '../services/metadata/pdfExtraction.service.js';
import { cleanFileNameToQuery } from '../services/metadata/metadata.service.js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1WP4GkxxPN-fJYvMxFvxLg_L006rTWB';

const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);

describe('Spec 03 — Literature Review & Paper Manager Test Suite', () => {
  let server: Server;
  let baseUrl: string;

  let adminToken: string;
  let adminUserId: string;

  let supervisorToken: string;
  let supervisorUserId: string;

  let researcherToken: string;
  let researcherUserId: string;

  let createdFileAssetId: string;
  let testStoragePath: string;
  let testProjectId: string;
  let createdPaperId: string;

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

    // Ensure profiles are active
    await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Admin' }).eq('id', adminUserId);
    await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Supervisor' }).eq('id', supervisorUserId);
    await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Researcher' }).eq('id', researcherUserId);

    // Initialize test collaborative project
    const { data: proj } = await supabaseAdmin
      .from('projects')
      .insert({
        title: 'Spec 03 Literature Lab',
        owner_id: supervisorUserId,
        is_personal: false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    assert.ok(proj?.id, 'Test project creation should succeed');
    testProjectId = proj.id;

    await supabaseAdmin.from('project_members').insert({
      project_id: testProjectId,
      user_id: researcherUserId,
      project_role: 'Member',
      joined_at: new Date().toISOString(),
    });
  });

  test.after(async () => {
    if (server) server.close();
    // Cleanup any created file asset or storage object
    if (createdFileAssetId) {
      await fileAssetService.deleteFileAsset(createdFileAssetId, researcherUserId);
    }
    // Cleanup test project
    if (testProjectId) {
      await supabaseAdmin.from('projects').delete().eq('id', testProjectId);
    }
  });

  // ==========================================
  // Phase 3.2: Storage & FileAsset Service Tests
  // ==========================================

  it('1. validateStoragePath: Accepts valid {userId}/{uuid}.pdf format', () => {
    const validUuid = '11111111-2222-3333-4444-555555555555';
    const path = `${researcherUserId}/${validUuid}.pdf`;
    assert.doesNotThrow(() => {
      fileAssetService.validateStoragePath(path, researcherUserId);
    });
  });

  it('2. validateStoragePath: Rejects path prefix mismatch with 403', () => {
    const validUuid = '11111111-2222-3333-4444-555555555555';
    const path = `${supervisorUserId}/${validUuid}.pdf`;
    assert.throws(
      () => {
        fileAssetService.validateStoragePath(path, researcherUserId);
      },
      (err: any) => {
        return err instanceof fileAssetService.FileAssetError && err.statusCode === 403;
      }
    );
  });

  it('3. validateStoragePath: Rejects invalid format or non-PDF extension with 400', () => {
    assert.throws(
      () => {
        fileAssetService.validateStoragePath(`papers/${researcherUserId}/test.pdf`, researcherUserId);
      },
      (err: any) => err.statusCode === 400
    );

    assert.throws(
      () => {
        fileAssetService.validateStoragePath(`${researcherUserId}/not-a-uuid.pdf`, researcherUserId);
      },
      (err: any) => err.statusCode === 400
    );

    assert.throws(
      () => {
        fileAssetService.validateStoragePath(`${researcherUserId}/11111111-2222-3333-4444-555555555555.docx`, researcherUserId);
      },
      (err: any) => err.statusCode === 400
    );
  });

  it('4. validatePdfMetadata: Rejects non-PDF extension, invalid MIME, or >50MB with 400', () => {
    // Non-PDF extension
    assert.throws(
      () => fileAssetService.validatePdfMetadata('paper.doc', 'application/pdf', 1000),
      (err: any) => err.statusCode === 400
    );

    // Invalid MIME
    assert.throws(
      () => fileAssetService.validatePdfMetadata('paper.pdf', 'image/jpeg', 1000),
      (err: any) => err.statusCode === 400
    );

    // 0 or negative bytes
    assert.throws(
      () => fileAssetService.validatePdfMetadata('paper.pdf', 'application/pdf', 0),
      (err: any) => err.statusCode === 400
    );

    // Exceeds 50MB (52428801 bytes)
    assert.throws(
      () => fileAssetService.validatePdfMetadata('paper.pdf', 'application/pdf', 52428801),
      (err: any) => err.statusCode === 400
    );
  });

  it('5. createFileAsset: Inserts valid FileAsset record and records audit log', async () => {
    const testUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    testStoragePath = `${researcherUserId}/${testUuid}.pdf`;

    // Upload a dummy PDF to Supabase Storage so physical object exists in bucket
    await supabaseAdmin.storage.from('papers').upload(
      testStoragePath,
      Buffer.from('%PDF-1.4\n%EOF'),
      { contentType: 'application/pdf', upsert: true }
    );

    const fileAsset = await fileAssetService.createFileAsset(
      researcherUserId,
      testStoragePath,
      'Attention_Is_All_You_Need.pdf',
      'application/pdf',
      2450000
    );

    assert.ok(fileAsset.id, 'FileAsset ID should be generated');
    assert.equal(fileAsset.ownerId, researcherUserId);
    assert.equal(fileAsset.storagePath, testStoragePath);
    assert.equal(fileAsset.fileName, 'Attention_Is_All_You_Need.pdf');
    assert.equal(fileAsset.mimeType, 'application/pdf');
    assert.equal(fileAsset.sizeBytes, 2450000);

    createdFileAssetId = fileAsset.id;

    // Verify row in database
    const { data: dbRow } = await supabaseAdmin
      .from('file_assets')
      .select('*')
      .eq('id', fileAsset.id)
      .single();
    assert.ok(dbRow, 'DB row must exist');

    // Verify audit log
    const { data: auditLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('target_id', fileAsset.id)
      .eq('action', 'create_file_asset');
    assert.ok(auditLogs && auditLogs.length > 0, 'Audit log must be created');
  });

  it('6. getSignedUrl: Rejects Admin requester with 403 (AC-18 Privacy Rule)', async () => {
    await assert.rejects(
      async () => {
        await fileAssetService.getSignedUrl(createdFileAssetId, adminUserId, 'Admin');
      },
      (err: any) => {
        return err instanceof fileAssetService.FileAssetError && err.statusCode === 403;
      }
    );
  });

  it('7. getSignedUrl: Rejects unauthorized non-owner requester with 403', async () => {
    await assert.rejects(
      async () => {
        await fileAssetService.getSignedUrl(createdFileAssetId, supervisorUserId, 'Supervisor');
      },
      (err: any) => {
        return err instanceof fileAssetService.FileAssetError && err.statusCode === 403;
      }
    );
  });

  it('8. getSignedUrl: Generates signed URL for authorized owner', async () => {
    const result = await fileAssetService.getSignedUrl(createdFileAssetId, researcherUserId, 'Researcher');
    assert.ok(result.url, 'Signed URL should be returned');
    assert.match(result.url, /token=/, 'Signed URL should contain access token');
  });

  it('9. GET /papers/:paperId/download-url: Returns 401 when unauthenticated', async () => {
    const res = await fetch(`${baseUrl}/papers/00000000-0000-0000-0000-000000000000/download-url`);
    assert.equal(res.status, 401);
  });

  it('10. GET /papers/:paperId/download-url: Returns 403 when requested by Admin token (AC-18)', async () => {
    const res = await fetch(`${baseUrl}/papers/00000000-0000-0000-0000-000000000000/download-url`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Admins cannot access paper content/i);
  });

  it('11. GET /papers/:paperId/download-url: Returns 404 for non-existent paper', async () => {
    const res = await fetch(`${baseUrl}/papers/00000000-0000-0000-0000-000000000000/download-url`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(res.status, 404);
  });

  it('12. deleteFileAsset: Cleans up file asset record and records audit log', async () => {
    await fileAssetService.deleteFileAsset(createdFileAssetId, researcherUserId);

    const { data: dbRow } = await supabaseAdmin
      .from('file_assets')
      .select('*')
      .eq('id', createdFileAssetId)
      .maybeSingle();
    assert.equal(dbRow, null, 'FileAsset DB row must be removed');

    createdFileAssetId = ''; // Clear so after hook doesn't re-delete
  });

  // ==========================================
  // Phase 3.3: Metadata Provider & DOI Extraction Tests
  // ==========================================

  it('13. normalizeDoi: Normalizes URLs, dx.doi prefixes, and trims trailing punctuation', () => {
    assert.equal(
      normalizeDoi('https://doi.org/10.1145/3292500.3330964'),
      '10.1145/3292500.3330964'
    );
    assert.equal(
      normalizeDoi('http://dx.doi.org/10.1000/182.'),
      '10.1000/182'
    );
    assert.equal(
      normalizeDoi('doi: 10.1016/j.cell.2020.01.001;'),
      '10.1016/j.cell.2020.01.001'
    );
  });

  it('14. calculateConfidence: Accurately scores title overlap, author overlap, and year matches', () => {
    // Exact DOI match
    const exactDoiScore = calculateConfidence(
      { doi: '10.1145/1234567' },
      { title: 'Test Paper', authors: ['Smith'], year: 2020, doi: '10.1145/1234567', source: 'crossref', confidence: 0 }
    );
    assert.equal(exactDoiScore, 0.98);

    // High title overlap with same year
    const highTitleScore = calculateConfidence(
      { title: 'Attention Is All You Need', year: 2017 },
      { title: 'Attention is All You Need', authors: ['Vaswani'], year: 2017, source: 'crossref', confidence: 0 }
    );
    assert.ok(highTitleScore >= 0.85, `Expected >= 0.85, got ${highTitleScore}`);

    // Completely unrelated title
    const unrelatedScore = calculateConfidence(
      { title: 'Deep Residual Learning for Image Recognition' },
      { title: 'Quantum Computing and Cryptography', authors: ['Alice'], year: 2022, source: 'openalex', confidence: 0 }
    );
    assert.ok(unrelatedScore < 0.40, `Expected < 0.40, got ${unrelatedScore}`);
  });

  it('15. cleanFileNameToQuery: Strips file extension, underscores, and arXiv identifiers', () => {
    assert.equal(
      cleanFileNameToQuery('Attention_Is_All_You_Need_1706.03762v7.pdf'),
      'Attention Is All You Need'
    );
    assert.equal(
      cleanFileNameToQuery('Deep-Residual-Learning--Image-Recognition.pdf'),
      'Deep Residual Learning Image Recognition'
    );
  });

  it('16. extractDoiFromText: Identifies standard DOI from text stream', () => {
    const rawText = 'Published in Nature 2021. For correspondence, see doi: 10.1038/s41586-020-2649-2; received in revised form.';
    const extracted = extractDoiFromText(rawText);
    assert.equal(extracted, '10.1038/s41586-020-2649-2');

    const empty = extractDoiFromText('No DOI mentioned anywhere in this manuscript header.');
    assert.equal(empty, null);
  });

  it('17. CrossRefProvider: Successfully looks up real DOI via CrossRef API', async () => {
    // Real well-known paper DOI
    const result = await crossRefProvider.lookupByDoi('10.1145/3292500.3330964');
    assert.ok(result, 'CrossRef should return candidate for valid DOI');
    assert.equal(result.source, 'crossref');
    assert.ok(result.title.length > 0, 'Should have paper title');
    assert.ok(result.authors.length > 0, 'Should have authors array');
  });

  it('18. OpenAlexProvider: Successfully looks up real DOI via OpenAlex API', async () => {
    // Real well-known paper DOI
    const result = await openAlexProvider.lookupByDoi('10.1145/3292500.3330964');
    assert.ok(result, 'OpenAlex should return candidate for valid DOI');
    assert.equal(result.source, 'openalex');
    assert.ok(result.title.length > 0, 'Should have paper title');
  });

  it('19. POST /metadata/resolve: Rejects unauthenticated request (401) and path ownership mismatch (403)', async () => {
    // Unauthenticated
    const resNoAuth = await fetch(`${baseUrl}/metadata/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath: 'test/path.pdf', fileName: 'test.pdf' }),
    });
    assert.equal(resNoAuth.status, 401);

    // Path prefix mismatch (belongs to supervisor, requester is researcher)
    const resMismatch = await fetch(`${baseUrl}/metadata/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        storagePath: `${supervisorUserId}/11111111-2222-3333-4444-555555555555.pdf`,
        fileName: 'test.pdf',
      }),
    });
    assert.equal(resMismatch.status, 403);
  });

  it('20. POST /metadata/resolve: Successfully returns resolved or candidate metadata for uploaded PDF', async () => {
    const resolveTestUuid = '22222222-3333-4444-5555-666666666666';
    const resolveStoragePath = `${researcherUserId}/${resolveTestUuid}.pdf`;

    // Upload a test PDF containing title text
    await supabaseAdmin.storage.from('papers').upload(
      resolveStoragePath,
      Buffer.from('%PDF-1.4\n%EOF\nAttention Is All You Need'),
      { contentType: 'application/pdf', upsert: true }
    );

    const res = await fetch(`${baseUrl}/metadata/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        storagePath: resolveStoragePath,
        fileName: 'Attention_Is_All_You_Need.pdf',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(
      ['resolved', 'candidates', 'manual'].includes(body.status),
      `Expected valid status, got ${body.status}`
    );

    // Clean up uploaded file
    await supabaseAdmin.storage.from('papers').remove([resolveStoragePath]);
  });

  // ==========================================
  // Phase 3.4: Paper CRUD, Sharing & Required Reading Tests
  // ==========================================

  let paperStoragePath: string;

  it('21. POST /papers: Creates Paper record, FileAsset, and triggers blank sidebar fields', async () => {
    const paperUuid = '33333333-4444-5555-6666-777777777777';
    paperStoragePath = `${researcherUserId}/${paperUuid}.pdf`;

    // Upload dummy PDF into Supabase Storage
    await supabaseAdmin.storage.from('papers').upload(
      paperStoragePath,
      Buffer.from('%PDF-1.4\n%EOF\nPaper text content'),
      { contentType: 'application/pdf', upsert: true }
    );

    const res = await fetch(`${baseUrl}/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'],
        year: 2017,
        doi: '10.5555/3295222.3295349',
        venue: 'NeurIPS',
        storagePath: paperStoragePath,
        fileName: 'Attention_Is_All_You_Need.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2500000,
        metadataSource: 'crossref',
        metadataConfidence: 0.95,
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.id, 'Paper ID should be generated');
    assert.equal(body.title, 'Attention Is All You Need');
    assert.equal(body.uploaderId, researcherUserId);
    assert.equal(body.readingStatus, 'Unread');
    assert.equal(body.isRequiredReading, false);
    assert.equal(body.doi, '10.5555/3295222.3295349');

    createdPaperId = body.id;

    // Verify auto-created blank paper_sidebar_fields via trigger
    const { data: sidebar } = await supabaseAdmin
      .from('paper_sidebar_fields')
      .select('*')
      .eq('paper_id', body.id)
      .single();

    assert.ok(sidebar, 'Blank sidebar fields row must be created by trigger');
    assert.equal(sidebar.personal_notes_visible, false);
  });

  it('22. POST /papers: Duplicate DOI in user library returns 409 Conflict', async () => {
    const dupUuid = '44444444-5555-6666-7777-888888888888';
    const dupStoragePath = `${researcherUserId}/${dupUuid}.pdf`;

    await supabaseAdmin.storage.from('papers').upload(
      dupStoragePath,
      Buffer.from('%PDF-1.4\n%EOF\nDuplicate test'),
      { contentType: 'application/pdf', upsert: true }
    );

    const res = await fetch(`${baseUrl}/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        title: 'Duplicate DOI Paper',
        doi: 'https://doi.org/10.5555/3295222.3295349', // Same DOI normalized
        storagePath: dupStoragePath,
        fileName: 'Duplicate.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1000000,
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.match(body.error, /already exists in your library/i);

    // Verify rollback deleted orphan storage object
    const { data: storageList } = await supabaseAdmin.storage
      .from('papers')
      .list(researcherUserId, { search: `${dupUuid}.pdf` });
    assert.equal((storageList || []).length, 0, 'Orphan storage object must be deleted on failure');
  });

  it('23. GET /papers: Lists papers with metadata search filter', async () => {
    const res = await fetch(`${baseUrl}/papers?q=Attention`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.papers), 'Should return papers array');
    assert.ok(body.papers.length > 0, 'Search should find the Attention paper');
    assert.equal(body.papers[0].id, createdPaperId);
  });

  it('24. PATCH /papers/:paperId: Updates reading status bidirectionally', async () => {
    // 1. Move to Reading
    let res = await fetch(`${baseUrl}/papers/${createdPaperId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ readingStatus: 'Reading' }),
    });
    assert.equal(res.status, 200);
    let body = await res.json();
    assert.equal(body.readingStatus, 'Reading');

    // 2. Move to DeeplyAnalysed
    res = await fetch(`${baseUrl}/papers/${createdPaperId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ readingStatus: 'DeeplyAnalysed' }),
    });
    assert.equal(res.status, 200);
    body = await res.json();
    assert.equal(body.readingStatus, 'DeeplyAnalysed');

    // 3. Move back to Read
    res = await fetch(`${baseUrl}/papers/${createdPaperId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ readingStatus: 'Read' }),
    });
    assert.equal(res.status, 200);
    body = await res.json();
    assert.equal(body.readingStatus, 'Read');
  });

  it('25. POST /papers/:paperId/share: Shares personal paper with project', async () => {
    // 1. Sharing with random project where user is not member -> 403 or 404
    const resForbidden = await fetch(`${baseUrl}/papers/${createdPaperId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ projectId: '00000000-0000-0000-0000-000000000000' }),
    });
    assert.ok([403, 404].includes(resForbidden.status));

    // 2. Sharing with testProjectId (where researcher is member) -> succeeds
    const resSuccess = await fetch(`${baseUrl}/papers/${createdPaperId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ projectId: testProjectId }),
    });

    assert.equal(resSuccess.status, 200);
    const body = await resSuccess.json();
    assert.equal(body.projectId, testProjectId);
  });

  it('26. PATCH /papers/:paperId: Non-uploader cannot edit paper metadata', async () => {
    const res = await fetch(`${baseUrl}/papers/${createdPaperId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ title: 'Tampered Title by Supervisor' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Only the original uploader can edit paper metadata/i);
  });

  it('27. POST & DELETE /papers/:paperId/required-reading: Supervisor assigns & clears required reading', async () => {
    // 1. Researcher attempts to set required reading -> 403
    const resResearcher = await fetch(`${baseUrl}/papers/${createdPaperId}/required-reading`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(resResearcher.status, 403);

    // 2. Supervisor sets required reading -> 200
    const resSupervisor = await fetch(`${baseUrl}/papers/${createdPaperId}/required-reading`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(resSupervisor.status, 200);
    let body = await resSupervisor.json();
    assert.equal(body.isRequiredReading, true);
    assert.equal(body.assignedBySupervisorId, supervisorUserId);

    // 3. Supervisor clears required reading -> 200
    const resClear = await fetch(`${baseUrl}/papers/${createdPaperId}/required-reading`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(resClear.status, 200);
    body = await resClear.json();
    assert.equal(body.isRequiredReading, false);
    assert.equal(body.assignedBySupervisorId, null);
  });

  it('28. DELETE /papers/:paperId: Deletes paper, cascades DB, and cleans up Storage object', async () => {
    // 1. Non-uploader (Supervisor) attempts to delete -> 403
    const resSupervisor = await fetch(`${baseUrl}/papers/${createdPaperId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(resSupervisor.status, 403);

    // 2. Uploader deletes paper -> 200
    const resDelete = await fetch(`${baseUrl}/papers/${createdPaperId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(resDelete.status, 200);

    // 3. Verify paper row is gone
    const { data: dbPaper } = await supabaseAdmin
      .from('papers')
      .select('id')
      .eq('id', createdPaperId)
      .maybeSingle();
    assert.equal(dbPaper, null, 'Paper record must be deleted');

    // 4. Verify blank sidebar fields cascaded delete
    const { data: dbSidebar } = await supabaseAdmin
      .from('paper_sidebar_fields')
      .select('id')
      .eq('paper_id', createdPaperId)
      .maybeSingle();
    assert.equal(dbSidebar, null, 'Sidebar fields must be cascaded deleted');

    // 5. Verify Storage object is deleted
    const [pathUserId, fileName] = paperStoragePath.split('/');
    const { data: storageList } = await supabaseAdmin.storage
      .from('papers')
      .list(pathUserId, { search: fileName });
    assert.equal((storageList || []).length, 0, 'Storage PDF must be removed on paper deletion');

    createdPaperId = ''; // Cleared
  });

  // ==========================================
  // Phase 3.5: Smart Research Sidebar, Annotations & Comments Tests
  // ==========================================

  let phase35PaperId: string;
  let phase35StoragePath: string;
  let testAnnotationId: string;

  it('29. GET /papers/:paperId/sidebar: Uploader retrieves sidebar with personal notes', async () => {
    const uuid = '55555555-6666-7777-8888-999999999999';
    phase35StoragePath = `${researcherUserId}/${uuid}.pdf`;

    await supabaseAdmin.storage.from('papers').upload(
      phase35StoragePath,
      Buffer.from('%PDF-1.4\n%EOF\nPhase 3.5 content'),
      { contentType: 'application/pdf', upsert: true }
    );

    const createRes = await fetch(`${baseUrl}/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        title: 'Deep Residual Learning for Image Recognition',
        authors: ['Kaiming He', 'Xiangyu Zhang'],
        year: 2016,
        venue: 'CVPR',
        storagePath: phase35StoragePath,
        fileName: 'ResNet.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1500000,
      }),
    });
    assert.equal(createRes.status, 201);
    const paper = await createRes.json();
    phase35PaperId = paper.id;

    // Share with testProjectId so supervisor has collaborative viewer access
    await fetch(`${baseUrl}/papers/${phase35PaperId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ projectId: testProjectId }),
    });

    // Uploader updates personal notes with visibility = false (default)
    const patchRes = await fetch(`${baseUrl}/papers/${phase35PaperId}/sidebar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        researchGap: 'Vanishing gradient problem in ultra-deep networks',
        personalNotes: 'Confidential preliminary notes for my thesis',
        personalNotesVisible: false,
      }),
    });
    assert.equal(patchRes.status, 200);

    // Uploader reads sidebar -> receives personal notes intact
    const getRes = await fetch(`${baseUrl}/papers/${phase35PaperId}/sidebar`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(getRes.status, 200);
    const body = await getRes.json();
    assert.equal(body.personalNotes, 'Confidential preliminary notes for my thesis');
    assert.equal(body.personalNotesVisible, false);
  });

  it('30. Option A Dynamic Masking: Non-uploader receives personalNotes = null when hidden', async () => {
    // Supervisor (project owner) views shared paper sidebar
    const res = await fetch(`${baseUrl}/papers/${phase35PaperId}/sidebar`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.researchGap, 'Vanishing gradient problem in ultra-deep networks');
    assert.equal(body.personalNotes, null, 'Option A: Hidden personal notes must be masked to null');
    assert.equal(body.personalNotesVisible, false);
  });

  it('31. PATCH /papers/:paperId/sidebar: Non-uploader updates structured fields, blocked from personal notes', async () => {
    // 1. Supervisor updates structured field -> 200
    const resStructured = await fetch(`${baseUrl}/papers/${phase35PaperId}/sidebar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        methodology: 'Residual skip connections bypassing stacked weight layers',
      }),
    });
    assert.equal(resStructured.status, 200);
    const body = await resStructured.json();
    assert.equal(body.methodology, 'Residual skip connections bypassing stacked weight layers');

    // 2. Supervisor attempts to modify personalNotes -> 403
    const resTamper = await fetch(`${baseUrl}/papers/${phase35PaperId}/sidebar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ personalNotes: 'Supervisor unauthorized edit' }),
    });
    assert.equal(resTamper.status, 403);

    // 3. Researcher toggles personalNotesVisible = true -> 200
    await fetch(`${baseUrl}/papers/${phase35PaperId}/sidebar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ personalNotesVisible: true }),
    });

    // 4. Supervisor reads sidebar -> now personalNotes is visible
    const resVisible = await fetch(`${baseUrl}/papers/${phase35PaperId}/sidebar`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(resVisible.status, 200);
    const bodyVisible = await resVisible.json();
    assert.equal(bodyVisible.personalNotes, 'Confidential preliminary notes for my thesis');
    assert.equal(bodyVisible.personalNotesVisible, true);
  });

  it('32. POST /papers/:paperId/annotations: Creates zoom-invariant annotation', async () => {
    // 1. Invalid position data -> 400
    const resInvalid = await fetch(`${baseUrl}/papers/${phase35PaperId}/annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        page: 1,
        highlightedText: 'residual learning framework',
        positionData: { page: 1, rects: [] }, // empty rects rejected
      }),
    });
    assert.equal(resInvalid.status, 400);

    // 2. Valid zoom-invariant annotation -> 201
    const resValid = await fetch(`${baseUrl}/papers/${phase35PaperId}/annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        page: 1,
        highlightedText: 'Instead of hoping each few stacked layers directly fit a desired underlying mapping',
        positionData: {
          page: 1,
          rects: [{ x: 12.5, y: 34.2, width: 75.0, height: 4.8 }],
        },
        stickyNote: 'Key formulation of the residual identity mapping hypothesis',
        linkedSidebarField: 'Methodology',
      }),
    });
    assert.equal(resValid.status, 201);
    const body = await resValid.json();
    assert.ok(body.id);
    assert.equal(body.page, 1);
    assert.equal(body.stickyNote, 'Key formulation of the residual identity mapping hypothesis');
    assert.equal(body.linkedSidebarField, 'Methodology');
    assert.equal(body.user.role, 'Researcher');

    testAnnotationId = body.id;
  });

  it('33. Collaborative Annotations: Project member sees other members annotations', async () => {
    const res = await fetch(`${baseUrl}/papers/${phase35PaperId}/annotations`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    const annotation = body.find((a: any) => a.id === testAnnotationId);
    assert.ok(annotation, 'Supervisor must see Researcher annotation on shared paper');
    assert.equal(annotation.userId, researcherUserId);
    assert.equal(annotation.user.fullName, 'Alex Chen');
  });

  it('34. PATCH /annotations/:id: Author can edit, non-author rejected with 403', async () => {
    // 1. Supervisor (non-author) attempts to edit -> 403
    const resForbidden = await fetch(`${baseUrl}/annotations/${testAnnotationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ stickyNote: 'Tampered sticky note' }),
    });
    assert.equal(resForbidden.status, 403);

    // 2. Researcher (author) updates sticky note -> 200
    const resAuthor = await fetch(`${baseUrl}/annotations/${testAnnotationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ stickyNote: 'Refined understanding of identity shortcuts' }),
    });
    assert.equal(resAuthor.status, 200);
    const body = await resAuthor.json();
    assert.equal(body.stickyNote, 'Refined understanding of identity shortcuts');
  });

  it('35. DELETE /annotations/:id: Author can delete, non-author rejected with 403', async () => {
    // 1. Supervisor attempts to delete -> 403
    const resForbidden = await fetch(`${baseUrl}/annotations/${testAnnotationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(resForbidden.status, 403);

    // 2. Researcher deletes annotation -> 200
    const resDelete = await fetch(`${baseUrl}/annotations/${testAnnotationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(resDelete.status, 200);

    // 3. Confirm deleted
    const { data: dbAnnotation } = await supabaseAdmin
      .from('paper_annotations')
      .select('id')
      .eq('id', testAnnotationId)
      .maybeSingle();
    assert.equal(dbAnnotation, null, 'Annotation must be deleted');
  });

  it('36. POST & GET /papers/:paperId/comments: Collaborative discussion thread on shared paper', async () => {
    // 1. Supervisor posts comment
    const resSup = await fetch(`${baseUrl}/papers/${phase35PaperId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        body: 'Please review Section 4.2 specifically for gradient norm comparisons.',
      }),
    });
    assert.equal(resSup.status, 201);
    const supComment = await resSup.json();
    assert.equal(supComment.author.role, 'Supervisor');

    // 2. Researcher replies
    const resRes = await fetch(`${baseUrl}/papers/${phase35PaperId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        body: 'Understood, I am comparing it with our baseline experiment.',
      }),
    });
    assert.equal(resRes.status, 201);

    // 3. List comments
    const resList = await fetch(`${baseUrl}/papers/${phase35PaperId}/comments`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(resList.status, 200);
    const comments = await resList.json();
    assert.equal(comments.length, 2);
    assert.equal(comments[0].authorId, supervisorUserId);
    assert.equal(comments[1].authorId, researcherUserId);

    // Cleanup phase 3.5 paper
    await fetch(`${baseUrl}/papers/${phase35PaperId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
  });

  // ==========================================
  // Phase 3.6: Collections, Citation Purpose & Export Tests
  // ==========================================

  let testCollectionId: string;
  let phase36PaperId: string;
  let phase36StoragePath: string;
  let testCitationId: string;

  it('37. POST /collections: Researcher creates personal collection', async () => {
    // 1. Invalid name -> 400
    const resInvalid = await fetch(`${baseUrl}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ name: '' }),
    });
    assert.equal(resInvalid.status, 400);

    // 2. Valid collection -> 201
    const res = await fetch(`${baseUrl}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        name: 'Deep Learning Foundations',
        colorHex: '#6366F1',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.id);
    assert.equal(body.name, 'Deep Learning Foundations');
    assert.equal(body.colorHex, '#6366F1');
    assert.equal(body.paperCount, 0);

    testCollectionId = body.id;
  });

  it('38. GET & PATCH /collections: Lists and updates collection with owner guard', async () => {
    // 1. List collections
    const resList = await fetch(`${baseUrl}/collections`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(resList.status, 200);
    const list = await resList.json();
    assert.ok(Array.isArray(list));
    assert.ok(list.some((c: any) => c.id === testCollectionId));

    // 2. Non-owner (Supervisor) attempts to rename -> 403
    const resForbidden = await fetch(`${baseUrl}/collections/${testCollectionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ name: 'Tampered Collection' }),
    });
    assert.equal(resForbidden.status, 403);

    // 3. Owner updates collection -> 200
    const resUpdate = await fetch(`${baseUrl}/collections/${testCollectionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        name: 'Transformers & LLMs',
        colorHex: '#10B981',
      }),
    });
    assert.equal(resUpdate.status, 200);
    const updated = await resUpdate.json();
    assert.equal(updated.name, 'Transformers & LLMs');
    assert.equal(updated.colorHex, '#10B981');
  });

  it('39. POST & DELETE /collections/:id/papers: Adds and removes paper from collection', async () => {
    // 1. Upload test paper
    const uuid = '66666666-7777-8888-9999-000000000000';
    phase36StoragePath = `${researcherUserId}/${uuid}.pdf`;

    await supabaseAdmin.storage.from('papers').upload(
      phase36StoragePath,
      Buffer.from('%PDF-1.4\n%EOF\nBERT content'),
      { contentType: 'application/pdf', upsert: true }
    );

    const paperRes = await fetch(`${baseUrl}/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        title: 'BERT: Pre-training of Deep Bidirectional Transformers',
        authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
        year: 2019,
        venue: 'NAACL',
        doi: '10.18653/v1/N19-1423',
        storagePath: phase36StoragePath,
        fileName: 'BERT.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1800000,
      }),
    });
    assert.equal(paperRes.status, 201);
    const paper = await paperRes.json();
    phase36PaperId = paper.id;

    // 2. Add paper to collection -> 201
    const resAdd = await fetch(`${baseUrl}/collections/${testCollectionId}/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ paperId: phase36PaperId }),
    });
    assert.equal(resAdd.status, 201);

    // 3. Verify collection paperCount updated
    const resListAfterAdd = await fetch(`${baseUrl}/collections`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    const listAfterAdd = await resListAfterAdd.json();
    const colAfterAdd = listAfterAdd.find((c: any) => c.id === testCollectionId);
    assert.equal(colAfterAdd.paperCount, 1);

    // 4. Remove paper from collection -> 200
    const resRemove = await fetch(`${baseUrl}/collections/${testCollectionId}/papers/${phase36PaperId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(resRemove.status, 200);

    // 5. Verify collection paperCount decremented
    const resListAfterRemove = await fetch(`${baseUrl}/collections`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    const listAfterRemove = await resListAfterRemove.json();
    const colAfterRemove = listAfterRemove.find((c: any) => c.id === testCollectionId);
    assert.equal(colAfterRemove.paperCount, 0);

    // 6. Re-add paper to collection
    await fetch(`${baseUrl}/collections/${testCollectionId}/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ paperId: phase36PaperId }),
    });
  });

  it('40. DELETE /collections/:id: Deletes collection without deleting paper', async () => {
    // 1. Delete collection
    const resDel = await fetch(`${baseUrl}/collections/${testCollectionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(resDel.status, 200);

    // 2. Verify collection is gone
    const { data: dbCol } = await supabaseAdmin
      .from('collections')
      .select('id')
      .eq('id', testCollectionId)
      .maybeSingle();
    assert.equal(dbCol, null);

    // 3. Verify paper still exists in database intact
    const { data: dbPaper } = await supabaseAdmin
      .from('papers')
      .select('id')
      .eq('id', phase36PaperId)
      .maybeSingle();
    assert.ok(dbPaper, 'Deleting collection must never delete paper records');
  });

  it('41. POST /papers/:paperId/citations: Adds citation purpose with validation', async () => {
    // 1. Invalid purpose -> 400
    const resInvalid = await fetch(`${baseUrl}/papers/${phase36PaperId}/citations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ purpose: 'NonExistentPurpose' }),
    });
    assert.equal(resInvalid.status, 400);

    // 2. Add Motivation citation purpose -> 201
    const res1 = await fetch(`${baseUrl}/papers/${phase36PaperId}/citations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        purpose: 'Motivation',
        note: 'Pioneered masked language modeling for contextualized representations',
      }),
    });
    assert.equal(res1.status, 201);
    const citation1 = await res1.json();
    assert.ok(citation1.id);
    assert.equal(citation1.purpose, 'Motivation');
    assert.equal(citation1.note, 'Pioneered masked language modeling for contextualized representations');
    testCitationId = citation1.id;

    // 3. Add ComparisonBaseline citation purpose -> 201
    const res2 = await fetch(`${baseUrl}/papers/${phase36PaperId}/citations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        purpose: 'ComparisonBaseline',
        note: 'Baseline comparison in table 3',
      }),
    });
    assert.equal(res2.status, 201);
  });

  it('42. GET & DELETE /papers/:paperId/citations: Lists and deletes citation purposes', async () => {
    // 1. List citations
    const resList = await fetch(`${baseUrl}/papers/${phase36PaperId}/citations`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(resList.status, 200);
    const list = await resList.json();
    assert.equal(list.length, 2);

    // 2. Delete single citation purpose
    const resDelete = await fetch(`${baseUrl}/citations/${testCitationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    assert.equal(resDelete.status, 200);

    // 3. Confirm 1 remaining
    const resAfter = await fetch(`${baseUrl}/papers/${phase36PaperId}/citations`, {
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
    const after = await resAfter.json();
    assert.equal(after.length, 1);
  });

  it('43. GET /papers/export: Exports papers in BibTeX format', async () => {
    const res = await fetch(
      `${baseUrl}/papers/export?format=bibtex&paperIds=${phase36PaperId}`,
      { headers: { Authorization: `Bearer ${researcherToken}` } }
    );

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/x-bibtex/i);
    const text = await res.text();
    assert.match(text, /@article\{/);
    assert.match(text, /title = \{BERT: Pre-training of Deep Bidirectional Transformers\}/);
    assert.match(text, /author = \{Jacob Devlin and Ming-Wei Chang and Kenton Lee and Kristina Toutanova\}/);
    assert.match(text, /year = \{2019\}/);
    assert.match(text, /journal = \{NAACL\}/);
    assert.match(text, /doi = \{10.18653\/v1\/N19-1423\}/);
  });

  it('44. GET /papers/export: Exports papers in RIS format', async () => {
    const res = await fetch(
      `${baseUrl}/papers/export?format=ris&paperIds=${phase36PaperId}`,
      { headers: { Authorization: `Bearer ${researcherToken}` } }
    );

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/x-research-info-systems/i);
    const text = await res.text();
    assert.match(text, /TY  - JOUR/);
    assert.match(text, /TI  - BERT: Pre-training of Deep Bidirectional Transformers/);
    assert.match(text, /AU  - Jacob Devlin/);
    assert.match(text, /PY  - 2019/);
    assert.match(text, /JO  - NAACL/);
    assert.match(text, /DO  - 10.18653\/v1\/N19-1423/);
    assert.match(text, /ER  - /);

    // Cleanup phase 3.6 paper
    await fetch(`${baseUrl}/papers/${phase36PaperId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${researcherToken}` },
    });
  });
});
