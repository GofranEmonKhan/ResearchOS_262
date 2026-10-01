import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  requireNonAdminMarketplace,
  requireListingOwner,
  requireBookingParticipant,
  requireBookingRequester,
  requireBookingProvider,
} from '../middleware/marketplaceGuards.js';
import { MarketplaceService } from '../services/marketplace.service.js';
import { EscrowService } from '../services/escrow.service.js';
import {
  CreateListingDTO,
  UpdateListingDTO,
  CreateSlotDTO,
  RequestBookingDTO,
  PayBookingDTO,
  ReleaseAccessDTO,
  CreateListingReviewDTO,
  ResolveDisputeDTO,
  ListingType,
} from '@researchos/shared-types';

export const marketplaceRouter: Router = Router();

// ==========================================
// 1. Listing Discovery & Management
// ==========================================

/**
 * GET /marketplace/listings
 * Search & filter listings
 */
marketplaceRouter.get('/listings', async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const isAdmin = req.user?.role === 'Admin';

    const filters = {
      type: req.query.type as ListingType | undefined,
      search: req.query.search as string | undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      gpuModel: req.query.gpuModel as string | undefined,
      domain: req.query.domain as string | undefined,
      isInstitutional: req.query.isInstitutional ? req.query.isInstitutional === 'true' : undefined,
      isFree: req.query.isFree ? req.query.isFree === 'true' : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    };

    const result = await MarketplaceService.searchListings(filters, currentUserId, isAdmin);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /marketplace/listings
 * Create new listing (Researcher or Supervisor only; starts Pending)
 */
marketplaceRouter.post(
  '/listings',
  authenticate,
  requireNonAdminMarketplace,
  async (req: Request, res: Response) => {
    try {
      const ownerId = req.user!.id;
      const userRole = req.user!.role;
      const dto: CreateListingDTO = req.body;

      const listing = await MarketplaceService.createListing(ownerId, userRole, dto);
      return res.status(201).json(listing);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * GET /marketplace/listings/:id
 * Get single listing details with slots and reviews
 */
marketplaceRouter.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const listingId = req.params.id as string;
    const currentUserId = req.user?.id;
    const isAdmin = req.user?.role === 'Admin';

    const listing = await MarketplaceService.getListingById(listingId, currentUserId, isAdmin);
    return res.json(listing);
  } catch (err: any) {
    const statusCode = err.message.includes('not found') ? 404 : 403;
    return res.status(statusCode).json({ error: err.message });
  }
});

/**
 * PATCH /marketplace/listings/:id
 * Update listing (Owner only)
 */
marketplaceRouter.patch(
  '/listings/:id',
  authenticate,
  requireListingOwner,
  async (req: Request, res: Response) => {
    try {
      const listingId = req.params.id as string;
      const ownerId = req.user!.id;
      const isAdmin = req.user?.role === 'Admin';
      const dto: UpdateListingDTO = req.body;

      const updated = await MarketplaceService.updateListing(listingId, ownerId, dto, isAdmin);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * DELETE /marketplace/listings/:id
 * Delete listing (Owner only)
 */
marketplaceRouter.delete(
  '/listings/:id',
  authenticate,
  requireListingOwner,
  async (req: Request, res: Response) => {
    try {
      const listingId = req.params.id as string;
      const ownerId = req.user!.id;
      const isAdmin = req.user?.role === 'Admin';

      await MarketplaceService.deleteListing(listingId, ownerId, isAdmin);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /marketplace/listings/:id/availability
 * Create availability slots (Owner only)
 */
marketplaceRouter.post(
  '/listings/:id/availability',
  authenticate,
  requireListingOwner,
  async (req: Request, res: Response) => {
    try {
      const listingId = req.params.id as string;
      const ownerId = req.user!.id;
      const slots: CreateSlotDTO[] = Array.isArray(req.body.slots) ? req.body.slots : [req.body];

      const created = await MarketplaceService.createAvailabilitySlots(listingId, ownerId, slots);
      return res.status(201).json(created);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * DELETE /marketplace/availability/:slotId
 * Delete an unbooked availability slot (Owner only)
 */
marketplaceRouter.delete(
  '/availability/:slotId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const slotId = req.params.slotId as string;
      const ownerId = req.user!.id;

      await MarketplaceService.deleteAvailabilitySlot(slotId, ownerId);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

// ==========================================
// 2. Booking & Escrow Operations
// ==========================================

/**
 * POST /marketplace/listings/:id/bookings
 * Request booking on a listing
 */
marketplaceRouter.post(
  '/listings/:id/bookings',
  authenticate,
  requireNonAdminMarketplace,
  async (req: Request, res: Response) => {
    try {
      const listingId = req.params.id as string;
      const requesterId = req.user!.id;
      const requesterRole = req.user!.role;
      const dto: RequestBookingDTO = req.body;

      const booking = await EscrowService.requestBooking(requesterId, requesterRole, listingId, dto);
      return res.status(201).json(booking);
    } catch (err: any) {
      const statusCode = err.message.includes('already booked') ? 409 : 400;
      return res.status(statusCode).json({ error: err.message });
    }
  }
);

/**
 * GET /marketplace/bookings
 * List user's bookings (as consumer / as provider)
 */
marketplaceRouter.get('/bookings', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const bookings = await EscrowService.getMyBookings(userId);
    return res.json(bookings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /marketplace/bookings/:id
 * Get single booking details (with unmasked or masked access details based on state and role)
 */
marketplaceRouter.get(
  '/bookings/:id',
  authenticate,
  requireBookingParticipant,
  async (req: Request, res: Response) => {
    try {
      const bookingId = req.params.id as string;
      const currentUserId = req.user!.id;
      const isAdmin = req.user?.role === 'Admin';

      const booking = await EscrowService.getBookingById(bookingId, currentUserId, isAdmin);
      return res.json(booking);
    } catch (err: any) {
      const statusCode = err.message.includes('not found') ? 404 : 403;
      return res.status(statusCode).json({ error: err.message });
    }
  }
);

/**
 * POST /marketplace/bookings/:id/accept
 * Provider accepts booking
 */
marketplaceRouter.post(
  '/bookings/:id/accept',
  authenticate,
  requireBookingProvider,
  async (req: Request, res: Response) => {
    try {
      const bookingId = req.params.id as string;
      const providerId = req.user!.id;

      const updated = await EscrowService.acceptBooking(bookingId, providerId);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /marketplace/bookings/:id/reject
 * Provider rejects booking
 */
marketplaceRouter.post(
  '/bookings/:id/reject',
  authenticate,
  requireBookingProvider,
  async (req: Request, res: Response) => {
    try {
      const bookingId = req.params.id as string;
      const providerId = req.user!.id;
      const { reason } = req.body;

      const updated = await EscrowService.rejectBooking(bookingId, providerId, reason);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /marketplace/bookings/:id/cancel
 * Requester cancels booking
 */
marketplaceRouter.post(
  '/bookings/:id/cancel',
  authenticate,
  requireBookingRequester,
  async (req: Request, res: Response) => {
    try {
      const bookingId = req.params.id as string;
      const requesterId = req.user!.id;

      const updated = await EscrowService.cancelBooking(bookingId, requesterId);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /marketplace/bookings/:id/pay
 * Requester completes sandbox payment -> escrow held
 */
marketplaceRouter.post(
  '/bookings/:id/pay',
  authenticate,
  requireBookingRequester,
  async (req: Request, res: Response) => {
    try {
      const bookingId = req.params.id as string;
      const requesterId = req.user!.id;
      const dto: PayBookingDTO = req.body;

      const result = await EscrowService.payBookingSandbox(bookingId, requesterId, dto);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /marketplace/bookings/:id/release-access
 * Provider releases access credentials
 */
marketplaceRouter.post(
  '/bookings/:id/release-access',
  authenticate,
  requireBookingProvider,
  async (req: Request, res: Response) => {
    try {
      const bookingId = req.params.id as string;
      const actorId = req.user!.id;
      const dto: ReleaseAccessDTO = req.body;

      const updated = await EscrowService.releaseAccess(bookingId, actorId, dto);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /marketplace/bookings/:id/complete
 * Mark booking completed and release funds to provider
 */
marketplaceRouter.post(
  '/bookings/:id/complete',
  authenticate,
  requireBookingParticipant,
  async (req: Request, res: Response) => {
    try {
      const bookingId = req.params.id as string;
      const actorId = req.user!.id;

      const updated = await EscrowService.completeBooking(bookingId, actorId);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /marketplace/bookings/:id/dispute
 * Open dispute on booking
 */
marketplaceRouter.post(
  '/bookings/:id/dispute',
  authenticate,
  requireBookingParticipant,
  async (req: Request, res: Response) => {
    try {
      const bookingId = req.params.id as string;
      const raisedBy = req.user!.id;
      const { reason } = req.body;

      const dispute = await EscrowService.openDispute(bookingId, raisedBy, reason);
      return res.status(201).json(dispute);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /marketplace/bookings/:id/review
 * Requester submits review after completion
 */
marketplaceRouter.post(
  '/bookings/:id/review',
  authenticate,
  requireBookingRequester,
  async (req: Request, res: Response) => {
    try {
      const bookingId = req.params.id as string;
      const raterId = req.user!.id;
      const dto: CreateListingReviewDTO = req.body;

      const review = await MarketplaceService.submitReview(bookingId, raterId, dto);
      return res.status(201).json(review);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

// ==========================================
// 3. Isolated Inquiries & Transactions
// ==========================================

/**
 * GET /marketplace/listings/:id/inquiries
 * View inquiry thread for listing
 */
marketplaceRouter.get('/listings/:id/inquiries', authenticate, async (req: Request, res: Response) => {
  try {
    const listingId = req.params.id as string;
    const userId = req.user!.id;
    const isAdmin = req.user?.role === 'Admin';

    const inquiries = await MarketplaceService.getListingInquiries(listingId, userId, isAdmin);
    return res.json(inquiries);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /marketplace/listings/:id/inquiries
 * Send inquiry message to listing owner
 */
marketplaceRouter.post('/listings/:id/inquiries', authenticate, async (req: Request, res: Response) => {
  try {
    const listingId = req.params.id as string;
    const senderId = req.user!.id;
    const { body } = req.body;

    const inquiry = await MarketplaceService.sendInquiry(listingId, senderId, body);
    return res.status(201).json(inquiry);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /marketplace/transactions
 * View user transactions (or all if admin)
 */
marketplaceRouter.get('/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user?.role === 'Admin';

    const transactions = await EscrowService.getTransactions(userId, isAdmin);
    return res.json(transactions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. Admin Marketplace Governance & Moderation
// ==========================================

/**
 * GET /admin/marketplace/listings/pending
 * Admin listing approval queue
 */
marketplaceRouter.get(
  '/admin/listings/pending',
  authenticate,
  requireRole('Admin'),
  async (_req: Request, res: Response) => {
    try {
      const pending = await MarketplaceService.getPendingListings();
      return res.json(pending);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /admin/marketplace/listings/:id/approve
 * Admin approves listing
 */
marketplaceRouter.post(
  '/admin/listings/:id/approve',
  authenticate,
  requireRole('Admin'),
  async (req: Request, res: Response) => {
    try {
      const listingId = req.params.id as string;
      const adminId = req.user!.id;

      const approved = await MarketplaceService.approveListing(listingId, adminId);
      return res.json(approved);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /admin/marketplace/listings/:id/reject
 * Admin rejects listing
 */
marketplaceRouter.post(
  '/admin/listings/:id/reject',
  authenticate,
  requireRole('Admin'),
  async (req: Request, res: Response) => {
    try {
      const listingId = req.params.id as string;
      const { reason } = req.body;

      const rejected = await MarketplaceService.rejectListing(listingId, reason);
      return res.json(rejected);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * POST /admin/marketplace/listings/:id/delist
 * Admin delists violating listing
 */
marketplaceRouter.post(
  '/admin/listings/:id/delist',
  authenticate,
  requireRole('Admin'),
  async (req: Request, res: Response) => {
    try {
      const listingId = req.params.id as string;
      const delisted = await MarketplaceService.delistListing(listingId);
      return res.json(delisted);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * GET /admin/marketplace/disputes
 * Admin disputes queue
 */
marketplaceRouter.get(
  '/admin/disputes',
  authenticate,
  requireRole('Admin'),
  async (_req: Request, res: Response) => {
    try {
      const ledger = await EscrowService.getAdminLedger();
      return res.json(ledger.disputes);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /admin/marketplace/disputes/:id/resolve
 * Admin resolves dispute
 */
marketplaceRouter.post(
  '/admin/disputes/:id/resolve',
  authenticate,
  requireRole('Admin'),
  async (req: Request, res: Response) => {
    try {
      const disputeId = req.params.id as string;
      const adminId = req.user!.id;
      const dto: ResolveDisputeDTO = req.body;

      const resolved = await EscrowService.resolveDispute(disputeId, adminId, dto);
      return res.json(resolved);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

/**
 * GET /admin/marketplace/ledger
 * Admin full financial ledger and platform metrics
 */
marketplaceRouter.get(
  '/admin/ledger',
  authenticate,
  requireRole('Admin'),
  async (_req: Request, res: Response) => {
    try {
      const ledger = await EscrowService.getAdminLedger();
      return res.json(ledger);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);
