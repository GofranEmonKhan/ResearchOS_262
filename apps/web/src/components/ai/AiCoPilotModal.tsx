import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Search,
  BookOpen,
  FileEdit,
  ClipboardList,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
  Layers,
  Cpu,
  Compass,
} from 'lucide-react';
import { AiUsageIndicator } from './AiUsageIndicator.js';
import { SemanticSearchPanel } from './SemanticSearchPanel.js';
import { LiteratureDiscoveryView } from './discovery/LiteratureDiscoveryView.js';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../lib/api.js';
import type { Project } from '@researchos/shared-types';

interface AiCoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export const AiCoPilotModal: React.FC<AiCoPilotModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'discover' | 'search' | 'hub' | 'quota'>('discover');
  const [projects, setProjects] = useState<Project[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      api.getProjects().then(setProjects).catch(() => {});
    }
  }, [isOpen]);


  if (!isOpen) return null;

  const handleLaunch = (route: string) => {
    onClose();
    if (onNavigate) {
      onNavigate(route);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[#0A0D14] border border-violet-900/40 rounded-3xl shadow-2xl shadow-violet-950/50 flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-violet-950/40 via-[#0E121E] to-[#0A0D14]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-0.5 shadow-lg shadow-violet-600/30 flex items-center justify-center">
              <div className="w-full h-full bg-[#0A0D14] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Research AI Co-Pilot</h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-500/30">
                  Gemini Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Autonomous academic intelligence for literature discovery, synthesis & writing
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <AiUsageIndicator variant="badge" />
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Close Co-Pilot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center px-6 border-b border-white/[0.06] bg-[#0E121E]/60 gap-2">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'discover'
                ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Literature Discovery</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'search'
                ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Semantic Search</span>
          </button>

          <button
            onClick={() => setActiveTab('hub')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'hub'
                ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>AI Tools & Launchpad</span>
          </button>

          <button
            onClick={() => setActiveTab('quota')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'quota'
                ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Quota & Usage</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'discover' && (
            <LiteratureDiscoveryView
              projects={projects}
              onOpenPaper={(paperId) => handleLaunch(`/papers/${paperId}`)}
            />
          )}

          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/20 via-indigo-950/10 to-transparent border border-violet-900/30 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-violet-200 uppercase tracking-wider mb-1">
                    Global Semantic Paper Explorer
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Query your entire research library using conceptual meaning and hypothesis matches, backed by high-dimensional vectors.
                  </p>
                </div>
                <button
                  onClick={() => handleLaunch('/literature')}
                  className="px-3.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-200 border border-violet-500/30 text-sm font-medium flex items-center space-x-1.5 transition-colors shrink-0"
                >
                  <span>Open Full Library</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              <SemanticSearchPanel
                onOpenPaper={(paperId) => {
                  handleLaunch(`/papers/${paperId}`);
                }}
              />
            </div>
          )}

          {activeTab === 'hub' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Interactive AI Tool Directory</h3>
                <p className="text-sm text-slate-300">
                  Where and how to use ResearchOS AI across your research workflow.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Paper Summaries & Extraction */}
                <div className="p-5 rounded-2xl bg-[#0E121E] border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-3">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1 group-hover:text-violet-300 transition-colors">
                      Paper Synthesis & Structured Extraction
                    </h4>
                    <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                      Instant Quick, Comprehensive, and Critique summaries, plus automated extraction of Research Gaps, Methodology, and Limitations directly from PDF files.
                    </p>
                    <div className="space-y-1.5 text-xs text-slate-300 font-mono bg-black/30 p-2.5 rounded-xl border border-white/5">
                      <div><strong className="text-slate-200">Where:</strong> Paper Viewer &gt; Smart Research Sidebar &gt; AI Assist Tab</div>
                      <div><strong className="text-slate-200">Purpose:</strong> Rapid literature review &amp; citation matrix</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLaunch('/literature')}
                    className="mt-4 w-full py-2.5 px-4 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-200 border border-violet-500/30 text-sm font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <span>Launch in Literature Library</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Manuscript Writing Assistant */}
                <div className="p-5 rounded-2xl bg-[#0E121E] border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                      <FileEdit className="w-4 h-4" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                      Manuscript Writing &amp; Transparency Co-Pilot
                    </h4>
                    <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                      Highlight any section in your paper to paraphrase for academic tone, fix grammar, or scaffold new sections. Includes diff preview and transparent AI badges.
                    </p>
                    <div className="space-y-1.5 text-xs text-slate-300 font-mono bg-black/30 p-2.5 rounded-xl border border-white/5">
                      <div><strong className="text-slate-200">Where:</strong> Manuscripts &gt; Editor &gt; Sparkles Action Bar</div>
                      <div><strong className="text-slate-200">Purpose:</strong> Drafting, peer review refinement &amp; disclosure</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLaunch('/manuscripts')}
                    className="mt-4 w-full py-2.5 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 text-sm font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <span>Launch in Manuscripts</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 3. Supervisor Progress Reports */}
                <div className="p-5 rounded-2xl bg-[#0E121E] border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                      Supervisor Weekly Progress Synthesis
                    </h4>
                    <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                      Automated weekly research digest synthesizing student task velocity, experiment outcomes, and manuscript drafts for Principal Investigators.
                    </p>
                    <div className="space-y-1.5 text-xs text-slate-300 font-mono bg-black/30 p-2.5 rounded-xl border border-white/5">
                      <div><strong className="text-slate-200">Where:</strong> Supervisor Dashboard &gt; Project Overview &gt; Generate Report</div>
                      <div><strong className="text-slate-200">Purpose:</strong> Lab oversight &amp; funding grant milestone tracking</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLaunch('/dashboard')}
                    className="mt-4 w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 text-sm font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 4. Admin Governance & Token Limits */}
                <div className="p-5 rounded-2xl bg-[#0E121E] border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                      AI Governance, Quotas &amp; Prompt Firewall
                    </h4>
                    <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                      Control LLM provider adapters, set per-role monthly token limits, block harmful/jailbreak prompt strings, and inspect system-wide cost analytics.
                    </p>
                    <div className="space-y-1.5 text-xs text-slate-300 font-mono bg-black/30 p-2.5 rounded-xl border border-white/5">
                      <div><strong className="text-slate-200">Where:</strong> Admin Console &gt; AI Settings Tab</div>
                      <div><strong className="text-slate-200">Purpose:</strong> Platform cost control &amp; content compliance</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLaunch(profile?.role === 'Admin' ? '/dashboard' : '/profile')}
                    className="mt-4 w-full py-2.5 px-4 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 border border-amber-500/30 text-sm font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <span>{profile?.role === 'Admin' ? 'Open Admin Console' : 'View Account Status'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quota' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#0E121E] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Monthly AI Token Allowance</h3>
                    <p className="text-sm text-slate-300">
                      Your quota resets automatically on the 1st of every calendar month.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                  <AiUsageIndicator variant="compact" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Account Role</div>
                    <div className="text-sm font-bold text-white mt-1">{profile?.role || 'Researcher'}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active LLM Model</div>
                    <div className="text-sm font-bold text-violet-400 mt-1">gemini-3.5-flash-lite</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Vector Index</div>
                    <div className="text-sm font-bold text-indigo-400 mt-1">pgvector (768-dim)</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-slate-200 leading-relaxed">
                  <strong className="text-white font-semibold">Human-in-the-Loop Guarantee:</strong> AI suggestions are never automatically committed to your manuscripts or papers. You retain full authorial control to accept, reject, or revise every suggestion.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#0E121E]/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-slate-400" />
            <span>ResearchOS Intelligent Assistant Subsystem</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
