import React, { useState } from 'react';
import {
  History,
  RotateCcw,
  Plus,
  Calendar,
  User,
  X,
  Loader2,
  FileText,
  AlertCircle,
  Sparkles,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { ManuscriptVersion } from '@researchos/shared-types';
import { api } from '../../lib/api.js';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuscriptId: string;
  versions: ManuscriptVersion[];
  canEdit: boolean;
  onRefreshVersions: () => Promise<void>;
  onVersionRestored: () => Promise<void>;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  manuscriptId,
  versions,
  canEdit,
  onRefreshVersions,
  onVersionRestored,
}) => {
  const [newVersionName, setNewVersionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      await api.createSnapshotVersion(manuscriptId, {
        versionName: newVersionName.trim(),
      });
      setNewVersionName('');
      await onRefreshVersions();
    } catch (err: any) {
      setError(err.message || 'Failed to create snapshot version');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (version: ManuscriptVersion) => {
    const confirmed = window.confirm(
      `Are you sure you want to restore "${version.versionName}" (v${version.versionNumber})? Current section contents will be replaced with this snapshot.`
    );
    if (!confirmed) return;

    setRestoringId(version.id);
    setError(null);
    try {
      await api.restoreManuscriptVersion(manuscriptId, version.id);
      await onVersionRestored();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to restore snapshot version');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-[#0B111E] border border-slate-700/80 shadow-2xl shadow-black/95 overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-800/90 bg-slate-900/60">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="version-history-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                Snapshot Version History
              </h2>
              <p className="text-xs text-slate-300 font-medium truncate">
                Frozen milestones, peer review submissions & rollback points
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Create new snapshot */}
          {canEdit && (
            <form onSubmit={handleCreateSnapshot} className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-700/80 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  Create Frozen Snapshot
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Captures current LaTeX & Markdown sections
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder="e.g. Pre-Review Submission Draft, Camera-Ready Revision 1..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
                <button
                  type="submit"
                  disabled={creating || !newVersionName.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition-all shrink-0 cursor-pointer"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Save Snapshot</span>
                </button>
              </div>
            </form>
          )}

          {/* Versions list */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Recorded Snapshots ({versions.length})
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-blue-300 border border-slate-700 font-mono">
                {versions.length} {versions.length === 1 ? 'snapshot' : 'snapshots'}
              </span>
            </div>

            {versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 sm:p-10 rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/30 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3 shadow-inner">
                  <FileText className="w-6 h-6 opacity-80" />
                </div>
                <p className="text-sm font-bold text-white mb-1">No snapshot versions created yet</p>
                <p className="text-xs text-slate-300 max-w-sm leading-relaxed mb-4">
                  Create snapshots before submitting to peer review or making major revisions
                </p>
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/70 text-[11px] text-slate-300 font-medium text-left">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Snapshots freeze all section drafts and citations for safe 1-click rollbacks.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-sm"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono shrink-0">
                          {`v${ver.versionNumber}.0`}
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">
                          {ver.versionName}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(ver.createdAt).toLocaleString()}
                        </span>
                        {ver.creator && (
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {ver.creator.fullName || 'Alex Researcher'}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700 font-mono text-[11px]">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {ver.snapshotData?.sections?.length || 0} sections
                        </span>
                      </div>
                    </div>

                    {canEdit && (
                      <button
                        onClick={() => handleRestore(ver)}
                        disabled={restoringId === ver.id}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 disabled:opacity-50 text-xs font-semibold text-slate-200 border border-slate-700 transition-all shrink-0 cursor-pointer"
                        title="Restore this snapshot"
                      >
                        {restoringId === ver.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/90 bg-slate-900/50">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
            <span>Restoring overwrites active drafts with the frozen snapshot data.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-semibold text-white border border-slate-700 transition-colors ml-auto cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

