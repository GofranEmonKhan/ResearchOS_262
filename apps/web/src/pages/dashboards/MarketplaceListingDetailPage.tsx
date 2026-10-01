import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Cpu,
  Database,
  Star,
  ShieldCheck,
  Clock,
  Calendar,
  Lock,
  MessageSquare,
  Sparkles,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Server,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout.js';
import { AvailabilitySlotPicker } from '../../components/marketplace/AvailabilitySlotPicker.js';
import { ListingInquiryChat } from '../../components/marketplace/ListingInquiryChat.js';
import { useListingDetails } from '../../hooks/useMarketplace.js';
import { marketplaceApi } from '../../lib/marketplaceApi.js';
import { AvailabilitySlot, RequestBookingDTO } from '@researchos/shared-types';

interface MarketplaceListingDetailPageProps {
  listingId: string;
  onNavigate: (route: string) => void;
}

export const MarketplaceListingDetailPage: React.FC<MarketplaceListingDetailPageProps> = ({
  listingId,
  onNavigate,
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'specs' | 'availability' | 'reviews' | 'inquiries'>('specs');
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [requesterNotes, setRequesterNotes] = useState('');
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const {
    listing,
    inquiries,
    loading,
    error,
    sendInquiry,
  } = useListingDetails(listingId);

  // Auto-scroll to booking if URL has ?action=book
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('action=book')) {
      setActiveTab('availability');
    }
  }, []);

  if (loading) {
    return (
      <WorkspaceLayout activeTab="marketplace" onNavigate={onNavigate}>
        <div className="max-w-6xl mx-auto py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <span className="text-xs text-slate-400">Loading resource specifications...</span>
        </div>
      </WorkspaceLayout>
    );
  }

  if (error || !listing) {
    return (
      <WorkspaceLayout activeTab="marketplace" onNavigate={onNavigate}>
        <div className="max-w-xl mx-auto py-24 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-slate-100">Listing Not Found</h2>
          <p className="text-xs text-slate-400">
            {error || 'This resource may have been deleted, unlisted, or is currently under moderation.'}
          </p>
          <button
            onClick={() => onNavigate('/marketplace')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Back to Catalog
          </button>
        </div>
      </WorkspaceLayout>
    );
  }

  const isOwner = profile?.id === listing.ownerId;
  const isSupervisorOrResearcher = profile?.role === 'Supervisor' || profile?.role === 'Researcher';
  const isAdmin = profile?.role === 'Admin';
  const canBook = !isOwner && isSupervisorOrResearcher;

  const isHardware = listing.type === 'Hardware';
  const slots = listing.slots || [];
  const reviews = listing.reviews || [];

  const displayPrice = isHardware
    ? listing.hourlyPrice ? `$${listing.hourlyPrice} / hour` : listing.dailyPrice ? `$${listing.dailyPrice} / day` : 'Free'
    : listing.onlinePrice ? `$${listing.onlinePrice} (One-Time)` : 'Free';

  const handleRequestBooking = async () => {
    if (!canBook) return;
    if (isHardware && slots.length > 0 && !selectedSlot) {
      setBookingError('Please select an available reservation slot');
      return;
    }

    setBookingInProgress(true);
    setBookingError(null);
    try {
      const dto: RequestBookingDTO = {
        slotId: selectedSlot?.id,
        requesterNotes: requesterNotes.trim() || undefined,
      };
      await marketplaceApi.requestBooking(listing.id, dto);
      setBookingSuccess(true);
      setTimeout(() => {
        onNavigate('/marketplace/manage');
      }, 1500);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to submit booking request');
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <WorkspaceLayout activeTab="marketplace" onNavigate={onNavigate}>
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('/marketplace')}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Marketplace</span>
            <span>&bull;</span>
            <span className="text-indigo-400 font-medium">{listing.type}</span>
          </div>
        </div>

        {/* Main Grid: Left Details & Right Booking Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Main Specs & Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Hero Card */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs">
                  {isHardware ? <Cpu className="w-3.5 h-3.5 text-indigo-400" /> : <Database className="w-3.5 h-3.5 text-emerald-400" />}
                  <span className="font-medium">{listing.type}</span>
                  {listing.domain && (
                    <>
                      <span className="text-slate-500">&bull;</span>
                      <span>{listing.domain}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {listing.isInstitutional && (
                    <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Institutional Resource
                    </span>
                  )}
                  {listing.approvalStatus === 'Approved' ? (
                    <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                      Verified & Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      {listing.approvalStatus}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                  {listing.title}
                </h1>
                {listing.description && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {listing.description}
                  </p>
                )}
              </div>

              {/* Provider Info Row */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                    {listing.ownerName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">
                        {listing.ownerName || 'Academic Provider'}
                      </span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3 h-3 text-slate-500" />
                      <span>{listing.ownerAffiliation || 'Research Laboratory'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-amber-400 text-sm font-bold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{(listing.ownerRating || 5.0).toFixed(1)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {listing.reviewCount} verified review{listing.reviewCount === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
              <button
                onClick={() => setActiveTab('specs')}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer ${
                  activeTab === 'specs'
                    ? 'border-b-2 border-indigo-500 text-indigo-300 bg-indigo-950/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Specifications & Matrix
              </button>
              {isHardware && (
                <button
                  onClick={() => setActiveTab('availability')}
                  className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'availability'
                      ? 'border-b-2 border-indigo-500 text-indigo-300 bg-indigo-950/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Available Slots ({slots.length})</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'reviews'
                    ? 'border-b-2 border-indigo-500 text-indigo-300 bg-indigo-950/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Reviews ({reviews.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('inquiries')}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'inquiries'
                    ? 'border-b-2 border-indigo-500 text-indigo-300 bg-indigo-950/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Inquiries ({inquiries.length})</span>
              </button>
            </div>

            {/* TAB 1: Specs & Matrix */}
            {activeTab === 'specs' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-4">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <span>Technical Architecture & Parameters</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {isHardware ? (
                      <>
                        {listing.gpuCpuModel && (
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">GPU / CPU Model</span>
                            <span className="font-mono font-semibold text-slate-200">{listing.gpuCpuModel}</span>
                          </div>
                        )}
                        {listing.vram && (
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">VRAM</span>
                            <span className="font-mono font-semibold text-slate-200">{listing.vram}</span>
                          </div>
                        )}
                        {listing.ram && (
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">System RAM</span>
                            <span className="font-mono font-semibold text-slate-200">{listing.ram}</span>
                          </div>
                        )}
                        {listing.storage && (
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Fast NVMe Storage</span>
                            <span className="font-mono font-semibold text-slate-200">{listing.storage}</span>
                          </div>
                        )}
                        {listing.os && (
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Operating System</span>
                            <span className="font-mono font-semibold text-slate-200">{listing.os}</span>
                          </div>
                        )}
                        {listing.accessMethod && (
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Connection Protocol</span>
                            <span className="font-mono font-semibold text-indigo-300">{listing.accessMethod}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {listing.domain && (
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Research Domain</span>
                            <span className="font-mono font-semibold text-slate-200">{listing.domain}</span>
                          </div>
                        )}
                        {listing.format && (
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Data Format</span>
                            <span className="font-mono font-semibold text-slate-200">{listing.format}</span>
                          </div>
                        )}
                        {listing.license && (
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Dataset License</span>
                            <span className="font-mono font-semibold text-slate-200">{listing.license}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Masked Access Guarantee */}
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-indigo-300">Masked Access Security</div>
                    <p className="text-slate-400">
                      Direct connection endpoints (SSH keys, hostnames, cluster IP addresses, download links) remain strictly encrypted until your booking is confirmed and escrow is secured.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Availability */}
            {activeTab === 'availability' && (
              <div className="space-y-4">
                <AvailabilitySlotPicker
                  slots={slots}
                  selectedSlotId={selectedSlot?.id}
                  onSelectSlot={(slot) => setSelectedSlot(slot)}
                  hourlyPrice={listing.hourlyPrice}
                  dailyPrice={listing.dailyPrice}
                  isFree={listing.isFree}
                />
              </div>
            )}

            {/* TAB 3: Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-2">
                    <Star className="w-8 h-8 text-slate-600 mx-auto" />
                    <h4 className="text-sm font-semibold text-slate-300">No Reviews Yet</h4>
                    <p className="text-xs text-slate-500">
                      Be the first academic researcher to rent and review this resource.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-4 rounded-xl border border-slate-800 bg-[#0D0F14] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-200">
                              {rev.raterName?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-200">
                                {rev.raterName || 'Academic Peer'}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {new Date(rev.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{rev.rating}</span>
                          </div>
                        </div>
                        {rev.comment && (
                          <p className="text-xs text-slate-300 leading-relaxed pt-1">{rev.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Inquiries */}
            {activeTab === 'inquiries' && (
              <div className="space-y-4">
                <ListingInquiryChat
                  inquiries={inquiries}
                  currentUserId={profile?.id}
                  onSendInquiry={async (msg) => {
                    await sendInquiry(msg);
                  }}
                />
              </div>
            )}
          </div>

          {/* Right Col: Pricing Card & Action Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-5 sticky top-24 shadow-2xl">
              {/* Pricing Header */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400">Institutional Rental Rate</span>
                <div className="text-2xl font-extrabold text-white">{displayPrice}</div>
              </div>

              {bookingSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Booking requested successfully! Redirecting to manage hub...</span>
                </div>
              )}

              {bookingError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Purpose / Project Notes */}
              {canBook && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Research Usage Purpose / Environment Needs
                  </label>
                  <textarea
                    value={requesterNotes}
                    onChange={(e) => setRequesterNotes(e.target.value)}
                    placeholder="Briefly state your experiments, tooling dependencies, or project context..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              )}

              {/* Booking CTAs */}
              <div className="space-y-2.5 pt-2">
                {canBook ? (
                  <button
                    onClick={handleRequestBooking}
                    disabled={bookingInProgress}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {bookingInProgress ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        <span>Request Reservation</span>
                      </>
                    )}
                  </button>
                ) : isOwner ? (
                  <div className="p-3 text-center rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-300">
                    You are the provider of this listing.
                  </div>
                ) : isAdmin ? (
                  <div className="p-3 text-center rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300">
                    Admin accounts cannot book marketplace listings.
                  </div>
                ) : null}

                <button
                  onClick={() => setActiveTab('inquiries')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-300 font-medium text-xs transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ask Provider a Question</span>
                </button>
              </div>

              {/* Security & Guarantees */}
              <div className="space-y-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-start gap-2.5 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Escrow Hold: Funds remain in escrow until access is delivered and verified.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-400">
                  <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span>Provider SLA: 24-hour response window for all reservation requests.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
