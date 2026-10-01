import React from 'react';
import {
  Server,
  Database,
  Cpu,
  HardDrive,
  Globe,
  Star,
  ShieldCheck,
  GraduationCap,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ListingWithStats } from '@researchos/shared-types';

interface ListingCardProps {
  listing: ListingWithStats;
  onSelect: (listing: ListingWithStats) => void;
  onQuickBook?: (listing: ListingWithStats) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onSelect,
  onQuickBook,
}) => {
  const isHardware = listing.type === 'Hardware';

  return (
    <div
      onClick={() => onSelect(listing)}
      className="group relative flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0D0F14]/90 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-[#12151C] hover:shadow-xl hover:shadow-indigo-950/20 cursor-pointer"
    >
      {/* Top Badges & Type */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                isHardware
                  ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/50'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
              }`}
            >
              {isHardware ? <Server className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
              {listing.type}
            </span>

            {listing.isInstitutional && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/40 text-amber-300 border border-amber-800/50">
                <ShieldCheck className="w-3 h-3" />
                Institutional
              </span>
            )}

            {listing.freeForInstitutionStudents && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-950/40 text-cyan-300 border border-cyan-800/50">
                <GraduationCap className="w-3 h-3" />
                Free for Students
              </span>
            )}
          </div>

          {/* Pricing Highlight */}
          <div className="text-right flex-shrink-0">
            {listing.isFree ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-3 h-3" />
                FREE
              </span>
            ) : isHardware ? (
              <div>
                <span className="text-lg font-bold text-white tracking-tight">
                  ${listing.hourlyPrice || 0}
                </span>
                <span className="text-xs text-slate-400 font-normal">/hr</span>
                {listing.dailyPrice && (
                  <div className="text-[11px] text-slate-500">
                    or ${listing.dailyPrice}/day
                  </div>
                )}
              </div>
            ) : (
              <div>
                <span className="text-lg font-bold text-white tracking-tight">
                  ${listing.onlinePrice || 0}
                </span>
                <span className="text-xs text-slate-400 font-normal"> once</span>
              </div>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-semibold text-slate-100 line-clamp-1 group-hover:text-indigo-300 transition-colors">
          {listing.title}
        </h3>
        <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {listing.description || 'Verified academic research compute resource with high reliability.'}
        </p>

        {/* Hardware Specs Grid */}
        {isHardware && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {listing.gpuCpuModel && (
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                <Cpu className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="truncate font-medium">{listing.gpuCpuModel}</span>
              </div>
            )}
            {listing.vram && (
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                <span className="text-[10px] font-bold text-indigo-400">VRAM</span>
                <span className="truncate">{listing.vram}</span>
              </div>
            )}
            {listing.ram && (
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                <HardDrive className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{listing.ram} RAM</span>
              </div>
            )}
            {listing.location && (
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{listing.location}</span>
              </div>
            )}
          </div>
        )}

        {/* Dataset Specs Grid */}
        {!isHardware && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {listing.domain && (
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                <Globe className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate font-medium">{listing.domain}</span>
              </div>
            )}
            {listing.format && (
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                <span className="text-[10px] font-bold text-emerald-400">FMT</span>
                <span className="truncate uppercase">{listing.format}</span>
              </div>
            )}
            {listing.license && (
              <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60 col-span-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate text-[11px] text-slate-400">{listing.license}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: Provider Info & Action */}
      <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-indigo-950/60 border border-indigo-700/40 flex items-center justify-center text-xs font-semibold text-indigo-300 flex-shrink-0">
            {listing.ownerAvatarUrl ? (
              <img
                src={listing.ownerAvatarUrl}
                alt={listing.ownerName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              listing.ownerName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-200 truncate">
              {listing.ownerName}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              {listing.ownerRating ? (
                <span className="flex items-center gap-0.5 text-amber-400 font-medium">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {listing.ownerRating}
                  <span className="text-slate-500 font-normal">({listing.reviewCount})</span>
                </span>
              ) : (
                <span className="text-slate-500">New Provider</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onQuickBook) {
              onQuickBook(listing);
            } else {
              onSelect(listing);
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm shadow-indigo-950 flex-shrink-0"
        >
          {isHardware ? (
            <>
              <Clock className="w-3.5 h-3.5" />
              Book Slot
            </>
          ) : (
            <>
              Get Access
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
