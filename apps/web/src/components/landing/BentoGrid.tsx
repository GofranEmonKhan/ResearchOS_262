import React from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  Sparkles, 
  Cpu, 
  FileText, 
  ArrowRight,
  GitCompare,
  Lock,
  Tag,
  MessageSquare
} from 'lucide-react';

interface BentoGridProps {
  onOpenDoiModal: () => void;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ onOpenDoiModal }) => {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono mb-3">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          The Modular Research Engine
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-white tracking-tight mb-4">
          Everything Your Research Lab Needs in{' '}
          <span className="text-gradient-cyan-violet italic">One Integrated OS</span>.
        </h2>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          Say goodbye to fragmented tools, lost hyperparameter sheets, scattered PDFs, and disconnected supervision emails.
        </p>
      </div>

      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* CARD 1: SMART LITERATURE MANAGER (Large Span 2 on Desktop) */}
        <div id="literature" className="lg:col-span-2 card-glass-interactive rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group scroll-mt-28">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl group-hover:bg-purple-600/20 transition-all duration-300 pointer-events-none" />

          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-purple-400">Core Module 01</span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-serif">
                  Smart Literature Manager & Citation Store
                </h3>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Instant DOI metadata auto-fetch via CrossRef, in-browser PDF annotation, and the <strong>Smart Research Sidebar</strong> extracting research gaps, limitations, and your exact <em>Citation Purpose ("Why did I cite this?")</em>.
            </p>

            {/* Interactive visual mockup inside card */}
            <div className="rounded-2xl bg-surface-1 border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-white/[0.06]">
                <span className="text-purple-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Structured Extraction
                </span>
                <span className="text-slate-400">Auto-BibTeX Ready</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-surface-2 border border-white/[0.04]">
                  <div className="text-[10px] font-mono text-purple-400 mb-1">Research Gap</div>
                  <div className="text-slate-300 font-medium truncate">No parallel context retention</div>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-2 border border-white/[0.04]">
                  <div className="text-[10px] font-mono text-sky-400 mb-1">Citation Purpose</div>
                  <div className="text-slate-300 font-medium truncate">Baseline for Section 3</div>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-2 border border-white/[0.04]">
                  <div className="text-[10px] font-mono text-emerald-400 mb-1">Reading Status</div>
                  <div className="text-emerald-400 font-medium truncate">Deeply Analysed ✓</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-white/[0.06] flex items-center justify-between">
            <button
              onClick={onOpenDoiModal}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Test DOI Extraction Preview</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
            <span className="text-[11px] font-mono text-slate-400">Private by Default</span>
          </div>
        </div>

        {/* CARD 2: SUPERVISOR GOVERNANCE */}
        <div className="card-glass-interactive rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">Core Module 02</span>
            <h3 className="text-xl font-bold text-white font-serif mb-2">
              Supervisor Approval Loop
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
              Strict faculty governance. PIs lock milestones, assign required readings, and sign off on submitted tasks with structured revision notes.
            </p>

            <div className="p-3 rounded-xl bg-surface-1 border border-white/[0.06] space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-300">
                <span>Task Submitted</span>
                <span className="text-amber-400">Alex Chen</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Supervisor Action</span>
                <span className="text-emerald-400">Approved (Signed)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>Audited State Transitions</span>
          </div>
        </div>

        {/* CARD 3: EXPERIMENT TRACKER & DIFF */}
        <div id="experiments" className="card-glass-interactive rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group scroll-mt-28">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <GitCompare className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Core Module 03</span>
            <h3 className="text-xl font-bold text-white font-serif mb-2">
              Experiment & Parameter Diff
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
              Log model configs, hyperparameter JSONs, dataset commits, and loss curves. Compare runs side-by-side to guarantee reproducibility.
            </p>

            <div className="p-3 rounded-xl bg-surface-1 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
              <div>
                <div className="text-[10px] text-slate-400">Run 03 vs Baseline</div>
                <div className="text-emerald-400 font-bold">+14.4% Accuracy</div>
              </div>
              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                Reported / Final
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] text-xs text-slate-400 font-mono">
            Zero Untracked Hyperparameters
          </div>
        </div>

        {/* CARD 4: MANUSCRIPT STUDIO */}
        <div className="card-glass-interactive rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-sky-400">Core Module 04</span>
            <h3 className="text-xl font-bold text-white font-serif mb-2">
              Manuscript Studio & Review
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
              Distraction-free Markdown/LaTeX drafting with live math rendering, citation autocompletion, and internal reviewer commentary threads.
            </p>

            <div className="p-3 rounded-xl bg-surface-1 border border-white/[0.06] text-xs font-mono text-slate-300 overflow-x-auto">
              {String.raw`$$\mathcal{L}_{G} = \mathbb{E}_{x}[\log D(x)] + \mathbb{E}_{z}[\log(1 - D(G(z)))]$$`}
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] text-xs text-sky-300 font-medium flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Inline Reviewer Sign-Off</span>
          </div>
        </div>

        {/* CARD 5: LAB RESOURCE MARKETPLACE */}
        <div className="card-glass-interactive rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400">Core Module 05</span>
            <h3 className="text-xl font-bold text-white font-serif mb-2">
              Lab Resource Marketplace
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
              Share and book idle GPU cluster nodes, specialized microscope hours, spectrometers, and datasets with integrated sandbox escrow.
            </p>

            <div className="p-3 rounded-xl bg-surface-1 border border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-slate-300">8x A100 (80GB) Cluster</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
                Available
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] text-xs text-slate-400 font-mono">
            Direct Lab-to-Lab Sharing
          </div>
        </div>

        {/* CARD 6: AI RESEARCH COPILOT (Span 2 on Desktop) */}
        <div className="lg:col-span-2 card-glass-interactive rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-300 pointer-events-none" />

          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-sky-400">Core Module 06</span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-serif">
                  AI Research Assistant & pgvector Index
                </h3>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Semantic literature search across your entire paper repository using PostgreSQL <code>pgvector</code> embeddings. Automatically synthesize contradictory evidence, formulate hypothesis testing tables, and generate LaTeX equations.
            </p>

            <div className="rounded-2xl bg-surface-1 border border-white/[0.08] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-mono font-bold text-xs">
                  AI
                </div>
                <div className="text-xs">
                  <div className="text-white font-semibold">"Summarize research gaps across these 14 papers"</div>
                  <div className="text-slate-400">Vector similarity score: 0.94 • 3 Key Gaps Synthesized</div>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono shrink-0">
                ⌘J Quick Access
              </span>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Provider-Agnostic AI Adapter</span>
            <span className="text-sky-400">pgvector Acceleration</span>
          </div>
        </div>

      </div>
    </section>
  );
};
