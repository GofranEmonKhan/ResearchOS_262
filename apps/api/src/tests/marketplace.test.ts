process.env.NODE_ENV = 'test';
import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import app from '../index.js';
import { supabaseAdmin } from '../supabase.js';
import { Server } from 'http';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_1WP4GkxxPN-fJYvMxFvxLg_L006rTWB';
const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);

describe('Spec 07 — Academic Marketplace & Compute Resource Sharing Test Suite', () => {
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

  let createdListingId: string;
  let createdSlotId: string;
  let createdBookingId: string;
  let createdDisputeBookingId: string;
  let createdDisputeId: string;

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

    // 2. Supervisor login (Provider)
    const { data: supervisorLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'supervisor@stanford.edu',
      password: 'Password123!',
    });
    assert.ok(supervisorLogin?.session, 'Supervisor login should succeed');
    supervisorToken = supervisorLogin.session.access_token;
    supervisorUserId = supervisorLogin.user.id;

    // 3. Researcher login (Consumer)
    const { data: researcherLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'researcher@mit.edu',
      password: 'Password123!',
    });
    assert.ok(researcherLogin?.session, 'Researcher login should succeed');
    researcherToken = researcherLogin.session.access_token;
    researcherUserId = researcherLogin.user.id;

    // 4. Other researcher (Third-party)
    const { data: otherLogin } = await supabaseClient.auth.signInWithPassword({
      email: 'supervisor.pending@oxford.edu',
      password: 'Password123!',
    });
    if (otherLogin?.session) {
      otherResearcherToken = otherLogin.session.access_token;
      otherResearcherUserId = otherLogin.user.id;
    } else {
      otherResearcherToken = researcherToken;
      otherResearcherUserId = researcherUserId;
    }

    // Ensure profiles are active
    await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Supervisor' }).eq('id', supervisorUserId);
    await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Researcher' }).eq('id', researcherUserId);
    if (otherResearcherUserId) {
      await supabaseAdmin.from('profiles').update({ status: 'Active', role: 'Researcher' }).eq('id', otherResearcherUserId);
    }
  });

  after(async () => {
    if (server) {
      server.close();
    }
  });

  it('1. Admin is forbidden from creating a marketplace listing (AC-2)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Admin Illegal Listing',
        type: 'Hardware',
        hourlyPrice: 100,
        description: 'Should fail with 403',
      }),
    });

    assert.equal(res.status, 403, 'Admin cannot create marketplace listings');
  });

  it('2. Supervisor/Researcher can create a new compute listing (AC-1)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        title: 'NVIDIA DGX H100 Node (8x 80GB SXM5)',
        type: 'Hardware',
        description: 'Ultra high throughput compute node for LLM fine-tuning and molecular dynamics.',
        gpuCpuModel: '8x NVIDIA H100 SXM5 80GB',
        vram: '640GB',
        ram: '2TB DDR5 ECC',
        storage: '30TB NVMe',
        os: 'Ubuntu 22.04 LTS',
        accessMethod: 'SSH',
        location: 'Biomedical Informatics Datacenter - Pod 4',
        hourlyPrice: 45.0,
        dailyPrice: 900.0,
        isFree: false,
        isInstitutional: true,
      }),
    });

    assert.equal(res.status, 201, 'Should create listing successfully');
    const listing = await res.json();
    assert.ok(listing?.id, 'Response should contain listing ID');
    assert.equal(listing.title, 'NVIDIA DGX H100 Node (8x 80GB SXM5)');
    assert.equal(listing.type, 'Hardware');
    createdListingId = listing.id;

    // Approve the listing as admin for public visibility
    await fetch(`${baseUrl}/marketplace/admin/listings/${createdListingId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  it('3. Public catalog search returns newly created active listing with filters (AC-3)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/listings?type=Hardware&search=H100`, {
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.listings), 'Should return listings array');
    const found = body.listings.find((l: any) => l.id === createdListingId);
    assert.ok(found, 'Created listing must be present in search results');
    assert.equal(found.type, 'Hardware');
  });

  it('4. Provider creates availability slot for listing (AC-4)', async () => {
    const startTime = new Date(Date.now() + 3600 * 1000 * 24).toISOString(); // +24 hours
    const endTime = new Date(Date.now() + 3600 * 1000 * 28).toISOString(); // +28 hours (4 hour block)

    const res = await fetch(`${baseUrl}/marketplace/listings/${createdListingId}/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        startTime,
        endTime,
      }),
    });

    assert.equal(res.status, 201);
    const createdSlots = await res.json();
    assert.ok(Array.isArray(createdSlots) && createdSlots.length > 0);
    assert.equal(createdSlots[0].isBooked, false);
    createdSlotId = createdSlots[0].id;
  });

  it('5. Prospective renter can send inquiry to provider (AC-18)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/listings/${createdListingId}/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        body: 'Is FlashAttention-2 pre-compiled with PyTorch 2.4 on this cluster?',
      }),
    });

    assert.equal(res.status, 201);
    const inquiry = await res.json();
    assert.ok(inquiry?.id);
    assert.equal(inquiry.body, 'Is FlashAttention-2 pre-compiled with PyTorch 2.4 on this cluster?');
  });

  it('6. Consumer requests booking for the availability slot (AC-5)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/listings/${createdListingId}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        slotId: createdSlotId,
        requesterNotes: 'Running benchmark runs for protein folding sequence generation.',
      }),
    });

    assert.equal(res.status, 201);
    const booking = await res.json();
    assert.ok(booking?.id);
    assert.equal(booking.status, 'Requested');
    assert.equal(booking.requesterId, researcherUserId);
    assert.equal(booking.totalPrice, 180.0); // 4 hours * $45/hr
    createdBookingId = booking.id;
  });

  it('7. Consumer cannot access sensitive credentials before payment (AC-11)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/bookings/${createdBookingId}`, {
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 200);
    const booking = await res.json();
    assert.equal(booking.accessDetails, null, 'Access details must be NULL for unreleased bookings');
  });

  it('8. Consumer cannot pay escrow before provider accepts (AC-8)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/bookings/${createdBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        testScenario: 'success',
      }),
    });

    assert.equal(res.status, 400, 'Cannot pay for a booking in Requested state');
  });

  it('9. Provider accepts booking request (AC-6)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/bookings/${createdBookingId}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supervisorToken}`,
      },
    });

    assert.equal(res.status, 200);
    const booking = await res.json();
    assert.equal(booking.status, 'Accepted');
  });

  it('10. Consumer completes sandbox escrow payment (AC-9)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/bookings/${createdBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        testScenario: 'success',
      }),
    });

    assert.equal(res.status, 200);
    const result = await res.json();
    assert.equal(result.booking.status, 'PaymentEscrowed');
    assert.equal(result.transaction.status, 'Held');
  });

  it('11. Provider releases access credentials to consumer (AC-12)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/bookings/${createdBookingId}/release-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        accessDetails: 'ssh h100-node04.cluster.researchos.internal -p 2222 -i id_ed25519_guest (Jupyter: port 8888)',
      }),
    });

    assert.equal(res.status, 200);
    const booking = await res.json();
    assert.equal(booking.status, 'AccessReleased');
  });

  it('12. Consumer can now view unmasked access credentials (AC-13)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/bookings/${createdBookingId}`, {
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 200);
    const booking = await res.json();
    assert.ok(booking.accessDetails?.includes('ssh h100-node04'), 'Consumer must receive cleartext credentials');
  });

  it('13. Consumer marks booking completed, releasing escrow payout (AC-14)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/bookings/${createdBookingId}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });

    assert.equal(res.status, 200);
    const booking = await res.json();
    assert.equal(booking.status, 'Completed');
  });

  it('14. Consumer submits 5-star review updating listing aggregate rating (AC-15)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/bookings/${createdBookingId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        rating: 5,
        comment: 'Phenomenal GPU performance, sustained 98% utilization with zero thermal throttling.',
      }),
    });

    assert.equal(res.status, 201);
    const review = await res.json();
    assert.equal(review.rating, 5);

    // Verify listing aggregate rating updated
    const listingRes = await fetch(`${baseUrl}/marketplace/listings/${createdListingId}`, {
      headers: {
        Authorization: `Bearer ${researcherToken}`,
      },
    });
    const listingData = await listingRes.json();
    assert.equal(listingData.ownerRating, 5.0);
    assert.equal(listingData.reviewCount, 1);
  });

  it('15. Dispute workflow: raise dispute on an escrow-held booking (AC-16)', async () => {
    // Create second slot & booking for dispute test
    const slotRes = await fetch(`${baseUrl}/marketplace/listings/${createdListingId}/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        startTime: new Date(Date.now() + 3600 * 1000 * 48).toISOString(),
        endTime: new Date(Date.now() + 3600 * 1000 * 52).toISOString(),
      }),
    });
    const slots = await slotRes.json();

    const bookRes = await fetch(`${baseUrl}/marketplace/listings/${createdListingId}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        slotId: slots[0].id,
      }),
    });
    const bookData = await bookRes.json();
    createdDisputeBookingId = bookData.id;

    // Accept & Pay Escrow
    await fetch(`${baseUrl}/marketplace/bookings/${createdDisputeBookingId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    await fetch(`${baseUrl}/marketplace/bookings/${createdDisputeBookingId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({ testScenario: 'success' }),
    });

    // File dispute
    const disputeRes = await fetch(`${baseUrl}/marketplace/bookings/${createdDisputeBookingId}/dispute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${researcherToken}`,
      },
      body: JSON.stringify({
        reason: 'Host node suffered hardware failure and was inaccessible for entire window.',
      }),
    });

    assert.equal(disputeRes.status, 201);
    const dispute = await disputeRes.json();
    assert.equal(dispute.status, 'Open');
    createdDisputeId = dispute.id;
  });

  it('16. Admin arbitrates dispute with full refund to buyer (AC-17)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/admin/disputes/${createdDisputeId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'RefundRequester',
        resolutionNote: 'Confirmed hardware network partition during reservation window. Full refund authorized.',
      }),
    });

    assert.equal(res.status, 200);
    const dispute = await res.json();
    assert.equal(dispute.status, 'Resolved');
    assert.equal(dispute.resolutionAction, 'RefundRequester');
    assert.ok(dispute.resolutionNote.includes('Full refund authorized'));
  });

  it('17. User cannot approve another provider listing booking (Wrong Owner Guard)', async () => {
    const res = await fetch(`${baseUrl}/marketplace/bookings/${createdBookingId}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${otherResearcherToken}`,
      },
    });

    assert.equal(res.status, 403, 'Wrong user cannot accept bookings');
  });
});
