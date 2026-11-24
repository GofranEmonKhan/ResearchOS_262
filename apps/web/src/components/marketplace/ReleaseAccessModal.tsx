import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  AlertCircle,
  X,
  Send,
  Terminal,
  Lock,
} from 'lucide-react';
import { BookingWithDetails } from '@researchos/shared-types';

interface ReleaseAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithDetails;
  onConfirmRelease: (dto: { accessDetails: string }) => Promise<void>;
}

export const ReleaseAccessModal: React.FC<ReleaseAccessModalProps> = ({
  isOpen,
  onClose,
  booking,
  onConfirmRelease,
}) => {
  const [accessDetails, setAccessDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessDetails.trim()) {
      setError('Please provide valid connection credentials or access instructions');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirmRelease({ accessDetails: accessDetails.trim() });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to release access credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0D0F14] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Grant Access & Credentials
              </h3>
              <p className="text-xs text-slate-400">Release access details to verified renter</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Escrow Guarantee Notice */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-semibold text-emerald-300">Escrow Payment Guaranteed</div>
            <p className="text-slate-300 leading-relaxed">
              Payment of <strong className="text-emerald-300">${booking.totalPrice}</strong> is secured in platform escrow. Once you grant access details, the consumer will gain immediate access and your payout will be finalized upon booking completion.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Access Credentials / Connection Instructions</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Provide SSH connection strings, IP/ports, temporary tokens, VPN instructions, or facility door access codes.
            </p>
            <textarea
              value={accessDetails}
              onChange={(e) => setAccessDetails(e.target.value)}
              placeholder={`# SSH Connection Details
Host: 198.51.100.42:2222
User: researcher_guest
Key/Password: [Temporarily provisioned credentials]
Jupyter Lab: https://gpu-node-04.lab.local:8888/?token=39f8a...
Container: docker exec -it llama_training bash`}
              rows={7}
              className="w-full px-3 py-2.5 font-mono text-xs rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              required
            />
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span>Access details are end-to-end masked and exclusively visible to the verified renter.</span>
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
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                'Transmitting...'
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Release Access Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
