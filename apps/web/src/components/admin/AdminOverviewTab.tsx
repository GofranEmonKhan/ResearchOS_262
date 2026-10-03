import React from 'react';
import { 
  Users, 
  FolderKanban, 
  HardDrive, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  FileCheck2,
  Trash2,
  Scale,
  Flag,
  ChevronRight
} from 'lucide-react';
import { AdminPlatformOverview } from '@researchos/shared-types';

interface AdminOverviewTabProps {
  overview: AdminPlatformOverview | null;
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: 'users' | 'verifications' | 'audit' | 'governance' | 'health' | 'ai') => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  overview,
  isLoading,
  onRefresh,
  onNavigateTab,
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const rawOverview = (overview as any)?.data || overview;
  const users = rawOverview?.users || { total: 0, admin: 0, supervisor: 0, researcher: 0 };
  const activeProjects = rawOverview?.activeProjects || 0;
  const totalProjects = rawOverview?.totalProjects || 0;
  const storageBytes = rawOverview?.storageBytes || 0;
  const storageFilesCount = rawOverview?.storageFilesCount || 0;
  const ai = rawOverview?.aiUsageThisMonth || { tokens: 0, costUsd: 0, requestCount: 0 };
  const pendingVerifications = rawOverview?.pendingSupervisorVerifications || 0;
  const pendingMarketplace = (rawOverview?.pendingMarketplaceListings || 0) + (rawOverview?.openDisputes || 0);
  const pendingForumReports = rawOverview?.pendingForumReports || 0;

  const totalQueuedItems = pendingVerifications + pendingMarketplace + pendingForumReports;

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner with Quick Refresh & Privacy Assurance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-violet-950/40 via-[#131224] to-[#0D0C18] border border-violet-500/20 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shadow-inner">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">Platform Governance Center</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                System Healthy
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Live platform metrics, strict RBAC enforcement & zero-content-inspection audit trails.
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[#1A1830] hover:bg-violet-900/40 border border-violet-500/30 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-violet-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* High-Impact KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Users */}
        <div 
          onClick={() => onNavigateTab('users')}
          className="p-5 rounded-2xl bg-[#0E1017] hover:bg-[#141824] border border-slate-800 hover:border-violet-500/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">User Community</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {users.total.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                <span>Supervisors:</span>
              </span>
              <span className="font-semibold text-white">{users.supervisor || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span>Researchers:</span>
              </span>
              <span className="font-semibold text-white">{users.researcher || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                <span>Admins:</span>
              </span>
              <span className="font-semibold text-white">{users.admin || 0}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Research Workspaces */}
        <div 
          onClick={() => onNavigateTab('governance')}
          className="p-5 rounded-2xl bg-[#0E1017] hover:bg-[#141824] border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Research Projects</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {totalProjects.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Active Projects:</span>
              </span>
              <span className="font-semibold text-emerald-400">{activeProjects}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                <span>Archived / Total:</span>
              </span>
              <span className="font-semibold text-slate-400">{totalProjects}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Storage Footprint */}
        <div 
          onClick={() => onNavigateTab('health')}
          className="p-5 rounded-2xl bg-[#0E1017] hover:bg-[#141824] border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Storage Volume</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {formatBytes(storageBytes)}
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Indexed Artifacts:</span>
              <span className="font-semibold text-white">{storageFilesCount.toLocaleString()} files</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Supabase Storage:</span>
              <span className="font-semibold text-emerald-400">Online & Encrypted</span>
            </div>
          </div>
        </div>

        {/* Card 4: AI Compute & Cost */}
        <div 
          onClick={() => onNavigateTab('ai')}
          className="p-5 rounded-2xl bg-[#0E1017] hover:bg-[#141824] border border-slate-800 hover:border-violet-500/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly AI Compute</span>
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-2">
              ${(ai.costUsd || 0).toFixed(4)}
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Tokens Processed:</span>
              <span className="font-semibold text-white">{(ai.tokens || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>API Invocations:</span>
              <span className="font-semibold text-violet-300">{(ai.requestCount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Governance & Pending Actions Hub */}
      <div className="p-6 rounded-2xl bg-[#0E1017] border border-slate-800/90 shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Governance & Moderation Action Queues</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Immediate administrator decisions required across platform queues.
              </p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
            totalQueuedItems > 0 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {totalQueuedItems > 0 ? `${totalQueuedItems} Pending Review` : 'All Queues Clear'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Queue Item 1: Supervisor Verifications */}
          <div 
            onClick={() => onNavigateTab('verifications')}
            className="p-4 rounded-xl bg-[#131722] hover:bg-[#1A2030] border border-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                    Supervisor Queue
                  </h4>
                  <p className="text-xs text-slate-400">Faculty credentials</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                pendingVerifications > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {pendingVerifications}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-200">
              <span>Review credentials</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Queue Item 2: Project Deletions */}
          <div 
            onClick={() => onNavigateTab('governance')}
            className="p-4 rounded-xl bg-[#131722] hover:bg-[#1A2030] border border-slate-800/80 hover:border-rose-500/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 group-hover:text-rose-300 transition-colors">
                    Deletion Requests
                  </h4>
                  <p className="text-xs text-slate-400">Project wipe approval</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400">
                Queue
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-200">
              <span>Inspect deletion queue</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Queue Item 3: Marketplace Disputes & Listings */}
          <div 
            onClick={() => onNavigateTab('governance')}
            className="p-4 rounded-xl bg-[#131722] hover:bg-[#1A2030] border border-slate-800/80 hover:border-indigo-500/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    Marketplace
                  </h4>
                  <p className="text-xs text-slate-400">Listings & Disputes</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                pendingMarketplace > 0 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {pendingMarketplace}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-200">
              <span>Arbitrate disputes</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Queue Item 4: Forum Moderation */}
          <div 
            onClick={() => onNavigateTab('governance')}
            className="p-4 rounded-xl bg-[#131722] hover:bg-[#1A2030] border border-slate-800/80 hover:border-pink-500/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 group-hover:text-pink-300 transition-colors">
                    Forum Reports
                  </h4>
                  <p className="text-xs text-slate-400">Flagged posts</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                pendingForumReports > 0 ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {pendingForumReports}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-200">
              <span>Review community flags</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
