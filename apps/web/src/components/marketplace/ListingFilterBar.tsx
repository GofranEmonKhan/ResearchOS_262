import React from 'react';
import { Search, Server, Database, Filter, Sparkles, ShieldCheck } from 'lucide-react';
import { ListingType, MarketplaceFilterParams } from '@researchos/shared-types';

interface ListingFilterBarProps {
  filters: MarketplaceFilterParams;
  onFilterChange: (filters: Partial<MarketplaceFilterParams>) => void;
  onReset: () => void;
}

export const ListingFilterBar: React.FC<ListingFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0D0F14]/80 p-4 backdrop-blur-md shadow-lg space-y-3.5">
      {/* Search Input & Category Toggle */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search compute (e.g. RTX 4090, A100, H100) or datasets (e.g. Genomic, NLP, Vision)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Type Tabs */}
        <div className="flex items-center p-1 bg-slate-900/90 rounded-lg border border-slate-800 flex-shrink-0">
          <button
            onClick={() => onFilterChange({ type: undefined })}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              !filters.type
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Resources
          </button>
          <button
            onClick={() => onFilterChange({ type: 'Hardware' as ListingType })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              filters.type === 'Hardware'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Hardware & GPUs
          </button>
          <button
            onClick={() => onFilterChange({ type: 'Dataset' as ListingType })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              filters.type === 'Dataset'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Research Datasets
          </button>
        </div>
      </div>

      {/* Secondary Fast Filters & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/60 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filters:
          </span>

          {/* Quick GPU model chips if hardware or all */}
          {(!filters.type || filters.type === 'Hardware') && (
            <>
              {['RTX 4090', 'A100', 'H100', 'V100', 'T4'].map((gpu) => {
                const isActive = filters.gpuModel === gpu;
                return (
                  <button
                    key={gpu}
                    onClick={() => onFilterChange({ gpuModel: isActive ? undefined : gpu })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                      isActive
                        ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/50'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {gpu}
                  </button>
                );
              })}
            </>
          )}

          {/* Institutional Toggle */}
          <button
            onClick={() => onFilterChange({ isInstitutional: filters.isInstitutional ? undefined : true })}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              filters.isInstitutional
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            Institutional Only
          </button>

          {/* Free Toggle */}
          <button
            onClick={() => onFilterChange({ isFree: filters.isFree ? undefined : true })}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              filters.isFree
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Free / Open Access
          </button>
        </div>

        {/* Clear Filters */}
        {(filters.search ||
          filters.type ||
          filters.gpuModel ||
          filters.domain ||
          filters.isInstitutional ||
          filters.isFree) && (
          <button
            onClick={onReset}
            className="text-[11px] text-slate-400 hover:text-indigo-400 underline underline-offset-2 transition-colors ml-auto"
          >
            Reset All Filters
          </button>
        )}
      </div>
    </div>
  );
};
