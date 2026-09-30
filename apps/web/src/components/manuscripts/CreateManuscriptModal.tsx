import React, { useState, useEffect } from 'react';
import {
  FileText,
  Building,
  Folder,
  X,
  Plus,
  Loader2,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { CreateManuscriptDto, Manuscript, Project } from '@researchos/shared-types';

interface CreateManuscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projects?: Project[];
  onManuscriptCreated: (manuscript: Manuscript) => void;
}

export const CreateManuscriptModal: React.FC<CreateManuscriptModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projects,
  onManuscriptCreated,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projectId || (projects && projects.length > 0 ? projects[0].id : '')
  );
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [targetVenue, setTargetVenue] = useState('');
  const [defaultSections, setDefaultSections] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    } else if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projectId, projects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Manuscript title is required.');
      return;
    }

    if (!selectedProjectId) {
      setError('Please select a research project to anchor this manuscript.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const dto: CreateManuscriptDto = {
        projectId: selectedProjectId,
        title: title.trim(),
        abstract: abstract.trim() || undefined,
        targetVenue: targetVenue.trim() || undefined,
        defaultSections,
      };

      const created = await api.createManuscript(selectedProjectId, dto);
      onManuscriptCreated(created);
      onClose();
      // Reset form
      setTitle('');
      setAbstract('');
      setTargetVenue('');
      setDefaultSections(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create manuscript');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#0C101A] border border-slate-800 shadow-2xl shadow-black/80 overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-manuscript-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-manuscript-title" className="text-base font-bold text-white tracking-tight">
                New Academic Manuscript
              </h2>
              <p className="text-xs text-slate-400">
                Initiate research paper draft with structured IMRAD sections
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Research Project Workspace Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              Research Project Workspace <span className="text-rose-400">*</span>
            </label>
            {projects && projects.length > 0 ? (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.isPersonal ? '(Personal Workspace)' : '(Collaborative Project)'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-400 flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-500" />
                <span>Current Project</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Select the project workspace for this paper. One project can host multiple manuscript drafts.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Paper Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scalable Low-Rank Adaptation for Multi-Modal Foundation Models"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              Target Publication Venue (Journal / Conference)
            </label>
            <input
              type="text"
              value={targetVenue}
              onChange={(e) => setTargetVenue(e.target.value)}
              placeholder="e.g. NeurIPS 2026, Nature Communications, IEEE TPAMI"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Executive Abstract
            </label>
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              rows={3}
              placeholder="Summarize research problem, proposed methodology, benchmark results and primary takeaways..."
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Default Sections Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
            <input
              type="checkbox"
              id="defaultSections"
              checked={defaultSections}
              onChange={(e) => setDefaultSections(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="defaultSections" className="cursor-pointer select-none">
              <span className="text-xs font-semibold text-white block">
                Initialize Standard IMRAD Section Structure
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Automatically scaffolds Abstract, Introduction, Related Work, Methodology, Results, and Discussion sections.
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Draft...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Manuscript</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
