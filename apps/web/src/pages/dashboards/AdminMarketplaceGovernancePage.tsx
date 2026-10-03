import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  DollarSign,
  Scale,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout.js';
import { useAdminMarketplaceGovernance } from '../../hooks/useMarketplace.js';
import { Dispute, DisputeResolutionAction } from '@researchos/shared-types';
import { HoverSelect } from '../../components/common/HoverSelect.js';

interface AdminMarketplaceGovernancePageProps {
  onNavigate: (route: string) => void;
}

export const AdminMarketplaceGovernancePage: React.FC<AdminMarketplaceGovernancePageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending_listings' | 'disputes' | 'platform_ledger'>('pending_listings');

  // Rejection modal state
  const [rejectingListingId, setRejectingListingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Dispute resolution state
  const [resolvingDispute, setResolvingDispute] = useState<Dispute | null>(null);
  const [action, setAction] = useState<DisputeResolutionAction>('RefundRequester');
  const [resolutionNote, setResolutionNote] = useState('');

  const {
    pendingListings,
    disputes,
    transactions,
    stats,
    loading,
    approveListing,
    rejectListing,
    resolveDispute,
    refetch,
  } = useAdminMarketplaceGovernance();

  if (profile?.role !== 'Admin') {
    return (
      <WorkspaceLayout activeTab="marketplace" onNavigate={onNavigate}>
        <div className="max-w-lg mx-auto py-24 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-slate-100">Access Restricted</h2>
          <p className="text-xs text-slate-400">
            This portal is restricted to platform administrators with governance and escrow arbitration privileges.
          </p>
          <button
            onClick={() => onNavigate('/marketplace')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Return to Marketplace
          </button>
        </div>
      </WorkspaceLayout>
    );
  }

  const openDisputes = disputes.filter((d) => d.status === 'Open' || d.status === 'UnderReview');
  const totalVolume = stats?.totalGrossVolume || transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const platformFees = stats?.totalPlatformCommission || (totalVolume * 0.1);

  return (
    <WorkspaceLayout activeTab="marketplace" onNavigate={onNavigate}>
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Governance & Escrow Arbitration</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Marketplace Moderation Portal
            </h1>
            <p className="text-xs text-slate-400">
              Audit pending equipment listings, adjudicate consumer/provider escrow disputes, and oversee platform transactions.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/marketplace')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-800 bg-[#0D0F14] hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Public Catalog</span>
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-1">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Pending Reviews</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">{pendingListings.length}</div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-1">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Active Disputes</span>
              <Scale className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-white">{openDisputes.length}</div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-1">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Total Volume Processed</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">${totalVolume.toFixed(2)}</div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
          <button
            onClick={() => setActiveTab('pending_listings')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'pending_listings'
                ? 'border-b-2 border-amber-500 text-amber-300 bg-amber-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Pending Listings Queue</span>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px]">
              {pendingListings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'disputes'
                ? 'border-b-2 border-rose-500 text-rose-300 bg-rose-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Dispute Arbitration</span>
            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px]">
              {openDisputes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('platform_ledger')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'platform_ledger'
                ? 'border-b-2 border-indigo-500 text-indigo-300 bg-indigo-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Platform Financial Ledger</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
              {transactions.length}
            </span>
          </button>
        </div>

        {/* TAB 1: Pending Listings Queue */}
        {activeTab === 'pending_listings' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
            ) : pendingListings.length === 0 ? (
              <div className="py-16 text-center p-8 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-200">Approval Queue is Clear</h3>
                <p className="text-xs text-slate-400">All submitted marketplace listings have been reviewed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="p-5 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-4 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-semibold text-white">{listing.title}</h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                            Pending Review
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3">
                          <span>Owner: <strong className="text-slate-300">{listing.ownerName}</strong></span>
                          <span>&bull;</span>
                          <span>Type: <strong className="text-indigo-400">{listing.type}</strong></span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-bold text-emerald-400">
                          {listing.hourlyPrice ? `$${listing.hourlyPrice}/hr` : listing.onlinePrice ? `$${listing.onlinePrice}` : 'Free'}
                        </span>
                      </div>
                    </div>

                    {listing.description && (
                      <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
                        {listing.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-3">
                      <button
                        onClick={() => onNavigate(`/marketplace/${listing.id}`)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                      >
                        <span>Inspect Full Specs</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => setRejectingListingId(listing.id)}
                          className="px-4 py-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-300 text-xs font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={async () => {
                            await approveListing(listing.id);
                            refetch();
                          }}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 cursor-pointer"
                        >
                          Approve Listing
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Dispute Arbitration */}
        {activeTab === 'disputes' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
              </div>
            ) : openDisputes.length === 0 ? (
              <div className="py-16 text-center p-8 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-2">
                <Scale className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-200">No Open Disputes</h3>
                <p className="text-xs text-slate-400">All escrow arbitration cases are resolved.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {openDisputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="p-5 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-4 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-semibold text-white">
                            Dispute for Booking #{dispute.bookingId.slice(0, 8)}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10px] font-semibold">
                            {dispute.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3">
                          <span>Raised by: <strong className="text-slate-300">{dispute.raisedByName || dispute.raisedBy}</strong></span>
                          <span>&bull;</span>
                          <span>Filed: {new Date(dispute.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs">
                      <div className="font-semibold text-slate-400">Claim Details:</div>
                      <p className="text-slate-200 font-mono text-[11px] leading-relaxed">{dispute.reason}</p>
                    </div>

                    <div className="flex items-center justify-end pt-3 border-t border-slate-800">
                      <button
                        onClick={() => setResolvingDispute(dispute)}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
                      >
                        Arbitrate Case
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Financial Ledger */}
        {activeTab === 'platform_ledger' && (
          <div className="p-6 rounded-2xl border border-slate-800 bg-[#0D0F14] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Full Marketplace Financial Ledger</span>
              </h3>
              <div className="text-xs text-slate-400">
                Platform Fees Earned: <strong className="text-indigo-400">${platformFees.toFixed(2)}</strong>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No ledger transactions recorded across the platform yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-900/40">
                    <tr>
                      <th className="py-3 px-3">Transaction ID</th>
                      <th className="py-3 px-3">Listing Title</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Commission</th>
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
                        <td className="py-3 px-3 font-medium text-indigo-300">${tx.commissionAmount}</td>
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

        {/* Rejection Modal */}
        {rejectingListingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0D0F14] p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-semibold text-slate-100">Reject Listing Submission</h3>
              <p className="text-xs text-slate-400">
                Provide a clear reason for rejecting this listing so the provider can revise.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Incomplete hardware benchmarks or prohibited service."
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 focus:outline-none focus:border-rose-500 resize-none"
              />
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => {
                    setRejectingListingId(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (rejectionReason.trim()) {
                      await rejectListing(rejectingListingId, rejectionReason.trim());
                      setRejectingListingId(null);
                      setRejectionReason('');
                      refetch();
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Arbitration Modal */}
        {resolvingDispute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0D0F14] p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-semibold text-slate-100">Adjudicate Dispute</h3>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">Ruling Action</label>
                <HoverSelect
                  value={action}
                  onChange={(val) => setAction(val as DisputeResolutionAction)}
                  options={[
                    { value: 'RefundRequester', label: 'Refund Requester (Full Escrow Refund)' },
                    { value: 'ReleaseToProvider', label: 'Release to Provider (Escrow Payout)' },
                    { value: 'DismissDispute', label: 'Dismiss Dispute' },
                  ]}
                  buttonClassName="w-full px-3 py-2 text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">Arbitration Notes</label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="State the operational basis for this resolution..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => {
                    setResolvingDispute(null);
                    setResolutionNote('');
                  }}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (resolutionNote.trim()) {
                      await resolveDispute(resolvingDispute.id, {
                        action,
                        resolutionNote: resolutionNote.trim(),
                      });
                      setResolvingDispute(null);
                      setResolutionNote('');
                      refetch();
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Apply Ruling & Execute Escrow
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
