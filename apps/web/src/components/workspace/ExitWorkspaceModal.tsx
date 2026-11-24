import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { UserAvatar } from '../common/UserAvatar.js';
import { LogOut, ArrowLeft, ShieldAlert, Sparkles } from 'lucide-react';

export interface ExitWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSignOut: () => Promise<void>;
  targetRouteName?: string;
}

export const ExitWorkspaceModal: React.FC<ExitWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onConfirmSignOut,
}) => {
  const { profile } = useAuth();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div
        className="relative bg-[#0D0C18] border border-white/15 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl shadow-black/90 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-workspace-title"
      >
        {/* Subtle Ambient Gradient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-5">
          {/* Header Icon + Badge */}
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-lg shadow-violet-600/20">
              <ShieldAlert className="w-6 h-6 text-violet-300" />
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Active Session</span>
            </span>
          </div>

          {/* Title & Body */}
          <div className="space-y-2">
            <h3 id="exit-workspace-title" className="text-lg font-bold text-white tracking-tight">
              Leave Research Workspace?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              You navigated back while working in your active research session. Do you want to sign out and return to the home page, or continue working?
            </p>
          </div>

          {/* Current User Session Preview */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center space-x-3">
            <UserAvatar
              photoUrl={profile?.photoUrl}
              name={profile?.fullName}
              role={profile?.role}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.fullName || 'Active Researcher'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {profile?.institution || 'Academic Institute'} · <span className="text-violet-400 font-medium">{profile?.role}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={onConfirmSignOut}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/30 border border-white/10 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out & Return Home</span>
            </button>

            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02] flex items-center justify-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Stay in Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
