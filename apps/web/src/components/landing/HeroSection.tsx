import React, { useState } from 'react';
import { Sparkles, Search, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ResearchWorkbenchDemo } from './ResearchWorkbenchDemo';

interface HeroSectionProps {
  onOpenDoiModal: (doi: string) => void;
  onGetStartedClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenDoiModal }) => {
  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onOpenDoiModal(inputVal.trim());
    } else {
      onOpenDoiModal('10.48550/arXiv.1706.03762');
    }
  };

  const sampleDois = [
    { label: 'Attention Is All You Need', doi: '10.48550/arXiv.1706.03762' },
    { label: 'AlphaFold (Nature)', doi: '10.1038/s41586-021-03819-2' },
  ];

  return (
    <section className="relative pt-28 sm:pt-36 pb-20 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
      {/* Background Cosmic Violet Ambient Aura */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] sm:w-[850px] h-[400px] sm:h-[500px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-40 left-1/3 w-72 h-72 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Eyebrow Pill Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-purple-500/30 text-purple-300 text-xs sm:text-sm font-medium shadow-[0_0_20px_rgba(139,92,246,0.2)] mb-6 animate-float-slow">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span className="font-sans font-semibold tracking-wide">
          THE NEXT-GENERATION RESEARCH OPERATING SYSTEM
        </span>
      </div>

      {/* Hero Headline */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-serif tracking-tight text-white max-w-5xl leading-[1.12] mb-6">
        Accelerate Discovery from{' '}
        <span className="text-gradient-cyan-violet font-serif italic">
          Literature Review
        </span>{' '}
        to Peer-Reviewed Publication.
      </h1>

      {/* Subtitle */}
      <p className="text-slate-300 text-base sm:text-lg md:text-xl font-normal max-w-3xl leading-relaxed mb-8 font-sans">
        An integrated workspace uniting <strong className="text-white font-semibold">Faculty Supervision</strong>,{' '}
        <strong className="text-white font-semibold">Smart Literature Extraction</strong>,{' '}
        <strong className="text-white font-semibold">Reproducible Lab Experiments</strong>, and{' '}
        <strong className="text-white font-semibold">AI-Augmented Manuscript Review</strong>.
      </p>

      {/* Interactive Search / DOI Action Pill (From Inspirations 01 & 02) */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl card-glass rounded-full p-1.5 sm:p-2 flex items-center gap-2 border border-purple-500/30 shadow-[0_0_40px_-5px_rgba(139,92,246,0.3)] mb-4 transition-all focus-within:border-purple-400 focus-within:shadow-[0_0_50px_rgba(139,92,246,0.45)]"
      >
        <div className="pl-3.5 sm:pl-4 text-slate-400">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
        </div>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Try DOI (e.g. 10.1038/s41586) or enter research topic..."
          className="flex-1 bg-transparent border-none text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none px-2 font-sans"
        />
        <button
          type="submit"
          className="btn-electric-pill px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Explore Smart Extraction</span>
          <span className="sm:hidden">Extract</span>
        </button>
      </form>

      {/* Quick DOI Samples */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 mb-12">
        <span className="font-mono">Try real DOIs:</span>
        {sampleDois.map((item) => (
          <button
            key={item.doi}
            onClick={() => onOpenDoiModal(item.doi)}
            className="px-2.5 py-0.5 rounded-full bg-white/[0.04] hover:bg-purple-500/15 border border-white/[0.08] hover:border-purple-500/30 text-purple-300 font-mono transition text-[11px] cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Live Hero Research Workbench Simulator */}
      <div className="w-full mt-2">
        <ResearchWorkbenchDemo />
      </div>

      {/* Institutional Trust & Verification Strip */}
      <div className="mt-16 w-full pt-8 border-t border-white/[0.08] flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Institutional RLS Data Isolation</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-400" />
          <span>Strict Faculty Governance Workflows</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>pgvector Semantic Citation Index</span>
        </div>
      </div>
    </section>
  );
};
