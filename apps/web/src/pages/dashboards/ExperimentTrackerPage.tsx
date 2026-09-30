import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout.js';
import { ExperimentCard } from '../../components/experiments/ExperimentCard.js';
import { CreateExperimentModal } from '../../components/experiments/CreateExperimentModal.js';
import { ExperimentDetailModal } from '../../components/experiments/ExperimentDetailModal.js';
import { SupervisorFlagModal } from '../../components/experiments/SupervisorFlagModal.js';
import { ExperimentComparisonModal } from '../../components/experiments/ExperimentComparisonModal.js';
import { api } from '../../lib/api.js';
import {
  Experiment,
  ExperimentPurpose,
  ExperimentStatus,
  Project,
  CreateExperimentDto,
  CreateExperimentFlagDto,
} from '@researchos/shared-types';
import {
  FlaskConical,
  Search,
  Plus,
  Sliders,
  Filter,
  Layers,
  Lock,
  Clock,
  AlertTriangle,
  ChevronDown,
  Loader2,
  X,
  ShieldAlert,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';

interface ExperimentTrackerPageProps {
  onNavigate: (route: string) => void;
}

const PURPOSES: { key: ExperimentPurpose | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All Purposes' },
  { key: 'Baseline', label: 'Baseline' },
  { key: 'ModelTesting', label: 'Model Testing' },
  { key: 'HyperparameterTuning', label: 'Hyperparameter Tuning' },
  { key: 'DatasetComparison', label: 'Dataset Comparison' },
  { key: 'PerformanceEvaluation', label: 'Performance Eval' },
  { key: 'Final', label: 'Final' },
];

export const ExperimentTrackerPage: React.FC<ExperimentTrackerPageProps> = ({ onNavigate }) => {
  const { profile, user } = useAuth();

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Experiments State
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [isLoadingExperiments, setIsLoadingExperiments] = useState(false);
  const [totalExperiments, setTotalExperiments] = useState(0);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState<ExperimentPurpose | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ExperimentStatus | 'ALL'>('ALL');

  // Compare Mode & Selection State (2 to 5 experiments)
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Experiment[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailExperimentId, setDetailExperimentId] = useState<string | null>(null);
  const [flaggingExperiment, setFlaggingExperiment] = useState<Experiment | null>(null);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  // Toast / notification feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const list = await api.getProjects().catch(() => []);
        setProjects(list);
        if (list.length > 0) {
          setSelectedProjectId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load projects for Experiment Tracker:', err);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch Experiments when project or filters change
  const fetchExperiments = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsLoadingExperiments(true);
    try {
      const res = await api.getProjectExperiments(selectedProjectId, {
        purpose: selectedPurpose === 'ALL' ? undefined : selectedPurpose,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: debouncedSearch.trim() || undefined,
        limit: 100,
      });
      setExperiments(res.experiments);
      setTotalExperiments(res.total);
    } catch (err) {
      console.error('Failed to fetch experiments:', err);
    } finally {
      setIsLoadingExperiments(false);
    }
  }, [selectedProjectId, selectedPurpose, selectedStatus, debouncedSearch]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchExperiments();
    }
  }, [selectedProjectId, fetchExperiments]);

  // Stats calculation
  const stats = useMemo(() => {
    const drafts = experiments.filter((e) => e.status === 'Draft').length;
    const finals = experiments.filter((e) => e.status === 'Final').length;
    const flagged = experiments.filter((e) => (e.flags || []).some((f) => !f.resolvedAt)).length;
    return {
      total: totalExperiments,
      drafts,
      finals,
      flagged,
    };
  }, [experiments, totalExperiments]);

  // Handle Toggle Compare Selection
  const handleToggleCompare = (exp: Experiment) => {
    const alreadySelected = selectedForCompare.some((item) => item.id === exp.id);
    if (alreadySelected) {
      setSelectedForCompare(selectedForCompare.filter((item) => item.id !== exp.id));
    } else {
      if (selectedForCompare.length >= 5) {
        showToast('Maximum of 5 experiments can be compared simultaneously.');
        return;
      }
      setSelectedForCompare([...selectedForCompare, exp]);
    }
  };

  // Handle Create Experiment
  const handleCreateExperiment = async (projId: string, dto: CreateExperimentDto) => {
    try {
      const created = await api.createExperiment(projId, dto);
      showToast(`Experiment "${created.name}" created successfully.`);
      setIsCreateModalOpen(false);
      // Refresh
      if (projId === selectedProjectId) {
        await fetchExperiments();
      } else {
        setSelectedProjectId(projId);
      }
    } catch (err: any) {
      console.error('Failed to create experiment:', err);
      throw err;
    }
  };

  // Handle Flag Submit
  const handleFlagSubmit = async (dto: CreateExperimentFlagDto) => {
    if (!flaggingExperiment) return;
    try {
      await api.createExperimentFlag(flaggingExperiment.id, dto);
      showToast(`Flag logged on "${flaggingExperiment.name}".`);
      setFlaggingExperiment(null);
      await fetchExperiments();
    } catch (err: any) {
      console.error('Failed to flag experiment:', err);
      throw err;
    }
  };

  // Handle Experiment Updated in Detail Drawer
  const handleExperimentUpdated = (updated: Experiment) => {
    setExperiments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    showToast(`Experiment "${updated.name}" updated.`);
  };

  // Handle Experiment Deleted
  const handleExperimentDeleted = (deletedId: string) => {
    setExperiments((prev) => prev.filter((e) => e.id !== deletedId));
    setSelectedForCompare((prev) => prev.filter((e) => e.id !== deletedId));
    setDetailExperimentId(null);
    showToast('Experiment deleted.');
  };

  // AC-18: Admin Privacy Restriction
  if (profile?.role === 'Admin') {
    return (
      <WorkspaceLayout
        activeTab="experiments"
        onTabChange={(tab) => {
          if (tab === 'dashboard' || tab === 'kanban' || tab === 'calendar') {
            onNavigate('/dashboard');
          }
        }}
        onNavigate={onNavigate}
      >
        <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Institutional Privacy Policy • AC-18
            </div>
            <h1 className="text-2xl font-bold text-white">Experiment Data Access Restricted</h1>
            <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              In accordance with academic research privacy and intellectual property protocols, raw experiment
              hyperparameters, datasets, and benchmark metrics are restricted to active research team members and
              supervisors. System administrators maintain governance over user identities and project metadata without
              accessing proprietary lab results.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('/dashboard')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-white/10 text-slate-200 text-xs font-semibold transition-colors"
            >
              <FolderKanban className="w-4 h-4 text-slate-400" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout
      activeTab="experiments"
      onTabChange={(tab) => {
        if (tab === 'dashboard' || tab === 'kanban' || tab === 'calendar') {
          onNavigate('/dashboard');
        }
      }}
      onNavigate={onNavigate}
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="px-4 py-3 rounded-xl bg-surface-1 border border-indigo-500/30 text-indigo-200 text-xs font-medium shadow-2xl flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FlaskConical className="w-4 h-4" />
              </div>
              <span>Experiment Tracker</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Log reproducible runs, track hyperparameters & metrics, and run multi-model comparisons
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Project Selector Dropdown */}
            {projects.length > 0 && (
              <div className="relative">
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setSelectedForCompare([]);
                  }}
                  className="appearance-none bg-surface-2 hover:bg-surface-3 border border-white/10 text-white text-xs font-semibold rounded-xl pl-3 pr-8 py-2 cursor-pointer transition-colors focus:outline-none focus:border-indigo-500"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id} className="bg-surface-1 text-slate-200">
                      {proj.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Toggle Compare Mode */}
            <button
              onClick={() => {
                setIsCompareMode(!isCompareMode);
                if (isCompareMode) {
                  setSelectedForCompare([]);
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isCompareMode
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                  : 'bg-surface-2 hover:bg-surface-3 text-slate-300 border-white/10'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isCompareMode ? 'Exit Compare' : 'Compare Mode'}</span>
            </button>

            {/* Create Experiment Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={projects.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>New Experiment</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-surface-1/90 border border-white/[0.08] shadow-md flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Total Runs</span>
              <span className="text-xl font-bold text-white mt-0.5 block">{stats.total}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-1/90 border border-white/[0.08] shadow-md flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">In-Progress Drafts</span>
              <span className="text-xl font-bold text-amber-400 mt-0.5 block">{stats.drafts}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-1/90 border border-white/[0.08] shadow-md flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Finalized Baselines</span>
              <span className="text-xl font-bold text-cyan-400 mt-0.5 block">{stats.finals}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-1/90 border border-white/[0.08] shadow-md flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Flagged for Rerun</span>
              <span className="text-xl font-bold text-rose-400 mt-0.5 block">{stats.flagged}</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-surface-1/90 border border-white/[0.08] shadow-md space-y-3.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by experiment name, hypothesis, model, or notes..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-2/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Status:</span>
              </span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ExperimentStatus | 'ALL')}
                className="bg-surface-2 border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="Draft">Draft Only</option>
                <option value="Final">Final Only</option>
              </select>
            </div>
          </div>

          {/* Purpose Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold mr-1 shrink-0">
              Purpose:
            </span>
            {PURPOSES.map((item) => {
              const isActive = selectedPurpose === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedPurpose(item.key)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-surface-2 hover:bg-surface-3 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Experiment Grid / Content */}
        {isLoadingProjects || isLoadingExperiments ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
            <p className="text-xs font-mono">Querying experiment database & audit records...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-surface-1/50 border border-white/[0.08] rounded-2xl p-8">
            <FolderKanban className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No Research Projects Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You must be a member or owner of a project to track lab experiments and compare baseline runs.
            </p>
            <button
              onClick={() => onNavigate('/dashboard')}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
            >
              Go to Workspace Dashboard
            </button>
          </div>
        ) : experiments.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-surface-1/50 border border-white/[0.08] rounded-2xl p-8">
            <FlaskConical className="w-10 h-10 text-indigo-400/50 mx-auto" />
            <h3 className="text-base font-bold text-white">No Experiments Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || selectedPurpose !== 'ALL' || selectedStatus !== 'ALL'
                ? 'No experiments match your active search or filter criteria.'
                : 'No experiments logged in this project yet. Capture your initial baseline run or model evaluation.'}
            </p>
            {searchQuery || selectedPurpose !== 'ALL' || selectedStatus !== 'ALL' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPurpose('ALL');
                  setSelectedStatus('ALL');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-surface-3 hover:bg-surface-4 text-white text-xs font-semibold transition-all"
              >
                Clear All Filters
              </button>
            ) : (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
              >
                Log First Experiment
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {experiments.map((exp) => {
              const isSelected = selectedForCompare.some((item) => item.id === exp.id);
              return (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  isSelectedForCompare={isSelected}
                  isCompareMode={isCompareMode || selectedForCompare.length > 0}
                  onToggleCompare={() => handleToggleCompare(exp)}
                  onClick={() => setDetailExperimentId(exp.id)}
                />
              );
            })}
          </div>
        )}

        {/* Floating Bottom Compare Action Bar */}
        {selectedForCompare.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="bg-surface-1/95 border border-indigo-500/30 shadow-2xl backdrop-blur-md rounded-2xl px-5 py-3.5 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="font-semibold text-white">
                  {selectedForCompare.length} <span className="text-slate-400">of 5 runs selected</span>
                </span>
              </div>

              <div className="h-4 w-[1px] bg-white/10" />

              <button
                onClick={() => setIsComparisonModalOpen(true)}
                disabled={selectedForCompare.length < 2}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>
                  {selectedForCompare.length < 2 ? 'Select at least 2 to compare' : 'Compare Experiments'}
                </span>
              </button>

              <button
                onClick={() => setSelectedForCompare([])}
                className="text-slate-400 hover:text-white transition-colors"
                title="Clear selection"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Create Experiment Modal */}
        <CreateExperimentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          projects={projects}
          activeProjectId={selectedProjectId}
          onCreate={handleCreateExperiment}
        />

        {/* Experiment Detail Modal / Inspector Drawer */}
        {detailExperimentId && (
          <ExperimentDetailModal
            isOpen={!!detailExperimentId}
            onClose={() => setDetailExperimentId(null)}
            experimentId={detailExperimentId}
            currentUserRole={profile?.role}
            currentUserId={user?.id}
            onExperimentUpdated={handleExperimentUpdated}
            onExperimentDeleted={handleExperimentDeleted}
            onOpenFlagModal={(exp) => setFlaggingExperiment(exp)}
          />
        )}

        {/* Supervisor Flagging Modal */}
        {flaggingExperiment && (
          <SupervisorFlagModal
            isOpen={!!flaggingExperiment}
            onClose={() => setFlaggingExperiment(null)}
            experiment={flaggingExperiment}
            onSubmitFlag={handleFlagSubmit}
          />
        )}

        {/* Multi-Run Comparison Modal */}
        <ExperimentComparisonModal
          isOpen={isComparisonModalOpen}
          onClose={() => setIsComparisonModalOpen(false)}
          experimentIds={selectedForCompare.map((e) => e.id)}
          onSelectExperiment={(exp) => {
            setIsComparisonModalOpen(false);
            setDetailExperimentId(exp.id);
          }}
        />
      </div>
    </WorkspaceLayout>
  );
};
