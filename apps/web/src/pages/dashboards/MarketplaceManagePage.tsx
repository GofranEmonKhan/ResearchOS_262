import React, { useState } from 'react';
import {
  Briefcase,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  CreditCard,
  KeyRound,
  Star,
  Scale,
  Plus,
  DollarSign,
  Loader2,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout.js';
import { EscrowPaymentModal } from '../../components/marketplace/EscrowPaymentModal.js';
import { ReleaseAccessModal } from '../../components/marketplace/ReleaseAccessModal.js';
import { ReviewModal } from '../../components/marketplace/ReviewModal.js';
import { DisputeDrawer } from '../../components/marketplace/DisputeDrawer.js';
import { AccessDetailsCard } from '../../components/marketplace/AccessDetailsCard.js';
import { CreateListingModal } from '../../components/marketplace/CreateListingModal.js';
import { useMyBookings, useUserTransactions, useMarketplaceCatalog } from '../../hooks/useMarketplace.js';
import { marketplaceApi } from '../../lib/marketplaceApi.js';
import {
  BookingWithDetails,
  BookingStatus,
  CreateListingDTO,
} from '@researchos/shared-types';

interface MarketplaceManagePageProps {
  onNavigate: (route: string) => void;
}

export const MarketplaceManagePage: React.FC<MarketplaceManagePageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'rentals' | 'requests' | 'listings' | 'finances'>('rentals');

  // Modals state
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<BookingWithDetails | null>(null);
  const [selectedBookingForRelease, setSelectedBookingForRelease] = useState<BookingWithDetails | null>(null);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<BookingWithDetails | null>(null);
  const [selectedBookingForDispute, setSelectedBookingForDispute] = useState<BookingWithDetails | null>(null);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);

  // Data hooks
  const {
    rentals,
    clientRequests,
    loading: bookingsLoading,
    acceptBooking,
    rejectBooking,
    payBooking,
    releaseAccess,
    completeBooking,
    openDispute,
    submitReview,
    refetch: refetchBookings,
  } = useMyBookings();

  const { transactions, loading: txLoading, refetch: refetchTx } = useUserTransactions();

  const {
    listings: allListings,
    loading: listingsLoading,
    refetch: refetchCatalog,
  } = useMarketplaceCatalog();

  const myListings = allListings.filter((l) => l.ownerId === profile?.id);

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'Requested':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending Provider Approval
          </span>
        );
      case 'Accepted':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center gap-1">
            <CreditCard className="w-3 h-3" />
            Accepted &bull; Awaiting Escrow Payment
          </span>
        );
      case 'PaymentEscrowed':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Escrow Held &bull; Awaiting Access Credentials
          </span>
        );
      case 'AccessReleased':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
            <KeyRound className="w-3 h-3" />
            Active &bull; Access Granted
          </span>
        );
      case 'Completed':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completed & Released
          </span>
        );
      case 'Disputed':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1">
            <Scale className="w-3 h-3" />
            Under Dispute
          </span>
        );
      case 'Cancelled':
      case 'Rejected':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
      default:
        return null;
    }
  };

  const handleCreateListing = async (dto: CreateListingDTO) => {
    await marketplaceApi.createListing(dto);
    setIsCreateListingOpen(false);
    refetchCatalog();
  };

  return (
    <WorkspaceLayout activeTab="marketplace" onNavigate={onNavigate}>
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Briefcase className="w-6 h-6 text-indigo-400" />
              <span>Marketplace Management & Rentals Hub</span>
            </h1>
            <p className="text-xs text-slate-400">
              Manage your active compute reservations, equipment rentals, incoming client requests, and financial escrow statements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/marketplace')}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 bg-[#0D0F14] hover:bg-slate-800 text-slate-300 transition-colors"
            >
              Browse Catalog
            </button>
            <button
              onClick={() => setIsCreateListingOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Listing</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
          <button
            onClick={() => setActiveTab('rentals')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'rentals'
                ? 'border-b-2 border-indigo-500 text-indigo-300 bg-indigo-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>My Rentals / Purchases</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300">
              {rentals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'border-b-2 border-indigo-500 text-indigo-300 bg-indigo-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Incoming Client Requests</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300">
              {clientRequests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'listings'
                ? 'border-b-2 border-indigo-500 text-indigo-300 bg-indigo-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>My Active Listings</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300">
              {myListings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('finances')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'finances'
                ? 'border-b-2 border-indigo-500 text-indigo-300 bg-indigo-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Escrow & Transactions</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300">
              {transactions.length}
            </span>
          </button>
        </div>

        {/* TAB 1: Consumer Rentals */}
        {activeTab === 'rentals' && (
          <div className="space-y-4">
            {bookingsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400">Loading your rentals...</span>
              </div>
            ) : rentals.length === 0 ? (
              <div className="py-16 text-center p-8 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-3">
                <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-200">No active rentals or bookings</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You have not rented any compute clusters or datasets yet.
                </p>
                <button
                  onClick={() => onNavigate('/marketplace')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Explore Marketplace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {rentals.map((booking: BookingWithDetails) => (
                  <div
                    key={booking.id}
                    className="p-5 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-4 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-semibold text-white">
                            {booking.listing?.title || 'Academic Resource'}
                          </h3>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3">
                          <span>Listing Type: <strong className="text-indigo-400">{booking.listing?.type}</strong></span>
                          <span>&bull;</span>
                          <span>Booking ID: <strong className="text-slate-300 font-mono">{booking.id.slice(0, 8)}...</strong></span>
                        </div>
                      </div>

                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                        <span className="text-xs text-slate-500">Total Price</span>
                        <span className="text-lg font-bold text-emerald-400">${booking.totalPrice}</span>
                      </div>
                    </div>

                    {/* Active access card if granted */}
                    {(booking.status === 'AccessReleased' || booking.status === 'Completed') && (
                      <div className="pt-2">
                        <AccessDetailsCard
                          status={booking.status}
                          accessDetails={booking.accessDetails}
                          listingType={booking.listing?.type || 'Hardware'}
                          accessMethod={booking.listing?.accessMethod}
                        />
                      </div>
                    )}

                    {/* Consumer Actions */}
                    <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800/80 gap-3">
                      <div className="text-[11px] text-slate-500">
                        Created {new Date(booking.createdAt).toLocaleDateString()}
                      </div>

                      <div className="flex items-center gap-2.5">
                        {booking.status === 'Accepted' && (
                          <button
                            onClick={() => setSelectedBookingForPayment(booking)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay & Secure Escrow</span>
                          </button>
                        )}

                        {booking.status === 'AccessReleased' && (
                          <button
                            onClick={async () => {
                              await completeBooking(booking.id);
                              refetchBookings();
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Completed</span>
                          </button>
                        )}

                        {booking.status === 'Completed' && (
                          <button
                            onClick={() => setSelectedBookingForReview(booking)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-white" />
                            <span>Leave Review</span>
                          </button>
                        )}

                        {(booking.status === 'PaymentEscrowed' || booking.status === 'AccessReleased') && (
                          <button
                            onClick={() => setSelectedBookingForDispute(booking)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-300 text-xs font-medium cursor-pointer"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>Dispute</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Incoming Client Requests (Provider Hub) */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {bookingsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400">Loading incoming requests...</span>
              </div>
            ) : clientRequests.length === 0 ? (
              <div className="py-16 text-center p-8 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-3">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-200">No incoming client requests</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When other researchers request to reserve your listed equipment, requests will appear here for your approval.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {clientRequests.map((booking: BookingWithDetails) => (
                  <div
                    key={booking.id}
                    className="p-5 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-4 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-semibold text-white">
                            {booking.listing?.title || 'Your Listing'}
                          </h3>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3">
                          <span>Requester: <strong className="text-slate-300">{booking.requester?.fullName}</strong></span>
                          <span>&bull;</span>
                          <span>Institution: <strong className="text-slate-300">{booking.requester?.institution || 'Academic Institute'}</strong></span>
                        </div>
                      </div>

                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                        <span className="text-xs text-slate-500">Payout (After 10% Platform Fee)</span>
                        <span className="text-lg font-bold text-emerald-400">
                          ${(Number(booking.totalPrice) * 0.9).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {booking.requesterNotes && (
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                        <span className="font-semibold text-slate-400">Researcher Project Notes:</span>
                        <p className="italic text-slate-300">{booking.requesterNotes}</p>
                      </div>
                    )}

                    {/* Provider Actions */}
                    <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800/80 gap-3">
                      <div className="text-[11px] text-slate-500 font-mono">
                        Booking ID: {booking.id.slice(0, 8)}...
                      </div>

                      <div className="flex items-center gap-2.5">
                        {booking.status === 'Requested' && (
                          <>
                            <button
                              onClick={async () => {
                                await rejectBooking(booking.id, 'Resource unavailable for requested time');
                                refetchBookings();
                              }}
                              className="px-3 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              onClick={async () => {
                                await acceptBooking(booking.id);
                                refetchBookings();
                              }}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Accept Request</span>
                            </button>
                          </>
                        )}

                        {booking.status === 'PaymentEscrowed' && (
                          <button
                            onClick={() => setSelectedBookingForRelease(booking)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Release Access & Credentials</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: My Active Listings */}
        {activeTab === 'listings' && (
          <div className="space-y-4">
            {listingsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400">Loading your listings...</span>
              </div>
            ) : myListings.length === 0 ? (
              <div className="py-16 text-center p-8 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-3">
                <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-200">No listings created yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Monetize idle compute nodes, lab equipment slots, or specialized scientific datasets.
                </p>
                <button
                  onClick={() => setIsCreateListingOpen(true)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Create Your First Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {myListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="p-5 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-800 text-slate-300">
                        {listing.type}
                      </span>
                      <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                        {listing.approvalStatus}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-white line-clamp-1">{listing.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{listing.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                      <div>
                        <span className="font-bold text-white text-base">
                          {listing.hourlyPrice ? `$${listing.hourlyPrice}/hr` : listing.onlinePrice ? `$${listing.onlinePrice}` : 'Free'}
                        </span>
                      </div>
                      <button
                        onClick={() => onNavigate(`/marketplace/${listing.id}`)}
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        <span>View Spec</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Financial Transactions & Escrow History */}
        {activeTab === 'finances' && (
          <div className="p-6 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Financial Ledger & Escrow Settlement Records</span>
              </h3>
              <span className="text-xs text-slate-500">{transactions.length} recorded events</span>
            </div>

            {txLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No financial transactions or escrow events recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-900/40">
                    <tr>
                      <th className="py-3 px-3">Transaction ID</th>
                      <th className="py-3 px-3">Listing</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-900/30">
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{tx.id.slice(0, 8)}...</td>
                        <td className="py-3 px-3 font-medium text-slate-200">{tx.bookingTitle}</td>
                        <td className="py-3 px-3 font-bold text-emerald-400">${tx.amount}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODALS */}
        {selectedBookingForPayment && (
          <EscrowPaymentModal
            isOpen={true}
            onClose={() => setSelectedBookingForPayment(null)}
            booking={selectedBookingForPayment}
            onConfirmPayment={async (dto) => {
              await payBooking(selectedBookingForPayment.id, dto);
              refetchBookings();
              refetchTx();
            }}
          />
        )}

        {selectedBookingForRelease && (
          <ReleaseAccessModal
            isOpen={true}
            onClose={() => setSelectedBookingForRelease(null)}
            booking={selectedBookingForRelease}
            onConfirmRelease={async (dto) => {
              await releaseAccess(selectedBookingForRelease.id, dto);
              refetchBookings();
            }}
          />
        )}

        {selectedBookingForReview && (
          <ReviewModal
            isOpen={true}
            onClose={() => setSelectedBookingForReview(null)}
            booking={selectedBookingForReview}
            onSubmitReview={async (dto) => {
              await submitReview(selectedBookingForReview.id, { rating: dto.rating, comment: dto.comment });
              refetchBookings();
            }}
          />
        )}

        {selectedBookingForDispute && (
          <DisputeDrawer
            isOpen={true}
            onClose={() => setSelectedBookingForDispute(null)}
            booking={selectedBookingForDispute}
            onRaiseDispute={async (dto) => {
              await openDispute(selectedBookingForDispute.id, dto.reason);
              refetchBookings();
            }}
          />
        )}

        <CreateListingModal
          isOpen={isCreateListingOpen}
          onClose={() => setIsCreateListingOpen(false)}
          onSubmit={handleCreateListing}
          isSupervisor={profile?.role === 'Supervisor'}
        />
      </div>
    </WorkspaceLayout>
  );
};
