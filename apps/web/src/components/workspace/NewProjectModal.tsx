import React, { useState } from 'react';
import { Project, UserRole } from '@researchos/shared-types';
import { supabase } from '../../supabase.js';
import {
  X,
  FolderKanban,
  User,
  Sparkles,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
  GraduationCap,
  Microscope,
} from 'lucide-react';

export interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: UserRole;
  onProjectCreated: (project: Project) => void;
}

const DOMAIN_PRESETS = [
  'Machine Learning',
  'Deep Learning',
  'NLP',
  'Computer Vision',
  'Bioinformatics',
  'Quantum Computing',
  'Robotics',
  'Neuroscience',
  'Cybersecurity',
  'Materials Science',
];

const STANDARD_MILESTONES = [
  { name: 'Phase 1: Literature Review & Problem Formulation', weightPct: 20 },
  { name: 'Phase 2: Baseline Implementation & Data Pipeline', weightPct: 30 },
  { name: 'Phase 3: Core Model Experimentation & Ablation Study', weightPct: 30 },
  { name: 'Phase 4: Manuscript Preparation & Benchmark Reporting', weightPct: 20 },
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  userRole = 'Researcher',
  onProjectCreated,
}) => {
  const isSupervisor = userRole === 'Supervisor' || userRole === 'Admin';

  // Form State
  const [isPersonal, setIsPersonal] = useState<boolean>(!isSupervisor);
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [domainTags, setDomainTags] = useState<string[]>(['Machine Learning']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  const [seedMilestones, setSeedMilestones] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleTag = (tag: string) => {
    if (domainTags.includes(tag)) {
      setDomainTags(domainTags.filter((t) => t !== tag));
    } else {
      if (domainTags.length < 5) {
        setDomainTags([...domainTags, tag]);
      }
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const clean = customTagInput.trim();
      if (!domainTags.includes(clean) && domainTags.length < 5) {
        setDomainTags([...domainTags, clean]);
        setCustomTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setDomainTags(domainTags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a research project title.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        throw new Error('You must be signed in to create a project.');
      }

      // 1. Create Project
      const res = await fetch('/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          abstract: abstract.trim() || undefined,
          domainTags: domainTags.length > 0 ? domainTags : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          isPersonal: isSupervisor ? isPersonal : true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to initialize research project.');
      }

      const createdProject: Project = await res.json();

      // 2. Optionally initialize standard research milestones
      if (seedMilestones && createdProject.id) {
        try {
          for (const m of STANDARD_MILESTONES) {
            await fetch(`/projects/${createdProject.id}/milestones`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                name: m.name,
                weightPct: m.weightPct,
              }),
            });
          }
        } catch (milestoneErr) {
          console.warn('Could not auto-seed default milestones:', milestoneErr);
        }
      }

      onProjectCreated(createdProject);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while launching workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0E1118] border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 border border-violet-500/30 flex items-center justify-center text-white shadow-lg shadow-violet-600/25">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isSupervisor
                  ? isPersonal
                    ? 'Create Independent Research Project'
                    : 'Launch Supervised Lab Project'
                  : 'Create Research Workspace'}
              </h2>
              <p className="text-xs text-slate-400">
                {isSupervisor
                  ? 'Configure research scope, collaborative permissions, and lifecycle milestones.'
                  : 'Set up your independent computational workbench and experimental roadmap.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Mode Selector (Supervisors Only) */}
          {isSupervisor ? (
            <div className="space-y-2">
              <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Workspace Architecture & Scope
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPersonal(false)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    !isPersonal
                      ? 'bg-violet-950/40 border-violet-500/60 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30'
                      : 'bg-[#141824]/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-300">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-white">Supervised Lab Project</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Multi-member team workspace. Invite student researchers, assign milestones, and review submitted deliverables.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPersonal(true)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isPersonal
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                      : 'bg-[#141824]/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-white">Personal Investigation</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Single-investigator workbench. Direct task and milestone management without supervisor approval gates.
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
              <Microscope className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-indigo-300">Independent Researcher Workspace</div>
                <p className="text-[11px] text-slate-400">
                  You are creating an independent project. You have full autonomous control over task creation, progress milestones, and experimental logs.
                </p>
              </div>
            </div>
          )}

          {/* Project Title */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Project Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Geometric Deep Learning on Non-Euclidean Protein Manifolds"
              className="w-full bg-[#141824] border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Research Abstract & Objectives */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Research Scope / Abstract <span className="text-slate-500 normal-case">(optional)</span>
              </label>
              <span className="text-[10px] text-slate-500">Methodology & hypothesis</span>
            </div>
            <textarea
              rows={3}
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Describe the research problem statement, core hypothesis, proposed computational architecture, and anticipated contributions..."
              className="w-full bg-[#141824] border border-slate-700/60 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
            />
          </div>

          {/* Academic Domain Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Scientific Taxonomy & Domains <span className="text-slate-500 normal-case">(up to 5)</span>
              </label>
              <span className="text-[10px] text-slate-500">{domainTags.length}/5 selected</span>
            </div>

            {/* Selected Tags */}
            <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 rounded-xl bg-[#141824]/60 border border-slate-800">
              {domainTags.length === 0 ? (
                <span className="text-slate-500 text-[11px] italic self-center">Select domains below or type custom tag</span>
              ) : (
                domainTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-medium"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-rose-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Domain Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DOMAIN_PRESETS.map((preset) => {
                const isSelected = domainTags.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleToggleTag(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'bg-violet-600 text-white border border-violet-400/30'
                        : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {preset}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="pt-1">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="Type custom domain tag and press Enter..."
                className="w-full bg-[#141824] border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Project Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#141824] border border-slate-700/60 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Target Completion <span className="text-slate-500 normal-case">(optional)</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#141824] border border-slate-700/60 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Milestone Seeder Option */}
          <div className="p-4 rounded-2xl bg-[#141824]/80 border border-slate-800 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={seedMilestones}
                onChange={(e) => setSeedMilestones(e.target.checked)}
                className="mt-1 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500"
              />
              <div className="space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto-provision Standard 4-Phase Research Lifecycle Milestones</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Pre-configures standard weighted milestones: Literature Review (20%), Baseline Pipeline (30%), Core Experimentation (30%), and Manuscript Benchmark (20%).
                </p>
              </div>
            </label>
          </div>

          {/* Live Preview Card */}
          {title.trim() && (
            <div className="space-y-1.5 pt-1">
              <span className="block font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                Live Workspace Card Preview
              </span>
              <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/20 to-[#0A0914] p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-bold text-white truncate pr-2">{title}</h3>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border bg-blue-500/10 border-blue-500/20 text-blue-400">
                    Planning
                  </span>
                </div>
                {abstract && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {abstract}
                  </p>
                )}
                {domainTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {domainTags.map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/15">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Launching Workspace...</span>
              </>
            ) : (
              <>
                <FolderKanban className="w-4 h-4" />
                <span>Launch Research Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
