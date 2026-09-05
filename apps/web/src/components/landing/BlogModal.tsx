import React from 'react';
import { X, Clock, Calendar, Sparkles } from 'lucide-react';

export interface BlogPost {
  id: string;
  category: 'METHODOLOGY' | 'LAB PRODUCTIVITY' | 'SUPERVISION';
  categoryColor: string;
  readTime: string;
  date: string;
  author: string;
  authorRole: string;
  title: string;
  excerpt: string;
  content: string[];
  keyTakeaway: string;
}

interface BlogModalProps {
  post: BlogPost | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BlogModal: React.FC<BlogModalProps> = ({ post, isOpen, onClose }) => {
  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl card-glass rounded-2xl sm:rounded-3xl border border-purple-500/30 p-6 sm:p-10 shadow-[0_0_60px_-15px_rgba(139,92,246,0.4)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08] relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${post.categoryColor}`}>
                {post.category}
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-400" /> {post.readTime}
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-400" /> {post.date}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-serif leading-snug">
              {post.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0 cursor-pointer"
            aria-label="Close article"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Author Bio Bar */}
        <div className="py-3 flex items-center gap-3 border-b border-white/[0.06] text-xs relative z-10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white text-xs">
            {post.author.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="font-semibold text-white">{post.author}</div>
            <div className="text-slate-400 text-[11px]">{post.authorRole}</div>
          </div>
        </div>

        {/* Article Body */}
        <div className="overflow-y-auto pr-2 py-5 space-y-4 text-sm text-slate-300 leading-relaxed font-sans relative z-10">
          {/* Key Takeaway Callout */}
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30">
            <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider font-mono flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Executive Takeaway
            </div>
            <p className="text-xs sm:text-sm text-slate-200 font-medium">
              {post.keyTakeaway}
            </p>
          </div>

          {post.content.map((paragraph, idx) => (
            <p key={idx} className="text-slate-300 leading-relaxed text-sm">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between relative z-10">
          <span className="text-xs text-slate-400 font-mono">
            Published on ResearchOS Academic Insights
          </span>
          <button
            onClick={onClose}
            className="btn-ghost-glass px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer"
          >
            Close Article
          </button>
        </div>
      </div>
    </div>
  );
};
