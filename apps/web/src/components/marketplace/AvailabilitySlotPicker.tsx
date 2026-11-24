import React from 'react';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { AvailabilitySlot } from '@researchos/shared-types';

interface AvailabilitySlotPickerProps {
  slots: AvailabilitySlot[];
  selectedSlotId?: string;
  onSelectSlot: (slot: AvailabilitySlot) => void;
  hourlyPrice?: number | null;
  dailyPrice?: number | null;
  isFree?: boolean;
}

export const AvailabilitySlotPicker: React.FC<AvailabilitySlotPickerProps> = ({
  slots,
  selectedSlotId,
  onSelectSlot,
  hourlyPrice,
  dailyPrice,
  isFree,
}) => {
  const availableSlots = slots.filter((s) => !s.isBooked);

  if (availableSlots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center">
        <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-300">No Open Slots Available</p>
        <p className="text-xs text-slate-500 mt-1">
          All currently listed time slots have been booked. You can message the provider to request additional compute availability.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Select Availability Window ({availableSlots.length} available)
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
        {availableSlots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          const start = new Date(slot.startTime);
          const end = new Date(slot.endTime);
          const durationHours = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60)));

          let estimatedCost = 0;
          if (!isFree) {
            if (hourlyPrice) {
              estimatedCost = hourlyPrice * durationHours;
            } else if (dailyPrice) {
              estimatedCost = dailyPrice * Math.max(1, Math.ceil(durationHours / 24));
            }
          }

          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelectSlot(slot)}
              className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40 text-slate-100 ring-1 ring-indigo-500'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  {start.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {isSelected ? (
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                ) : (
                  <span className="text-[11px] font-medium text-indigo-400">
                    {isFree ? 'FREE' : `$${estimatedCost}`}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <span>
                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                  {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({durationHours}h)
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
