import { supabaseAdmin } from '../supabase.js';
import {
  Booking,
  BookingWithDetails,
  RequestBookingDTO,
  PayBookingDTO,
  ReleaseAccessDTO,
  Transaction,
  TransactionWithBooking,
  Dispute,
  ResolveDisputeDTO,
  MarketplaceLedgerStats,
  UserRole,
} from '@researchos/shared-types';
import { NotificationService } from './notification.service.js';

export class EscrowService {
  /**
   * Request a booking on a listing (Hardware slot or Dataset instant access)
   */
  static async requestBooking(
    requesterId: string,
    requesterRole: UserRole,
    listingId: string,
    dto: RequestBookingDTO
  ): Promise<Booking> {
    // Admin conflict of interest check (Spec 07 §252, §272)
    if (requesterRole === 'Admin') {
      throw new Error('Administrators cannot book marketplace resources (conflict of interest)');
    }

    // 1. Fetch listing details
    const { data: listing, error: listErr } = await supabaseAdmin
      .from('listings')
      .select('*, availability_slots(*)')
      .eq('id', listingId)
      .single();

    if (listErr || !listing) {
      throw new Error('Listing not found');
    }

    if (listing.approval_status !== 'Approved' || listing.is_delisted) {
      throw new Error('Listing is not currently available for booking');
    }

    if (listing.owner_id === requesterId) {
      throw new Error('You cannot book your own listing');
    }

    let calculatedPrice = 0.0;
    let slotRecord: any = null;

    // 2. Hardware vs Dataset validation
    if (listing.type === 'Hardware') {
      if (!dto.slotId) {
        throw new Error('Please select an availability time slot for hardware compute bookings');
      }

      // Check slot availability and lock
      const { data: slot, error: slotErr } = await supabaseAdmin
        .from('availability_slots')
        .select('*')
        .eq('id', dto.slotId)
        .eq('listing_id', listingId)
        .single();

      if (slotErr || !slot) {
        throw new Error('Selected availability slot not found');
      }

      if (slot.is_booked) {
        throw new Error('This time slot is already booked by another researcher');
      }

      slotRecord = slot;

      if (!listing.is_free && !listing.free_for_institution_students) {
        // Compute duration in hours
        const start = new Date(slot.start_time).getTime();
        const end = new Date(slot.end_time).getTime();
        const hours = Math.max(1, Math.round((end - start) / (1000 * 60 * 60)));

        if (listing.hourly_price) {
          calculatedPrice = Number(listing.hourly_price) * hours;
        } else if (listing.daily_price) {
          calculatedPrice = Number(listing.daily_price) * Math.max(1, Math.ceil(hours / 24));
        }
      }
    } else if (listing.type === 'Dataset') {
      if (!listing.is_free && !listing.free_for_institution_students) {
        calculatedPrice = Number(listing.online_price || 0);
      }
    }

    // 3. Atomically lock slot if Hardware
    if (slotRecord) {
      const { error: lockErr } = await supabaseAdmin
        .from('availability_slots')
        .update({ is_booked: true })
        .eq('id', slotRecord.id)
        .eq('is_booked', false);

      if (lockErr) {
        throw new Error('Failed to reserve slot — another booking was confirmed concurrently');
      }
    }

    // 4. Create Booking record
    const { data: booking, error: bookErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        listing_id: listingId,
        requester_id: requesterId,
        slot_id: dto.slotId || null,
        status: 'Requested',
        total_price: calculatedPrice,
        requester_notes: dto.requesterNotes?.trim() || null,
      })
      .select()
      .single();

    if (bookErr) {
      // Rollback slot if failed
      if (slotRecord) {
        await supabaseAdmin.from('availability_slots').update({ is_booked: false }).eq('id', slotRecord.id);
      }
      throw new Error(`Failed to create booking: ${bookErr.message}`);
    }

    // Notify provider
    await NotificationService.createNotification({
      userId: listing.owner_id,
      type: 'BookingRequest',
      payload: {
        title: 'New Resource Booking Request',
        body: `A researcher requested to book "${listing.title}".`,
        linkUrl: `/marketplace/manage`,
      },
    }).catch(() => null);

    return {
      id: booking.id,
      listingId: booking.listing_id,
      requesterId: booking.requester_id,
      slotId: booking.slot_id,
      status: booking.status,
      totalPrice: Number(booking.total_price),
      accessDetails: null, // Always masked initially
      requesterNotes: booking.requester_notes,
      rejectionReason: booking.rejection_reason,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    };
  }

  /**
   * Provider accepts a booking request
   */
  static async acceptBooking(bookingId: string, providerId: string): Promise<Booking> {
    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('*, listing:listings!bookings_listing_id_fkey(id, owner_id, title)')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.listing?.owner_id !== providerId) {
      throw new Error('Only the listing provider can accept this booking');
    }

    if (booking.status !== 'Requested') {
      throw new Error(`Cannot accept booking in current status: ${booking.status}`);
    }

    // If free booking ($0.00), auto-transition to PaymentEscrowed (or AccessReleased if instant)
    let nextStatus: any = 'Accepted';
    if (Number(booking.total_price) === 0) {
      nextStatus = 'PaymentEscrowed';
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status: nextStatus })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to accept booking: ${error.message}`);
    }

    // Notify requester
    await NotificationService.createNotification({
      userId: booking.requester_id,
      type: 'BookingAccepted',
      payload: {
        title: 'Booking Request Accepted',
        body: `Your request for "${booking.listing?.title}" was accepted. ${
          nextStatus === 'Accepted' ? 'Please complete payment to secure access.' : 'Access will be released shortly.'
        }`,
        linkUrl: `/marketplace/manage`,
      },
    }).catch(() => null);

    return {
      id: data.id,
      listingId: data.listing_id,
      requesterId: data.requester_id,
      slotId: data.slot_id,
      status: data.status,
      totalPrice: Number(data.total_price),
      accessDetails: null,
      requesterNotes: data.requester_notes,
      rejectionReason: data.rejection_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Provider rejects a booking request
   */
  static async rejectBooking(bookingId: string, providerId: string, reason?: string): Promise<Booking> {
    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('*, listing:listings!bookings_listing_id_fkey(id, owner_id, title)')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.listing?.owner_id !== providerId) {
      throw new Error('Only the listing provider can reject this booking');
    }

    if (booking.status !== 'Requested') {
      throw new Error(`Cannot reject booking in current status: ${booking.status}`);
    }

    // Release slot if booked
    if (booking.slot_id) {
      await supabaseAdmin.from('availability_slots').update({ is_booked: false }).eq('id', booking.slot_id);
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'Rejected',
        rejection_reason: reason?.trim() || 'Provider is unavailable during this time window',
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to reject booking: ${error.message}`);
    }

    // Notify requester
    await NotificationService.createNotification({
      userId: booking.requester_id,
      type: 'BookingRejected',
      payload: {
        title: 'Booking Request Rejected',
        body: `Your request for "${booking.listing?.title}" was declined.`,
        linkUrl: `/marketplace/manage`,
      },
    }).catch(() => null);

    return {
      id: data.id,
      listingId: data.listing_id,
      requesterId: data.requester_id,
      slotId: data.slot_id,
      status: data.status,
      totalPrice: Number(data.total_price),
      accessDetails: null,
      requesterNotes: data.requester_notes,
      rejectionReason: data.rejection_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Requester cancels a booking (only before payment escrow)
   */
  static async cancelBooking(bookingId: string, requesterId: string): Promise<Booking> {
    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.requester_id !== requesterId) {
      throw new Error('Only the requester can cancel this booking');
    }

    if (!['Requested', 'Accepted'].includes(booking.status)) {
      throw new Error('Cannot cancel a booking after payment has been escrowed (open a dispute instead)');
    }

    // Release slot
    if (booking.slot_id) {
      await supabaseAdmin.from('availability_slots').update({ is_booked: false }).eq('id', booking.slot_id);
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'Cancelled' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel booking: ${error.message}`);
    }

    return {
      id: data.id,
      listingId: data.listing_id,
      requesterId: data.requester_id,
      slotId: data.slot_id,
      status: data.status,
      totalPrice: Number(data.total_price),
      accessDetails: null,
      requesterNotes: data.requester_notes,
      rejectionReason: data.rejection_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Process sandbox payment for an accepted booking -> moves to PaymentEscrowed
   */
  static async payBookingSandbox(
    bookingId: string,
    requesterId: string,
    dto: PayBookingDTO
  ): Promise<{ booking: Booking; transaction: Transaction }> {
    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('*, listing:listings!bookings_listing_id_fkey(id, owner_id, title)')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.requester_id !== requesterId) {
      throw new Error('Only the booking requester can pay for this booking');
    }

    if (booking.status !== 'Accepted') {
      throw new Error(`Cannot process payment for booking in status: ${booking.status}`);
    }

    const testScenario = dto.testScenario || 'success';
    if (testScenario === 'decline') {
      throw new Error('Sandbox Card Declined: Your bank declined the transaction.');
    }
    if (testScenario === 'insufficient_funds') {
      throw new Error('Sandbox Payment Error: Insufficient funds in account.');
    }

    const totalAmount = Number(booking.total_price);
    const platformCommissionRate = 0.1; // 10% platform commission
    const commission = Number((totalAmount * platformCommissionRate).toFixed(2));
    const gatewayRef = `sbx_tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Create Transaction record in 'Held' escrow status
    const { data: transaction, error: txErr } = await supabaseAdmin
      .from('transactions')
      .insert({
        booking_id: bookingId,
        amount: totalAmount,
        commission_amount: commission,
        gateway_ref: gatewayRef,
        status: 'Held',
      })
      .select()
      .single();

    if (txErr) {
      throw new Error(`Failed to create transaction record: ${txErr.message}`);
    }

    // 2. Transition Booking status to PaymentEscrowed
    const { data: updatedBooking, error: updateErr } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'PaymentEscrowed' })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) {
      throw new Error(`Failed to transition booking to escrow: ${updateErr.message}`);
    }

    // 3. Notify provider to release access details
    await NotificationService.createNotification({
      userId: booking.listing?.owner_id,
      type: 'PaymentEscrowed',
      payload: {
        title: 'Payment Escrowed — Ready to Release Access',
        body: `Payment for "${booking.listing?.title}" ($${totalAmount.toFixed(2)}) is securely held in escrow. Please release access details to the requester.`,
        linkUrl: `/marketplace/manage`,
      },
    }).catch(() => null);

    return {
      booking: {
        id: updatedBooking.id,
        listingId: updatedBooking.listing_id,
        requesterId: updatedBooking.requester_id,
        slotId: updatedBooking.slot_id,
        status: updatedBooking.status,
        totalPrice: Number(updatedBooking.total_price),
        accessDetails: null, // Still masked until access release
        requesterNotes: updatedBooking.requester_notes,
        rejectionReason: updatedBooking.rejection_reason,
        createdAt: updatedBooking.created_at,
        updatedAt: updatedBooking.updated_at,
      },
      transaction: {
        id: transaction.id,
        bookingId: transaction.booking_id,
        amount: Number(transaction.amount),
        commissionAmount: Number(transaction.commission_amount),
        gatewayRef: transaction.gateway_ref,
        status: transaction.status,
        invoiceFileId: transaction.invoice_file_id,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at,
      },
    };
  }

  /**
   * Provider releases access details (SSH key, endpoint, download URL) -> moves to AccessReleased
   */
  static async releaseAccess(
    bookingId: string,
    actorId: string,
    dto: ReleaseAccessDTO
  ): Promise<Booking> {
    if (!dto.accessDetails || dto.accessDetails.trim().length === 0) {
      throw new Error('Access details and connection instructions are required');
    }

    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('*, listing:listings!bookings_listing_id_fkey(id, owner_id, title)')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.listing?.owner_id !== actorId) {
      throw new Error('Only the listing provider can release access credentials');
    }

    if (booking.status !== 'PaymentEscrowed') {
      throw new Error('Access credentials can only be released after payment is held in escrow');
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'AccessReleased',
        access_details: dto.accessDetails.trim(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to release access: ${error.message}`);
    }

    // Notify requester
    await NotificationService.createNotification({
      userId: booking.requester_id,
      type: 'AccessReleased',
      payload: {
        title: 'Compute Access Details Released!',
        body: `Your access details for "${booking.listing?.title}" are now available in your marketplace dashboard.`,
        linkUrl: `/marketplace/manage`,
      },
    }).catch(() => null);

    return {
      id: data.id,
      listingId: data.listing_id,
      requesterId: data.requester_id,
      slotId: data.slot_id,
      status: data.status,
      totalPrice: Number(data.total_price),
      accessDetails: data.access_details, // Now revealed
      requesterNotes: data.requester_notes,
      rejectionReason: data.rejection_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Complete booking -> transitions funds from Held to Released
   */
  static async completeBooking(bookingId: string, actorId: string): Promise<Booking> {
    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('*, listing:listings!bookings_listing_id_fkey(id, owner_id, title)')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) {
      throw new Error('Booking not found');
    }

    const isRequester = booking.requester_id === actorId;
    const isProvider = booking.listing?.owner_id === actorId;

    if (!isRequester && !isProvider) {
      throw new Error('Only booking participants can complete this booking');
    }

    if (booking.status !== 'AccessReleased') {
      throw new Error(`Cannot complete booking from status: ${booking.status}`);
    }

    // 1. Release escrow funds
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'Released' })
      .eq('booking_id', bookingId)
      .eq('status', 'Held');

    // 2. Update booking status
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'Completed' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to complete booking: ${error.message}`);
    }

    // Notify both parties
    await NotificationService.createNotification({
      userId: booking.listing?.owner_id,
      type: 'BookingCompleted',
      payload: {
        title: 'Booking Completed & Funds Released',
        body: `Booking for "${booking.listing?.title}" is completed. Escrow funds have been released to your balance.`,
        linkUrl: `/marketplace/manage`,
      },
    }).catch(() => null);

    return {
      id: data.id,
      listingId: data.listing_id,
      requesterId: data.requester_id,
      slotId: data.slot_id,
      status: data.status,
      totalPrice: Number(data.total_price),
      accessDetails: data.access_details,
      requesterNotes: data.requester_notes,
      rejectionReason: data.rejection_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Open a dispute on an active/escrowed booking
   */
  static async openDispute(bookingId: string, raisedBy: string, reason: string): Promise<Dispute> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Dispute reason is required');
    }

    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('*, listing:listings!bookings_listing_id_fkey(id, owner_id, title)')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) {
      throw new Error('Booking not found');
    }

    const isRequester = booking.requester_id === raisedBy;
    const isProvider = booking.listing?.owner_id === raisedBy;

    if (!isRequester && !isProvider) {
      throw new Error('Only the requester or provider can open a dispute');
    }

    if (!['PaymentEscrowed', 'AccessReleased', 'Completed'].includes(booking.status)) {
      throw new Error('Disputes can only be opened for escrowed or active bookings');
    }

    // 1. Create dispute
    const { data: dispute, error: dErr } = await supabaseAdmin
      .from('disputes')
      .insert({
        booking_id: bookingId,
        raised_by: raisedBy,
        reason: reason.trim(),
        status: 'Open',
      })
      .select(
        `
        *,
        raiser:profiles!disputes_raised_by_fkey(id, full_name)
      `
      )
      .single();

    if (dErr) {
      throw new Error(`Failed to open dispute: ${dErr.message}`);
    }

    // 2. Mark booking as Disputed
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'Disputed' })
      .eq('id', bookingId);

    // Notify other participant
    const recipientId = isRequester ? booking.listing?.owner_id : booking.requester_id;
    await NotificationService.createNotification({
      userId: recipientId,
      type: 'DisputeRaised',
      payload: {
        title: 'Marketplace Dispute Opened',
        body: `A dispute has been raised regarding booking "${booking.listing?.title}". An administrator will arbitrate.`,
        linkUrl: `/marketplace/manage`,
      },
    }).catch(() => null);

    return {
      id: dispute.id,
      bookingId: dispute.booking_id,
      raisedBy: dispute.raised_by,
      raisedByName: dispute.raiser?.full_name || 'Participant',
      reason: dispute.reason,
      status: dispute.status,
      resolvedBy: dispute.resolved_by,
      resolutionNote: dispute.resolution_note,
      resolutionAction: dispute.resolution_action,
      createdAt: dispute.created_at,
      updatedAt: dispute.updated_at,
    };
  }

  /**
   * Admin resolves a dispute (Refund / Release / Dismiss)
   */
  static async resolveDispute(
    disputeId: string,
    adminId: string,
    dto: ResolveDisputeDTO
  ): Promise<Dispute> {
    const { data: dispute, error: dErr } = await supabaseAdmin
      .from('disputes')
      .select('*, booking:bookings!disputes_booking_id_fkey(*, listing:listings!bookings_listing_id_fkey(id, owner_id, title))')
      .eq('id', disputeId)
      .single();

    if (dErr || !dispute) {
      throw new Error('Dispute not found');
    }

    if (dispute.status === 'Resolved' || dispute.status === 'Rejected') {
      throw new Error('This dispute has already been finalized');
    }

    const booking = dispute.booking;
    if (!booking) {
      throw new Error('Associated booking record not found');
    }

    let nextBookingStatus = booking.status;
    let nextTxStatus: any = null;

    if (dto.action === 'RefundRequester') {
      nextBookingStatus = 'Cancelled';
      nextTxStatus = 'Refunded';
    } else if (dto.action === 'ReleaseToProvider') {
      nextBookingStatus = 'Completed';
      nextTxStatus = 'Released';
    } else if (dto.action === 'DismissDispute') {
      nextBookingStatus = booking.access_details ? 'AccessReleased' : 'PaymentEscrowed';
    }

    // 1. Update transaction if funds need refunding/releasing
    if (nextTxStatus) {
      await supabaseAdmin
        .from('transactions')
        .update({ status: nextTxStatus })
        .eq('booking_id', booking.id);
    }

    // 2. Update booking status
    await supabaseAdmin
      .from('bookings')
      .update({ status: nextBookingStatus })
      .eq('id', booking.id);

    // 3. Finalize dispute
    const { data: updatedDispute, error: resErr } = await supabaseAdmin
      .from('disputes')
      .update({
        status: dto.action === 'DismissDispute' ? 'Rejected' : 'Resolved',
        resolved_by: adminId,
        resolution_note: dto.resolutionNote?.trim() || 'Resolved by administrative review',
        resolution_action: dto.action,
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (resErr) {
      throw new Error(`Failed to resolve dispute: ${resErr.message}`);
    }

    // Notify both parties
    await Promise.all([
      NotificationService.createNotification({
        userId: booking.requester_id,
        type: 'DisputeResolved',
        payload: {
          title: 'Dispute Resolution Notice',
          body: `Admin resolved dispute for "${booking.listing?.title}": ${dto.action}.`,
          linkUrl: `/marketplace/manage`,
        },
      }).catch(() => null),
      NotificationService.createNotification({
        userId: booking.listing?.owner_id,
        type: 'DisputeResolved',
        payload: {
          title: 'Dispute Resolution Notice',
          body: `Admin resolved dispute for "${booking.listing?.title}": ${dto.action}.`,
          linkUrl: `/marketplace/manage`,
        },
      }).catch(() => null),
    ]);

    return {
      id: updatedDispute.id,
      bookingId: updatedDispute.booking_id,
      raisedBy: updatedDispute.raised_by,
      reason: updatedDispute.reason,
      status: updatedDispute.status,
      resolvedBy: updatedDispute.resolved_by,
      resolutionNote: updatedDispute.resolution_note,
      resolutionAction: updatedDispute.resolution_action,
      createdAt: updatedDispute.created_at,
      updatedAt: updatedDispute.updated_at,
    };
  }

  /**
   * Get all bookings for a user (categorized by rentals vs client requests)
   */
  static async getMyBookings(userId: string): Promise<{
    asRequester: BookingWithDetails[];
    asProvider: BookingWithDetails[];
  }> {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(
        `
        *,
        listing:listings!bookings_listing_id_fkey(
          *,
          owner:profiles!listings_owner_id_fkey(id, full_name, photo_url, institution)
        ),
        requester:profiles!bookings_requester_id_fkey(id, full_name, photo_url, institution),
        slot:availability_slots!bookings_slot_id_fkey(*),
        transactions(*),
        listing_reviews(*),
        disputes(*)
      `
      )
      .or(`requester_id.eq.${userId},listing.owner_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch bookings: ${error.message}`);
    }

    const asRequester: BookingWithDetails[] = [];
    const asProvider: BookingWithDetails[] = [];

    for (const row of data || []) {
      const isRequester = row.requester_id === userId;
      const isProvider = row.listing?.owner_id === userId;

      // Sensitive access details masking (Spec 07 §266):
      // Only reveal accessDetails if requester AND status IN ('AccessReleased', 'Completed') OR provider
      const shouldRevealAccess =
        isProvider || (isRequester && ['AccessReleased', 'Completed'].includes(row.status));

      const sanitizedAccess = shouldRevealAccess ? row.access_details : null;

      const tx = row.transactions && row.transactions.length > 0 ? row.transactions[0] : null;
      const review = row.listing_reviews && row.listing_reviews.length > 0 ? row.listing_reviews[0] : null;
      const dispute = row.disputes && row.disputes.length > 0 ? row.disputes[0] : null;

      const formatted: BookingWithDetails = {
        id: row.id,
        listingId: row.listing_id,
        requesterId: row.requester_id,
        slotId: row.slot_id,
        status: row.status,
        totalPrice: Number(row.total_price),
        accessDetails: sanitizedAccess,
        requesterNotes: row.requester_notes,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        listing: {
          id: row.listing.id,
          ownerId: row.listing.owner_id,
          type: row.listing.type,
          title: row.listing.title,
          description: row.listing.description,
          gpuCpuModel: row.listing.gpu_cpu_model,
          vram: row.listing.vram,
          ram: row.listing.ram,
          storage: row.listing.storage,
          os: row.listing.os,
          location: row.listing.location,
          accessMethod: row.listing.access_method,
          hourlyPrice: row.listing.hourly_price ? Number(row.listing.hourly_price) : null,
          dailyPrice: row.listing.daily_price ? Number(row.listing.daily_price) : null,
          domain: row.listing.domain,
          sizeBytes: row.listing.size_bytes ? Number(row.listing.size_bytes) : null,
          format: row.listing.format,
          license: row.listing.license,
          samplePreviewFileId: row.listing.sample_preview_file_id,
          datasetFileId: row.listing.dataset_file_id,
          onlinePrice: row.listing.online_price ? Number(row.listing.online_price) : null,
          isFree: row.listing.is_free,
          isInstitutional: row.listing.is_institutional,
          freeForInstitutionStudents: row.listing.free_for_institution_students,
          institutionName: row.listing.institution_name,
          approvalStatus: row.listing.approval_status,
          rejectionReason: row.listing.rejection_reason,
          isDelisted: row.listing.is_delisted,
          createdAt: row.listing.created_at,
          updatedAt: row.listing.updated_at,
        },
        requester: row.requester
          ? {
              id: row.requester.id,
              fullName: row.requester.full_name || 'Researcher',
              avatarUrl: row.requester.photo_url || null,
              institution: row.requester.institution || null,
            }
          : undefined,
        slot: row.slot
          ? {
              id: row.slot.id,
              listingId: row.slot.listing_id,
              startTime: row.slot.start_time,
              endTime: row.slot.end_time,
              isBooked: row.slot.is_booked,
              createdAt: row.slot.created_at,
            }
          : null,
        transaction: tx
          ? {
              id: tx.id,
              bookingId: tx.booking_id,
              amount: Number(tx.amount),
              commissionAmount: Number(tx.commission_amount),
              gatewayRef: tx.gateway_ref,
              status: tx.status,
              invoiceFileId: tx.invoice_file_id,
              createdAt: tx.created_at,
              updatedAt: tx.updated_at,
            }
          : null,
        review: review
          ? {
              id: review.id,
              bookingId: review.booking_id,
              listingId: review.listing_id,
              raterId: review.rater_id,
              rating: review.rating,
              comment: review.comment,
              createdAt: review.created_at,
            }
          : null,
        dispute: dispute
          ? {
              id: dispute.id,
              bookingId: dispute.booking_id,
              raisedBy: dispute.raised_by,
              reason: dispute.reason,
              status: dispute.status,
              resolvedBy: dispute.resolved_by,
              resolutionNote: dispute.resolution_note,
              resolutionAction: dispute.resolution_action,
              createdAt: dispute.created_at,
              updatedAt: dispute.updated_at,
            }
          : null,
      };

      if (isRequester) asRequester.push(formatted);
      if (isProvider) asProvider.push(formatted);
    }

    return { asRequester, asProvider };
  }

  /**
   * Get single booking by ID with role-based access details masking
   */
  static async getBookingById(bookingId: string, currentUserId: string, isAdmin = false): Promise<BookingWithDetails> {
    const { data: row, error } = await supabaseAdmin
      .from('bookings')
      .select(
        `
        *,
        listing:listings!bookings_listing_id_fkey(
          *,
          owner:profiles!listings_owner_id_fkey(id, full_name, photo_url, institution)
        ),
        requester:profiles!bookings_requester_id_fkey(id, full_name, photo_url, institution),
        slot:availability_slots!bookings_slot_id_fkey(*),
        transactions(*),
        listing_reviews(*),
        disputes(*)
      `
      )
      .eq('id', bookingId)
      .single();

    if (error || !row) {
      throw new Error(`Booking not found: ${error?.message || 'Not found'}`);
    }

    const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
    const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester;
    const slot = Array.isArray(row.slot) ? row.slot[0] : row.slot;

    const isRequester = row.requester_id === currentUserId;
    const isProvider = listing?.owner_id === currentUserId;

    if (!isRequester && !isProvider && !isAdmin) {
      throw new Error('You do not have permission to view this booking');
    }

    // Sensitive access details masking (Spec 07 §266):
    // Only reveal accessDetails if provider, admin, or requester in ('AccessReleased', 'Completed')
    const shouldRevealAccess =
      isProvider || isAdmin || (isRequester && ['AccessReleased', 'Completed'].includes(row.status));

    const sanitizedAccess = shouldRevealAccess ? row.access_details : null;
    const tx = row.transactions && row.transactions.length > 0 ? row.transactions[0] : null;
    const review = row.listing_reviews && row.listing_reviews.length > 0 ? row.listing_reviews[0] : null;
    const dispute = row.disputes && row.disputes.length > 0 ? row.disputes[0] : null;

    return {
      id: row.id,
      listingId: row.listing_id,
      requesterId: row.requester_id,
      slotId: row.slot_id,
      status: row.status,
      totalPrice: Number(row.total_price),
      accessDetails: sanitizedAccess,
      requesterNotes: row.requester_notes,
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      listing: listing
        ? {
            id: listing.id,
            ownerId: listing.owner_id,
            type: listing.type,
            title: listing.title,
            description: listing.description,
            gpuCpuModel: listing.gpu_cpu_model,
            vram: listing.vram,
            ram: listing.ram,
            storage: listing.storage,
            os: listing.os,
            location: listing.location,
            accessMethod: listing.access_method,
            hourlyPrice: listing.hourly_price ? Number(listing.hourly_price) : null,
            dailyPrice: listing.daily_price ? Number(listing.daily_price) : null,
            domain: listing.domain,
            sizeBytes: listing.size_bytes ? Number(listing.size_bytes) : null,
            format: listing.format,
            license: listing.license,
            samplePreviewFileId: listing.sample_preview_file_id,
            datasetFileId: listing.dataset_file_id,
            onlinePrice: listing.online_price ? Number(listing.online_price) : null,
            isFree: listing.is_free,
            isInstitutional: listing.is_institutional,
            freeForInstitutionStudents: listing.free_for_institution_students,
            institutionName: listing.institution_name,
            approvalStatus: listing.approval_status,
            rejectionReason: listing.rejection_reason,
            isDelisted: listing.is_delisted,
            createdAt: listing.created_at,
            updatedAt: listing.updated_at,
          }
        : ({} as any),
      requester: requester
        ? {
            id: requester.id,
            fullName: requester.full_name,
            avatarUrl: requester.photo_url || null,
            institution: requester.institution || null,
          }
        : undefined,
      slot: slot
        ? {
            id: slot.id,
            listingId: slot.listing_id,
            startTime: slot.start_time,
            endTime: slot.end_time,
            isBooked: slot.is_booked,
            createdAt: slot.created_at,
          }
        : null,
      transaction: tx
        ? {
            id: tx.id,
            bookingId: tx.booking_id,
            amount: Number(tx.amount),
            commissionAmount: Number(tx.commission_amount),
            gatewayRef: tx.gateway_ref,
            status: tx.status,
            invoiceFileId: tx.invoice_file_id,
            createdAt: tx.created_at,
            updatedAt: tx.updated_at,
          }
        : null,
      review: review
        ? {
            id: review.id,
            bookingId: review.booking_id,
            listingId: review.listing_id,
            raterId: review.rater_id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.created_at,
          }
        : null,
      dispute: dispute
        ? {
            id: dispute.id,
            bookingId: dispute.booking_id,
            raisedBy: dispute.raised_by,
            reason: dispute.reason,
            status: dispute.status,
            resolvedBy: dispute.resolved_by,
            resolutionNote: dispute.resolution_note,
            resolutionAction: dispute.resolution_action,
            createdAt: dispute.created_at,
            updatedAt: dispute.updated_at,
          }
        : null,
    };
  }

  /**
   * Get transaction history (parties view own; Admin views all)
   */
  static async getTransactions(
    userId: string,
    isAdmin = false
  ): Promise<TransactionWithBooking[]> {
    let query = supabaseAdmin.from('transactions').select(`
        *,
        booking:bookings!transactions_booking_id_fkey(
          id,
          requester_id,
          listing:listings!bookings_listing_id_fkey(
            id,
            title,
            type,
            owner_id,
            owner:profiles!listings_owner_id_fkey(full_name)
          ),
          requester:profiles!bookings_requester_id_fkey(full_name)
        )
      `);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    const filtered = (data || []).filter((tx: any) => {
      if (isAdmin) return true;
      const reqId = tx.booking?.requester_id;
      const provId = tx.booking?.listing?.owner_id;
      return reqId === userId || provId === userId;
    });

    return filtered.map((tx: any) => ({
      id: tx.id,
      bookingId: tx.booking_id,
      amount: Number(tx.amount),
      commissionAmount: Number(tx.commission_amount),
      gatewayRef: tx.gateway_ref,
      status: tx.status,
      invoiceFileId: tx.invoice_file_id,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
      bookingTitle: tx.booking?.listing?.title || 'Resource Booking',
      listingType: tx.booking?.listing?.type || 'Hardware',
      requesterName: tx.booking?.requester?.full_name || 'Requester',
      providerName: tx.booking?.listing?.owner?.full_name || 'Provider',
    }));
  }

  /**
   * Admin Platform Financial & Governance Ledger Stats
   */
  static async getAdminLedger(): Promise<{
    stats: MarketplaceLedgerStats;
    transactions: TransactionWithBooking[];
    disputes: Dispute[];
  }> {
    const transactions = await this.getTransactions('', true);

    const totalGross = transactions.reduce((sum, tx) => sum + (tx.status !== 'Failed' ? tx.amount : 0), 0);
    const totalNet = transactions.reduce((sum, tx) => sum + (tx.status === 'Released' ? tx.amount - tx.commissionAmount : 0), 0);
    const totalCommission = transactions.reduce((sum, tx) => sum + (tx.status === 'Released' ? tx.commissionAmount : 0), 0);
    const totalEscrow = transactions.reduce((sum, tx) => sum + (tx.status === 'Held' ? tx.amount : 0), 0);
    const totalRefunded = transactions.reduce((sum, tx) => sum + (tx.status === 'Refunded' ? tx.amount : 0), 0);

    const [{ count: activeListings }, { count: pendingListings }, { data: openDisputes }] = await Promise.all([
      supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('approval_status', 'Approved').eq('is_delisted', false),
      supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('approval_status', 'Pending'),
      supabaseAdmin.from('disputes').select(`*, raiser:profiles!disputes_raised_by_fkey(id, full_name)`).eq('status', 'Open').order('created_at', { ascending: false }),
    ]);

    const disputes: Dispute[] = (openDisputes || []).map((d: any) => ({
      id: d.id,
      bookingId: d.booking_id,
      raisedBy: d.raised_by,
      raisedByName: d.raiser?.full_name || 'Participant',
      reason: d.reason,
      status: d.status,
      resolvedBy: d.resolved_by,
      resolutionNote: d.resolution_note,
      resolutionAction: d.resolution_action,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    return {
      stats: {
        totalGrossVolume: Number(totalGross.toFixed(2)),
        totalNetRevenue: Number(totalNet.toFixed(2)),
        totalPlatformCommission: Number(totalCommission.toFixed(2)),
        totalEscrowHeld: Number(totalEscrow.toFixed(2)),
        totalRefunded: Number(totalRefunded.toFixed(2)),
        activeListingsCount: activeListings || 0,
        pendingListingsCount: pendingListings || 0,
        openDisputesCount: disputes.length,
      },
      transactions,
      disputes,
    };
  }
}
