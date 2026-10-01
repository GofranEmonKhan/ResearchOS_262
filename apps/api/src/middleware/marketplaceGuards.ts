import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase.js';

export async function requireNonAdminMarketplace(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === 'Admin') {
    return res.status(403).json({
      error: 'Administrators cannot create or book marketplace resources due to conflict of interest.',
    });
  }
  next();
}

export async function requireListingOwner(req: Request, res: Response, next: NextFunction) {
  const listingId = req.params.id || req.params.listingId;
  const userId = req.user?.id;

  if (!listingId || !userId) {
    return res.status(400).json({ error: 'Listing ID is required' });
  }

  try {
    const { data: listing, error } = await supabaseAdmin
      .from('listings')
      .select('owner_id')
      .eq('id', listingId)
      .single();

    if (error || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.owner_id !== userId && req.user?.role !== 'Admin') {
      return res.status(403).json({ error: 'Only the listing owner can perform this action' });
    }

    next();
  } catch (err: any) {
    return res.status(500).json({ error: `Guard error: ${err.message}` });
  }
}

export async function requireBookingParticipant(req: Request, res: Response, next: NextFunction) {
  const bookingId = req.params.id || req.params.bookingId;
  const userId = req.user?.id;

  if (!bookingId || !userId) {
    return res.status(400).json({ error: 'Booking ID is required' });
  }

  try {
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('requester_id, listing:listings!bookings_listing_id_fkey(owner_id)')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;
    const isRequester = booking.requester_id === userId;
    const isProvider = listing?.owner_id === userId;
    const isAdmin = req.user?.role === 'Admin';

    if (!isRequester && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Access restricted to booking participants' });
    }

    next();
  } catch (err: any) {
    return res.status(500).json({ error: `Guard error: ${err.message}` });
  }
}

export async function requireBookingRequester(req: Request, res: Response, next: NextFunction) {
  const bookingId = req.params.id || req.params.bookingId;
  const userId = req.user?.id;

  if (!bookingId || !userId) {
    return res.status(400).json({ error: 'Booking ID is required' });
  }

  try {
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('requester_id')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.requester_id !== userId) {
      return res.status(403).json({ error: 'Only the booking requester can perform this action' });
    }

    next();
  } catch (err: any) {
    return res.status(500).json({ error: `Guard error: ${err.message}` });
  }
}

export async function requireBookingProvider(req: Request, res: Response, next: NextFunction) {
  const bookingId = req.params.id || req.params.bookingId;
  const userId = req.user?.id;

  if (!bookingId || !userId) {
    return res.status(400).json({ error: 'Booking ID is required' });
  }

  try {
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('listing:listings!bookings_listing_id_fkey(owner_id)')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;
    const isProvider = listing?.owner_id === userId;

    if (!isProvider && req.user?.role !== 'Admin') {
      return res.status(403).json({ error: 'Only the resource provider can perform this action' });
    }

    next();
  } catch (err: any) {
    return res.status(500).json({ error: `Guard error: ${err.message}` });
  }
}
