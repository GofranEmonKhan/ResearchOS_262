import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout.js';
import { KanbanBoard } from '../../components/workspace/KanbanBoard.js';
import { MilestoneTimeline } from '../../components/workspace/MilestoneTimeline.js';
import { WorkspaceCalendar } from '../../components/workspace/WorkspaceCalendar.js';
import { TaskDetailModal } from '../../components/workspace/TaskDetailModal.js';
import { SupervisorReviewModal } from '../../components/workspace/SupervisorReviewModal.js';
import { NewTaskModal } from '../../components/workspace/NewTaskModal.js';
import { NewMilestoneModal } from '../../components/workspace/NewMilestoneModal.js';
import { NewProjectModal } from '../../components/workspace/NewProjectModal.js';
import { JoinProjectModal } from '../../components/workspace/JoinProjectModal.js';
import { ProjectMembersModal } from '../../components/workspace/ProjectMembersModal.js';
import { ProjectChatDrawer } from '../../components/workspace/ProjectChatDrawer.js';
import { Project, Task, Milestone, ProjectMember, TaskStatus, SubmissionFile } from '@researchos/shared-types';
import { supabase } from '../../supabase.js';
import { UserAvatar } from '../../components/common/UserAvatar.js';
import {
  FolderKanban,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  ArrowLeft,
  ArrowRight,
  Layers,
  Target,
  Loader2,
  Key,
  BookOpen,
  Bookmark,
  Sparkles,
  Activity,
  Flame,
} from 'lucide-react';

interface ResearcherWorkspacePageProps {
  onNavigate: (route: string) => void;
  projectId?: string;
  initialTab?: 'dashboard' | 'kanban' | 'calendar';
}

export const ResearcherWorkspacePage: React.FC<ResearcherWorkspacePageProps> = ({ onNavigate, projectId, initialTab }) => {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<string>(initialTab || (projectId ? 'kanban' : 'dashboard'));
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState<boolean>(false);
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false);
  const [isNewMilestoneModalOpen, setIsNewMilestoneModalOpen] = useState<boolean>(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isJoinProjectModalOpen, setIsJoinProjectModalOpen] = useState<boolean>(false);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch('/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data: Project[] = await res.json();
        setProjects(data);
      }
    } catch (err: any) {
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch project sub-resources (tasks, milestones, members)
  const fetchProjectData = async (pId: string) => {
    setIsLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const [tasksRes, milestonesRes, membersRes] = await Promise.all([
        fetch(`/projects/${pId}/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/projects/${pId}/milestones`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/projects/${pId}/members`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (milestonesRes.ok) setMilestones(await milestonesRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
    } catch (err: any) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Sync active project when projectId prop changes (e.g. from URL /projects/:projectId)
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const found = projects.find((p) => p.id === projectId);
      if (found) {
        setActiveProject(found);
        try {
          localStorage.setItem('researchos_last_active_project_id', found.id);
        } catch {}
        if (!initialTab && activeTab === 'dashboard') {
          setActiveTab('kanban');
        }
      }
    } else if (!projectId) {
      // If user navigated directly to /dashboard?tab=kanban or ?tab=calendar and projects are available
      if ((initialTab === 'kanban' || initialTab === 'calendar') && projects.length > 0) {
        const lastId = typeof window !== 'undefined' ? localStorage.getItem('researchos_last_active_project_id') : null;
        const target = (lastId && projects.find((p) => p.id === lastId)) || projects[0];
        if (target) {
          try {
            localStorage.setItem('researchos_last_active_project_id', target.id);
          } catch {}
          setActiveProject(target);
          setActiveTab(initialTab);
          onNavigate(`/projects/${target.id}?tab=${initialTab}`);
          return;
        }
      }
      setActiveProject(null);
      if (!initialTab) {
        setActiveTab('dashboard');
      }
      setTasks([]);
      setMilestones([]);
      setMembers([]);
    }
  }, [projectId, projects, initialTab]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (activeProject) {
      fetchProjectData(activeProject.id);
    }
  }, [activeProject?.id]);

  // Tab change handler — navigate to /dashboard when selecting 'dashboard'
  const handleTabChange = (tab: string) => {
    if (tab === 'dashboard') {
      onNavigate('/dashboard');
      return;
    }

    if ((tab === 'kanban' || tab === 'calendar') && !activeProject) {
      // If currently on dashboard without active project, auto-open last or first project
      const lastId = typeof window !== 'undefined' ? localStorage.getItem('researchos_last_active_project_id') : null;
      const target = (lastId && projects.find((p) => p.id === lastId)) || projects[0];
      if (target) {
        try {
          localStorage.setItem('researchos_last_active_project_id', target.id);
        } catch {}
        setActiveProject(target);
        setActiveTab(tab);
        onNavigate(`/projects/${target.id}?tab=${tab}`);
        return;
      }
    }

    setActiveTab(tab);
    if (activeProject && (tab === 'kanban' || tab === 'calendar')) {
      window.history.replaceState({}, '', `/projects/${activeProject.id}?tab=${tab}`);
    }
  };

  // Select a project and enter its dedicated workspace URL (/projects/:projectId)
  const handleSelectProject = (project: Project) => {
    try {
      localStorage.setItem('researchos_last_active_project_id', project.id);
    } catch {}
    const tabToUse = activeTab !== 'dashboard' ? activeTab : 'kanban';
    onNavigate(`/projects/${project.id}?tab=${tabToUse}`);
  };

  // Task Status Transition Handler
  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus, note?: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token || !activeProject) return;

      let res: Response;
      if (newStatus === 'InProgress') {
        res = await fetch(`/tasks/${taskId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } else if (newStatus === 'Submitted') {
        res = await fetch(`/tasks/${taskId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ progressNote: note }),
        });
      } else {
        res = await fetch(`/tasks/${taskId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update task status');
      }

      await fetchProjectData(activeProject.id);
      await fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  // Submit Task with file attachments
  const handleSubmitTask = async (taskId: string, progressNote: string, files: SubmissionFile[]) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token || !activeProject) return;

    const res = await fetch(`/tasks/${taskId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ progressNote: progressNote || undefined, submissionFiles: files }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to submit task');
    }

    await fetchProjectData(activeProject.id);
    await fetchProjects();
  };

  // Supervisor Review Actions
  const handleApproveTask = async (taskId: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token || !activeProject) return;

    const res = await fetch(`/tasks/${taskId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'Approve' }),
    });

    if (!res.ok) throw new Error('Failed to approve deliverable');
    await fetchProjectData(activeProject.id);
    await fetchProjects();
  };

  const handleRequestRevision = async (taskId: string, note: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token || !activeProject) return;

    const res = await fetch(`/tasks/${taskId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'RequestRevision', revisionNote: note, note }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to request revision');
    }
    await fetchProjectData(activeProject.id);
    await fetchProjects();
  };

  // Approve Proposal
  const handleApproveTaskProposal = async (taskId: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token || !activeProject) return;

    const res = await fetch(`/tasks/${taskId}/approve-proposal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      await fetchProjectData(activeProject.id);
    }
  };

  const handleApproveMilestoneProposal = async (milestoneId: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token || !activeProject) return;

    const res = await fetch(`/milestones/${milestoneId}/approve-proposal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      await fetchProjectData(activeProject.id);
    }
  };

  // Milestone Lock Toggle
  const handleMilestoneLockToggle = async (milestoneId: string, currentLocked: boolean) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token || !activeProject) return;

    const res = await fetch(`/milestones/${milestoneId}/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isLocked: !currentLocked }),
    });

    if (res.ok) {
      await fetchProjectData(activeProject.id);
    }
  };

  // Compute quick stats from all projects
  const totalTasks = projects.reduce((sum, p) => sum + (p.tasksCount || 0), 0);
  const completedProjects = projects.filter((p) => p.status === 'Completed').length;
  const overdueCount = 0; // Placeholder — would need cross-project task due date check

  // ─────────────────────────── RENDER ───────────────────────────
  // ─────────────────────────── RENDER ───────────────────────────
  const renderDashboardHome = () => (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ─── 1. ACADEMIC WORKSTATION HERO BANNER ────────────────────────────────────────── */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-950/40 via-[#090A16]/95 to-indigo-950/40 border border-slate-800/90 shadow-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <UserAvatar
                photoUrl={profile?.photoUrl}
                name={profile?.fullName}
                role={profile?.role}
                size="xl"
                className="ring-2 ring-violet-500/40 shadow-xl shadow-violet-950/50"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#090A16] shadow-sm" title="Online" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Welcome back, {profile?.fullName?.split(' ')[0] || 'Researcher'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  {profile?.role || 'Researcher'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-400">
                <span className="text-slate-200 font-medium">{profile?.institution || 'Research Institute'}</span>
                {profile?.department && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300">{profile?.department}</span>
                  </>
                )}
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-mono text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Realtime Workspace Active
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 self-stretch sm:self-auto">
            <button
              onClick={() => setIsJoinProjectModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer hover:border-slate-600"
            >
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Join Project</span>
            </button>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Personal Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. QUICK METRICS CARDS (LINEAR / VERCEL STYLE) ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Workspaces',
            value: projects.length,
            subtext: 'Across all labs & personal',
            icon: Layers,
            accent: 'from-violet-500/20 via-violet-500/5 to-transparent',
            borderColor: 'border-violet-500/30 hover:border-violet-500/60',
            iconBg: 'bg-violet-500/15 border-violet-500/30 text-violet-400',
            textColor: 'text-violet-300',
          },
          {
            label: 'Scheduled Tasks',
            value: totalTasks,
            subtext: 'Deliverables across milestones',
            icon: Target,
            accent: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
            borderColor: 'border-cyan-500/30 hover:border-cyan-500/60',
            iconBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
            textColor: 'text-cyan-300',
          },
          {
            label: 'Completed Projects',
            value: completedProjects,
            subtext: 'Verified research milestones',
            icon: CheckCircle2,
            accent: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
            borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
            iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
            textColor: 'text-emerald-300',
          },
          {
            label: 'Attention Required',
            value: overdueCount,
            subtext: overdueCount > 0 ? 'Urgent items need review' : 'All deliverables on track',
            icon: overdueCount > 0 ? Flame : Activity,
            accent: 'from-amber-500/20 via-amber-500/5 to-transparent',
            borderColor: 'border-amber-500/30 hover:border-amber-500/60',
            iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
            textColor: 'text-amber-300',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl p-5 bg-[#090A16]/95 border ${stat.borderColor} transition-all duration-200 hover:-translate-y-0.5 shadow-xl space-y-3 relative overflow-hidden group`}
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.accent}`} />
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl border ${stat.iconBg}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {stat.value}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {stat.label}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                {stat.subtext}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 3. MY RESEARCH PROJECTS SECTION ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 rounded-2xl bg-slate-900/20 border border-slate-800/80">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      ) : projects.length === 0 ? (
        <div className="py-20 max-w-lg mx-auto text-center space-y-4 rounded-3xl bg-slate-900/40 border border-slate-800/80 p-8">
          <div className="w-16 h-16 rounded-3xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto shadow-2xl">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Create your Research Workspace</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Organize experimental tasks, track milestone progress, and collaborate in real-time.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsJoinProjectModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Join with Invite Code</span>
            </button>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Personal Workspace</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-400">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  My Research Projects
                </h2>
                <p className="text-xs text-slate-400">
                  Select a workspace to enter its Kanban board, calendar, and research notes
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              {projects.length} Workspaces
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className="text-left rounded-2xl border border-slate-800/90 bg-[#090A16]/95 hover:bg-[#0E1022] hover:border-violet-500/50 p-5 transition-all duration-200 hover:-translate-y-1 shadow-xl hover:shadow-violet-950/40 group flex flex-col justify-between cursor-pointer space-y-4"
              >
                {/* Card Top: Title & Workspace Scope Pill */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                      {project.title}
                    </h3>
                    {project.isPersonal ? (
                      <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 shrink-0">
                        Personal
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30 shrink-0 flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" /> Lab
                      </span>
                    )}
                  </div>

                  {project.abstract && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {project.abstract}
                    </p>
                  )}
                </div>

                {/* Status + Progress Meter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                        project.status === 'Ongoing'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : project.status === 'Planning'
                          ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                          : project.status === 'Writing'
                          ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                          : project.status === 'Completed'
                          ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                          : 'bg-slate-500/15 border-slate-500/30 text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          project.status === 'Ongoing'
                            ? 'bg-emerald-400'
                            : project.status === 'Planning'
                            ? 'bg-sky-400'
                            : project.status === 'Writing'
                            ? 'bg-purple-400'
                            : 'bg-violet-400'
                        }`}
                      />
                      {project.status}
                    </span>

                    <span className="font-mono font-bold text-slate-300 text-[11px]">
                      {project.progressPercent}%
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-full h-1.5 rounded-full bg-slate-900 border border-slate-800/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-all duration-300"
                      style={{ width: `${Math.max(project.progressPercent, 4)}%` }}
                    />
                  </div>
                </div>

                {/* Domain Tags */}
                {project.domainTags && project.domainTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.domainTags.slice(0, 3).map((tag: string) => (
                      <span
                        key={tag}
                        className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-300 border border-slate-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer: Collaborators, Tasks, & Action Arrow */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-3">
                    {project.membersCount !== undefined && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{project.membersCount}</span>
                      </span>
                    )}
                    {project.tasksCount !== undefined && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{project.tasksCount} tasks</span>
                      </span>
                    )}
                  </div>

                  <span className="text-violet-400 group-hover:text-violet-300 font-bold text-xs flex items-center gap-1">
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── 4. LITERATURE DISCOVERY & READING QUEUE CARD ───────────────────────────── */}
      <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-r from-violet-950/30 via-[#090A16]/95 to-indigo-950/30 p-6 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/35 flex items-center justify-center text-violet-300 shrink-0 shadow-lg shadow-violet-600/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-extrabold text-white flex flex-wrap items-center gap-2">
              <span>Literature Library & Reading Queue</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                <Bookmark className="w-3 h-3 fill-amber-400" />
                Required Reading
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Upload PDF papers, extract metadata via CrossRef & OpenAlex, highlight text with scale-invariant coordinates, and synthesize research gaps in the Smart Research Sidebar.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/literature')}
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all hover:scale-105 shrink-0 flex items-center gap-2 cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>Open Library</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const renderProjectWorkspace = () => (
    <div className="space-y-6">
      {/* Back to Dashboard + Sub-tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleTabChange('dashboard')}
            className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <div className="h-5 w-px bg-white/10" />

          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'kanban'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'calendar'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Roadmap & Calendar</span>
          </button>

          <button
            onClick={() => setIsNewMilestoneModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-slate-300 text-xs font-medium transition-all"
          >
            <span>+ Milestone</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <button
            onClick={() => setIsMembersModalOpen(true)}
            className="hover:text-violet-300 transition-colors"
          >
            Team: <strong className="text-white">{members.length} members</strong>
          </button>
        </div>
      </div>

      {/* Tab Views */}
      {activeTab === 'kanban' ? (
        <KanbanBoard
          tasks={tasks}
          milestones={milestones}
          members={members}
          project={activeProject!}
          currentUserId={user?.id}
          currentUserRole={profile?.role}
          onTaskClick={(t) => {
            setSelectedTask(t);
            setIsTaskDetailOpen(true);
          }}
          onTaskMove={handleTaskStatusChange}
          onReviewTask={(t) => setReviewingTask(t)}
          onApproveProposal={handleApproveTaskProposal}
          onOpenNewTask={() => setIsNewTaskModalOpen(true)}
        />
      ) : (
        <div className="space-y-8">
          <MilestoneTimeline
            milestones={milestones}
            tasks={tasks}
            project={activeProject!}
            currentUserId={user?.id}
            currentUserRole={profile?.role}
            onLockToggle={handleMilestoneLockToggle}
            onApproveProposal={handleApproveMilestoneProposal}
            onOpenNewMilestone={() => setIsNewMilestoneModalOpen(true)}
          />
          <WorkspaceCalendar
            tasks={tasks}
            milestones={milestones}
            onTaskClick={(t) => {
              setSelectedTask(t);
              setIsTaskDetailOpen(true);
            }}
          />
        </div>
      )}
    </div>
  );

  return (
    <WorkspaceLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onNavigate={onNavigate}
      headerProps={{
        userId: user?.id,
        userRole: profile?.role,
        projects,
        activeProject,
        onSelectProject: handleSelectProject,
        onOpenNewProjectModal: () => setIsNewProjectModalOpen(true),
        onOpenJoinProjectModal: () => setIsJoinProjectModalOpen(true),
        onOpenNewTaskModal: () => setIsNewTaskModalOpen(true),
        onOpenInviteModal: () => setIsMembersModalOpen(true),
        onToggleChat: () => setIsChatOpen(!isChatOpen),
        isChatOpen,
      }}
    >
      {/* Dashboard Home vs Project Workspace vs Empty Tab State */}
      {activeProject ? (
        renderProjectWorkspace()
      ) : activeTab === 'kanban' || activeTab === 'calendar' ? (
        <div className="py-24 max-w-lg mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto shadow-2xl">
            {activeTab === 'calendar' ? <Calendar className="w-8 h-8" /> : <FolderKanban className="w-8 h-8" />}
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {activeTab === 'calendar' ? 'No Active Milestone Roadmap' : 'No Active Research Workspace'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {activeTab === 'calendar'
              ? 'Milestone timelines and calendars are linked to research projects. Create your personal workspace or join an existing project to begin tracking milestones.'
              : 'Workspace Kanban boards require an active research project. Create your personal workspace or join an existing lab project to start organizing tasks.'}
          </p>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => setIsJoinProjectModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all flex items-center space-x-2"
            >
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Join with Invite Code</span>
            </button>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all hover:scale-105 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Personal Workspace</span>
            </button>
          </div>
        </div>
      ) : (
        renderDashboardHome()
      )}

      {/* Task Detail Modal — handles inline review actions for supervisors */}
      <TaskDetailModal
        task={selectedTask}
        project={activeProject!}
        milestones={milestones}
        currentUserId={user?.id}
        currentUserRole={profile?.role}
        isOpen={isTaskDetailOpen}
        onClose={() => {
          setIsTaskDetailOpen(false);
          setSelectedTask(null);
        }}
        onStatusChange={handleTaskStatusChange}
        onReviewTask={(t) => setReviewingTask(t)}
        onApprove={handleApproveTask}
        onRequestRevision={handleRequestRevision}
        onSubmitTask={handleSubmitTask}
      />

      {/* Supervisor Review Modal — fallback for quick review from Kanban cards */}
      <SupervisorReviewModal
        task={reviewingTask}
        isOpen={!!reviewingTask}
        onClose={() => setReviewingTask(null)}
        onApprove={handleApproveTask}
        onRequestRevision={handleRequestRevision}
      />

      {/* New Task Modal */}
      {activeProject && (
        <NewTaskModal
          project={activeProject}
          milestones={milestones}
          members={members}
          currentUserId={user?.id}
          currentUserRole={profile?.role}
          isOpen={isNewTaskModalOpen}
          onClose={() => setIsNewTaskModalOpen(false)}
          onTaskCreated={() => fetchProjectData(activeProject.id)}
        />
      )}

      {/* New Milestone Modal */}
      {activeProject && (
        <NewMilestoneModal
          project={activeProject}
          currentUserId={user?.id}
          currentUserRole={profile?.role}
          isOpen={isNewMilestoneModalOpen}
          onClose={() => setIsNewMilestoneModalOpen(false)}
          onMilestoneCreated={() => fetchProjectData(activeProject.id)}
        />
      )}

      {/* Project Members Modal */}
      {activeProject && (
        <ProjectMembersModal
          project={activeProject}
          members={members}
          currentUserId={user?.id}
          currentUserRole={profile?.role}
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          onRefreshMembers={() => fetchProjectData(activeProject.id)}
        />
      )}

      {/* Realtime Project Chat Drawer */}
      <ProjectChatDrawer
        project={activeProject}
        currentUserId={user?.id}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* New Research Project Creation Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        userRole={profile?.role}
        onProjectCreated={(newProj) => {
          setProjects((prev) => [newProj, ...prev]);
          handleSelectProject(newProj);
        }}
      />

      {/* Join Project Modal */}
      <JoinProjectModal
        isOpen={isJoinProjectModalOpen}
        onClose={() => setIsJoinProjectModalOpen(false)}
        onProjectJoined={(joinedProj) => {
          setProjects((prev) => [joinedProj, ...prev.filter((p) => p.id !== joinedProj.id)]);
          handleSelectProject(joinedProj);
        }}
      />
    </WorkspaceLayout>
  );
};
