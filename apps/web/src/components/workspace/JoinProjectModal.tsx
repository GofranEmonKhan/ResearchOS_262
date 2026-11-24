import React, { useState } from 'react';
import { Project } from '@researchos/shared-types';
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../../supabase.js';

export interface JoinProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectJoined: (project: Project) => void;
}

export const JoinProjectModal: React.FC<JoinProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectJoined,
}) => {
  const [code, setCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ project: Project; message: string } | null>(null);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessData(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setErrorMessage('Authentication session expired. Please sign in again.');
        return;
      }

      const res = await fetch(`/invites/${encodeURIComponent(cleanCode)}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.project) {
        setSuccessData({ project: data.project, message: data.message || 'Successfully joined project!' });
        setTimeout(() => {
          onProjectJoined(data.project);
          onClose();
          setCode('');
          setSuccessData(null);
        }, 1200);
      } else {
        setErrorMessage(data.error || 'Invalid or expired invite code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while joining project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0D0C18] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl shadow-black/90 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Join Research Workspace</h3>
              <p className="text-[11px] text-slate-400">Enter your project invitation code</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              setCode('');
              setErrorMessage(null);
              setSuccessData(null);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {successData ? (
            <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">{successData.project.title}</h4>
              <p className="text-xs text-emerald-300 font-medium">{successData.message}</p>
              <p className="text-[11px] text-slate-400">Redirecting to workspace...</p>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider block">
                  Invite Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. RES-9A2F4E1B"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setErrorMessage(null);
                    }}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-sm font-mono tracking-widest text-center text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 uppercase font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Ask your Principal Investigator or Co-Supervisor for the 12-character project join code.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !code.trim()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Join Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
