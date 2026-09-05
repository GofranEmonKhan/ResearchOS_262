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
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* Annotation Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-1">
            <BookOpen className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p>No annotations found.</p>
            <p className="text-[11px] text-slate-600">Select text in the PDF to create a highlight.</p>
          </div>
        ) : (
          filtered.map((ann) => {
            const isOwner = ann.userId === currentUserId;
            const isCurrentPage = ann.page === currentPage;

            return (
              <div
                key={ann.id}
                onClick={() => onJumpToPage(ann.page)}
                className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 group ${
                  isCurrentPage
                    ? 'bg-violet-600/15 border-violet-500/40 shadow-md'
                    : 'bg-surface-2/70 hover:bg-surface-2 border-white/[0.06] hover:border-white/20'
                }`}
              >
                {/* Top Row: Page indicator & Author & Delete */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono font-medium px-2 py-0.5 rounded bg-white/[0.06] text-violet-300">
                    Page {ann.page}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {ann.user?.fullName && (
                      <span className="text-slate-400 truncate max-w-[100px]" title={ann.user.fullName}>
                        {ann.user.fullName}
                      </span>
                    )}
                    {isOwner && (
                      <button
                        onClick={(e) => handleDelete(ann.id, e)}
                        className="p-1 rounded text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete annotation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Highlight text snippet */}
                <p
                  className="text-xs text-slate-200 italic line-clamp-3 leading-relaxed border-l-2 pl-2"
                  style={{
                    borderLeftColor: ann.positionData?.color || (ann.linkedSidebarField ? '#A855F7' : '#FACC15'),
                  }}
                >
                  "{ann.highlightedText}"
                </p>

                {/* Sticky Note */}
                {ann.stickyNote && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-1.5">
                    <StickyNote className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{ann.stickyNote}</span>
                  </div>
                )}

                {/* Linked Field Tag */}
                {ann.linkedSidebarField && (
                  <div className="flex items-center gap-1 text-[10px] text-violet-400 font-medium pt-1">
                    <Sparkles className="w-3 h-3" />
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
