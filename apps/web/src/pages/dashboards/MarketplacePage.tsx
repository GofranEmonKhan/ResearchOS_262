import React, { useState } from 'react';
import {
  Plus,
  Cpu,
  Database,
  Layers,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Loader2,
  PackageSearch,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout.js';
import { ListingCard } from '../../components/marketplace/ListingCard.js';
import { ListingFilterBar } from '../../components/marketplace/ListingFilterBar.js';
import { CreateListingModal } from '../../components/marketplace/CreateListingModal.js';
import { useMarketplaceCatalog } from '../../hooks/useMarketplace.js';
import { marketplaceApi } from '../../lib/marketplaceApi.js';
import { ListingType, CreateListingDTO } from '@researchos/shared-types';

interface MarketplacePageProps {
  onNavigate: (route: string) => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Hook for catalog queries
  const {
    listings,
    total,
    loading,
    filters,
    updateFilters,
    setFilters,
    refetch,
  } = useMarketplaceCatalog();

  const isSupervisorOrResearcher = profile?.role === 'Supervisor' || profile?.role === 'Researcher';
  const isAdmin = profile?.role === 'Admin';

  const categoryCards: { id: ListingType | 'all'; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: 'all', label: 'All Resources', icon: Layers, desc: 'Explore all shared compute & datasets' },
    { id: 'Hardware', label: 'GPU & Cloud Compute', icon: Cpu, desc: 'H100/A100 clusters, TPU nodes & workstations' },
    { id: 'Dataset', label: 'Curated Research Datasets', icon: Database, desc: 'Genomic sequences, NLP corpora & benchmark data' },
  ];

  const handleCategorySelect = (type: ListingType | 'all') => {
    updateFilters({
      type: type === 'all' ? undefined : type,
    });
  };

  const handleCreateListing = async (dto: CreateListingDTO) => {
    await marketplaceApi.createListing(dto);
    setIsCreateModalOpen(false);
    refetch();
  };

  return (
    <WorkspaceLayout activeTab="marketplace" onNavigate={onNavigate}>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        {/* Hero & Action Header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-[#0D0F17] via-[#090A0F] to-[#121624] p-6 lg:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Academic Resource Sharing & Compute Escrow</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                Academic Marketplace & Compute Grid
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Rent high-performance GPU nodes, workstations, and verified research datasets with automated escrow guarantees and institutional peer ratings.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => onNavigate('/admin/marketplace')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-sm transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Governance Portal</span>
                </button>
              )}

              {isSupervisorOrResearcher && (
                <>
                  <button
                    onClick={() => onNavigate('/marketplace/manage')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold shadow-sm transition-all"
                  >
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    <span>My Rentals & Requests</span>
                  </button>

                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>List a Resource</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/60">
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
              <div className="text-[11px] font-medium text-slate-400">Total Live Catalog</div>
              <div className="text-xl font-bold text-white mt-0.5">{total}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
              <div className="text-[11px] font-medium text-slate-400">Escrow Security</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">100% Guaranteed</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
              <div className="text-[11px] font-medium text-slate-400">Platform Commission</div>
              <div className="text-xl font-bold text-indigo-300 mt-0.5">10% Platform Fee</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
              <div className="text-[11px] font-medium text-slate-400">Peer Verification</div>
              <div className="text-xl font-bold text-amber-300 mt-0.5">Institutional Only</div>
            </div>
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {categoryCards.map((cat) => {
            const isSelected = (!filters.type && cat.id === 'all') || filters.type === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`p-3.5 rounded-xl border text-left transition-all group cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500/80 bg-indigo-950/40 shadow-lg shadow-indigo-950/50 text-white'
                    : 'border-slate-800 bg-[#0D0F14]/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs">{cat.label}</div>
                    <div className="text-[11px] text-slate-400">{cat.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter Toolbar */}
        <ListingFilterBar
          filters={filters}
          onFilterChange={updateFilters}
          onReset={() => setFilters({ page: 1, limit: 12 })}
        />

        {/* Listings Content Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <span className="text-xs text-slate-400">Loading catalog resources...</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-slate-800/80 bg-[#0D0F14] space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-500">
              <PackageSearch className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-semibold text-slate-200">No resources found</h3>
              <p className="text-xs text-slate-400">
                Try adjusting your search filters or clear existing categories to discover other academic listings.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFilters({ page: 1, limit: 12 })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Reset All Filters
              </button>
              {isSupervisorOrResearcher && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Create New Listing
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onSelect={(item) => onNavigate(`/marketplace/${item.id}`)}
                onQuickBook={(item) => onNavigate(`/marketplace/${item.id}?action=book`)}
              />
            ))}
          </div>
        )}

        {/* Create Listing Modal */}
        <CreateListingModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateListing}
          isSupervisor={profile?.role === 'Supervisor'}
        />
      </div>
    </WorkspaceLayout>
  );
};
