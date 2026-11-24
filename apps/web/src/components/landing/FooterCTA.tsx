import React, { useState } from 'react';
import { Sparkles, ArrowRight, Mail, CheckCircle2, ShieldCheck } from 'lucide-react';

interface FooterCTAProps {
  onLaunchWorkspace?: (email?: string) => void;
}

export const FooterCTA: React.FC<FooterCTAProps> = ({ onLaunchWorkspace }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      onLaunchWorkspace?.(email.trim());
    } else {
      onLaunchWorkspace?.();
    }
  };

  return (
    <footer className="relative pt-16 pb-12 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
      {/* High-Conversion Main CTA Card */}
      <div className="relative rounded-3xl p-8 sm:p-14 lg:p-16 card-glass border-2 border-purple-500/40 shadow-[0_0_80px_-15px_rgba(139,92,246,0.45)] text-center overflow-hidden mb-16">
        {/* Background ambient lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-purple-600/25 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-64 h-64 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Ready for Next-Gen Academic Workflows
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-white tracking-tight leading-tight">
            Transform How Your Lab Conducts, Tracks, and{' '}
            <span className="text-gradient-cyan-violet italic">Publishes Science</span>.
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Join hundreds of research groups accelerating their publications with faculty supervision loops, literature extraction, and reproducible experiment tracking.
          </p>

          {/* Email Onboarding Action Pill */}
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-xl mx-auto card-glass rounded-full p-2 flex items-center gap-2 border border-purple-500/40 shadow-glow-sm focus-within:border-purple-400 focus-within:shadow-glow-md transition-all"
          >
            <div className="pl-3.5 text-slate-400">
              <Mail className="w-4 h-4 text-purple-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter institutional email (.edu, .ac, .org)..."
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none px-2 font-sans"
            />
            <button
              type="submit"
              className="btn-electric-pill px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>{submitted ? 'Opening Workspace...' : 'Launch Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-mono pt-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Free 14-Day Lab Trial
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> RLS Data Isolation
            </span>
          </div>
        </div>
      </div>

      {/* Footer Navigation Columns */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-white/[0.08] text-xs">
        {/* Brand Column */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-white font-sans">
              Research<span className="text-purple-400">OS</span>
            </span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed max-w-sm font-sans">
            The integrated operating system for academic supervision, literature review, reproducible experimentation, and manuscript publishing.
          </p>
          <div className="text-[11px] font-mono text-purple-300">
            Powered by Supabase Postgres & pgvector
          </div>
        </div>

        {/* Product Navigation */}
        <div className="space-y-2.5">
          <div className="font-bold text-white uppercase tracking-wider font-mono text-[11px]">Product</div>
          <ul className="space-y-2 text-slate-400">
            <li><a href="#features" className="hover:text-purple-300 transition">Features</a></li>
            <li><a href="#supervision" className="hover:text-purple-300 transition">Faculty Supervision</a></li>
            <li><a href="#literature" className="hover:text-purple-300 transition">Literature Manager</a></li>
            <li><a href="#experiments" className="hover:text-purple-300 transition">Experiment Tracker</a></li>
            <li><a href="#pricing" className="hover:text-purple-300 transition">Pricing Plans</a></li>
          </ul>
        </div>

        {/* Resources & Content */}
        <div className="space-y-2.5">
          <div className="font-bold text-white uppercase tracking-wider font-mono text-[11px]">Resources</div>
          <ul className="space-y-2 text-slate-400">
            <li><a href="#blogs" className="hover:text-purple-300 transition">Research Insights & Blogs</a></li>
            <li><a href="#features" className="hover:text-purple-300 transition">Citation Purpose Store</a></li>
            <li><a href="#features" className="hover:text-purple-300 transition">Reproducibility Guide</a></li>
            <li><a href="#features" className="hover:text-purple-300 transition">LaTeX Writing Toolkit</a></li>
          </ul>
        </div>

        {/* Governance & Privacy */}
        <div className="space-y-2.5">
          <div className="font-bold text-white uppercase tracking-wider font-mono text-[11px]">Governance</div>
          <ul className="space-y-2 text-slate-400">
            <li><span className="hover:text-purple-300 transition cursor-pointer">Security Architecture</span></li>
            <li><span className="hover:text-purple-300 transition cursor-pointer">Ownership Beats Role</span></li>
            <li><span className="hover:text-purple-300 transition cursor-pointer">Supabase RLS Protocol</span></li>
            <li><span className="hover:text-purple-300 transition cursor-pointer">Academic Terms & IP</span></li>
          </ul>
        </div>
      </div>

      {/* Copyright & Disclaimer */}
      <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-500">
        <div>
          © {new Date().getFullYear()} ResearchOS Platform. Built for scientific rigor and academic integrity.
        </div>
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-400 transition cursor-pointer">Privacy Policy</span>
          <span className="hover:text-slate-400 transition cursor-pointer">Terms of Service</span>
          <span className="hover:text-slate-400 transition cursor-pointer">Academic Guidelines</span>
        </div>
      </div>
    </footer>
  );
};
