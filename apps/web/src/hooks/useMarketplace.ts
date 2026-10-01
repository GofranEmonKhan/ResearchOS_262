import { useState, useEffect, useCallback } from 'react';
import { marketplaceApi } from '../lib/marketplaceApi.js';
import {
  ListingWithStats,
  AvailabilitySlot,
  ListingReview,
  BookingWithDetails,
  ListingInquiry,
  TransactionWithBooking,
  MarketplaceFilterParams,
  MarketplaceLedgerStats,
  Dispute,
  PayBookingDTO,
  ReleaseAccessDTO,
  CreateListingReviewDTO,
  ResolveDisputeDTO,
} from '@researchos/shared-types';

/**
 * Hook for browsing and searching the marketplace catalog
 */
export function useMarketplaceCatalog(initialFilters: MarketplaceFilterParams = {}) {
  const [filters, setFilters] = useState<MarketplaceFilterParams>(initialFilters);
  const [listings, setListings] = useState<ListingWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await marketplaceApi.searchListings(filters);
      setListings(data.listings);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const updateFilters = (newFilters: Partial<MarketplaceFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  return {
    listings,
    total,
    loading,
    error,
    filters,
    setFilters,
    updateFilters,
    refetch: fetchListings,
  };
}

/**
 * Hook for single listing details, slots, reviews, and inquiries
 */
export function useListingDetails(listingId: string) {
  const [listing, setListing] = useState<
    (ListingWithStats & { slots: AvailabilitySlot[]; reviews: ListingReview[] }) | null
  >(null);
  const [inquiries, setInquiries] = useState<ListingInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListing = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError(null);
    try {
      const [listData, inqData] = await Promise.all([
        marketplaceApi.getListing(listingId),
        marketplaceApi.getInquiries(listingId).catch(() => []),
      ]);
      setListing(listData);
      setInquiries(inqData);
    } catch (err: any) {
      setError(err.message || 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const sendInquiry = async (body: string) => {
    const newInquiry = await marketplaceApi.sendInquiry(listingId, body);
    setInquiries((prev) => [...prev, newInquiry]);
    return newInquiry;
  };

  return {
    listing,
    inquiries,
    loading,
    error,
    refetch: fetchListing,
    sendInquiry,
  };
}

/**
 * Hook for managing user's bookings (as consumer & provider)
 */
export function useMyBookings() {
  const [rentals, setRentals] = useState<BookingWithDetails[]>([]);
  const [clientRequests, setClientRequests] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await marketplaceApi.getMyBookings();
      setRentals(data.asRequester);
      setClientRequests(data.asProvider);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Actions
  const acceptBooking = async (bookingId: string) => {
    const updated = await marketplaceApi.acceptBooking(bookingId);
    await fetchBookings();
    return updated;
  };

  const rejectBooking = async (bookingId: string, reason?: string) => {
    const updated = await marketplaceApi.rejectBooking(bookingId, reason);
    await fetchBookings();
    return updated;
  };

  const cancelBooking = async (bookingId: string) => {
    const updated = await marketplaceApi.cancelBooking(bookingId);
    await fetchBookings();
    return updated;
  };

  const payBooking = async (bookingId: string, dto: PayBookingDTO) => {
    const result = await marketplaceApi.payBooking(bookingId, dto);
    await fetchBookings();
    return result;
  };

  const releaseAccess = async (bookingId: string, dto: ReleaseAccessDTO) => {
    const updated = await marketplaceApi.releaseAccess(bookingId, dto);
    await fetchBookings();
    return updated;
  };

  const completeBooking = async (bookingId: string) => {
    const updated = await marketplaceApi.completeBooking(bookingId);
    await fetchBookings();
    return updated;
  };

  const openDispute = async (bookingId: string, reason: string) => {
    const dispute = await marketplaceApi.openDispute(bookingId, reason);
    await fetchBookings();
    return dispute;
  };

  const submitReview = async (bookingId: string, dto: CreateListingReviewDTO) => {
    const review = await marketplaceApi.submitReview(bookingId, dto);
    await fetchBookings();
    return review;
  };

  return {
    rentals,
    clientRequests,
    loading,
    error,
    refetch: fetchBookings,
    acceptBooking,
    rejectBooking,
    cancelBooking,
    payBooking,
    releaseAccess,
    completeBooking,
    openDispute,
    submitReview,
  };
}

/**
 * Hook for transactions history
 */
export function useUserTransactions() {
  const [transactions, setTransactions] = useState<TransactionWithBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await marketplaceApi.getTransactions();
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
  };
}

/**
 * Hook for Admin marketplace governance and arbitration
 */
export function useAdminMarketplaceGovernance() {
  const [pendingListings, setPendingListings] = useState<ListingWithStats[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithBooking[]>([]);
  const [stats, setStats] = useState<MarketplaceLedgerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pending, ledger] = await Promise.all([
        marketplaceApi.getAdminPendingListings(),
        marketplaceApi.getAdminLedger(),
      ]);
      setPendingListings(pending);
      setDisputes(ledger.disputes);
      setTransactions(ledger.transactions);
      setStats(ledger.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load marketplace governance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const approveListing = async (id: string) => {
    const updated = await marketplaceApi.adminApproveListing(id);
    await fetchData();
    return updated;
  };

  const rejectListing = async (id: string, reason?: string) => {
    const updated = await marketplaceApi.adminRejectListing(id, reason);
    await fetchData();
    return updated;
  };

  const delistListing = async (id: string) => {
    const updated = await marketplaceApi.adminDelistListing(id);
    await fetchData();
    return updated;
  };

  const resolveDispute = async (id: string, dto: ResolveDisputeDTO) => {
    const resolved = await marketplaceApi.adminResolveDispute(id, dto);
    await fetchData();
    return resolved;
  };

  return {
    pendingListings,
    disputes,
    transactions,
    stats,
    loading,
    error,
    refetch: fetchData,
    approveListing,
    rejectListing,
    delistListing,
    resolveDispute,
  };
}
