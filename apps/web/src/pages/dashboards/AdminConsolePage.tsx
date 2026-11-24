import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../lib/api.js';
import { Logo } from '../../components/brand/Logo.js';
import { 
  ShieldCheck, 
  Users, 
  FileCheck2,
  History, 
  Scale, 
  Activity, 
  Sparkles, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle,
  LayoutDashboard
} from 'lucide-react';
import { AdminPlatformOverview } from '@researchos/shared-types';
import { 
  AdminOverviewTab, 
  AdminUserDirectoryTab, 
  AdminVerificationsTab, 
  AdminAuditLogsTab, 
  AdminGovernanceTab, 
  AdminSystemHealthTab 
} from '../../components/admin/index.js';
import { AdminAiConfigPanel } from '../../components/ai/index.js';

export type AdminTabId = 'overview' | 'users' | 'verifications' | 'audit' | 'governance' | 'health' | 'ai';

interface AdminConsolePageProps {
  onNavigate: (route: string) => void;
}

export const AdminConsolePage: React.FC<AdminConsolePageProps> = ({ onNavigate }) => {
  const { signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [overview, setOverview] = useState<AdminPlatformOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleNotify = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
  };

  const navTabs: { id: AdminTabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Platform Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'User Directory & RBAC', icon: <Users className="w-4 h-4" />, badge: overview?.users?.total },
    { 
      id: 'verifications', 
      label: 'Supervisor Queue', 
      icon: <FileCheck2 className="w-4 h-4" />, 
      badge: overview?.pendingSupervisorVerifications 
    },
    { id: 'audit', label: 'Audit Log Explorer', icon: <History className="w-4 h-4" /> },
    { 
      id: 'governance', 
      label: 'Governance & Deletions', 
      icon: <Scale className="w-4 h-4" />,
      badge: overview ? (overview.openDisputes + overview.pendingMarketplaceListings + overview.pendingForumReports) : undefined
    },
    { id: 'health', label: 'System Health & Storage', icon: <Activity className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Platform Config', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#07070C] text-slate-100 flex flex-col font-sans">
      {/* Fixed Header Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-[#0A0914]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between z-50 shadow-md">
        <div className="flex items-center space-x-4 sm:space-x-6">
          <Logo
            size="sm"
            showBadge={false}
            onClick={() => onNavigate('/dashboard')}
          />
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center space-x-2">
            <span className="font-bold text-sm text-white">Platform Governance Command Center</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrator Active</span>
          </div>

          <button
            onClick={() => signOut().then(() => onNavigate('/'))}
            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 border border-white/10 text-slate-400 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-24 sm:pt-28 pb-16 space-y-6">
        {/* Status Notification Banner */}
        {statusMessage && (
          <div className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-150 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
            <button 
              onClick={() => setStatusMessage(null)} 
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Command Center Tabs Navigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-thin">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25 border border-violet-500'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-violet-300 border border-violet-500/30'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Viewport */}
        <div className="pt-2">
          {activeTab === 'overview' && (
            <AdminOverviewTab
              overview={overview}
              isLoading={isLoadingOverview}
              onRefresh={fetchOverview}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'users' && (
            <AdminUserDirectoryTab onNotify={handleNotify} />
          )}

          {activeTab === 'verifications' && (
            <AdminVerificationsTab
              onNotify={handleNotify}
              onRefreshOverview={fetchOverview}
            />
          )}

          {activeTab === 'audit' && (
            <AdminAuditLogsTab onNotify={handleNotify} />
          )}

          {activeTab === 'governance' && (
            <AdminGovernanceTab
              onNotify={handleNotify}
              onNavigate={onNavigate}
              onRefreshOverview={fetchOverview}
            />
          )}

          {activeTab === 'health' && (
            <AdminSystemHealthTab onNotify={handleNotify} />
          )}

          {activeTab === 'ai' && (
            <AdminAiConfigPanel onNotify={handleNotify} />
          )}
        </div>
      </main>
    </div>
  );
};
