import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Eye,
  Edit2,
  AlertCircle,
  BookOpen,
  MessageSquare,
  Image as ImageIcon,
  Upload,
  Globe,
  Folder,
} from 'lucide-react';
import { ForumPost } from '@researchos/shared-types';
import { HoverSelect } from '../common/HoverSelect.js';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    body: string;
    tags: string[];
    attachmentIds: string[];
    projectId?: string;
  }) => Promise<void>;
  popularTags?: { tag: string; count: number }[];
  userProjects?: { id: string; title: string }[];
  editingPost?: ForumPost | null;
  initialPostType?: 'discussion' | 'blog';
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  popularTags = [],
  userProjects = [],
  editingPost,
  initialPostType = 'discussion',
}) => {
  const isInitialBlog = editingPost?.tags?.includes('scientific-blog') || editingPost?.tags?.includes('blog') || initialPostType === 'blog';
  const [postType, setPostType] = useState<'discussion' | 'blog'>(isInitialBlog ? 'blog' : 'discussion');
  const [title, setTitle] = useState(editingPost?.title || '');
  const [body, setBody] = useState(editingPost?.body || '');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedCaption, setAttachedCaption] = useState<string>('');
  const [tags, setTags] = useState<string[]>(editingPost?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [projectId, setProjectId] = useState<string>(editingPost?.projectId || '');
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const isBlog = editingPost?.tags?.includes('scientific-blog') || editingPost?.tags?.includes('blog') || initialPostType === 'blog';
      setPostType(isBlog ? 'blog' : 'discussion');
      setTitle(editingPost?.title || '');
      
      // Check if existing post body has an embedded image
      const existingImg = editingPost?.body?.match(/!\[(.*?)\]\((.*?)\)/);
      if (existingImg) {
        setAttachedCaption(existingImg[1] || '');
        setAttachedImage(existingImg[2] || null);
        setBody(editingPost?.body?.replace(/!\[.*?\]\(.*?\)/g, '').trim() || '');
      } else {
        setAttachedImage(null);
        setAttachedCaption('');
        setBody(editingPost?.body || '');
      }

      setTags(editingPost?.tags || []);
      setTagInput('');
      setProjectId(editingPost?.projectId || '');
      setActiveTab('write');
      setError(null);
    }
  }, [isOpen, editingPost, initialPostType]);

  if (!isOpen) return null;

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tags.includes(clean) && tags.length < 10) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters long');
      return;
    }
    if (body.trim().length < 5) {
      setError('Body content must be at least 5 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalTags = [...tags];
      if (postType === 'blog' && !finalTags.includes('scientific-blog')) {
        finalTags.push('scientific-blog');
      }

      let finalBody = body.trim();
      if (attachedImage) {
        const caption = attachedCaption.trim() || 'Attached Figure or Screenshot';
        finalBody += `\n\n![${caption}](${attachedImage})`;
      }

      await onSubmit({
        title: title.trim(),
        body: finalBody,
        tags: finalTags,
        attachmentIds: [],
        projectId: projectId || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0E0D1B] border border-indigo-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              {editingPost
                ? 'Edit Post'
                : postType === 'blog'
                ? 'Write Scientific Blog & Methodology Article'
                : 'Ask Question or Start Discussion'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Post Type Selector (Discussion vs Scientific Blog) */}
          {!editingPost && (
            <div className="p-1 bg-black/50 border border-white/10 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPostType('discussion')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  postType === 'discussion'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Discussion / Q&A</span>
              </button>

              <button
                type="button"
                onClick={() => setPostType('blog')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  postType === 'blog'
                    ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-lg shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Scientific Blog & Article</span>
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {postType === 'blog' ? 'Article Title' : 'Discussion Title'} <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                postType === 'blog'
                  ? 'e.g. Eliminating CUDA Out-of-Memory Spikes During Gradient Checkpointing in LLM Pre-training'
                  : 'e.g. What is the optimal temperature protocol for CRISPR-Cas9 in vivo delivery?'
              }
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          {/* Associated Project (Optional) */}
          {userProjects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Link to Project (Optional)
              </label>
              <HoverSelect
                value={projectId}
                options={[
                  {
                    value: '',
                    label: 'Public Community Discussion (No project link)',
                    icon: <Globe className="w-3.5 h-3.5 text-indigo-400" />,
                  },
                  ...userProjects.map((p) => ({
                    value: p.id,
                    label: p.title,
                    icon: <Folder className="w-3.5 h-3.5 text-amber-400" />,
                  })),
                ]}
                onChange={(val) => setProjectId(val)}
                placeholder="Select project..."
                align="left"
                buttonClassName="w-full py-2.5 px-4 text-xs bg-black/40 border-white/10 hover:border-indigo-500/40 rounded-xl"
                menuClassName="w-full max-h-56"
              />
            </div>
          )}

          {/* Body Editor Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Body & Details <span className="text-indigo-400">*</span>
              </label>
              <div className="flex items-center bg-black/30 border border-white/10 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'write' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Edit2 className="w-3 h-3" />
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'preview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
              </div>
            </div>

            {activeTab === 'write' ? (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Detail your scientific inquiry, experimental setup, or hypothesis. Markdown is supported..."
                rows={7}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono leading-relaxed resize-none"
                required
              />
            ) : (
              <div className="w-full min-h-[175px] p-4 bg-black/40 border border-white/10 rounded-xl text-sm text-slate-200 prose prose-invert max-w-none whitespace-pre-wrap">
                {body.trim().length > 0 ? body : <span className="text-slate-500 italic">Nothing to preview</span>}
              </div>
            )}
          </div>

          {/* Attach Image / Screenshot / Equation Diagram */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                Attach Image / Screenshot / Diagram (Optional)
              </label>
              {attachedImage && (
                <button
                  type="button"
                  onClick={() => {
                    setAttachedImage(null);
                    setAttachedCaption('');
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                >
                  Remove image
                </button>
              )}
            </div>

            {attachedImage ? (
              <div className="p-3 bg-black/40 border border-indigo-500/30 rounded-xl flex items-center gap-3">
                <img
                  src={attachedImage}
                  alt="Attachment preview"
                  className="w-16 h-16 object-cover rounded-lg border border-white/10 shrink-0 bg-black/50"
                />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={attachedCaption}
                    onChange={(e) => setAttachedCaption(e.target.value)}
                    placeholder="Caption for diagram, screenshot, or equation..."
                    className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    ✓ Image will be attached and displayed with your post.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachedImage(null);
                    setAttachedCaption('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <label className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black/40 hover:bg-white/[0.04] border border-dashed border-white/20 hover:border-indigo-500/50 rounded-xl text-xs text-slate-300 font-medium cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Upload Screenshot or Diagram</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setAttachedImage(reader.result);
                            setAttachedCaption(file.name.replace(/\.[^/.]+$/, ''));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                <div className="w-full sm:w-auto flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-mono">or URL:</span>
                  <input
                    type="url"
                    placeholder="https://.../image.png"
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val) {
                        setAttachedImage(val);
                        setAttachedCaption('Attached Diagram');
                        e.target.value = '';
                      }
                    }}
                    className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-48"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Research Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Research Tags (Up to 10)
            </label>

            <div className="flex flex-wrap items-center gap-2 p-2 bg-black/40 border border-white/10 rounded-xl mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder={tags.length === 0 ? "Type tag and press Enter (e.g. bioinformatics)" : "+ Add tag"}
                className="flex-1 min-w-[140px] px-2 py-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Popular Tag suggestions */}
            {popularTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Popular:</span>
                {popularTags.slice(0, 6).map(({ tag }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-400 hover:text-indigo-300 transition-colors"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
            >
              {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{editingPost ? 'Save Changes' : postType === 'blog' ? 'Publish Scientific Blog' : 'Publish Discussion'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
