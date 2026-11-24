import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Calendar,
  Cpu,
  Database,
  GitCommit,
  User,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  MessageSquare,
  Send,
  Link as LinkIcon,
} from 'lucide-react';
import {
  Experiment,
  ExperimentComment,
  ExperimentFlag,
  UserRole,
} from '@researchos/shared-types';
import { api } from '../../lib/api.js';

interface ExperimentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  experimentId: string;
  initialExperiment?: Experiment;
  currentUserRole?: UserRole;
  currentUserId?: string;
  onExperimentUpdated?: (updated: Experiment) => void;
  onExperimentDeleted?: (experimentId: string) => void;
  onOpenFlagModal?: (experiment: Experiment) => void;
}

export const ExperimentDetailModal: React.FC<ExperimentDetailModalProps> = ({
  isOpen,
  onClose,
  experimentId,
  initialExperiment,
  currentUserRole,
  currentUserId,
  onExperimentUpdated,
  onExperimentDeleted,
  onOpenFlagModal,
}) => {
  const [experiment, setExperiment] = useState<Experiment | null>(initialExperiment || null);
  const [loading, setLoading] = useState<boolean>(!initialExperiment);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'config' | 'metrics' | 'tasks' | 'discussion'>('config');

  // Comments state
  const [comments, setComments] = useState<ExperimentComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Flags state
  const [flags, setFlags] = useState<ExperimentFlag[]>([]);
  const [resolvingFlagId, setResolvingFlagId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // Link task state
  const [linkTaskId, setLinkTaskId] = useState('');
  const [linkingTask, setLinkingTask] = useState(false);

  // Editing draft state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editObservation, setEditObservation] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const isOwner = currentUserId && experiment?.ownerId === currentUserId;
  const isDraft = experiment?.status === 'Draft';
  const isSupervisor = currentUserRole === 'Supervisor';

  useEffect(() => {
    if (!isOpen || !experimentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getExperimentById(experimentId),
      api.getExperimentComments(experimentId),
      api.getExperimentFlags(experimentId),
    ])
      .then(([exp, comms, flgs]) => {
        if (!isMounted) return;
        setExperiment(exp);
        setComments(comms);
        setFlags(flgs);
        setEditName(exp.name);
        setEditObservation(exp.observation || '');
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load experiment details');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, experimentId]);

  if (!isOpen) return null;

  const handleFinalize = async () => {
    if (!experiment) return;
    if (!window.confirm('Finalizing will permanently lock this experiment from further editing or deletion. Proceed?')) {
      return;
    }

    try {
      const finalized = await api.finalizeExperiment(experiment.id);
      setExperiment(finalized);
      onExperimentUpdated?.(finalized);
    } catch (err: any) {
      alert(err.message || 'Failed to finalize experiment');
    }
  };

  const handleDelete = async () => {
    if (!experiment) return;
    if (!window.confirm(`Are you sure you want to delete "${experiment.name}"?`)) {
      return;
    }

    try {
      await api.deleteExperiment(experiment.id);
      onExperimentDeleted?.(experiment.id);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete experiment');
    }
  };

  const handleSaveEdit = async () => {
    if (!experiment) return;
    setSavingEdit(true);
    try {
      const updated = await api.updateExperiment(experiment.id, {
        name: editName.trim(),
        observation: editObservation.trim() || null,
      });
      setExperiment(updated);
      setIsEditing(false);
      onExperimentUpdated?.(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update experiment');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !experiment) return;
    setPostingComment(true);
    try {
      const comm = await api.addExperimentComment(experiment.id, { body: newComment.trim() });
      setComments([...comments, comm]);
      setNewComment('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleResolveFlag = async (flagId: string) => {
    if (!resolutionNote.trim()) {
      alert('Please provide a note explaining how the issue was resolved.');
      return;
    }

    try {
      const resolved = await api.resolveExperimentFlag(flagId, {
        resolutionNote: resolutionNote.trim(),
      });
      setFlags(flags.map((f) => (f.id === flagId ? resolved : f)));
      setResolvingFlagId(null);
      setResolutionNote('');
    } catch (err: any) {
      alert(err.message || 'Failed to resolve flag');
    }
  };

  const handleLinkTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTaskId.trim() || !experiment) return;
    setLinkingTask(true);
    try {
      await api.linkTaskExperiment(linkTaskId.trim(), experiment.id);
      const refreshed = await api.getExperimentById(experiment.id);
      setExperiment(refreshed);
      setLinkTaskId('');
    } catch (err: any) {
      alert(err.message || 'Failed to link task');
    } finally {
      setLinkingTask(false);
    }
  };

  const handleUnlinkTask = async (taskId: string) => {
    if (!experiment) return;
    try {
      await api.unlinkTaskExperiment(taskId, experiment.id);
      const refreshed = await api.getExperimentById(experiment.id);
      setExperiment(refreshed);
    } catch (err: any) {
      alert(err.message || 'Failed to unlink task');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#111319] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0d0e12]">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {experiment?.purpose || 'Run Inspector'}
            </span>
            {experiment?.status === 'Final' ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                <Lock className="w-3 h-3" />
                Finalized & Locked
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 rounded-full">
                Draft Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Owner Actions */}
            {isOwner && isDraft && (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                >
                  {isEditing ? 'Cancel Edit' : 'Edit Details'}
                </button>
                <button
                  onClick={handleFinalize}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Finalize & Lock
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Delete Draft Run"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Supervisor Flag Action */}
            {isSupervisor && (
              <button
                onClick={() => experiment && onOpenFlagModal?.(experiment)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Flag for Rerun
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading experiment details...
          </div>
        ) : error || !experiment ? (
          <div className="p-8 text-center text-rose-400 text-sm">
            {error || 'Experiment not found'}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Title & Overview Banner */}
            <div className="px-6 py-4 bg-[#141720] border-b border-slate-800/80">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#1c202d] border border-slate-700 rounded-lg px-3 py-1.5 text-base font-bold text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <textarea
                    rows={2}
                    value={editObservation}
                    onChange={(e) => setEditObservation(e.target.value)}
                    placeholder="Observations..."
                    className="w-full bg-[#1c202d] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                    >
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-slate-100 mb-1">{experiment.name}</h1>
                  {experiment.hypothesis && (
                    <p className="text-xs text-slate-400 italic mb-2">
                      Hypothesis: "{experiment.hypothesis}"
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Date: {experiment.date}
                    </span>
                    {experiment.ownerName && (
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Author: {experiment.ownerName}
                      </span>
                    )}
                    {experiment.projectName && (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        Project: {experiment.projectName}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-slate-800 bg-[#0d0e12] px-6 gap-2">
              <button
                onClick={() => setActiveTab('config')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'config'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Configuration & Hyperparameters
              </button>
              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'metrics'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Metrics & Observations
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'tasks'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Linked Tasks
                {experiment.linkedTasks && experiment.linkedTasks.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300">
                    {experiment.linkedTasks.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('discussion')}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'discussion'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Flags & Discussion
                {(flags.length > 0 || comments.length > 0) && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300">
                    {flags.filter((f) => !f.resolvedAt).length > 0 ? '!' : comments.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: Configuration */}
            {activeTab === 'config' && (
              <div className="p-6 space-y-6">
                {/* Core Architectural Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#171922] p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      Model
                    </div>
                    <div className="text-sm font-bold text-slate-200 font-mono">
                      {experiment.config.model || 'N/A'}
                    </div>
                  </div>

                  <div className="bg-[#171922] p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Database className="w-3.5 h-3.5 text-blue-400" />
                      Dataset
                    </div>
                    <div className="text-sm font-bold text-slate-200">
                      {experiment.config.dataset || 'N/A'}
                    </div>
                  </div>

                  <div className="bg-[#171922] p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      Hardware
                    </div>
                    <div className="text-sm font-bold text-slate-200 truncate">
                      {experiment.config.hardware || 'N/A'}
                    </div>
                  </div>

                  <div className="bg-[#171922] p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
                      Code Commit
                    </div>
                    <div className="text-sm font-bold text-slate-200 font-mono truncate">
                      {experiment.config.codeCommit || 'N/A'}
                    </div>
                  </div>
                </div>

                {experiment.config.environmentNotes && (
                  <div className="p-3 bg-[#171922] rounded-xl border border-slate-800 text-xs">
                    <span className="font-semibold text-slate-400">Environment: </span>
                    <span className="text-slate-200 font-mono">{experiment.config.environmentNotes}</span>
                  </div>
                )}

                {/* Hyperparameters Table */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Hyperparameters Matrix
                  </h3>
                  {experiment.config.hyperparameters &&
                  Object.keys(experiment.config.hyperparameters).length > 0 ? (
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0d0e12] text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold">Parameter</th>
                            <th className="px-4 py-2.5 font-semibold">Configured Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 bg-[#141720]">
                          {Object.entries(experiment.config.hyperparameters).map(([k, v]) => (
                            <tr key={k} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-2.5 font-mono text-slate-300 font-medium">{k}</td>
                              <td className="px-4 py-2.5 font-mono text-indigo-300 font-semibold">
                                {String(v)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#171922] rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                      No explicit hyperparameters recorded for this run.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Metrics */}
            {activeTab === 'metrics' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Evaluation Metric Scorecards
                  </h3>
                  {experiment.metrics && Object.keys(experiment.metrics).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(experiment.metrics).map(([k, v]) => {
                        const formatted =
                          typeof v === 'number'
                            ? v < 1 && v > 0
                              ? `${(v * 100).toFixed(2)}%`
                              : v.toFixed(3)
                            : String(v);

                        return (
                          <div
                            key={k}
                            className="bg-[#171922] p-4 rounded-xl border border-slate-800 text-center"
                          >
                            <div className="text-[11px] uppercase font-bold text-slate-400 mb-1">
                              {k.replace(/_/g, ' ')}
                            </div>
                            <div className="text-lg font-black text-indigo-400 font-mono">
                              {formatted}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-[#171922] rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                      No evaluation metrics recorded yet.
                    </div>
                  )}
                </div>

                {/* Takeaways / Observation */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Observation Notes
                  </h3>
                  <div className="p-4 bg-[#171922] rounded-xl border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {experiment.observation || 'No observations recorded.'}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Linked Tasks */}
            {activeTab === 'tasks' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Linked Deliverable Tasks
                  </h3>
                </div>

                {experiment.linkedTasks && experiment.linkedTasks.length > 0 ? (
                  <div className="space-y-2">
                    {experiment.linkedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3.5 bg-[#171922] border border-slate-800 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                          <div>
                            <div className="text-xs font-semibold text-slate-200">{task.title}</div>
                            <div className="text-[10px] text-slate-400">Status: {task.status}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnlinkTask(task.id)}
                          className="text-xs text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          title="Unlink Task"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-[#171922] rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                    No workspace tasks linked to this experiment run.
                  </div>
                )}

                {/* Link Task Form */}
                <form onSubmit={handleLinkTask} className="flex gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    value={linkTaskId}
                    onChange={(e) => setLinkTaskId(e.target.value)}
                    placeholder="Enter Workspace Task ID to attach evidence..."
                    className="flex-1 bg-[#171922] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={linkingTask}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    {linkingTask ? 'Linking...' : 'Link Task'}
                  </button>
                </form>
              </div>
            )}

            {/* Tab 4: Flags & Discussion */}
            {activeTab === 'discussion' && (
              <div className="p-6 space-y-6">
                {/* Supervisor Flags Section */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Supervisor Reproducibility Flags
                  </h3>

                  {flags.length > 0 ? (
                    <div className="space-y-3">
                      {flags.map((flag) => (
                        <div
                          key={flag.id}
                          className={`p-4 rounded-xl border ${
                            flag.resolvedAt
                              ? 'bg-slate-900/50 border-slate-800 text-slate-400'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${
                                  flag.type === 'NeedsRerun'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                }`}
                              >
                                {flag.type === 'NeedsRerun' ? 'Needs Rerun' : 'Not Reproducible'}
                              </span>

                              {flag.resolvedAt ? (
                                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Resolved on {new Date(flag.resolvedAt).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-[11px] text-amber-400 font-medium">
                                  Pending Resolution
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-slate-500">
                              {new Date(flag.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="text-xs leading-relaxed mb-3">{flag.note}</p>

                          {flag.resolvedAt && flag.resolutionNote && (
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-xs mb-2">
                              <span className="font-semibold">Resolution Note: </span>
                              {flag.resolutionNote}
                            </div>
                          )}

                          {!flag.resolvedAt && (
                            <div>
                              {resolvingFlagId === flag.id ? (
                                <div className="space-y-2 pt-2 border-t border-amber-500/20">
                                  <textarea
                                    rows={2}
                                    value={resolutionNote}
                                    onChange={(e) => setResolutionNote(e.target.value)}
                                    placeholder="Explain what steps or reruns resolved this issue..."
                                    className="w-full bg-[#1c202d] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setResolvingFlagId(null)}
                                      className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleResolveFlag(flag.id)}
                                      className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                    >
                                      Confirm Resolution
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setResolvingFlagId(flag.id)}
                                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline"
                                >
                                  Mark as Resolved
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-[#171922] rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                      No reproducibility flags issued for this experiment.
                    </div>
                  )}
                </div>

                {/* Collaborative Comments Stream */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    Discussion Comments ({comments.length})
                  </h3>

                  <div className="space-y-3 mb-4">
                    {comments.map((comm) => (
                      <div key={comm.id} className="p-3 bg-[#171922] rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                              {comm.authorName?.[0] || 'U'}
                            </div>
                            <span className="text-xs font-semibold text-slate-200">
                              {comm.authorName || 'Collaborator'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(comm.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 pl-8 leading-relaxed">{comm.body}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment Form */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment or observation..."
                      className="flex-1 bg-[#171922] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={postingComment || !newComment.trim()}
                      className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Post
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
