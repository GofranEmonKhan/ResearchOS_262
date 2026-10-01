import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Send,
  X,
  Scale,
} from 'lucide-react';
import { BookingWithDetails, Dispute } from '@researchos/shared-types';

interface DisputeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithDetails;
  dispute?: Dispute | null;
  onRaiseDispute?: (dto: { bookingId: string; reason: string; evidence?: Record<string, any> }) => Promise<void>;
}

export const DisputeDrawer: React.FC<DisputeDrawerProps> = ({
  isOpen,
  onClose,
  booking,
  dispute,
  onRaiseDispute,
}) => {
  const [reason, setReason] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please state the primary reason for this dispute');
      return;
    }
    if (!onRaiseDispute) return;

    setSubmitting(true);
    setError(null);
    try {
      await onRaiseDispute({
        bookingId: booking.id,
        reason: reason.trim(),
        evidence: evidenceNotes.trim() ? { notes: evidenceNotes.trim() } : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to raise dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Under Dispute Review
          </span>
        );
      case 'ResolvedInFavorOfBuyer':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved &bull; Buyer Refunded
          </span>
        );
      case 'ResolvedInFavorOfSeller':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved &bull; Seller Paid
          </span>
        );
      case 'Dismissed':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-300 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Dispute Dismissed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0D0F14] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Dispute Resolution Center
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{booking.listing?.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Dispute Details */}
        {dispute ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Status</span>
              {getStatusBadge(dispute.status)}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>Claimed Reason</span>
              </div>
              <p className="text-slate-300 leading-relaxed bg-black/30 p-2.5 rounded-lg border border-slate-800/60 font-mono text-[11px]">
                {dispute.reason}
              </p>
            </div>

            {dispute.resolutionNote && (
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1.5 text-xs">
                <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Admin Arbitration Ruling</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{dispute.resolutionNote}</p>
                <div className="text-[10px] text-indigo-400/80 pt-1">
                  Resolved on: {new Date(dispute.updatedAt || dispute.createdAt).toLocaleDateString()}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800/60 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form to file new dispute */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-semibold text-rose-300">Raise Dispute & Freeze Escrow</div>
                <p className="text-slate-300 leading-relaxed">
                  Filing a dispute immediately freezes all escrow transactions for this booking (${booking.totalPrice}) and routes the issue to platform administrators for investigation.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Primary Reason for Dispute
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., GPU cluster host was completely unreachable during the allocated slot time; invalid credentials provided."
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Evidence & Log Details (Optional)
              </label>
              <textarea
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                placeholder="Paste connection error outputs, ping traces, or timestamps..."
                rows={3}
                className="w-full px-3 py-2 font-mono text-xs rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? (
                  'Filing Dispute...'
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Dispute</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
