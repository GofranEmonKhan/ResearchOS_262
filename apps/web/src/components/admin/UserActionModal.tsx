import React, { useState } from 'react';
import { X, CheckCircle2, UserCheck, KeyRound, UserX, Loader2 } from 'lucide-react';
import { UserRole } from '@researchos/shared-types';
import { HoverSelect } from '../common/HoverSelect.js';

export type UserActionType = 'role' | 'suspend' | 'reactivate' | 'password-reset';

interface UserActionModalProps {
  isOpen: boolean;
  actionType: UserActionType | null;
  targetUser: { id: string; name: string; role: string; status: string } | null;
  onClose: () => void;
  onSubmitRoleChange: (userId: string, newRole: UserRole) => Promise<void>;
  onSubmitSuspend: (userId: string) => Promise<void>;
  onSubmitForcePasswordReset: (userId: string) => Promise<void>;
}

export const UserActionModal: React.FC<UserActionModalProps> = ({
  isOpen,
  actionType,
  targetUser,
  onClose,
  onSubmitRoleChange,
  onSubmitSuspend,
  onSubmitForcePasswordReset,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>((targetUser?.role as UserRole) || 'Researcher');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !actionType || !targetUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (actionType === 'role') {
        await onSubmitRoleChange(targetUser.id, selectedRole);
      } else if (actionType === 'suspend' || actionType === 'reactivate') {
        await onSubmitSuspend(targetUser.id);
      } else if (actionType === 'password-reset') {
        await onSubmitForcePasswordReset(targetUser.id);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-md bg-[#0D0F18] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#111420]">
          <div className="flex items-center gap-2.5">
            {actionType === 'role' && <UserCheck className="w-5 h-5 text-indigo-400" />}
            {actionType === 'suspend' && <UserX className="w-5 h-5 text-rose-400" />}
            {actionType === 'reactivate' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {actionType === 'password-reset' && <KeyRound className="w-5 h-5 text-amber-400" />}
            <h3 className="text-sm font-bold text-white">
              {actionType === 'role' && 'Assign Application Role'}
              {actionType === 'suspend' && 'Suspend User Account'}
              {actionType === 'reactivate' && 'Reactivate User Account'}
              {actionType === 'password-reset' && 'Force Password Recovery'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-[#141824] border border-slate-800 space-y-1">
            <div className="text-slate-400">Target Scholar:</div>
            <div className="text-sm font-bold text-white">{targetUser.name}</div>
            <div className="text-slate-500 font-mono text-[11px] truncate">UUID: {targetUser.id}</div>
          </div>

          {actionType === 'role' && (
            <div className="space-y-2">
              <label className="block font-semibold uppercase tracking-wider text-slate-300">
                Select Platform Role
              </label>
              <HoverSelect
                value={selectedRole}
                onChange={(val) => setSelectedRole(val as UserRole)}
                options={[
                  { value: 'Researcher', label: 'Researcher (Default Student/Lab Member)' },
                  { value: 'Supervisor', label: 'Supervisor (PI / Lab Director with Approval Rights)' },
                  { value: 'Admin', label: 'Admin (Platform Governance & System Operations)' },
                ]}
                className="w-full"
                buttonClassName="py-2.5 text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Changing a role updates user permissions immediately across all API endpoints and routes.
              </p>
            </div>
          )}

          {actionType === 'suspend' && (
            <div className="space-y-2 text-slate-300 leading-relaxed">
              <p>
                Are you sure you want to <span className="font-bold text-rose-400">suspend</span> this account?
              </p>
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300 text-[11px]">
                The user will be immediately blocked from all authenticated endpoints and Supabase sessions without waiting for token expiration.
              </div>
            </div>
          )}

          {actionType === 'reactivate' && (
            <div className="space-y-2 text-slate-300 leading-relaxed">
              <p>
                Are you sure you want to <span className="font-bold text-emerald-400">reactivate</span> this account?
              </p>
              <p className="text-slate-400">
                The account status will return to <span className="font-semibold text-emerald-400">Active</span> and full role-based access will be restored immediately.
              </p>
            </div>
          )}

          {actionType === 'password-reset' && (
            <div className="space-y-2 text-slate-300 leading-relaxed">
              <p>
                Trigger an administrative password reset for this scholar?
              </p>
              <p className="text-slate-400">
                A password recovery authorization link will be generated and dispatched.
              </p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                actionType === 'suspend'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  : actionType === 'reactivate'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : actionType === 'password-reset'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
              } disabled:opacity-50`}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {actionType === 'role' && 'Save Role Changes'}
                {actionType === 'suspend' && 'Confirm Suspension'}
                {actionType === 'reactivate' && 'Confirm Reactivation'}
                {actionType === 'password-reset' && 'Send Recovery Email'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
