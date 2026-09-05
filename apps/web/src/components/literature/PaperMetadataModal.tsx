import React, { useState } from 'react';
import { Paper, ReadingStatus, READING_STATUSES } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import {
  X,
  Edit3,
  Loader2,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface PaperMetadataModalProps {
  paper: Paper | null;
  isOpen: boolean;
  onClose: () => void;
  onPaperUpdated: () => void;
  currentUserId?: string;
}

export const PaperMetadataModal: React.FC<PaperMetadataModalProps> = ({
  paper,
  isOpen,
  onClose,
  onPaperUpdated,
  currentUserId,
}) => {
  if (!isOpen || !paper) return null;

  const isUploader = paper.uploaderId === currentUserId;

  const [title, setTitle] = useState(paper.title || '');
  const [authorsText, setAuthorsText] = useState((paper.authors || []).join(', '));
  const [year, setYear] = useState<number | undefined>(paper.year || undefined);
  const [venue, setVenue] = useState(paper.venue || '');
  const [doi, setDoi] = useState(paper.doi || '');
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>(paper.readingStatus || 'Unread');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const authors = authorsText
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      await api.updatePaper(paper.id, {
        ...(isUploader
          ? {
              title: title.trim(),
              authors: authors.length > 0 ? authors : undefined,
              year: year ? Number(year) : undefined,
              venue: venue.trim() || undefined,
              doi: doi.trim() || undefined,
            }
          : {}),
        readingStatus,
      });

      onPaperUpdated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update paper');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-surface-1 border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Paper Details & Metadata</h2>
              <p className="text-[11px] text-slate-400">
                {isUploader
                  ? 'Edit bibliographic information and reading status'
                  : 'Update reading status (bibliographic edits restricted to uploader)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Reading Status Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Reading Status</label>
            <select
              value={readingStatus}
              onChange={(e) => setReadingStatus(e.target.value as ReadingStatus)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
            >
              {(Object.keys(READING_STATUSES) as ReadingStatus[]).map((st) => (
                <option key={st} value={st}>
                  {st === 'DeeplyAnalysed' ? 'Deeply Analysed' : st}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Paper Title {!isUploader && '(View only)'}
            </label>
            <input
              type="text"
              disabled={!isUploader}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white disabled:opacity-60 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Authors */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Authors {!isUploader && '(View only)'}
            </label>
            <input
              type="text"
              disabled={!isUploader}
              value={authorsText}
              onChange={(e) => setAuthorsText(e.target.value)}
              placeholder="Comma-separated authors"
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white disabled:opacity-60 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Year & Venue */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Year</label>
              <input
                type="number"
                disabled={!isUploader}
                value={year || ''}
                onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white disabled:opacity-60 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Venue</label>
              <input
                type="text"
                disabled={!isUploader}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white disabled:opacity-60 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* DOI */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">DOI</label>
            <div className="flex gap-2">
              <input
                type="text"
                disabled={!isUploader}
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white font-mono disabled:opacity-60 focus:outline-none focus:border-violet-500"
              />
              {doi && (
                <a
                  href={`https://doi.org/${doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-surface-2 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center shrink-0"
                  title="Open DOI Link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Provenance Footer */}
          {paper.metadataSource && (
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Source: <span className="font-mono text-slate-300">{paper.metadataSource}</span>
              </span>
              {paper.metadataConfidence && (
                <span className="font-mono text-slate-300">
                  {Math.round(paper.metadataConfidence * 100)}% Confidence
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
