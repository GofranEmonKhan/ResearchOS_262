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

export interface AppSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNavigate?: (route: string) => void;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
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

  // Navigation items — workspace-internal items only switch tabs, they DON'T navigate.
  // "Dashboard" is the ONLY item that navigates to /dashboard.
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      category: 'Workspace',
      isNavigate: true,  // This one navigates
      route: '/dashboard',
    },
    {
      id: 'kanban',
      label: 'Workspace Board',
      icon: FolderKanban,
      category: 'Workspace',
      isNavigate: false,  // Tab switch only
    },
    {
      id: 'calendar',
      label: 'Milestones & Calendar',
      icon: Calendar,
      category: 'Workspace',
      isNavigate: false,  // Tab switch only
    },
    {
      id: 'literature',
      label: 'Literature Discovery',
      icon: BookOpen,
      category: 'Research Engine',
      badge: 'M03',
      isNavigate: true,
      route: '/literature',
    },
    {
      id: 'experiments',
      label: 'Lab & Experiments',
      icon: FlaskConical,
      category: 'Research Engine',
      badge: 'M04',
    },
    {
      id: 'manuscripts',
      label: 'Manuscripts & Review',
      icon: FileText,
      category: 'Publishing',
      badge: 'M05',
    },
    {
      id: 'community',
      label: 'Community & Peer Feed',
      icon: MessagesSquare,
      category: 'Publishing',
      badge: 'M06',
    },
    {
      id: 'marketplace',
      label: 'Equipment & Services',
      icon: Store,
      category: 'Ecosystem',
      badge: 'M07',
    },
    {
      id: 'ai-assistant',
      label: 'Research AI Co-Pilot',
      icon: Sparkles,
      category: 'Ecosystem',
      badge: 'M08',
      glow: true,
    },
  ];

  const getRoleIcon = () => {
    if (profile?.role === 'Admin') return <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />;
    if (profile?.role === 'Supervisor') return <GraduationCap className="w-3.5 h-3.5 text-violet-400" />;
    return <Microscope className="w-3.5 h-3.5 text-indigo-400" />;
  };

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] z-40 bg-[#0A0914]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col justify-between transition-all duration-300 ease-in-out select-none shadow-2xl shadow-black/80 ${
        isExpanded ? 'w-64' : 'w-[72px]'
      }`}
      aria-label="Sidebar Navigation"
    >
      {/* Navigation Item List */}
      <nav className="p-3 space-y-1.5 overflow-y-auto flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                // If item navigates (like Dashboard), call onNavigate
                if (item.isNavigate && item.route && onNavigate) {
                  onNavigate(item.route);
                }
                // Always update the active tab
                if (onTabChange) onTabChange(item.id);
              }}
              className={`w-full flex items-center rounded-xl p-2.5 transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600/30 to-indigo-600/10 text-white border border-violet-500/30 shadow-lg shadow-violet-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
              title={!isExpanded ? item.label : undefined}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-r" />
              )}

              {/* Icon */}
              <div
                className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-lg ${
                  isActive
                    ? 'text-violet-400'
                    : item.glow
                    ? 'text-amber-400 group-hover:text-amber-300'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              </div>

              {/* Label & Badges */}
              <div
                className={`flex items-center justify-between flex-1 ml-3 overflow-hidden whitespace-nowrap transition-all duration-200 ${
                  isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
                }`}
              >
                <span className="text-xs font-medium truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 group-hover:text-slate-300">
                    {item.badge}
                  </span>
                )}
                {item.glow && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 animate-pulse">
                    PRO
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile & Actions */}
      <div className="p-3 border-t border-white/10 bg-white/[0.01]">
        {/* User Card */}
        <div
          onClick={() => onNavigate?.('/profile')}
          className={`flex items-center p-2 rounded-xl hover:bg-white/[0.05] cursor-pointer transition-colors group ${
            isExpanded ? 'space-x-3' : 'justify-center'
          }`}
          title={!isExpanded ? `${profile?.fullName || 'User'} (${profile?.role})` : undefined}
        >
          <UserAvatar
            photoUrl={profile?.photoUrl}
            name={profile?.fullName}
            role={profile?.role}
            size="md"
          />

          <div
            className={`flex flex-col flex-1 min-w-0 transition-opacity duration-200 overflow-hidden whitespace-nowrap ${
              isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
            }`}
          >
            <span className="text-xs font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
              {profile?.fullName || 'Research Scientist'}
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              {getRoleIcon()}
              <span className="text-[10px] text-slate-400 capitalize">{profile?.role || 'Member'}</span>
            </div>
          </div>
        </div>

        {/* Sign Out Action */}
        <button
          onClick={handleSignOut}
          className={`mt-2 w-full flex items-center rounded-xl p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all ${
            isExpanded ? 'space-x-3 px-3' : 'justify-center'
          }`}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span
            className={`text-xs font-medium transition-opacity duration-200 overflow-hidden whitespace-nowrap ${
              isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
            }`}
          >
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
};
