import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  BookOpen,
  FlaskConical,
  FileText,
  MessagesSquare,
  Store,
  Sparkles,
  LogOut,
  ShieldCheck,
  GraduationCap,
  Microscope,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { UserAvatar } from '../common/UserAvatar.js';
import { AiUsageIndicator, AiCoPilotModal } from '../ai/index.js';

export interface AppSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNavigate?: (route: string) => void;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  isNavigate?: boolean;
  route?: string;
  badge?: string;
  glow?: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab = 'dashboard',
  onTabChange,
  onNavigate,
  isHovered: controlledHovered,
  onHoverChange,
}) => {
  const { profile, signOut } = useAuth();
  const [internalHovered, setInternalHovered] = useState(false);
  const [isAiCoPilotOpen, setIsAiCoPilotOpen] = useState(false);

  const isExpanded = controlledHovered !== undefined ? controlledHovered : internalHovered;

  const handleMouseEnter = () => {
    setInternalHovered(true);
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    setInternalHovered(false);
    onHoverChange?.(false);
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate?.('/');
  };

  // Navigation items — workspace-internal items switch tabs, others navigate
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      category: 'Workspace',
      isNavigate: true,
      route: '/dashboard',
    },
    {
      id: 'kanban',
      label: 'Workspace Board',
      icon: FolderKanban,
      category: 'Workspace',
      isNavigate: false,
    },
    {
      id: 'calendar',
      label: 'Milestones & Calendar',
      icon: Calendar,
      category: 'Workspace',
      isNavigate: false,
    },
    {
      id: 'literature',
      label: 'Literature Discovery',
      icon: BookOpen,
      category: 'Research Engine',
      isNavigate: true,
      route: '/literature',
    },
    {
      id: 'experiments',
      label: 'Experiment Tracker',
      icon: FlaskConical,
      category: 'Research Engine',
      isNavigate: true,
      route: '/experiments',
    },
    {
      id: 'manuscripts',
      label: 'Manuscripts & Review',
      icon: FileText,
      category: 'Publishing',
      isNavigate: true,
      route: '/manuscripts',
    },
    {
      id: 'community',
      label: 'Community & Peer Feed',
      icon: MessagesSquare,
      category: 'Community',
      isNavigate: true,
      route: '/community',
    },
    {
      id: 'marketplace',
      label: 'Equipment & Services',
      icon: Store,
      category: 'Ecosystem',
    },
    {
      id: 'ai-assistant',
      label: 'Research AI Co-Pilot',
      icon: Sparkles,
      category: 'Ecosystem',
      glow: true,
    },
  ];

  const getRoleIcon = () => {
    if (profile?.role === 'Admin') return <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />;
    if (profile?.role === 'Supervisor') return <GraduationCap className="w-3.5 h-3.5 text-violet-400" />;
    return <Microscope className="w-3.5 h-3.5 text-indigo-400" />;
  };

  return (
    <>
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] z-40 bg-[#07080F]/95 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col justify-between transition-all duration-300 ease-in-out select-none shadow-2xl shadow-black/80 ${
          isExpanded ? 'w-64' : 'w-[72px]'
        }`}
        aria-label="Sidebar Navigation"
      >
        {/* Navigation Item List */}
        <nav className="p-2.5 space-y-1 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'ai-assistant') {
                    setIsAiCoPilotOpen(true);
                    return;
                  }
                  // Handle kanban & calendar tabs
                  if (item.id === 'kanban' || item.id === 'calendar') {
                    if (onTabChange) {
                      onTabChange(item.id);
                    } else if (onNavigate) {
                      const lastId = typeof window !== 'undefined' ? localStorage.getItem('researchos_last_active_project_id') : null;
                      if (lastId) {
                        onNavigate(`/projects/${lastId}?tab=${item.id}`);
                      } else {
                        onNavigate(`/dashboard?tab=${item.id}`);
                      }
                    }
                    return;
                  }
                  // If item navigates (like Dashboard), call onNavigate
                  if (item.isNavigate && item.route && onNavigate) {
                    onNavigate(item.route);
                  }
                  // Always update the active tab
                  if (onTabChange) onTabChange(item.id);
                }}
                className={`w-full flex items-center rounded-xl px-2.5 py-2 transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/25 via-indigo-600/15 to-transparent text-white border border-violet-500/35 shadow-lg shadow-violet-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60'
                }`}
                title={!isExpanded ? item.label : undefined}
              >
                {/* Active Indicator Left Accent Bar */}
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-violet-400 to-indigo-500 rounded-r shadow-[0_0_10px_rgba(139,92,246,0.6)]" />
                )}

                {/* Icon Container with subtle glass tinting */}
                <div
                  className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-inner'
                      : item.glow
                      ? 'text-amber-400 group-hover:text-amber-300 group-hover:bg-amber-500/10'
                      : 'text-slate-400 group-hover:text-slate-100 group-hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                </div>

                {/* Label & Badges with enhanced contrast */}
                <div
                  className={`flex items-center justify-between flex-1 ml-3 overflow-hidden whitespace-nowrap transition-all duration-200 ${
                    isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
                  }`}
                >
                  <span
                    className={`text-xs font-semibold tracking-normal truncate ${
                      isActive ? 'text-white font-bold' : 'text-slate-200 group-hover:text-white'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-slate-300 group-hover:text-white">
                      {item.badge}
                    </span>
                  )}
                  {item.glow && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/20">
                      PRO
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile & Actions */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50">
          {/* AI Quota Meter */}
          <div className="mb-2.5">
            {isExpanded ? (
              <AiUsageIndicator variant="compact" />
            ) : (
              <div className="flex justify-center">
                <AiUsageIndicator variant="icon" />
              </div>
            )}
          </div>

          {/* User Card */}
          <div
            onClick={() => onNavigate?.('/profile')}
            className={`flex items-center p-2 rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 cursor-pointer transition-all group ${
              isExpanded ? 'space-x-3' : 'justify-center'
            }`}
            title={!isExpanded ? `${profile?.fullName || 'User'} (${profile?.role})` : undefined}
          >
            <div className="relative shrink-0">
              <UserAvatar
                photoUrl={profile?.photoUrl}
                name={profile?.fullName}
                role={profile?.role}
                size="md"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#07080F] rounded-full" />
            </div>

            <div
              className={`flex flex-col flex-1 min-w-0 transition-opacity duration-200 overflow-hidden whitespace-nowrap ${
                isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
              }`}
            >
              <span className="text-xs font-bold text-slate-100 truncate group-hover:text-violet-300 transition-colors">
                {profile?.fullName || 'Research Scientist'}
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                {getRoleIcon()}
                <span className="text-[11px] font-medium text-slate-400 capitalize">
                  {profile?.role || 'Member'}
                </span>
              </div>
            </div>
          </div>

          {/* Sign Out Action */}
          <button
            onClick={handleSignOut}
            className={`mt-2 w-full flex items-center rounded-xl p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer ${
              isExpanded ? 'space-x-2.5 px-3' : 'justify-center'
            }`}
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-rose-400" />
            <span
              className={`text-xs font-semibold transition-opacity duration-200 overflow-hidden whitespace-nowrap ${
                isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
              }`}
            >
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Research AI Co-Pilot Modal */}
      <AiCoPilotModal
        isOpen={isAiCoPilotOpen}
        onClose={() => setIsAiCoPilotOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
};
