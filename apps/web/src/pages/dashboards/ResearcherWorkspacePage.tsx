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
import { Project, Task, Milestone, ProjectMember, TaskStatus } from '@researchos/shared-types';
import { supabase } from '../../supabase.js';
import { UserAvatar } from '../../components/common/UserAvatar.js';
import {
  FolderKanban,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  ArrowLeft,
  Layers,
  Target,
  Loader2,
  Key,
  BookOpen,
  Bookmark,
} from 'lucide-react';

interface ResearcherWorkspacePageProps {
  onNavigate: (route: string) => void;
  projectId?: string;
}

export const ResearcherWorkspacePage: React.FC<ResearcherWorkspacePageProps> = ({ onNavigate, projectId }) => {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<string>(projectId ? 'kanban' : 'dashboard');
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
        if (activeTab === 'dashboard') {
          setActiveTab('kanban');
        }
      }
    } else if (!projectId) {
      setActiveProject(null);
      setActiveTab('dashboard');
      setTasks([]);
      setMilestones([]);
      setMembers([]);
    }
  }, [projectId, projects]);

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
    setActiveTab(tab);
  };

  // Select a project and enter its dedicated workspace URL (/projects/:projectId)
  const handleSelectProject = (project: Project) => {
    onNavigate(`/projects/${project.id}`);
  };

  // Task Status Transition Handler
  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus, note?: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token || !activeProject) return;

      const endpoint =
        newStatus === 'InProgress'
          ? `/tasks/${taskId}/start`
          : newStatus === 'Submitted'
          ? `/tasks/${taskId}/submit`
          : `/tasks/${taskId}`;

      const method = newStatus === 'InProgress' || newStatus === 'Submitted' ? 'POST' : 'PATCH';
      const body = newStatus === 'InProgress' || newStatus === 'Submitted' ? undefined : JSON.stringify({ status: newStatus, revisionNote: note });

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update task status');
      }

      await fetchProjectData(activeProject.id);
      await fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
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
      body: JSON.stringify({ action: 'RequestRevision', note }),
    });

    if (!res.ok) throw new Error('Failed to request revision');
    await fetchProjectData(activeProject.id);
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
  const renderDashboardHome = () => (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-950/50 via-[#0E1118] to-violet-950/30 border border-indigo-500/20 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <UserAvatar
              photoUrl={profile?.photoUrl}
              name={profile?.fullName}
              role={profile?.role}
              size="xl"
              className="ring-2 ring-indigo-500/30 shadow-lg"
            />
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Welcome back, {profile?.fullName?.split(' ')[0] || 'Researcher'}
              </h1>
              <p className="text-sm text-slate-400">
                {profile?.institution} · {profile?.department} · <span className="text-indigo-400 font-medium">{profile?.role}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={() => setIsJoinProjectModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center space-x-2"
            >
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Join Project</span>
            </button>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all hover:scale-105 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Personal Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: projects.length, icon: Layers, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'Active Tasks', value: totalTasks, icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
          { label: 'Completed', value: completedProjects, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Project Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      ) : projects.length === 0 ? (
        <div className="py-24 max-w-lg mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto shadow-2xl">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Create your Research Workspace</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Organize experimental tasks, track milestone progress, and collaborate in real-time.
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
        <div>
          <h2 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
            <FolderKanban className="w-4 h-4 text-violet-400" />
            <span>My Research Projects</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className="text-left rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/30 p-5 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate pr-2">
                    {project.title}
                  </h3>
                  {project.isPersonal && (
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                      Personal
                    </span>
                  )}
                </div>

                {/* Status + Progress */}
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    project.status === 'Ongoing' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    project.status === 'Planning' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                    project.status === 'Completed' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' :
                    'bg-slate-500/10 border-slate-500/20 text-slate-400'
                  }`}>
                    {project.status}
                  </span>
                  <span className="text-[11px] text-violet-400 font-medium">{project.progressPercent}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-white/5 mb-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                    style={{ width: `${project.progressPercent}%` }}
                  />
                </div>

                {/* Domain Tags */}
                {project.domainTags && project.domainTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.domainTags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/15">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Meta Row */}
                <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                  {project.membersCount !== undefined && (
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{project.membersCount}</span>
                    </span>
                  )}
                  {project.tasksCount !== undefined && (
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{project.tasksCount} tasks</span>
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Literature Discovery & Reading Queue Card */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-violet-950/20 via-surface-2 to-indigo-950/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Literature Library & Reading Queue</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                <Bookmark className="w-3 h-3 fill-amber-400" />
                Required Reading
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Upload PDF papers, extract metadata via CrossRef & OpenAlex, highlight text with scale-invariant coordinates, and synthesize research gaps in the Smart Research Sidebar.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/literature')}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all hover:scale-105 shrink-0 flex items-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          <span>Open Library</span>
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
      {/* Dashboard Home vs Project Workspace */}
      {activeProject ? renderProjectWorkspace() : renderDashboardHome()}

      {/* Task Detail Modal */}
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
      />

      {/* Supervisor Review Modal */}
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
