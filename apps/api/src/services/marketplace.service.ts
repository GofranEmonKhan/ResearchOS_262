import { supabaseAdmin } from '../supabase.js';
import {
  Listing,
  ListingWithStats,
  CreateListingDTO,
  UpdateListingDTO,
  AvailabilitySlot,
  CreateSlotDTO,
  ListingReview,
  CreateListingReviewDTO,
  ListingInquiry,
  MarketplaceFilterParams,
  UserRole,
} from '@researchos/shared-types';
import { NotificationService } from './notification.service.js';

export class MarketplaceService {
  /**
   * Search and filter approved listings, plus user's own listings
   */
  static async searchListings(
    params: MarketplaceFilterParams,
    currentUserId?: string,
    isAdmin = false
  ): Promise<{ listings: ListingWithStats[]; total: number }> {
    const {
      type,
      search,
      minPrice,
      maxPrice,
      gpuModel,
      domain,
      isInstitutional,
      isFree,
      page = 1,
      limit = 20,
    } = params;

    let query = supabaseAdmin
      .from('listings')
      .select(
        `
        *,
        owner:profiles!listings_owner_id_fkey(
          id,
          full_name,
          photo_url,
          institution,
          role
        ),
        availability_slots(
          id,
          is_booked,
          start_time,
          end_time
        ),
        listing_reviews(
          id,
          rating
        )
      `,
        { count: 'exact' }
      );

    // Visibility filter: Public sees Approved + not delisted. Owner sees own. Admin sees all.
    if (!isAdmin) {
      if (currentUserId) {
        query = query.or(`and(approval_status.eq.Approved,is_delisted.eq.false),owner_id.eq.${currentUserId}`);
      } else {
        query = query.eq('approval_status', 'Approved').eq('is_delisted', false);
      }
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,gpu_cpu_model.ilike.%${search}%,domain.ilike.%${search}%`);
    }

    if (gpuModel) {
      query = query.ilike('gpu_cpu_model', `%${gpuModel}%`);
    }

    if (domain) {
      query = query.ilike('domain', `%${domain}%`);
    }

    if (isInstitutional !== undefined) {
      query = query.eq('is_institutional', isInstitutional);
    }

    if (isFree !== undefined) {
      query = query.eq('is_free', isFree);
    }

    if (minPrice !== undefined) {
      query = query.or(`hourly_price.gte.${minPrice},online_price.gte.${minPrice}`);
    }

    if (maxPrice !== undefined) {
      query = query.or(`hourly_price.lte.${maxPrice},online_price.lte.${maxPrice}`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Failed to search listings: ${error.message}`);
    }

    const listings: ListingWithStats[] = (data || []).map((row: any) => {
      const reviews = row.listing_reviews || [];
      const totalRatings = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
      const avgRating = reviews.length > 0 ? Number((totalRatings / reviews.length).toFixed(1)) : null;
      const availableSlots = (row.availability_slots || []).filter((s: any) => !s.is_booked).length;

      return {
        id: row.id,
        ownerId: row.owner_id,
        type: row.type,
        title: row.title,
        description: row.description,
        gpuCpuModel: row.gpu_cpu_model,
        vram: row.vram,
        ram: row.ram,
        storage: row.storage,
        os: row.os,
        location: row.location,
        accessMethod: row.access_method,
        hourlyPrice: row.hourly_price ? Number(row.hourly_price) : null,
        dailyPrice: row.daily_price ? Number(row.daily_price) : null,
        domain: row.domain,
        sizeBytes: row.size_bytes ? Number(row.size_bytes) : null,
        format: row.format,
        license: row.license,
        samplePreviewFileId: row.sample_preview_file_id,
        datasetFileId: row.dataset_file_id,
        onlinePrice: row.online_price ? Number(row.online_price) : null,
        isFree: row.is_free,
        isInstitutional: row.is_institutional,
        freeForInstitutionStudents: row.free_for_institution_students,
        institutionName: row.institution_name,
        approvalStatus: row.approval_status,
        rejectionReason: row.rejection_reason,
        isDelisted: row.is_delisted,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ownerName: row.owner?.full_name || 'Anonymous Provider',
        ownerAvatarUrl: row.owner?.photo_url || null,
        ownerAffiliation: row.owner?.institution || null,
        ownerRating: avgRating,
        reviewCount: reviews.length,
        availableSlotCount: availableSlots,
      };
    });

    return {
      listings,
      total: count || 0,
    };
  }

  /**
   * Get single listing by ID with full specifications, slots, reviews
   */
  static async getListingById(
    listingId: string,
    currentUserId?: string,
    isAdmin = false
  ): Promise<ListingWithStats & { slots: AvailabilitySlot[]; reviews: ListingReview[] }> {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select(
        `
        *,
        owner:profiles!listings_owner_id_fkey(
          id,
          full_name,
          photo_url,
          institution,
          role
        ),
        availability_slots(
          id,
          listing_id,
          start_time,
          end_time,
          is_booked,
          created_at
        ),
        listing_reviews(
          id,
          booking_id,
          listing_id,
          rater_id,
          rating,
          comment,
          created_at,
          rater:profiles!listing_reviews_rater_id_fkey(
            id,
            full_name,
            photo_url
          )
        )
      `
      )
      .eq('id', listingId)
      .single();

    if (error || !data) {
      throw new Error('Listing not found');
    }

    // Access check: If not approved or delisted, only owner or Admin can view
    const isOwner = currentUserId && data.owner_id === currentUserId;
    if (data.approval_status !== 'Approved' || data.is_delisted) {
      if (!isOwner && !isAdmin) {
        throw new Error('Listing is not available or pending administrative approval');
      }
    }

    const reviews = (data.listing_reviews || []).map((r: any) => ({
      id: r.id,
      bookingId: r.booking_id,
      listingId: r.listing_id,
      raterId: r.rater_id,
      raterName: r.rater?.full_name || 'Verified Researcher',
      raterAvatarUrl: r.rater?.photo_url || null,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    }));

    const totalRatings = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
    const avgRating = reviews.length > 0 ? Number((totalRatings / reviews.length).toFixed(1)) : null;

    const slots: AvailabilitySlot[] = (data.availability_slots || []).map((s: any) => ({
      id: s.id,
      listingId: s.listing_id,
      startTime: s.start_time,
      endTime: s.end_time,
      isBooked: s.is_booked,
      createdAt: s.created_at,
    }));

    const listing: ListingWithStats & { slots: AvailabilitySlot[]; reviews: ListingReview[] } = {
      id: data.id,
      ownerId: data.owner_id,
      type: data.type,
      title: data.title,
      description: data.description,
      gpuCpuModel: data.gpu_cpu_model,
      vram: data.vram,
      ram: data.ram,
      storage: data.storage,
      os: data.os,
      location: data.location,
      accessMethod: data.access_method,
      hourlyPrice: data.hourly_price ? Number(data.hourly_price) : null,
      dailyPrice: data.daily_price ? Number(data.daily_price) : null,
      domain: data.domain,
      sizeBytes: data.size_bytes ? Number(data.size_bytes) : null,
      format: data.format,
      license: data.license,
      samplePreviewFileId: data.sample_preview_file_id,
      datasetFileId: data.dataset_file_id,
      onlinePrice: data.online_price ? Number(data.online_price) : null,
      isFree: data.is_free,
      isInstitutional: data.is_institutional,
      freeForInstitutionStudents: data.free_for_institution_students,
      institutionName: data.institution_name,
      approvalStatus: data.approval_status,
      rejectionReason: data.rejection_reason,
      isDelisted: data.is_delisted,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      ownerName: data.owner?.full_name || 'Anonymous Provider',
      ownerAvatarUrl: data.owner?.photo_url || null,
      ownerAffiliation: data.owner?.institution || null,
      ownerRating: avgRating,
      reviewCount: reviews.length,
      availableSlotCount: slots.filter((s) => !s.isBooked).length,
      slots,
      reviews,
    };

    return listing;
  }

  /**
   * Create a new listing (starts in 'Pending' approval status)
   */
  static async createListing(
    ownerId: string,
    userRole: UserRole,
    dto: CreateListingDTO
  ): Promise<Listing> {
    // Admin conflict of interest check (Spec 07 §252, §272)
    if (userRole === 'Admin') {
      throw new Error('Administrators cannot create marketplace listings (conflict of interest)');
    }

    if (!dto.title || !dto.type) {
      throw new Error('Title and type are required');
    }

    // Hardware specific validations
    if (dto.type === 'Hardware') {
      if (!dto.isFree && !dto.hourlyPrice && !dto.dailyPrice) {
        throw new Error('Hardware listing must have an hourly or daily rate, or be marked free');
      }
    }

    // Dataset specific validations
    if (dto.type === 'Dataset') {
      if (!dto.isFree && !dto.onlinePrice) {
        throw new Error('Dataset listing must have an online purchase price or be marked free');
      }
    }

    const { data, error } = await supabaseAdmin
      .from('listings')
      .insert({
        owner_id: ownerId,
        type: dto.type,
        title: dto.title,
        description: dto.description || null,
        gpu_cpu_model: dto.gpuCpuModel || null,
        vram: dto.vram || null,
        ram: dto.ram || null,
        storage: dto.storage || null,
        os: dto.os || null,
        location: dto.location || null,
        access_method: dto.accessMethod || null,
        hourly_price: dto.hourlyPrice ?? null,
        daily_price: dto.dailyPrice ?? null,
        domain: dto.domain || null,
        size_bytes: dto.sizeBytes ?? null,
        format: dto.format || null,
        license: dto.license || null,
        sample_preview_file_id: dto.samplePreviewFileId || null,
        dataset_file_id: dto.datasetFileId || null,
        online_price: dto.onlinePrice ?? null,
        is_free: dto.isFree || false,
        is_institutional: dto.isInstitutional || false,
        free_for_institution_students: dto.freeForInstitutionStudents || false,
        institution_name: dto.institutionName || null,
        approval_status: 'Pending',
        is_delisted: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create listing: ${error.message}`);
    }

    return {
      id: data.id,
      ownerId: data.owner_id,
      type: data.type,
      title: data.title,
      description: data.description,
      gpuCpuModel: data.gpu_cpu_model,
      vram: data.vram,
      ram: data.ram,
      storage: data.storage,
      os: data.os,
      location: data.location,
      accessMethod: data.access_method,
      hourlyPrice: data.hourly_price ? Number(data.hourly_price) : null,
      dailyPrice: data.daily_price ? Number(data.daily_price) : null,
      domain: data.domain,
      sizeBytes: data.size_bytes ? Number(data.size_bytes) : null,
      format: data.format,
      license: data.license,
      samplePreviewFileId: data.sample_preview_file_id,
      datasetFileId: data.dataset_file_id,
      onlinePrice: data.online_price ? Number(data.online_price) : null,
      isFree: data.is_free,
      isInstitutional: data.is_institutional,
      freeForInstitutionStudents: data.free_for_institution_students,
      institutionName: data.institution_name,
      approvalStatus: data.approval_status,
      rejectionReason: data.rejection_reason,
      isDelisted: data.is_delisted,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Update listing details
   */
  static async updateListing(
    listingId: string,
    ownerId: string,
    dto: UpdateListingDTO,
    isAdmin = false
  ): Promise<Listing> {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (fetchErr || !existing) {
      throw new Error('Listing not found');
    }

    if (existing.owner_id !== ownerId && !isAdmin) {
      throw new Error('Unauthorized to modify this listing');
    }

    const updates: any = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.gpuCpuModel !== undefined) updates.gpu_cpu_model = dto.gpuCpuModel;
    if (dto.vram !== undefined) updates.vram = dto.vram;
    if (dto.ram !== undefined) updates.ram = dto.ram;
    if (dto.storage !== undefined) updates.storage = dto.storage;
    if (dto.os !== undefined) updates.os = dto.os;
    if (dto.location !== undefined) updates.location = dto.location;
    if (dto.accessMethod !== undefined) updates.access_method = dto.accessMethod;
    if (dto.hourlyPrice !== undefined) updates.hourly_price = dto.hourlyPrice;
    if (dto.dailyPrice !== undefined) updates.daily_price = dto.dailyPrice;
    if (dto.domain !== undefined) updates.domain = dto.domain;
    if (dto.sizeBytes !== undefined) updates.size_bytes = dto.sizeBytes;
    if (dto.format !== undefined) updates.format = dto.format;
    if (dto.license !== undefined) updates.license = dto.license;
    if (dto.onlinePrice !== undefined) updates.online_price = dto.onlinePrice;
    if (dto.isFree !== undefined) updates.is_free = dto.isFree;
    if (dto.isInstitutional !== undefined) updates.is_institutional = dto.isInstitutional;
    if (dto.freeForInstitutionStudents !== undefined) updates.free_for_institution_students = dto.freeForInstitutionStudents;
    if (dto.institutionName !== undefined) updates.institution_name = dto.institutionName;
    if (dto.isDelisted !== undefined && (existing.owner_id === ownerId || isAdmin)) {
      updates.is_delisted = dto.isDelisted;
    }

    const { data, error } = await supabaseAdmin
      .from('listings')
      .update(updates)
      .eq('id', listingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update listing: ${error.message}`);
    }

    return {
      id: data.id,
      ownerId: data.owner_id,
      type: data.type,
      title: data.title,
      description: data.description,
      gpuCpuModel: data.gpu_cpu_model,
      vram: data.vram,
      ram: data.ram,
      storage: data.storage,
      os: data.os,
      location: data.location,
      accessMethod: data.access_method,
      hourlyPrice: data.hourly_price ? Number(data.hourly_price) : null,
      dailyPrice: data.daily_price ? Number(data.daily_price) : null,
      domain: data.domain,
      sizeBytes: data.size_bytes ? Number(data.size_bytes) : null,
      format: data.format,
      license: data.license,
      samplePreviewFileId: data.sample_preview_file_id,
      datasetFileId: data.dataset_file_id,
      onlinePrice: data.online_price ? Number(data.online_price) : null,
      isFree: data.is_free,
      isInstitutional: data.is_institutional,
      freeForInstitutionStudents: data.free_for_institution_students,
      institutionName: data.institution_name,
      approvalStatus: data.approval_status,
      rejectionReason: data.rejection_reason,
      isDelisted: data.is_delisted,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Delete listing (only if no active or disputed bookings exist)
   */
  static async deleteListing(listingId: string, ownerId: string, isAdmin = false): Promise<void> {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('listings')
      .select('owner_id')
      .eq('id', listingId)
      .single();

    if (fetchErr || !existing) {
      throw new Error('Listing not found');
    }

    if (existing.owner_id !== ownerId && !isAdmin) {
      throw new Error('Unauthorized to delete this listing');
    }

    // Check for active bookings
    const { data: activeBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, status')
      .eq('listing_id', listingId)
      .in('status', ['Requested', 'Accepted', 'PaymentEscrowed', 'AccessReleased', 'Disputed']);

    if (activeBookings && activeBookings.length > 0) {
      throw new Error('Cannot delete listing with active or escrowed bookings');
    }

    const { error } = await supabaseAdmin.from('listings').delete().eq('id', listingId);
    if (error) {
      throw new Error(`Failed to delete listing: ${error.message}`);
    }
  }

  /**
   * Create availability slots for hardware listing
   */
  static async createAvailabilitySlots(
    listingId: string,
    ownerId: string,
    slots: CreateSlotDTO[]
  ): Promise<AvailabilitySlot[]> {
    const { data: listing, error: listErr } = await supabaseAdmin
      .from('listings')
      .select('owner_id, type')
      .eq('id', listingId)
      .single();

    if (listErr || !listing) {
      throw new Error('Listing not found');
    }

    if (listing.owner_id !== ownerId) {
      throw new Error('Only the listing owner can create availability slots');
    }

    if (listing.type !== 'Hardware') {
      throw new Error('Availability slots are only applicable to Hardware listings');
    }

    const slotInserts = slots.map((s) => {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);
      if (end <= start) {
        throw new Error('Slot end time must be strictly after start time');
      }
      return {
        listing_id: listingId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_booked: false,
      };
    });

    const { data, error } = await supabaseAdmin
      .from('availability_slots')
      .insert(slotInserts)
      .select();

    if (error) {
      throw new Error(`Failed to create availability slots: ${error.message}`);
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      listingId: s.listing_id,
      startTime: s.start_time,
      endTime: s.end_time,
      isBooked: s.is_booked,
      createdAt: s.created_at,
    }));
  }

  /**
   * Delete an unbooked availability slot
   */
  static async deleteAvailabilitySlot(slotId: string, ownerId: string): Promise<void> {
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from('availability_slots')
      .select('*, listing:listings!availability_slots_listing_id_fkey(owner_id)')
      .eq('id', slotId)
      .single();

    if (slotErr || !slot) {
      throw new Error('Slot not found');
    }

    if (slot.listing?.owner_id !== ownerId) {
      throw new Error('Unauthorized to remove this slot');
    }

    if (slot.is_booked) {
      throw new Error('Cannot delete an already booked slot');
    }

    const { error } = await supabaseAdmin.from('availability_slots').delete().eq('id', slotId);
    if (error) {
      throw new Error(`Failed to delete slot: ${error.message}`);
    }
  }

  /**
   * Send an isolated listing inquiry
   */
  static async sendInquiry(listingId: string, senderId: string, body: string): Promise<ListingInquiry> {
    if (!body || body.trim().length === 0) {
      throw new Error('Inquiry message body cannot be empty');
    }

    const { data: listing, error: listErr } = await supabaseAdmin
      .from('listings')
      .select('id, title, owner_id')
      .eq('id', listingId)
      .single();

    if (listErr || !listing) {
      throw new Error('Listing not found');
    }

    const { data, error } = await supabaseAdmin
      .from('listing_inquiries')
      .insert({
        listing_id: listingId,
        sender_id: senderId,
        body: body.trim(),
      })
      .select(
        `
        *,
        sender:profiles!listing_inquiries_sender_id_fkey(
          id,
          full_name,
          photo_url
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to send inquiry: ${error.message}`);
    }

    // Notify listing owner if inquiry is from another user
    if (listing.owner_id !== senderId) {
      await NotificationService.createNotification({
        userId: listing.owner_id,
        type: 'InquiryReceived',
        payload: {
          title: 'New Marketplace Inquiry',
          body: `You received an inquiry about "${listing.title}".`,
          linkUrl: `/marketplace/listings/${listing.id}`,
        },
      }).catch(() => null);
    }

    return {
      id: data.id,
      listingId: data.listing_id,
      senderId: data.sender_id,
      senderName: data.sender?.full_name || 'Inquirer',
      senderAvatarUrl: data.sender?.photo_url || null,
      body: data.body,
      createdAt: data.created_at,
    };
  }

  /**
   * Get inquiry messages for a listing (participant scoped)
   */
  static async getListingInquiries(
    listingId: string,
    userId: string,
    isAdmin = false
  ): Promise<ListingInquiry[]> {
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('owner_id')
      .eq('id', listingId)
      .single();

    if (!listing) {
      throw new Error('Listing not found');
    }

    const isOwner = listing.owner_id === userId;

    let query = supabaseAdmin
      .from('listing_inquiries')
      .select(
        `
        *,
        sender:profiles!listing_inquiries_sender_id_fkey(
          id,
          full_name,
          photo_url
        )
      `
      )
      .eq('listing_id', listingId);

    // If inquirer, only see own thread with owner
    if (!isOwner && !isAdmin) {
      query = query.eq('sender_id', userId);
    }

    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch inquiries: ${error.message}`);
    }

    return (data || []).map((inq: any) => ({
      id: inq.id,
      listingId: inq.listing_id,
      senderId: inq.sender_id,
      senderName: inq.sender?.full_name || 'Inquirer',
      senderAvatarUrl: inq.sender?.photo_url || null,
      body: inq.body,
      createdAt: inq.created_at,
    }));
  }

  /**
   * Submit a review for a completed booking (1 review per booking)
   */
  static async submitReview(
    bookingId: string,
    raterId: string,
    dto: CreateListingReviewDTO
  ): Promise<ListingReview> {
    if (!dto.rating || dto.rating < 1 || dto.rating > 5) {
      throw new Error('Rating must be an integer between 1 and 5');
    }

    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('id, listing_id, requester_id, status')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.requester_id !== raterId) {
      throw new Error('Only the booking requester can leave a review');
    }

    if (booking.status !== 'Completed') {
      throw new Error('Reviews can only be submitted after the booking is completed');
    }

    // Check if review already exists (database unique constraint defense)
    const { data: existing } = await supabaseAdmin
      .from('listing_reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .single();

    if (existing) {
      throw new Error('A review has already been submitted for this booking');
    }

    const { data, error } = await supabaseAdmin
      .from('listing_reviews')
      .insert({
        booking_id: bookingId,
        listing_id: booking.listing_id,
        rater_id: raterId,
        rating: Math.floor(dto.rating),
        comment: dto.comment?.trim() || null,
      })
      .select(
        `
        *,
        rater:profiles!listing_reviews_rater_id_fkey(
          id,
          full_name,
          photo_url
        )
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to submit review: ${error.message}`);
    }

    return {
      id: data.id,
      bookingId: data.booking_id,
      listingId: data.listing_id,
      raterId: data.rater_id,
      raterName: data.rater?.full_name || 'Verified Researcher',
      raterAvatarUrl: data.rater?.photo_url || null,
      rating: data.rating,
      comment: data.comment,
      createdAt: data.created_at,
    };
  }

  // --- Admin Moderation Operations ---

  static async getPendingListings(): Promise<ListingWithStats[]> {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select(
        `
        *,
        owner:profiles!listings_owner_id_fkey(
          id,
          full_name,
          photo_url,
          institution,
          role
        )
      `
      )
      .eq('approval_status', 'Pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending listings: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      ownerId: row.owner_id,
      type: row.type,
      title: row.title,
      description: row.description,
      gpuCpuModel: row.gpu_cpu_model,
      vram: row.vram,
      ram: row.ram,
      storage: row.storage,
      os: row.os,
      location: row.location,
      accessMethod: row.access_method,
      hourlyPrice: row.hourly_price ? Number(row.hourly_price) : null,
      dailyPrice: row.daily_price ? Number(row.daily_price) : null,
      domain: row.domain,
      sizeBytes: row.size_bytes ? Number(row.size_bytes) : null,
      format: row.format,
      license: row.license,
      samplePreviewFileId: row.sample_preview_file_id,
      datasetFileId: row.dataset_file_id,
      onlinePrice: row.online_price ? Number(row.online_price) : null,
      isFree: row.is_free,
      isInstitutional: row.is_institutional,
      freeForInstitutionStudents: row.free_for_institution_students,
      institutionName: row.institution_name,
      approvalStatus: row.approval_status,
      rejectionReason: row.rejection_reason,
      isDelisted: row.is_delisted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ownerName: row.owner?.full_name || 'Anonymous Provider',
      ownerAvatarUrl: row.owner?.photo_url || null,
      ownerAffiliation: row.owner?.institution || null,
      reviewCount: 0,
    }));
  }

  static async approveListing(listingId: string, adminId: string): Promise<Listing> {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .update({
        approval_status: 'Approved',
        rejection_reason: null,
      })
      .eq('id', listingId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to approve listing: ${error?.message}`);
    }

    // Notify provider
    await NotificationService.createNotification({
      userId: data.owner_id,
      type: 'ListingApproved',
      payload: {
        title: 'Listing Approved',
        body: `Your marketplace listing "${data.title}" has been approved and is now live.`,
        linkUrl: `/marketplace/listings/${data.id}`,
      },
    }).catch(() => null);

    return {
      id: data.id,
      ownerId: data.owner_id,
      type: data.type,
      title: data.title,
      description: data.description,
      gpuCpuModel: data.gpu_cpu_model,
      vram: data.vram,
      ram: data.ram,
      storage: data.storage,
      os: data.os,
      location: data.location,
      accessMethod: data.access_method,
      hourlyPrice: data.hourly_price ? Number(data.hourly_price) : null,
      dailyPrice: data.daily_price ? Number(data.daily_price) : null,
      domain: data.domain,
      sizeBytes: data.size_bytes ? Number(data.size_bytes) : null,
      format: data.format,
      license: data.license,
      samplePreviewFileId: data.sample_preview_file_id,
      datasetFileId: data.dataset_file_id,
      onlinePrice: data.online_price ? Number(data.online_price) : null,
      isFree: data.is_free,
      isInstitutional: data.is_institutional,
      freeForInstitutionStudents: data.free_for_institution_students,
      institutionName: data.institution_name,
      approvalStatus: data.approval_status,
      rejectionReason: data.rejection_reason,
      isDelisted: data.is_delisted,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  static async rejectListing(listingId: string, reason: string): Promise<Listing> {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .update({
        approval_status: 'Rejected',
        rejection_reason: reason || 'Does not meet marketplace standards',
      })
      .eq('id', listingId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to reject listing: ${error?.message}`);
    }

    // Notify provider
    await NotificationService.createNotification({
      userId: data.owner_id,
      type: 'ListingRejected',
      payload: {
        title: 'Listing Rejected',
        body: `Your listing "${data.title}" was not approved: ${reason}`,
        linkUrl: `/marketplace/manage`,
      },
    }).catch(() => null);

    return {
      id: data.id,
      ownerId: data.owner_id,
      type: data.type,
      title: data.title,
      description: data.description,
      gpuCpuModel: data.gpu_cpu_model,
      vram: data.vram,
      ram: data.ram,
      storage: data.storage,
      os: data.os,
      location: data.location,
      accessMethod: data.access_method,
      hourlyPrice: data.hourly_price ? Number(data.hourly_price) : null,
      dailyPrice: data.daily_price ? Number(data.daily_price) : null,
      domain: data.domain,
      sizeBytes: data.size_bytes ? Number(data.size_bytes) : null,
      format: data.format,
      license: data.license,
      samplePreviewFileId: data.sample_preview_file_id,
      datasetFileId: data.dataset_file_id,
      onlinePrice: data.online_price ? Number(data.online_price) : null,
      isFree: data.is_free,
      isInstitutional: data.is_institutional,
      freeForInstitutionStudents: data.free_for_institution_students,
      institutionName: data.institution_name,
      approvalStatus: data.approval_status,
      rejectionReason: data.rejection_reason,
      isDelisted: data.is_delisted,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  static async delistListing(listingId: string): Promise<Listing> {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .update({
        is_delisted: true,
      })
      .eq('id', listingId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to delist listing: ${error?.message}`);
    }

    return {
      id: data.id,
      ownerId: data.owner_id,
      type: data.type,
      title: data.title,
      description: data.description,
      gpuCpuModel: data.gpu_cpu_model,
      vram: data.vram,
      ram: data.ram,
      storage: data.storage,
      os: data.os,
      location: data.location,
      accessMethod: data.access_method,
      hourlyPrice: data.hourly_price ? Number(data.hourly_price) : null,
      dailyPrice: data.daily_price ? Number(data.daily_price) : null,
      domain: data.domain,
      sizeBytes: data.size_bytes ? Number(data.size_bytes) : null,
      format: data.format,
      license: data.license,
      samplePreviewFileId: data.sample_preview_file_id,
      datasetFileId: data.dataset_file_id,
      onlinePrice: data.online_price ? Number(data.online_price) : null,
      isFree: data.is_free,
      isInstitutional: data.is_institutional,
      freeForInstitutionStudents: data.free_for_institution_students,
      institutionName: data.institution_name,
      approvalStatus: data.approval_status,
      rejectionReason: data.rejection_reason,
      isDelisted: data.is_delisted,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
