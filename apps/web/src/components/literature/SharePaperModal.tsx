import React, { useState } from 'react';
import { Paper, Project } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import {
  X,
  Share2,
  Users,
  Loader2,
  AlertCircle,
  FolderKanban,
  Check,
} from 'lucide-react';

interface SharePaperModalProps {
  paper: Paper | null;
  isOpen: boolean;
  onClose: () => void;
  onPaperShared: () => void;
  projects: Project[];
}

export const SharePaperModal: React.FC<SharePaperModalProps> = ({
  paper,
  isOpen,
  onClose,
  onPaperShared,
  projects,
}) => {
  if (!isOpen || !paper) return null;

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.sharePaper(paper.id, selectedProjectId);
      onPaperShared();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to share paper with project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-surface-1 border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Share Paper to Project</h2>
              <p className="text-[11px] text-slate-400">Enable collaborative reading and discussions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleShare} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Paper Summary Box */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <h4 className="text-xs font-semibold text-white truncate">{paper.title}</h4>
            <p className="text-[11px] text-slate-400 truncate">
              {(paper.authors || []).join(', ') || 'Unknown Authors'}
            </p>
          </div>

          {/* Project Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300">
              Select Destination Project
            </label>
            {projects.length === 0 ? (
              <p className="text-xs text-slate-500">
                You do not have any active collaborative projects.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {projects.map((proj) => {
                  const isSelected = selectedProjectId === proj.id;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-violet-600/20 border-violet-500/40 text-white'
                          : 'bg-surface-2 border-white/[0.06] text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FolderKanban className="w-4 h-4 text-violet-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-medium block truncate">{proj.title}</span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {proj.abstract || 'Collaborative Workspace'}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-violet-400 shrink-0 ml-2" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-start gap-2">
            <Users className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              Once shared, all project members and supervisors will be able to read, create shared
              highlights, and participate in discussion threads on this paper.
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedProjectId || projects.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Share
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
