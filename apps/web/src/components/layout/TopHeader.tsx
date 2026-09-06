import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Project } from '@researchos/shared-types';
import { useAuth } from '../../context/AuthContext.js';
import { NotificationBell } from './NotificationBell.js';
import {
  Layers,
  ChevronDown,
  Plus,
  MessageSquare,
  Sparkles,
  Activity,
  UserPlus,
  Key,
  Check,
} from 'lucide-react';

export interface TopHeaderProps {
  userId?: string;
  userRole?: string;
  projects?: Project[];
  activeProject?: Project | null;
  onSelectProject?: (project: Project) => void;
  onOpenNewProjectModal?: () => void;
  onOpenJoinProjectModal?: () => void;
  onOpenNewTaskModal?: () => void;
  onOpenInviteModal?: () => void;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  onNavigate?: (route: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  userId,
  userRole,
  projects = [],
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenJoinProjectModal,
  onOpenNewTaskModal,
  onOpenInviteModal,
  onToggleChat,
  isChatOpen = false,
  onNavigate,
}) => {
  const { user } = useAuth();
  const currentUserId = userId || user?.id;
  const isSupervisor = userRole === 'Supervisor';
  const isPersonal = activeProject?.isPersonal;
  const isOwner = activeProject?.ownerId === currentUserId;

  const canDirectCreateTask = isSupervisor || isPersonal;

  // Project Switcher Dropdown State
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setIsProjectSwitcherOpen(false);
    }, 150);
  }, [cancelClose]);

  const handleMouseEnter = () => {
    cancelClose();
    setIsProjectSwitcherOpen(true);
  };

  const handleMouseLeave = () => {
    scheduleClose();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setIsProjectSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      cancelClose();
    };
  }, [cancelClose]);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0B0A13]/90 backdrop-blur-md border-b border-white/10 z-40 px-6 flex items-center justify-between">
      {/* Left: Brand Identity & Active Project Switcher */}
      <div className="flex items-center space-x-6">
        {/* Brand */}
        <div 
          onClick={() => onNavigate?.('/')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-serif font-bold text-lg text-white tracking-tight">
            Research<span className="text-violet-400">OS</span>
          </span>
        </div>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        {/* Project Switcher Dropdown */}
        {activeProject ? (
          <div className="flex items-center space-x-3">
            <div 
              ref={switcherRef}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="relative"
            >
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsProjectSwitcherOpen((prev) => !prev);
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 select-none ${
                  isProjectSwitcherOpen
                    ? 'bg-gradient-to-r from-violet-950/70 to-indigo-950/70 border-violet-500/60 shadow-[0_0_16px_rgba(139,92,246,0.3)] ring-1 ring-violet-500/40 text-white'
                    : 'bg-white/5 hover:bg-white/[0.08] border-white/10 hover:border-violet-500/30 text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span className="max-w-[160px] truncate">{activeProject.title}</span>
                <ChevronDown 
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ease-out ${
                    isProjectSwitcherOpen
                      ? 'rotate-180 text-violet-300 drop-shadow-[0_0_6px_rgba(167,139,250,0.8)]'
                      : 'text-slate-400'
                  }`} 
                />
              </button>

              {/* Cosmic Popover Menu */}
              {projects.length > 0 && (
                <div 
                  className={`absolute top-full left-0 mt-1.5 w-80 rounded-2xl popover-neon-surface p-1.5 transition-all duration-200 ease-out transform z-50 ${
                    isProjectSwitcherOpen
                      ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto visible'
                      : 'opacity-0 -translate-y-1 scale-98 pointer-events-none invisible'
                  }`}
                >
                  {/* Animated Top Neon Shimmer Line */}
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] overflow-hidden rounded-t-2xl pointer-events-none">
                    <div className="w-full h-full bg-gradient-to-r from-transparent via-violet-400 to-transparent popover-neon-sweep opacity-90" />
                  </div>

                  {/* Hover Bridge */}
                  <div className="absolute -top-2 left-0 right-0 h-2 bg-transparent" />
                  
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-violet-400/90 tracking-wider flex items-center justify-between">
                    <span>Switch Workspace Project</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-200 font-semibold border border-violet-500/30">
                      {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-0.5 p-0.5 custom-scrollbar">
                    {projects.map((p) => {
                      const isSelected = p.id === activeProject.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSelectProject?.(p);
                            setIsProjectSwitcherOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between gap-2 transition-all duration-150 ${
                            isSelected
                              ? 'bg-gradient-to-r from-violet-600/35 via-indigo-600/25 to-transparent text-white font-semibold border-l-2 border-violet-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                              : 'text-slate-300 hover:bg-white/[0.08] hover:text-white hover:translate-x-0.5'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0 truncate">
                            <Layers className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-violet-300' : 'text-slate-400'}`} />
                            <span className="truncate">{p.title}</span>
                            {p.isPersonal && (
                              <span className="text-[9px] bg-violet-500/20 text-violet-200 px-1.5 py-0.5 rounded border border-violet-500/30 shrink-0 font-medium">
                                Personal
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-violet-300 shrink-0 ml-1 drop-shadow-[0_0_6px_rgba(167,139,250,0.8)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-1 pt-1.5 border-t border-white/5 space-y-0.5 mt-1">
                    {onOpenNewProjectModal && (
                      <button
                        onClick={() => {
                          setIsProjectSwitcherOpen(false);
                          onOpenNewProjectModal();
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs rounded-xl flex items-center space-x-2 text-violet-300 hover:bg-violet-600/15 hover:text-white font-medium transition-all hover:translate-x-0.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-violet-400" />
                        <span>Create New Project...</span>
                      </button>
                    )}

                    {onOpenJoinProjectModal && (
                      <button
                        onClick={() => {
                          setIsProjectSwitcherOpen(false);
                          onOpenJoinProjectModal();
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs rounded-xl flex items-center space-x-2 text-cyan-300 hover:bg-cyan-600/15 hover:text-white font-medium transition-all hover:translate-x-0.5"
                      >
                        <Key className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Join with Invite Code...</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status Pill */}
            <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/10 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300 font-medium">{activeProject.status}</span>
              <span className="text-slate-600">|</span>
              <span className="text-violet-400 font-semibold">{activeProject.progressPercent}% Completed</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-slate-400 text-sm font-medium">
            <Layers className="w-4 h-4 text-violet-400" />
            <span>Research Workspace</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2.5">
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>Realtime Sync</span>
        </div>

        {/* Invite Member Button (for collaborative projects) */}
        {activeProject && !activeProject.isPersonal && (isSupervisor || isOwner) && (
          <button
            onClick={onOpenInviteModal}
            className="px-3 py-1.5 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-semibold flex items-center space-x-1.5 transition-all hover:scale-105"
            title="Manage Team & Invites"
          >
            <UserPlus className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Invite / Members</span>
          </button>
        )}

        {/* Propose Task (Researcher in Supervised project) */}
        {activeProject && !activeProject.isPersonal && !isSupervisor && !isOwner && onOpenNewTaskModal && (
          <button
            onClick={onOpenNewTaskModal}
            className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition-all hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Propose Task</span>
          </button>
        )}

        {/* Direct Create Task Button (Supervisor or Personal Project) */}
        {activeProject && canDirectCreateTask && onOpenNewTaskModal && (
          <button
            onClick={onOpenNewTaskModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 flex items-center space-x-1.5 transition-all hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        )}

        {/* Project Realtime Chat Drawer Trigger */}
        {activeProject && onToggleChat && (
          <button
            onClick={onToggleChat}
            className={`p-2 rounded-xl border transition-all ${
              isChatOpen
                ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-600/30'
                : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border-white/10'
            }`}
            title="Toggle Project Discussion Stream"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}

        {/* Notification Center Trigger & Popover */}
        <NotificationBell userId={currentUserId} onNavigate={onNavigate} />
      </div>
    </header>
  );
};
