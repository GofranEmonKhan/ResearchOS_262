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
      await api.restoreVersion(manuscriptId, version.id);
      await onVersionRestored();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to restore snapshot version');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#0B0F17] border border-slate-800 shadow-2xl shadow-black/90 overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 id="version-history-title" className="text-base font-bold text-white tracking-tight">
                Snapshot Version History
              </h2>
              <p className="text-xs text-slate-400">
                Frozen milestones, peer review submissions & rollback points
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Create new snapshot */}
          {canEdit && (
            <form onSubmit={handleCreateSnapshot} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-200 block">
                Create Frozen Snapshot
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder="e.g. Pre-Review Submission Draft, Camera-Ready Revision 1..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={creating || !newVersionName.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors shrink-0"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Snapshot</span>
                </button>
              </div>
            </form>
          )}

          {/* Versions list */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recorded Snapshots ({versions.length})
            </h3>

            {versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-44 text-slate-500 text-center">
                <FileText className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs font-medium text-slate-400">No snapshot versions created yet</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                  Create snapshots before submitting to peer review or making major revisions
                </p>
              </div>
            ) : (
              versions.map((ver) => (
                <div
                  key={ver.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                        v{ver.versionNumber}.0
                      </span>
                      <h4 className="text-xs font-bold text-white">
                        {ver.versionName}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(ver.createdAt).toLocaleString()}
                      </span>
                      {ver.creator && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          {ver.creator.fullName || 'Author'}
                        </span>
                      )}
                      <span>
                        {ver.snapshotData?.sections?.length || 0} sections
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <button
                      onClick={() => handleRestore(ver)}
                      disabled={restoringId === ver.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium text-slate-200 transition-colors"
                    >
                      {restoringId === ver.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
