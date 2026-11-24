import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Building,
  Layers,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  Loader2,
  BookOpen,
  FolderPlus,
  Folder,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../lib/api.js';
import { Manuscript, ManuscriptStatus, Project } from '@researchos/shared-types';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout.js';
import { CreateManuscriptModal } from '../../components/manuscripts/CreateManuscriptModal.js';
import { NoticeModal } from '../../components/common/NoticeModal.js';
import { HoverSelect } from '../../components/common/HoverSelect.js';
import { supabase } from '../../supabase.js';

interface ManuscriptsPageProps {
  onNavigate: (route: string) => void;
}

export const ManuscriptsPage: React.FC<ManuscriptsPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProjectRequiredModalOpen, setIsProjectRequiredModalOpen] = useState(false);

  // Fetch manuscripts & projects
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Resolve current user session token
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      const [manuscriptRes, projectRes] = await Promise.all([
        api.listManuscripts({
          search: search.trim() || undefined,
          status: statusFilter !== 'ALL' ? (statusFilter as ManuscriptStatus) : undefined,
          projectId: selectedProjectId || undefined,
        }).catch(() => ({ manuscripts: [], total: 0 })),
        token
          ? fetch('/projects', {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then(async (res) => (res.ok ? await res.json() : []))
              .catch(() => [])
          : api.getProjects().catch(() => []),
      ]);

      setManuscripts(manuscriptRes.manuscripts || []);
      setProjects(projectRes || []);
    } catch (err) {
      console.error('Failed to load manuscripts:', err);
    } finally {
      setLoading(false);
    }
  }, [user, search, statusFilter, selectedProjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute publication metrics
  const totalCount = manuscripts.length;
  const underReviewCount = manuscripts.filter((m) => m.status === 'UnderInternalReview' || m.status === 'Revising').length;
  const readyCount = manuscripts.filter((m) => m.status === 'ReadyForSubmission' || m.status === 'Submitted' || m.status === 'Published').length;

  const getStatusBadge = (status: ManuscriptStatus) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
            Draft
          </span>
        );
      case 'UnderInternalReview':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Under Review
          </span>
        );
      case 'Revising':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            Revising
          </span>
        );
      case 'ReadyForSubmission':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Ready for Submission
          </span>
        );
      case 'Submitted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
            Submitted
          </span>
        );
      case 'Published':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-200 border border-teal-500/30">
            Published
          </span>
        );
    }
  };

  return (
    <WorkspaceLayout
      activeTab="manuscripts"
      onTabChange={(tab) => {
        if (tab === 'dashboard') {
          onNavigate('/dashboard');
        } else if (tab === 'kanban' || tab === 'calendar') {
          const lastId = typeof window !== 'undefined' ? localStorage.getItem('researchos_last_active_project_id') : null;
          if (lastId) {
            onNavigate(`/projects/${lastId}?tab=${tab}`);
          } else {
            onNavigate(`/dashboard?tab=${tab}`);
          }
        }
      }}
      onNavigate={onNavigate}
      headerProps={{
        userId: user?.id,
        userRole: profile?.role,
        projects,
      }}
    >
      <div className="max-w-7xl mx-auto space-y-8 select-none">
        {/* Welcome / Header Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-amber-950/30 via-[#0B0F17] to-slate-900/60 border border-amber-500/20 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded border border-amber-500/30">
                  Module 05: Academic Publishing
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Manuscript Writing & Peer Review
              </h1>
              <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                Distraction-free scholarly drafting, IMRAD structure, in-text citation grounding, and rigorous internal peer review governance.
              </p>
            </div>

            <button
              onClick={() => {
                if (projects.length === 0) {
                  setIsProjectRequiredModalOpen(true);
                  return;
                }
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm shadow-lg shadow-amber-600/25 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Manuscript</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white">{totalCount}</span>
                <p className="text-xs text-slate-300 font-medium">Total Manuscripts</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white">{underReviewCount}</span>
                <p className="text-xs text-slate-300 font-medium">Under Internal Review</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white">{readyCount}</span>
                <p className="text-xs text-slate-300 font-medium">Ready / Submitted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search manuscripts by title, abstract, or venue..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <HoverSelect
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Statuses"
              className="w-48"
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'Draft', label: 'Drafts' },
                { value: 'UnderInternalReview', label: 'Under Review', badge: 'Review' },
                { value: 'Revising', label: 'Author Revisions', badge: 'Revising' },
                { value: 'ReadyForSubmission', label: 'Ready for Submission' },
                { value: 'Submitted', label: 'Submitted' },
                { value: 'Published', label: 'Published' },
              ]}
            />

            {/* Project Filter */}
            {projects.length > 0 && (
              <HoverSelect
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                placeholder="All Projects"
                className="w-56"
                options={[
                  { value: '', label: 'All Projects' },
                  ...projects.map((p) => ({
                    value: p.id,
                    label: p.title,
                    badge: p.isPersonal ? 'Personal' : 'Project',
                  })),
                ]}
              />
            )}
          </div>
        </div>

        {/* Manuscripts Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
            <p className="text-xs font-mono">Loading manuscripts...</p>
          </div>
        ) : manuscripts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center flex flex-col items-center justify-center">
            {projects.length === 0 ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
                  <FolderPlus className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Project Required</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                  Please select or create a research project to start drafting your manuscript.
                </p>
                <button
                  onClick={() => onNavigate('/dashboard')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/25 transition-all"
                >
                  <span>Go to Research Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">No Manuscripts Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                  Create your first academic manuscript to start writing with IMRAD sections, linked citations, and internal review.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/25 transition-all"
                >
                  Draft New Manuscript
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {manuscripts.map((m) => {
              const project = projects.find((p) => p.id === m.projectId);
              return (
              <div
                key={m.id}
                onClick={() => onNavigate(`/manuscripts/${m.id}`)}
                className="group p-5 rounded-2xl bg-[#0B0F17] border border-slate-800/80 hover:border-amber-500/40 hover:shadow-xl hover:shadow-black/60 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(m.status)}
                      {project && (
                        <span className="text-xs text-slate-300 flex items-center gap-1 font-medium bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800 truncate max-w-[150px]">
                          <Folder className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                          <span className="truncate">{project.title}</span>
                        </span>
                      )}
                    </div>
                    {m.targetVenue && (
                      <span className="text-xs text-slate-300 flex items-center gap-1 font-medium truncate max-w-[140px]">
                        <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {m.targetVenue}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                    {m.title}
                  </h3>

                  {m.abstract && (
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {m.abstract}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{m.sections?.length || 0} sections</span>
                    </span>
                    <span className="font-mono text-slate-300 font-medium">
                      {(m.totalWordCount || 0).toLocaleString()}w
                    </span>
                  </div>

                  <span className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Open Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Manuscript Modal */}
      {projects.length > 0 && (
        <CreateManuscriptModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          projectId={selectedProjectId || projects[0].id}
          projects={projects}
          onManuscriptCreated={(created) => {
            onNavigate(`/manuscripts/${created.id}`);
          }}
        />
      )}

      {/* Project Required Notice Modal */}
      <NoticeModal
        isOpen={isProjectRequiredModalOpen}
        type="project-required"
        title="Project Required"
        message="Please select or create a research project to start drafting your manuscript."
        primaryActionText="Go to Research Workspace"
        secondaryActionText="Dismiss"
        onPrimaryAction={() => {
          setIsProjectRequiredModalOpen(false);
          onNavigate('/dashboard');
        }}
        onClose={() => setIsProjectRequiredModalOpen(false)}
      />
    </WorkspaceLayout>
  );
};
