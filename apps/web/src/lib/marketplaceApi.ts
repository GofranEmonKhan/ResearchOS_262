import { supabase } from '../supabase.js';
import {
  Listing,
  ListingWithStats,
  CreateListingDTO,
  UpdateListingDTO,
  AvailabilitySlot,
  CreateSlotDTO,
  Booking,
  BookingWithDetails,
  RequestBookingDTO,
  PayBookingDTO,
  ReleaseAccessDTO,
  ListingReview,
  CreateListingReviewDTO,
  Dispute,
  ResolveDisputeDTO,
  ListingInquiry,
  TransactionWithBooking,
  MarketplaceFilterParams,
  MarketplaceLedgerStats,
} from '@researchos/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // Ignore JSON parse error on non-json response
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const marketplaceApi = {
  // --- Listings ---
  async searchListings(
    params: MarketplaceFilterParams = {}
  ): Promise<{ listings: ListingWithStats[]; total: number }> {
    const q = new URLSearchParams();
    if (params.type) q.set('type', params.type);
    if (params.search) q.set('search', params.search);
    if (params.minPrice !== undefined) q.set('minPrice', String(params.minPrice));
    if (params.maxPrice !== undefined) q.set('maxPrice', String(params.maxPrice));
    if (params.gpuModel) q.set('gpuModel', params.gpuModel);
    if (params.domain) q.set('domain', params.domain);
    if (params.isInstitutional !== undefined) q.set('isInstitutional', String(params.isInstitutional));
    if (params.isFree !== undefined) q.set('isFree', String(params.isFree));
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));

    const qs = q.toString();
    return fetchApi<{ listings: ListingWithStats[]; total: number }>(
      `/marketplace/listings${qs ? `?${qs}` : ''}`
    );
  },

  async getListing(
    id: string
  ): Promise<ListingWithStats & { slots: AvailabilitySlot[]; reviews: ListingReview[] }> {
    return fetchApi<ListingWithStats & { slots: AvailabilitySlot[]; reviews: ListingReview[] }>(
      `/marketplace/listings/${id}`
    );
  },

  async createListing(dto: CreateListingDTO): Promise<Listing> {
    return fetchApi<Listing>('/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updateListing(id: string, dto: UpdateListingDTO): Promise<Listing> {
    return fetchApi<Listing>(`/marketplace/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  async deleteListing(id: string): Promise<void> {
    return fetchApi<void>(`/marketplace/listings/${id}`, {
      method: 'DELETE',
    });
  },

  async createSlots(listingId: string, slots: CreateSlotDTO[]): Promise<AvailabilitySlot[]> {
    return fetchApi<AvailabilitySlot[]>(`/marketplace/listings/${listingId}/availability`, {
      method: 'POST',
      body: JSON.stringify({ slots }),
    });
  },

  async deleteSlot(slotId: string): Promise<void> {
    return fetchApi<void>(`/marketplace/availability/${slotId}`, {
      method: 'DELETE',
    });
  },

  // --- Bookings & Escrow ---
  async requestBooking(listingId: string, dto: RequestBookingDTO): Promise<Booking> {
    return fetchApi<Booking>(`/marketplace/listings/${listingId}/bookings`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getMyBookings(): Promise<{
    asRequester: BookingWithDetails[];
    asProvider: BookingWithDetails[];
  }> {
    return fetchApi<{
      asRequester: BookingWithDetails[];
      asProvider: BookingWithDetails[];
    }>('/marketplace/bookings');
  },

  async acceptBooking(id: string): Promise<Booking> {
    return fetchApi<Booking>(`/marketplace/bookings/${id}/accept`, {
      method: 'POST',
    });
  },

  async rejectBooking(id: string, reason?: string): Promise<Booking> {
    return fetchApi<Booking>(`/marketplace/bookings/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async cancelBooking(id: string): Promise<Booking> {
    return fetchApi<Booking>(`/marketplace/bookings/${id}/cancel`, {
      method: 'POST',
    });
  },

  async payBooking(
    id: string,
    dto: PayBookingDTO
  ): Promise<{ booking: Booking; transaction: import('@researchos/shared-types').Transaction }> {
    return fetchApi<{ booking: Booking; transaction: import('@researchos/shared-types').Transaction }>(
      `/marketplace/bookings/${id}/pay`,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      }
    );
  },

  async releaseAccess(id: string, dto: ReleaseAccessDTO): Promise<Booking> {
    return fetchApi<Booking>(`/marketplace/bookings/${id}/release-access`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async completeBooking(id: string): Promise<Booking> {
    return fetchApi<Booking>(`/marketplace/bookings/${id}/complete`, {
      method: 'POST',
    });
  },

  async openDispute(bookingId: string, reason: string): Promise<Dispute> {
    return fetchApi<Dispute>(`/marketplace/bookings/${bookingId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async submitReview(bookingId: string, dto: CreateListingReviewDTO): Promise<ListingReview> {
    return fetchApi<ListingReview>(`/marketplace/bookings/${bookingId}/review`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // --- Inquiries & Transactions ---
  async getInquiries(listingId: string): Promise<ListingInquiry[]> {
    return fetchApi<ListingInquiry[]>(`/marketplace/listings/${listingId}/inquiries`);
  },

  async sendInquiry(listingId: string, body: string): Promise<ListingInquiry> {
    return fetchApi<ListingInquiry>(`/marketplace/listings/${listingId}/inquiries`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  async getTransactions(): Promise<TransactionWithBooking[]> {
    return fetchApi<TransactionWithBooking[]>('/marketplace/transactions');
  },

  // --- Admin Governance ---
  async getAdminPendingListings(): Promise<ListingWithStats[]> {
    return fetchApi<ListingWithStats[]>('/admin/marketplace/listings/pending');
  },

  async adminApproveListing(id: string): Promise<Listing> {
    return fetchApi<Listing>(`/admin/marketplace/listings/${id}/approve`, {
      method: 'POST',
    });
  },

  async adminRejectListing(id: string, reason?: string): Promise<Listing> {
    return fetchApi<Listing>(`/admin/marketplace/listings/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async adminDelistListing(id: string): Promise<Listing> {
    return fetchApi<Listing>(`/admin/marketplace/listings/${id}/delist`, {
      method: 'POST',
    });
  },

  async getAdminDisputes(): Promise<Dispute[]> {
    return fetchApi<Dispute[]>('/admin/marketplace/disputes');
  },

  async adminResolveDispute(id: string, dto: ResolveDisputeDTO): Promise<Dispute> {
    return fetchApi<Dispute>(`/admin/marketplace/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getAdminLedger(): Promise<{
    stats: MarketplaceLedgerStats;
    transactions: TransactionWithBooking[];
    disputes: Dispute[];
  }> {
    return fetchApi<{
      stats: MarketplaceLedgerStats;
      transactions: TransactionWithBooking[];
      disputes: Dispute[];
    }>('/admin/marketplace/ledger');
  },
};
