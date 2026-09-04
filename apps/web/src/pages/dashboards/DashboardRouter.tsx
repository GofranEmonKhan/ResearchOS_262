import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { ResearcherWorkspacePage } from './ResearcherWorkspacePage.js';
import { SupervisorDashboardPage } from './SupervisorDashboardPage.js';
import { AdminConsolePage } from './AdminConsolePage.js';
import { CompleteProfilePage } from '../auth/CompleteProfilePage.js';
import { Loader2, ShieldAlert } from 'lucide-react';

interface DashboardRouterProps {
  onNavigate: (route: string) => void;
  currentRoute?: string;
}

export const DashboardRouter: React.FC<DashboardRouterProps> = ({ onNavigate, currentRoute }) => {
  const { user, profile, loading } = useAuth();

  // Extract projectId if navigating to /projects/:projectId or /dashboard/projects/:projectId
  let targetProjectId: string | undefined;
  if (currentRoute?.startsWith('/projects/')) {
    targetProjectId = currentRoute.replace('/projects/', '').split('/')[0];
  } else if (currentRoute?.startsWith('/dashboard/projects/')) {
    targetProjectId = currentRoute.replace('/dashboard/projects/', '').split('/')[0];
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
        <p className="text-xs text-slate-500 font-mono">Loading live academic session & role profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Please sign in with your institutional credentials to access your research workspace.
        </p>
        <button
          onClick={() => onNavigate('/login')}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all"
        >
          Sign In to ResearchOS
        </button>
      </div>
    );
  }

  // If user is Suspended
  if (profile?.status === 'Suspended') {
    return (
      <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-red-400 mb-2">Account Suspended</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6">
          Your account has been placed under administrative suspension. Live API and workspace access have been revoked. Please contact your system administrator.
        </p>
        <button
          onClick={() => onNavigate('/login')}
          className="px-5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          Return to Sign In
        </button>
      </div>
    );
  }

  // If profile is missing institutional details (e.g. Google OAuth first-time user)
  if (profile && (!profile.institution || !profile.department)) {
    return <CompleteProfilePage onNavigate={onNavigate} />;
  }

  // Role-Based Dashboard Dispatch
  switch (profile?.role) {
    case 'Admin':
      return <AdminConsolePage onNavigate={onNavigate} />;
    case 'Supervisor':
      return <SupervisorDashboardPage onNavigate={onNavigate} projectId={targetProjectId} />;
    case 'Researcher':
    default:
      return <ResearcherWorkspacePage onNavigate={onNavigate} projectId={targetProjectId} />;
  }
};
