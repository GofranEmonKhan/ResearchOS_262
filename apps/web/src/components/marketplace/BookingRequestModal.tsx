import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  AlertCircle,
  X,
  Send,
  HelpCircle,
} from 'lucide-react';
import { ListingWithStats, AvailabilitySlot, RequestBookingDTO } from '@researchos/shared-types';

interface BookingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: ListingWithStats;
  availableSlots?: AvailabilitySlot[];
  onSubmitBooking: (dto: RequestBookingDTO) => Promise<void>;
}

export const BookingRequestModal: React.FC<BookingRequestModalProps> = ({
  isOpen,
  onClose,
  listing,
  availableSlots = [],
  onSubmitBooking,
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (listing.type === 'Hardware' && availableSlots.length > 0 && !selectedSlotId) {
      setError('Please select an available reservation slot');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitBooking({
        slotId: selectedSlotId || undefined,
        requesterNotes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit booking request');
    } finally {
      setSubmitting(false);
    }
  };

  const isHardware = listing.type === 'Hardware';
  const displayPrice = isHardware
    ? listing.hourlyPrice ? `$${listing.hourlyPrice}/hr` : listing.dailyPrice ? `$${listing.dailyPrice}/day` : 'Free'
    : listing.onlinePrice ? `$${listing.onlinePrice}` : 'Free';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0D0F14] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Request Resource Booking
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{listing.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Slot Selection */}
          {isHardware && availableSlots.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Select Available Slot</span>
                <span className="text-slate-500 font-normal">{availableSlots.length} available</span>
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlotId === slot.id;
                  const start = new Date(slot.startTime).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const end = new Date(slot.endTime).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200 shadow-sm'
                          : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <span>
                          {start} &rarr; {end}
                        </span>
                      </div>
                      <span className="font-semibold text-emerald-400">Standard Rate</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Project notes / purpose */}
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <span>Research Purpose & Requirements</span>
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., Fine-tuning Mistral-7B on biomedical abstracts. Need PyTorch 2.4 pre-installed..."
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Pricing Estimation Summary */}
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-slate-400">Rate / Total Estimate</div>
              <div className="text-[11px] text-slate-500">
                {displayPrice}
              </div>
            </div>
            <div className="flex items-center gap-1 text-lg font-bold text-emerald-400">
              <span>{displayPrice}</span>
            </div>
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
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Booking Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
