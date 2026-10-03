import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  FolderGit2,
  Library,
  FlaskConical,
  Users,
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';

export type LoaderContextType =
  | 'paper'
  | 'manuscript'
  | 'workspace'
  | 'literature'
  | 'experiment'
  | 'community'
  | 'generic';

export interface StageItem {
  label: string;
  status?: 'done' | 'active' | 'pending';
}

export interface ContextualLoaderProps {
  context?: LoaderContextType;
  title?: string;
  subtitle?: string;
  itemTitle?: string;
  stages?: StageItem[];
  onCancel?: () => void;
  cancelLabel?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTips?: boolean;
  className?: string;
}

const CONTEXT_CONFIGS: Record<
  LoaderContextType,
  {
    icon: React.ComponentType<{ className?: string }>;
    defaultTitle: string;
    defaultSubtitle: string;
    defaultStages: StageItem[];
    tips: string[];
    accentGradient: string;
  }
> = {
  paper: {
    icon: BookOpen,
    defaultTitle: 'Preparing Academic Publication',
    defaultSubtitle:
      'Resolving verified PDF document stream, citation index, and collaborative annotations...',
    defaultStages: [
      { label: 'PDF Document Stream', status: 'done' },
      { label: 'Annotation Layer', status: 'active' },
      { label: 'Structured Analysis Graph', status: 'pending' },
    ],
    tips: [
      'Select any text passage on the PDF canvas to attach an inline sticky note or link it to a structured synthesis field.',
      'Click any field in the Smart Research Sidebar to smoothly expand it into a comfortable reading and writing view.',
      'Change reading status between "Unread", "Reading", "Completed", and "Deeply Analysed" to keep your project organized.',
      'Annotations with linked research fields automatically surface in the Structured Synthesis tab for quick citation.',
    ],
    accentGradient: 'from-violet-500 via-indigo-500 to-purple-500',
  },
  manuscript: {
    icon: FileText,
    defaultTitle: 'Opening Scholarly Manuscript',
    defaultSubtitle:
      'Retrieving LaTeX document tree, peer-review comments, and milestone versions...',
    defaultStages: [
      { label: 'LaTeX Section Tree', status: 'done' },
      { label: 'Collaborative Review Threads', status: 'active' },
      { label: 'Overleaf Figure Assets', status: 'pending' },
    ],
    tips: [
      'Citations inserted from your literature library automatically format according to your target journal guideline.',
      'You can freeze milestone versions before submitting to internal supervisors or external peer review.',
      'Figures uploaded in the Figures tab can be inserted directly as LaTeX figure environments with custom captions.',
    ],
    accentGradient: 'from-amber-500 via-violet-500 to-indigo-500',
  },
  literature: {
    icon: Library,
    defaultTitle: 'Indexing Scholarly Library',
    defaultSubtitle:
      'Querying semantic paper store, custom collections, and reading milestones...',
    defaultStages: [
      { label: 'Publication Index', status: 'done' },
      { label: 'Collection Taxonomies', status: 'active' },
      { label: 'Vector Cache', status: 'pending' },
    ],
    tips: [
      'Filter papers by collections or search directly across extracted abstracts, authors, and year of publication.',
      'Export formatted citations in BibTeX, APA, or IEEE with one click from the export menu.',
      'Supervisors can mark essential papers as "Required Reading" for collaborative project teams.',
    ],
    accentGradient: 'from-blue-500 via-violet-500 to-indigo-500',
  },
  workspace: {
    icon: FolderGit2,
    defaultTitle: 'Synchronizing Academic Session',
    defaultSubtitle:
      'Validating institutional credentials, role profile, and collaborative workspace...',
    defaultStages: [
      { label: 'Supabase JWT Auth', status: 'done' },
      { label: 'Active Role Profile', status: 'active' },
      { label: 'Project Access Boundary', status: 'pending' },
    ],
    tips: [
      'Researchers can propose milestones and tasks, while Supervisors verify deliverables and conduct peer reviews.',
      'Use the Kanban board to track research workflows through ToDo, In Progress, Submitted, and Approved states.',
      'Direct Messages and project channels keep discussions isolated and focused on research outcomes.',
    ],
    accentGradient: 'from-indigo-500 via-purple-500 to-pink-500',
  },
  experiment: {
    icon: FlaskConical,
    defaultTitle: 'Spinning Up Computational Sandbox',
    defaultSubtitle:
      'Bootstrapping Pyodide Python WASM kernel and experiment telemetry...',
    defaultStages: [
      { label: 'Python 3.11 WASM Engine', status: 'done' },
      { label: 'NumPy / SciPy Wheels', status: 'active' },
      { label: 'Reproducibility Logs', status: 'pending' },
    ],
    tips: [
      'All Python code runs client-side inside a sandboxed WebAssembly runtime with zero server dependency.',
      'Generated plots and artifacts can be saved directly as figures in your manuscript draft.',
      'Supervisor flags highlight experimental anomalies for prompt reproducibility checks.',
    ],
    accentGradient: 'from-emerald-500 via-teal-500 to-cyan-500',
  },
  community: {
    icon: Users,
    defaultTitle: 'Connecting Scholarly Network',
    defaultSubtitle:
      'Loading peer discussions, preprint commentary, and research threads...',
    defaultStages: [
      { label: 'Researcher Network Feed', status: 'active' },
      { label: 'Scientific Threads', status: 'pending' },
    ],
    tips: [
      'Share early research findings, preprint links, and computational challenges with global peers.',
      'Engage in threaded academic discussions with verified researchers and supervisors.',
    ],
    accentGradient: 'from-cyan-500 via-blue-500 to-violet-500',
  },
  generic: {
    icon: Sparkles,
    defaultTitle: 'Loading Academic Workspace',
    defaultSubtitle: 'Fetching scholarly assets from secure cloud storage...',
    defaultStages: [
      { label: 'Authenticating Client', status: 'done' },
      { label: 'Fetching Data Stream', status: 'active' },
    ],
    tips: [
      'ResearchOS encrypts all scholarly artifacts, experimental data, and peer-review threads end-to-end.',
    ],
    accentGradient: 'from-violet-500 via-indigo-500 to-purple-500',
  },
};

export const ContextualLoader: React.FC<ContextualLoaderProps> = ({
  context = 'generic',
  title,
  subtitle,
  itemTitle,
  stages,
  onCancel,
  cancelLabel = 'Return to Library',
  onRetry,
  fullScreen = true,
  size = 'lg',
  showTips = true,
  className = '',
}) => {
  const config = CONTEXT_CONFIGS[context] || CONTEXT_CONFIGS.generic;
  const IconComponent = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displaySubtitle = subtitle || config.defaultSubtitle;
  const displayStages = stages || config.defaultStages;

  // Active tip cycling
  const [tipIndex, setTipIndex] = useState(0);
  const [isTipFading, setIsTipFading] = useState(false);
  const [showLatencyNotice, setShowLatencyNotice] = useState(false);

  // Cycle tips automatically every 6 seconds
  useEffect(() => {
    if (!showTips || config.tips.length <= 1) return;
    const interval = setInterval(() => {
      setIsTipFading(true);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % config.tips.length);
        setIsTipFading(false);
      }, 200);
    }, 6000);

    return () => clearInterval(interval);
  }, [showTips, config.tips.length]);

  // If loading takes > 7 seconds, display gentle latency prompt
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLatencyNotice(true);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  const handleNextTip = () => {
    setIsTipFading(true);
    setTimeout(() => {
      setTipIndex((prev) => (prev + 1) % config.tips.length);
      setIsTipFading(false);
    }, 150);
  };

  // Compact / Embedded mode
  if (!fullScreen || size === 'sm') {
    return (
      <div
        className={`py-8 px-4 flex flex-col items-center justify-center text-center space-y-3 rounded-2xl bg-surface-1/60 border border-white/[0.06] backdrop-blur-md ${className}`}
      >
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-lg shadow-violet-950/30">
            <IconComponent className="w-5 h-5 text-violet-300 animate-pulse" />
          </div>
          <Loader2 className="w-12 h-12 text-violet-400/60 animate-spin absolute -inset-1" />
        </div>

        <div className="space-y-1 max-w-xs">
          <h4 className="text-xs font-bold text-white tracking-tight">{displayTitle}</h4>
          <p className="text-[11px] text-slate-300 leading-snug">{displaySubtitle}</p>
        </div>
      </div>
    );
  }

  // Full Screen / Major Viewport Mode
  return (
    <div
      className={`min-h-screen w-full bg-[#07070C] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none z-50 ${className}`}
    >
      {/* Ambient Radial Spotlight Backdrops */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-violet-600/15 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0D0E17]/90 border border-white/10 backdrop-blur-2xl shadow-2xl shadow-black/90 p-7 sm:p-9 text-center space-y-6">
        {/* Top Edge Gradient Beam */}
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

        {/* Central Glowing Beacon */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          {/* Outer Pulsing Aura */}
          <div className="absolute inset-0 rounded-full border border-violet-500/25 bg-violet-600/5 animate-ping opacity-30" />

          {/* Middle Dashed Spinning Orbit */}
          <div className="absolute inset-1 rounded-full border-2 border-dashed border-violet-400/30 animate-[spin_10s_linear_infinite]" />

          {/* Inner Glowing Hex / Rounded Core */}
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-xl shadow-violet-600/40 border border-white/20">
            <IconComponent className="w-7 h-7 text-white drop-shadow-md" />
          </div>

          {/* Orbiting Mini Spinner Badge */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-1 border border-violet-400/40 flex items-center justify-center shadow-md">
            <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
          </div>
        </div>

        {/* Context Specific Item Pill (e.g. Paper Title) */}
        {itemTitle && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-medium text-slate-200 max-w-md mx-auto shadow-inner">
            <IconComponent className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="truncate max-w-[280px] sm:max-w-[340px] text-left">{itemTitle}</span>
          </div>
        )}

        {/* Headline & Description */}
        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {displayTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-sm mx-auto">
            {displaySubtitle}
          </p>
        </div>

        {/* Smooth Shimmer Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-indigo-400 to-purple-500 rounded-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
            <div
              className="h-full w-1/2 bg-white/40 rounded-full blur-[2px] animate-[slide_1.8s_ease-in-out_infinite]"
              style={{
                animation: 'slide 1.8s ease-in-out infinite alternate',
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 px-1">
            <span>Secure Stream</span>
            <span className="text-violet-300 font-semibold">Readying Viewport...</span>
          </div>
        </div>

        {/* Status Pipeline Chips */}
        {displayStages && displayStages.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {displayStages.map((stage, idx) => (
              <div
                key={idx}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  stage.status === 'done'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : stage.status === 'active'
                    ? 'bg-violet-500/15 border-violet-500/40 text-violet-200 shadow-sm shadow-violet-950/40'
                    : 'bg-white/[0.03] border-white/[0.06] text-slate-400'
                }`}
              >
                {stage.status === 'done' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : stage.status === 'active' ? (
                  <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                )}
                <span>{stage.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Interactive Academic Tip Box */}
        {showTips && config.tips.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-left space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-violet-300 tracking-wider uppercase flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-400" />
                Research Tip
              </span>
              {config.tips.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextTip}
                  className="text-[10px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/[0.06]"
                  title="Show next tip"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Next Tip</span>
                </button>
              )}
            </div>
            <p
              className={`text-xs text-slate-300 leading-relaxed transition-opacity duration-200 ${
                isTipFading ? 'opacity-20' : 'opacity-100'
              }`}
            >
              {config.tips[tipIndex]}
            </p>
          </div>
        )}

        {/* Footer Actions (Cancel / Return & High Latency Prompt) */}
        <div className="pt-2 flex flex-col items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-white/10 hover:border-white/20 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-md active:scale-[0.98]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{cancelLabel}</span>
            </button>
          )}

          {showLatencyNotice && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[11px] text-amber-400/90 hover:text-amber-300 hover:underline transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Taking longer than expected? Click to re-fetch</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextualLoader;
