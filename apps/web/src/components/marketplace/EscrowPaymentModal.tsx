import React, { useState } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { BookingWithDetails } from '@researchos/shared-types';

interface EscrowPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithDetails;
  onConfirmPayment: (dto: { testScenario?: 'success' | 'decline' | 'insufficient_funds' }) => Promise<void>;
}

export const EscrowPaymentModal: React.FC<EscrowPaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onConfirmPayment,
}) => {
  const [testScenario, setTestScenario] = useState<'success' | 'decline' | 'insufficient_funds'>('success');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePay = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirmPayment({ testScenario });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment simulation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = Number(booking.totalPrice);
  const commission = Number((totalPrice * 0.1).toFixed(2));
  const providerPayout = Number((totalPrice - commission).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0D0F14] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Secure Sandbox Escrow Checkout
              </h3>
              <p className="text-xs text-slate-400">
                Guaranteed buyer & seller protection for compute & data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary */}
        <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-4 space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Resource:</span>
            <span className="font-medium text-slate-200 truncate max-w-[240px]">
              {booking.listing.title}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Type:</span>
            <span className="font-medium text-indigo-400">{booking.listing.type}</span>
          </div>
          {booking.slot && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Reserved Window:</span>
              <span className="font-medium text-slate-300">
                {new Date(booking.slot.startTime).toLocaleDateString()} (
                {new Date(booking.slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                {new Date(booking.slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-200">Total Escrow Amount:</span>
            <span className="text-lg font-bold text-emerald-400">${totalPrice.toFixed(2)}</span>
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between">
            <span>Provider Payout: ${providerPayout.toFixed(2)}</span>
            <span>Platform Fee (10%): ${commission.toFixed(2)}</span>
          </div>
        </div>

        {/* Escrow Protection Badge */}
        <div className="rounded-xl bg-indigo-950/30 border border-indigo-900/40 p-3 flex items-start gap-2.5 text-xs text-indigo-200 leading-relaxed">
          <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-indigo-300">Funds Held in Escrow: </span>
            Your payment is securely locked. The provider only receives funds once you verify SSH/dataset access and the booking concludes without dispute.
          </div>
        </div>

        {/* Sandbox Test Card Scenarios */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            Sandbox Payment Simulation
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTestScenario('success')}
              className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                testScenario === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Success
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Test Card •••• 4242</div>
            </button>

            <button
              type="button"
              onClick={() => setTestScenario('decline')}
              className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                testScenario === 'decline'
                  ? 'bg-rose-950/50 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                Card Declined
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Test Card •••• 0002</div>
            </button>

            <button
              type="button"
              onClick={() => setTestScenario('insufficient_funds')}
              className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                testScenario === 'insufficient_funds'
                  ? 'bg-amber-950/50 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Low Balance
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Test Card •••• 9999</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg bg-rose-950/40 border border-rose-800/60 p-3 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-950/50"
          >
            {submitting ? (
              'Processing Sandbox Payment...'
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Deposit ${totalPrice.toFixed(2)} to Escrow
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
