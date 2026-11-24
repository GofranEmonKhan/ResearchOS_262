import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../lib/api.js';
import { Logo } from '../../components/brand/Logo.js';
import { NeuralGalaxyBackground } from '../../components/effects/NeuralGalaxyBackground.js';
import { 
  CheckCircle2, 
  Building2, 
  Tag, 
  GraduationCap, 
  FlaskConical, 
  Loader2, 
  AlertCircle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { UserRole } from '@researchos/shared-types';

interface CompleteProfilePageProps {
  onNavigate: (route: string) => void;
}

export const CompleteProfilePage: React.FC<CompleteProfilePageProps> = ({ onNavigate }) => {
  const { user, profile, refreshProfile } = useAuth();

  const [role, setRole] = useState<UserRole>('Researcher');
  const [institution, setInstitution] = useState(profile?.institution || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [researchTags, setResearchTags] = useState(profile?.researchFieldTags?.join(', ') || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.institution && profile?.department && profile?.role) {
      // Profile already fully initialized
      onNavigate('/dashboard');
    }
  }, [profile, onNavigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution || !department) {
      setErrorMsg('Please specify both your institution and department.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const tagsArray = researchTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await api.updateProfile({
        institution,
        department,
        researchFieldTags: tagsArray,
      });

      await refreshProfile();
      onNavigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete profile onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Living Neural Galaxy Background Layer */}
      <NeuralGalaxyBackground />

      <div className="mb-6 text-center">
        <div className="mb-3 flex justify-center">
          <Logo size="md" onClick={() => onNavigate('/')} />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>OAuth Account Authenticated</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Complete Academic Onboarding
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
          Welcome{user?.email ? `, ${user.email}` : ''}! Please configure your institutional affiliation to enter ResearchOS.
        </p>
      </div>

      <div className="w-full max-w-lg bg-[#0E1118]/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/80 relative z-10">
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Primary Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('Researcher')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  role === 'Researcher'
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                    : 'bg-[#141824]/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FlaskConical className={`w-4 h-4 ${role === 'Researcher' ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="font-semibold text-sm text-white">Researcher</span>
                </div>
                <p className="text-[11px] text-slate-400">Student or investigator</p>
              </button>

              <button
                type="button"
                onClick={() => setRole('Supervisor')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  role === 'Supervisor'
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                    : 'bg-[#141824]/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap className={`w-4 h-4 ${role === 'Supervisor' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="font-semibold text-sm text-white">Supervisor</span>
                </div>
                <p className="text-[11px] text-slate-400">Faculty or PI</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              University / Institute
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Stanford University, MIT"
                className="w-full bg-[#141824] border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Department
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Department of Computer Science"
                className="w-full bg-[#141824] border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Research Field Tags <span className="text-slate-500 normal-case">(optional)</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={researchTags}
                onChange={(e) => setResearchTags(e.target.value)}
                placeholder="Machine Learning, NLP, Quantum Computing"
                className="w-full bg-[#141824] border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Finalizing Profile...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Save Profile & Enter Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
