import React, { useState } from 'react';
import { Paper, ReadingStatus, READING_STATUSES, Collection } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import {
  BookOpen,
  Bookmark,
  ExternalLink,
  MoreVertical,
  Edit3,
  Share2,
  Trash2,
  FolderPlus,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface PaperCardProps {
  paper: Paper;
  currentUserId?: string;
  collections: Collection[];
  onOpenViewer: (paperId: string) => void;
  onEditMetadata: (paper: Paper) => void;
  onShareToProject: (paper: Paper) => void;
  onDeletePaper: (paperId: string) => void;
  onPaperUpdated: () => void;
}

const STATUS_CONFIG: Record<
  ReadingStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  Unread: {
    label: 'Unread',
    bg: 'bg-slate-800/80',
    text: 'text-slate-200',
    border: 'border-slate-600/60',
  },
  Reading: {
    label: 'Reading',
    bg: 'bg-blue-500/20',
    text: 'text-blue-200',
    border: 'border-blue-400/40',
  },
  Read: {
    label: 'Read',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-200',
    border: 'border-emerald-400/40',
  },
  DeeplyAnalysed: {
    label: 'Deeply Analysed',
    bg: 'bg-purple-500/25',
    text: 'text-purple-100',
    border: 'border-purple-400/50',
  },
};

export const PaperCard: React.FC<PaperCardProps> = ({
  paper,
  currentUserId,
  collections,
  onOpenViewer,
  onEditMetadata,
  onShareToProject,
  onDeletePaper,
  onPaperUpdated,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const isUploader = paper.uploaderId === currentUserId;
  const statusCfg = STATUS_CONFIG[paper.readingStatus || 'Unread'];

  const handleStatusSelect = async (newStatus: ReadingStatus) => {
    setIsStatusDropdownOpen(false);
    if (newStatus === paper.readingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await api.updatePaper(paper.id, { readingStatus: newStatus });
      onPaperUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update reading status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleCollection = async (collectionId: string, isInCol: boolean) => {
    try {
      if (isInCol) {
        await api.removePaperFromCollection(collectionId, paper.id);
      } else {
        await api.addPaperToCollection(collectionId, paper.id);
      }
      onPaperUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update paper collection');
    }
  };

  const authorSummary =
    paper.authors && paper.authors.length > 0
      ? paper.authors.length <= 2
        ? paper.authors.join(', ')
        : `${paper.authors[0]} et al.`
      : 'Unknown Authors';

  const confidenceScore = paper.metadataConfidence ? Math.round(paper.metadataConfidence * 100) : null;

  return (
    <div
      onClick={() => onOpenViewer(paper.id)}
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-surface-1/95 hover:bg-surface-2/95 border border-white/10 hover:border-violet-500/50 shadow-md hover:shadow-violet-600/15 transition-all duration-200 cursor-pointer backdrop-blur-sm"
    >
      {/* Top Row: Reading Status & Badges & Actions */}
      <div className="flex items-center justify-between gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
        {/* Status Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            disabled={isUpdatingStatus}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
          >
            <span>{statusCfg.label}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {isStatusDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-40 rounded-xl bg-surface-2 border border-white/15 shadow-2xl z-30 py-1.5">
              {(Object.keys(READING_STATUSES) as ReadingStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusSelect(st)}
                  className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-white/[0.08] transition-colors ${
                    paper.readingStatus === st ? 'text-violet-400 font-semibold' : 'text-slate-200'
                  }`}
                >
                  <span>{STATUS_CONFIG[st].label}</span>
                  {paper.readingStatus === st && <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Badges: Required Reading & Actions */}
        <div className="flex items-center gap-2">
          {paper.isRequiredReading && (
            <span
              title="Required Reading assigned by Supervisor"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-xs font-semibold text-amber-200 shadow-sm"
            >
              <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Required</span>
            </span>
          )}

          {/* Context Menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-surface-2 border border-white/15 shadow-2xl z-30 py-1 text-xs">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenViewer(paper.id);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-white/[0.08] hover:text-white text-left transition-colors font-medium"
                >
                  <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                  Read in Viewer
                </button>

                {isUploader && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEditMetadata(paper);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-white/[0.08] hover:text-white text-left transition-colors font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                    Edit Metadata
                  </button>
                )}

                {isUploader && !paper.projectId && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onShareToProject(paper);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-200 hover:bg-white/[0.08] hover:text-white text-left transition-colors font-medium"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-400" />
                    Share to Project
                  </button>
                )}

                {/* Add to Collection sub-item */}
                <button
                  onClick={() => {
                    setIsCollectionDropdownOpen(!isCollectionDropdownOpen);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-slate-200 hover:bg-white/[0.08] hover:text-white text-left transition-colors font-medium"
                >
                  <span className="flex items-center gap-2.5">
                    <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                    Collections
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isCollectionDropdownOpen && (
                  <div className="pl-4 pr-2 py-1 bg-surface-3/50 space-y-1">
                    {collections.length === 0 ? (
                      <div className="text-xs text-slate-400 py-1">No collections created</div>
                    ) : (
                      collections.map((c) => {
                        const isInCol = paper.collections?.some((pc) => pc.id === c.id) || false;
                        return (
                          <button
                            key={c.id}
                            onClick={() => handleToggleCollection(c.id, isInCol)}
                            className="w-full flex items-center justify-between text-xs py-1 text-slate-300 hover:text-white"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: c.colorHex }}
                              />
                              <span className="truncate">{c.name}</span>
                            </span>
                            {isInCol && <span className="text-violet-400 text-xs">✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {isUploader && (
                  <div className="border-t border-white/[0.08] mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDeletePaper(paper.id);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-left transition-colors font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Paper
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Title & Bibliographic details */}
      <div className="space-y-1.5 mb-4">
        <h3 className="text-[15px] font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-2 leading-snug">
          {paper.title}
        </h3>
        <p className="text-xs font-medium text-slate-300 truncate">{authorSummary}</p>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          {paper.year && <span className="text-slate-300 font-semibold">{paper.year}</span>}
          {paper.year && paper.venue && <span>•</span>}
          {paper.venue && <span className="truncate max-w-[220px]">{paper.venue}</span>}
        </div>
      </div>

      {/* Bottom Row: Metadata Confidence, DOI, and Collection Pills */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs">
        {/* Collection Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {paper.collections && paper.collections.length > 0 ? (
            paper.collections.map((c) => (
              <span
                key={c.id}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-slate-200 border border-white/15"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: c.colorHex || '#8B5CF6' }}
                />
                <span className="truncate max-w-[90px]">{c.name}</span>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-300 font-mono font-medium">
              {paper.fileAsset?.sizeBytes ? `${(paper.fileAsset.sizeBytes / (1024 * 1024)).toFixed(1)} MB` : ''}
            </span>
          )}
        </div>

        {/* DOI or Confidence */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {confidenceScore !== null && (
            <span
              title={`Metadata extraction confidence: ${confidenceScore}% (${paper.metadataSource || 'pipeline'})`}
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${
                confidenceScore >= 85
                  ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40'
                  : 'text-amber-300 bg-amber-500/20 border-amber-500/40'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{confidenceScore}%</span>
            </span>
          )}

          {paper.doi && (
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-violet-300 transition-colors p-1 rounded-md hover:bg-white/10"
              title={`Open DOI: ${paper.doi}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
