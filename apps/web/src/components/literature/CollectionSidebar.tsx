import React, { useState } from 'react';
import { Collection } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import {
  Bookmark,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  FolderPlus,
  Check,
  X,
  BookOpen,
} from 'lucide-react';

const COLOR_PRESETS = [
  '#8B5CF6', // Violet
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#EF4444', // Red
];

interface CollectionSidebarProps {
  collections: Collection[];
  selectedCollectionId: string | null;
  isRequiredFilter: boolean;
  totalPapersCount: number;
  requiredCount: number;
  onSelectCollection: (collectionId: string | null) => void;
  onToggleRequired: (required: boolean) => void;
  onRefreshCollections: () => void;
}

export const CollectionSidebar: React.FC<CollectionSidebarProps> = ({
  collections,
  selectedCollectionId,
  isRequiredFilter,
  totalPapersCount,
  requiredCount,
  onSelectCollection,
  onToggleRequired,
  onRefreshCollections,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState(COLOR_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.createCollection({
        name: newColName.trim(),
        colorHex: newColColor,
      });
      setNewColName('');
      setIsCreating(false);
      onRefreshCollections();
    } catch (err: any) {
      setError(err.message || 'Failed to create collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection || !editName.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.updateCollection(editingCollection.id, {
        name: editName.trim(),
        colorHex: editColor,
      });
      setEditingCollection(null);
      onRefreshCollections();
    } catch (err: any) {
      setError(err.message || 'Failed to update collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (colId: string) => {
    if (!window.confirm('Delete this collection? Papers inside will not be deleted.')) {
      return;
    }
    try {
      await api.deleteCollection(colId);
      if (selectedCollectionId === colId) {
        onSelectCollection(null);
      }
      onRefreshCollections();
    } catch (err: any) {
      alert(err.message || 'Failed to delete collection');
    }
  };

  return (
    <aside className="w-64 shrink-0 flex flex-col gap-6 select-none">
      {/* Quick Filters */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Library Views
        </div>

        {/* All Papers */}
        <button
          onClick={() => {
            onToggleRequired(false);
            onSelectCollection(null);
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            selectedCollectionId === null && !isRequiredFilter
              ? 'bg-violet-600/20 text-violet-200 border border-violet-500/30 shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-violet-400" />
            <span>All Papers</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
            {totalPapersCount}
          </span>
        </button>

        {/* Required Reading */}
        <button
          onClick={() => {
            onToggleRequired(!isRequiredFilter);
            onSelectCollection(null);
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            isRequiredFilter
              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span>Required Reading</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
            {requiredCount}
          </span>
        </button>
      </div>

      {/* Collections Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Collections
          </span>
          <button
            onClick={() => {
              setIsCreating(true);
              setEditingCollection(null);
            }}
            className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
            title="Create Collection"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Create Collection Form */}
        {isCreating && (
          <form
            onSubmit={handleCreate}
            className="p-3 mx-1 rounded-xl bg-surface-2 border border-violet-500/30 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <FolderPlus className="w-3.5 h-3.5 text-violet-400" />
                New Collection
              </span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="Collection name..."
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-1 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />

            {/* Color preset swatches */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColColor(color)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform ${
                    newColColor === color ? 'scale-110 ring-2 ring-white/50' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {newColColor === color && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>

            {error && <p className="text-[11px] text-red-400">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newColName.trim()}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Collections List */}
        <div className="space-y-1">
          {collections.length === 0 && !isCreating && (
            <div className="px-3 py-4 text-center text-xs text-slate-500">
              No collections yet. Click + to organize papers.
            </div>
          )}

          {collections.map((col) => {
            const isSelected = selectedCollectionId === col.id;
            const isEditing = editingCollection?.id === col.id;

            if (isEditing) {
              return (
                <form
                  key={col.id}
                  onSubmit={handleUpdate}
                  className="p-3 mx-1 rounded-xl bg-surface-2 border border-violet-500/30 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-200">Edit Collection</span>
                    <button
                      type="button"
                      onClick={() => setEditingCollection(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-1 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform ${
                          editColor === color ? 'scale-110 ring-2 ring-white/50' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {editColor === color && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingCollection(null)}
                      className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:bg-white/[0.06]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !editName.trim()}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={col.id}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-violet-600/20 text-white border border-violet-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <button
                  onClick={() => {
                    onToggleRequired(false);
                    onSelectCollection(col.id);
                  }}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: col.colorHex || '#8B5CF6' }}
                  />
                  <span className="truncate">{col.name}</span>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
                    {col.paperCount || 0}
                  </span>

                  {/* Context Menu Trigger */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === col.id ? null : col.id);
                      }}
                      className="p-1 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] hover:text-white transition-all"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {menuOpenId === col.id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-32 rounded-xl bg-surface-2 border border-white/10 shadow-2xl z-20 py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setEditingCollection(col);
                            setEditName(col.name);
                            setEditColor(col.colorHex || COLOR_PRESETS[0]);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-white/[0.06] hover:text-white text-left"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400" />
                          Rename & Color
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpenId(null);
                            handleDelete(col.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 hover:text-red-300 text-left"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
