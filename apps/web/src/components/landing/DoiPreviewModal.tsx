import React, { useState } from 'react';
import { X, Sparkles, Check, Copy, BookOpen, Tag, ArrowRight, FileText } from 'lucide-react';

interface DoiPreviewModalProps {
  initialQuery?: string;
  isOpen: boolean;
  onClose: () => void;
  onLaunchWorkspace?: () => void;
}

interface PaperSample {
  doi: string;
  title: string;
  authors: string[];
  venue: string;
  year: number;
  gap: string;
  methodology: string;
  limitation: string;
  citationPurpose: string;
  bibtex: string;
}

const PRESET_PAPERS: Record<string, PaperSample> = {
  '10.48550/arXiv.1706.03762': {
    doi: '10.48550/arXiv.1706.03762',
    title: 'Attention Is All You Need',
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Łukasz Kaiser', 'Illia Polosukhin'],
    venue: 'NeurIPS 2017',
    year: 2017,
    gap: 'Sequential recurrent computation creates an inescapable bottleneck in training parallelization and context retention across long sequence lengths.',
    methodology: 'Pure self-attention mechanisms computed as scaled dot-product queries, keys, and values without recurrent or convolutional layers.',
    limitation: 'Quadratic memory complexity O(N²) with respect to sequence length N.',
    citationPurpose: 'Foundation Architecture / Baseline Benchmark for Transformer models.',
    bibtex: `@inproceedings{vaswani2017attention,
  author    = {Ashish Vaswani and Noam Shazeer and Niki Parmar and others},
  title     = {Attention Is All You Need},
  booktitle = {Advances in Neural Information Processing Systems (NeurIPS)},
  year      = {2017}
}`,
  },
  '10.1038/s41586-021-03819-2': {
    doi: '10.1038/s41586-021-03819-2',
    title: 'Highly accurate protein structure prediction with AlphaFold',
    authors: ['John Jumper', 'Richard Evans', 'Alexander Pritzel', 'Tim Green', 'Michael Figurnov', 'Olaf Ronneberger', 'Demis Hassabis'],
    venue: 'Nature 596, 583–589',
    year: 2021,
    gap: 'Decades-long inability to computationally predict 3D atomic protein structures from 1D amino acid sequences at experimental crystallographic accuracy.',
    methodology: 'Evoformer neural network incorporating spatial geometric constraints and multi-sequence alignments through invariant point attention.',
    limitation: 'Computational inference cost on very large multi-protein oligomers.',
    citationPurpose: 'Primary Methodology Source / Ground-Truth Structural Predictor.',
    bibtex: `@article{jumper2021highly,
  author  = {John Jumper and Richard Evans and Alexander Pritzel and others},
  title   = {Highly accurate protein structure prediction with AlphaFold},
  journal = {Nature},
  volume  = {596},
  pages   = {583--589},
  year    = {2021}
}`,
  },
};

export const DoiPreviewModal: React.FC<DoiPreviewModalProps> = ({
  initialQuery = '10.48550/arXiv.1706.03762',
  isOpen,
  onClose,
  onLaunchWorkspace,
}) => {
  const [activeDoi, setActiveDoi] = useState(
    PRESET_PAPERS[initialQuery] ? initialQuery : '10.48550/arXiv.1706.03762'
  );
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  if (!isOpen) return null;

  const currentPaper = PRESET_PAPERS[activeDoi] || PRESET_PAPERS['10.48550/arXiv.1706.03762'];

  const handleCopyBibtex = () => {
    navigator.clipboard.writeText(currentPaper.bibtex);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl card-glass rounded-2xl border border-purple-500/30 p-6 sm:p-8 shadow-[0_0_60px_-15px_rgba(139,92,246,0.35)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08] relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Smart Metadata & Gap Synthesizer
            </div>
            <h3 className="text-xl font-bold text-white font-sans">
              Instant Literature Extraction Preview
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Quick Selector */}
        <div className="py-3 flex items-center gap-2 overflow-x-auto text-xs relative z-10 border-b border-white/[0.06]">
          <span className="text-slate-400 shrink-0 font-medium">Quick Demo Samples:</span>
          <button
            onClick={() => setActiveDoi('10.48550/arXiv.1706.03762')}
            className={`px-3 py-1 rounded-full shrink-0 transition font-mono cursor-pointer ${
              activeDoi === '10.48550/arXiv.1706.03762'
                ? 'bg-purple-600/30 border border-purple-500/50 text-purple-200'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            Attention Is All You Need (NeurIPS)
          </button>
          <button
            onClick={() => setActiveDoi('10.1038/s41586-021-03819-2')}
            className={`px-3 py-1 rounded-full shrink-0 transition font-mono cursor-pointer ${
              activeDoi === '10.1038/s41586-021-03819-2'
                ? 'bg-purple-600/30 border border-purple-500/50 text-purple-200'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            AlphaFold (Nature)
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto pr-1 py-4 space-y-5 text-sm relative z-10">
          {/* Paper Metadata Block */}
          <div className="p-4 rounded-xl bg-surface-1/90 border border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Peer-Reviewed / Indexed
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-sky-500/10 border border-sky-500/20 text-sky-400">
                {currentPaper.venue} ({currentPaper.year})
              </span>
              <span className="text-slate-400 text-xs font-mono ml-auto">
                DOI: {currentPaper.doi}
              </span>
            </div>
            <h4 className="text-lg font-bold text-white font-serif mb-2 leading-snug">
              {currentPaper.title}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {currentPaper.authors.join(', ')}
            </p>
          </div>

          {/* Structured Smart Sidebar Extraction Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Card 1: Research Gap */}
            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 mb-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span>Identified Research Gap</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentPaper.gap}
              </p>
            </div>

            {/* Card 2: Citation Purpose */}
            <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-300 mb-1.5 uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5 text-sky-400" />
                <span>Citation Purpose (Why I Cited This)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentPaper.citationPurpose}
              </p>
            </div>

            {/* Card 3: Methodology */}
            <div className="p-3.5 rounded-xl bg-surface-2 border border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Methodology Core</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentPaper.methodology}
              </p>
            </div>

            {/* Card 4: Limitation */}
            <div className="p-3.5 rounded-xl bg-surface-2 border border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Acknowledged Limitation</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentPaper.limitation}
              </p>
            </div>
          </div>

          {/* BibTeX Box */}
          <div className="p-3.5 rounded-xl bg-[#090812] border border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400">Formatted BibTeX</span>
              <button
                onClick={handleCopyBibtex}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition cursor-pointer"
              >
                {copiedBibtex ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy BibTeX</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2.5 rounded bg-black/40 border border-white/[0.04]">
              {currentPaper.bibtex}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3 relative z-10">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Connect directly to CrossRef, PubMed, and arXiv in ResearchOS.
          </span>
          <button
            onClick={() => {
              onClose();
              onLaunchWorkspace?.();
            }}
            className="ml-auto btn-electric-pill px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <span>Open in Full Research Workbench</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
