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
    bg: 'bg-slate-800/60',
    text: 'text-slate-300',
    border: 'border-slate-700/50',
  },
  Reading: {
    label: 'Reading',
    bg: 'bg-blue-500/15',
    text: 'text-blue-300',
    border: 'border-blue-500/30',
  },
  Read: {
    label: 'Read',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
  },
  DeeplyAnalysed: {
    label: 'Deeply Analysed',
    bg: 'bg-purple-500/20',
    text: 'text-purple-200',
    border: 'border-purple-500/40',
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
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-surface-1/80 hover:bg-surface-2/90 border border-white/[0.08] hover:border-violet-500/40 shadow-lg hover:shadow-violet-600/10 transition-all duration-200 cursor-pointer"
    >
      {/* Top Row: Reading Status & Badges & Actions */}
      <div className="flex items-center justify-between gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
        {/* Status Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            disabled={isUpdatingStatus}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
          >
            <span>{statusCfg.label}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {isStatusDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-36 rounded-xl bg-surface-2 border border-white/10 shadow-2xl z-30 py-1">
              {(Object.keys(READING_STATUSES) as ReadingStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusSelect(st)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/[0.06] ${
                    paper.readingStatus === st ? 'text-violet-400 font-semibold' : 'text-slate-300'
                  }`}
                >
                  {STATUS_CONFIG[st].label}
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
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[11px] font-medium text-amber-300"
            >
              <Bookmark className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>Required</span>
            </span>
          )}

          {/* Context Menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-surface-2 border border-white/10 shadow-2xl z-30 py-1 text-xs">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenViewer(paper.id);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-white/[0.06] hover:text-white text-left"
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
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-white/[0.06] hover:text-white text-left"
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
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-white/[0.06] hover:text-white text-left"
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
                  className="w-full flex items-center justify-between px-3 py-1.5 text-slate-300 hover:bg-white/[0.06] hover:text-white text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                    Collections
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {isCollectionDropdownOpen && (
                  <div className="pl-4 pr-2 py-1 bg-surface-3/50 space-y-1">
                    {collections.length === 0 ? (
                      <div className="text-[10px] text-slate-500 py-1">No collections created</div>
                    ) : (
                      collections.map((c) => {
                        const isInCol = paper.collections?.some((pc) => pc.id === c.id) || false;
                        return (
                          <button
                            key={c.id}
                            onClick={() => handleToggleCollection(c.id, isInCol)}
                            className="w-full flex items-center justify-between text-[11px] py-1 text-slate-300 hover:text-white"
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
                  <div className="border-t border-white/[0.06] mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDeletePaper(paper.id);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-left"
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
        <h3 className="text-sm font-semibold text-slate-100 group-hover:text-violet-300 transition-colors line-clamp-2 leading-snug">
          {paper.title}
        </h3>
        <p className="text-xs text-slate-400 truncate">{authorSummary}</p>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          {paper.year && <span>{paper.year}</span>}
          {paper.year && paper.venue && <span>•</span>}
          {paper.venue && <span className="truncate max-w-[200px]">{paper.venue}</span>}
        </div>
      </div>

      {/* Bottom Row: Metadata Confidence, DOI, and Collection Pills */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
        {/* Collection Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {paper.collections && paper.collections.length > 0 ? (
            paper.collections.map((c) => (
              <span
                key={c.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.05] text-slate-300 border border-white/[0.08]"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: c.colorHex || '#8B5CF6' }}
                />
                <span className="truncate max-w-[80px]">{c.name}</span>
              </span>
            ))
          ) : (
            <span className="text-[11px] text-slate-600 font-mono">
              {paper.fileAsset?.sizeBytes ? `${(paper.fileAsset.sizeBytes / (1024 * 1024)).toFixed(1)} MB` : ''}
            </span>
          )}
        </div>

        {/* DOI or Confidence */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {confidenceScore !== null && (
            <span
              title={`Metadata extraction confidence: ${confidenceScore}% (${paper.metadataSource || 'pipeline'})`}
              className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                confidenceScore >= 85
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-amber-400 bg-amber-500/10'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{confidenceScore}%</span>
            </span>
          )}

          {paper.doi && (
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-violet-400 transition-colors p-1"
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
