import React, { useState } from 'react';
import { PaperAnnotation } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import {
  Highlighter,
  StickyNote,
  Trash2,
  Sparkles,
  Search,
  X,
  BookOpen,
} from 'lucide-react';

interface AnnotationListProps {
  annotations: PaperAnnotation[];
  currentUserId?: string;
  currentPage: number;
  onJumpToPage: (pageNumber: number) => void;
  onAnnotationDeleted: () => void;
  onClose?: () => void;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({
  annotations,
  currentUserId,
  currentPage,
  onJumpToPage,
  onAnnotationDeleted,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = annotations.filter((ann) => {
    return (
      !searchQuery ||
      ann.highlightedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.stickyNote?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ann.linkedSidebarField && ann.linkedSidebarField.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleDelete = async (annotationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this annotation?')) return;
    try {
      await api.deleteAnnotation(annotationId);
      onAnnotationDeleted();
    } catch (err: any) {
      alert(err.message || 'Failed to delete annotation');
    }
  };

  return (
    <aside className="w-80 shrink-0 h-full flex flex-col bg-surface-1 border-r border-white/[0.08] select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Highlighter className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            Annotations ({annotations.length})
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="p-3 space-y-2 border-b border-white/[0.06]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search highlights or notes..."
            className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {/* Annotation Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-1">
            <BookOpen className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No annotations found.</p>
            <p className="text-[11px] text-slate-400">Select text in the PDF to create a highlight.</p>
          </div>
        ) : (
          filtered.map((ann) => {
            const isOwner = ann.userId === currentUserId;
            const isCurrentPage = ann.page === currentPage;

            return (
              <div
                key={ann.id}
                onClick={() => onJumpToPage(ann.page)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 group ${
                  isCurrentPage
                    ? 'bg-violet-600/20 border-violet-500/50 shadow-lg shadow-violet-950/30'
                    : 'bg-surface-2/80 hover:bg-surface-2 border-white/[0.08] hover:border-white/20'
                }`}
              >
                {/* Top Row: Page indicator & Author & Delete */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-200">
                    Page {ann.page}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {ann.user?.fullName && (
                      <span className="text-slate-300 font-medium truncate max-w-[120px]" title={ann.user.fullName}>
                        {ann.user.fullName}
                      </span>
                    )}
                    {isOwner && (
                      <button
                        onClick={(e) => handleDelete(ann.id, e)}
                        className="p-1 rounded text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete annotation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Highlight text snippet */}
                <p
                  className="text-xs sm:text-[13px] text-slate-100 italic line-clamp-3 leading-relaxed border-l-2 pl-2.5"
                  style={{
                    borderLeftColor: ann.positionData?.color || (ann.linkedSidebarField ? '#A855F7' : '#FACC15'),
                  }}
                >
                  "{ann.highlightedText}"
                </p>

                {/* Sticky Note */}
                {ann.stickyNote && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-100 font-medium flex items-start gap-2">
                    <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{ann.stickyNote}</span>
                  </div>
                )}

                {/* Linked Field Tag */}
                {ann.linkedSidebarField && (
                  <div className="flex items-center gap-1.5 text-xs text-violet-300 font-semibold pt-1">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    <span>Linked to {ann.linkedSidebarField}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
