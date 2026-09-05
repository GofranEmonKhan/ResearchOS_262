import React, { useState } from 'react';
import { AnnotationRect, SidebarFieldType, SIDEBAR_FIELD_TYPES } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import {
  Highlighter,
  StickyNote,
  X,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react';

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', hex: '#FACC15', label: 'Yellow (Key Point / General)' },
  { id: 'green', hex: '#4ADE80', label: 'Green (Methodology / Validated)' },
  { id: 'blue', hex: '#38BDF8', label: 'Blue (Results / Evidence)' },
  { id: 'purple', hex: '#A855F7', label: 'Purple (Research Gap / Theory)' },
  { id: 'rose', hex: '#FB7185', label: 'Rose (Limitation / Contradiction)' },
  { id: 'orange', hex: '#FB923C', label: 'Orange (Future Work / Question)' },
] as const;

interface HighlightPopoverProps {
  paperId: string;
  pageNumber: number;
  highlightedText: string;
  rects: AnnotationRect[];
  position: { top: number; left: number };
  onClose: () => void;
  onAnnotationCreated: () => void;
}

export const HighlightPopover: React.FC<HighlightPopoverProps> = ({
  paperId,
  pageNumber,
  highlightedText,
  rects,
  position,
  onClose,
  onAnnotationCreated,
}) => {
  const [stickyNote, setStickyNote] = useState('');
  const [selectedField, setSelectedField] = useState<SidebarFieldType | ''>('');
  const [selectedColor, setSelectedColor] = useState<string>('#FACC15');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);

  const handleFieldChange = (field: SidebarFieldType | '') => {
    setSelectedField(field);
    if (field && selectedColor === '#FACC15') {
      setSelectedColor('#A855F7');
    }
  };

  const handleSave = async () => {
    if (rects.length === 0 || !highlightedText.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createAnnotation(paperId, {
        page: pageNumber,
        highlightedText: highlightedText.trim(),
        positionData: {
          page: pageNumber,
          rects,
          color: selectedColor,
        },
        stickyNote: stickyNote.trim() || undefined,
        linkedSidebarField: selectedField || undefined,
      });

      onAnnotationCreated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save annotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNearTop = position.top < 180;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${Math.max(148, position.left)}px`,
        transform: isNearTop ? 'translate(-50%, 16px)' : 'translate(-50%, -100%) translateY(-12px)',
      }}
      className="z-50 w-72 rounded-2xl bg-[#0E0D1B]/95 backdrop-blur-2xl border border-violet-500/30 shadow-2xl shadow-black/80 p-3 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <span className="flex items-center gap-1.5 font-semibold text-white text-[11px] uppercase tracking-wider">
          <Highlighter className="w-3.5 h-3.5 text-violet-400" />
          Add Annotation
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Color Palette Selector */}
      <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
        <span className="text-[10px] font-semibold text-slate-400">Color</span>
        <div className="flex items-center gap-2">
          {HIGHLIGHT_COLORS.map((c) => {
            const isSelected = selectedColor === c.hex;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedColor(c.hex)}
                title={c.label}
                style={{ backgroundColor: c.hex }}
                className={`w-4 h-4 rounded-full transition-all ${
                  isSelected
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0E0D1B] scale-110'
                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Selected text snippet preview */}
      <div className="py-2">
        <p
          className="text-[11px] text-slate-300 italic line-clamp-2 bg-white/[0.03] p-2 rounded-lg border-l-2"
          style={{ borderLeftColor: selectedColor }}
        >
          "{highlightedText}"
        </p>
      </div>

      {/* Note Input Toggle / Editor */}
      {showNoteInput ? (
        <div className="space-y-1 py-1">
          <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
            <StickyNote className="w-3 h-3 text-amber-400" />
            Sticky Note
          </label>
          <textarea
            autoFocus
            rows={2}
            value={stickyNote}
            onChange={(e) => setStickyNote(e.target.value)}
            placeholder="Add a personal critique or reflection..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNoteInput(true)}
          className="w-full py-1.5 px-2 rounded-lg text-left text-[11px] text-slate-400 hover:text-white hover:bg-white/[0.04] flex items-center gap-1.5 transition-colors"
        >
          <StickyNote className="w-3 h-3 text-amber-400" />
          <span>+ Add Sticky Note</span>
        </button>
      )}

      {/* Link to Sidebar Field */}
      <div className="space-y-1 py-1">
        <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-violet-400" />
          Link to Research Gap or Analysis
        </label>
        <select
          value={selectedField}
          onChange={(e) => handleFieldChange(e.target.value as SidebarFieldType | '')}
          className="w-full px-2.5 py-1 rounded-lg bg-surface-2 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">No link (General highlight)</option>
          {(Object.keys(SIDEBAR_FIELD_TYPES) as SidebarFieldType[]).map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-white/[0.08] mt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="px-3.5 py-1 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          Save Highlight
        </button>
      </div>
    </div>
  );
};
