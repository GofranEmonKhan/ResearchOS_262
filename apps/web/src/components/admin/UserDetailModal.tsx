import React, { useEffect, useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Building2, 
  ShieldCheck, 
  AlertTriangle, 
  UserX, 
  Clock, 
  Calendar, 
  FolderKanban, 
  Lock,
  History,
  Loader2
} from 'lucide-react';
import { AdminUserDetail, UserRole } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import { UserAvatar } from '../common/UserAvatar.js';

interface UserDetailModalProps {
  userId: string | null;
  isOpen: boolean;
  initialDetail?: AdminUserDetail | null;
  onClose: () => void;
  onRoleChange: (userId: string, newRole: UserRole) => void;
  onToggleSuspend: (userId: string, currentStatus: string) => void;
  onForcePasswordReset: (userId: string) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  userId,
  isOpen,
  initialDetail = null,
  onClose,
  onRoleChange,
  onToggleSuspend,
  onForcePasswordReset,
}) => {
  const [detail, setDetail] = useState<AdminUserDetail | null>(initialDetail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDetail) {
      setDetail(initialDetail);
    }
  }, [initialDetail]);

  useEffect(() => {
    if (!isOpen || !userId) {
      setDetail(null);
      setError(null);
      return;
    }
    if (initialDetail) return;

    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getAdminUserDetail(userId);
        setDetail(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load user operational details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const verification = detail?.verificationHistory && detail.verificationHistory.length > 0 ? detail.verificationHistory[0] : null;
  const auditLogs = detail?.recentAuditLogs || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl bg-[#0D0F18] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111420]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-300 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Operational User Profile</h3>
              <p className="text-xs text-slate-400 font-mono">ID: {userId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
              <span>Fetching secure operational telemetry...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : detail ? (
            <>
              {/* Privacy Boundary Banner (Spec 09 & AGENTS.md rule) */}
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                <div>
                  <span className="font-semibold text-indigo-200">Governance Privacy Boundary:</span> Admin access is strictly operational and metadata-bound. Private research notes, paper highlights, manuscript bodies, experiment files, and direct messages remain inaccessible.
                </div>
              </div>

              {/* Main Profile Info Card */}
              <div className="p-5 rounded-xl bg-[#141824] border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <UserAvatar 
                      name={detail.fullName || 'User'} 
                      photoUrl={detail.photoUrl} 
                      role={detail.role} 
                      size="lg" 
                    />
                    <div>
                      <h4 className="text-base font-bold text-white">{detail.fullName || 'Unnamed Scholar'}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{detail.email || 'No email attached'}</span>
                      </p>
                      {detail.institution && (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{detail.institution}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status & Role Badges */}
                  <div className="flex sm:flex-col items-end gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      detail.role === 'Admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                      detail.role === 'Supervisor' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30' :
                      'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    }`}>
                      {detail.role}
                    </span>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      detail.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      detail.status === 'Suspended' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {detail.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Associated Projects</span>
                    <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                      <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{detail.projectsCount} Projects</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Member Since</span>
                    <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Last Updated</span>
                    <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{detail.updatedAt ? new Date(detail.updatedAt).toLocaleDateString() : 'N/A'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Supervisor Verification History (if applicable) */}
              {verification && (
                <div className="p-4 rounded-xl bg-[#141824] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-violet-400" />
                      <span>Supervisor Verification Record</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      verification.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      verification.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {verification.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500">Institution Domain:</span>{' '}
                      <span className="font-mono text-slate-200">{verification.institutionDomain}</span>
                    </div>
                    {verification.documentUrl && (
                      <div className="truncate">
                        <span className="text-slate-500">Document:</span>{' '}
                        <span className="font-mono text-indigo-300">{verification.documentUrl}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Audit Events */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>Recent Audit Activity ({auditLogs.length})</span>
                </h5>

                {auditLogs.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#141824] border border-slate-800 text-center text-xs text-slate-500">
                    No privileged actions recorded for this user identity.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 rounded-xl bg-[#141824] border border-slate-800/80 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-200">{log.action}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Target: {log.targetType} ({log.targetId ? log.targetId.slice(0, 8) + '...' : 'Global'})
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                          <div className="font-mono text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        {detail && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-[#111420]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onRoleChange(detail.id, detail.role)}
                className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                Change Role
              </button>

              <button
                onClick={() => onToggleSuspend(detail.id, detail.status)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  detail.status === 'Suspended'
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>{detail.status === 'Suspended' ? 'Reactivate Account' : 'Suspend Account'}</span>
              </button>

              <button
                onClick={() => onForcePasswordReset(detail.id)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Reset Password</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
