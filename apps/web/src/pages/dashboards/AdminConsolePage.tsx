import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../lib/api.js';
import { Logo } from '../../components/brand/Logo.js';
import { HoverSelect } from '../../components/common/HoverSelect.js';
import { 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  KeyRound, 
  Loader2, 
  FileText, 
  Building2, 
  UserX,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { SupervisorVerificationRequest, UserRole } from '@researchos/shared-types';

interface AdminConsolePageProps {
  onNavigate: (route: string) => void;
}

export const AdminConsolePage: React.FC<AdminConsolePageProps> = ({ onNavigate }) => {
  const { signOut } = useAuth();

  const [verifications, setVerifications] = useState<SupervisorVerificationRequest[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Target User Management form state
  const [targetUserId, setTargetUserId] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Researcher');
  const [isManagingUser, setIsManagingUser] = useState(false);

  const fetchQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const data = await api.getAdminSupervisorVerifications();
      setVerifications(data);
    } catch (err: any) {
      console.error('Failed to load supervisor verification queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    setStatusMessage(null);
    try {
      await api.approveSupervisorVerification(id);
      setStatusMessage({ type: 'success', text: 'Supervisor approved and activated. Audit log recorded.' });
      await fetchQueue();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to approve supervisor.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter the reason for rejection (e.g. invalid faculty ID, domain mismatch):');
    if (!reason) return;

    setActionLoadingId(id);
    setStatusMessage(null);
    try {
      await api.rejectSupervisorVerification(id, reason);
      setStatusMessage({ type: 'success', text: 'Supervisor verification rejected. Audit log recorded.' });
      await fetchQueue();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to reject verification.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSuspendUser = async () => {
    if (!targetUserId) return;
    setIsManagingUser(true);
    setStatusMessage(null);
    try {
      await api.suspendUser(targetUserId);
      setStatusMessage({ type: 'success', text: `User ${targetUserId} suspended. Next request will be immediately blocked.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to suspend user.' });
    } finally {
      setIsManagingUser(false);
    }
  };

  const handleForcePasswordReset = async () => {
    if (!targetUserId) return;
    setIsManagingUser(true);
    setStatusMessage(null);
    try {
      await api.forcePasswordReset(targetUserId);
      setStatusMessage({ type: 'success', text: `Password recovery triggered for user ${targetUserId}.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to trigger password reset.' });
    } finally {
      setIsManagingUser(false);
    }
  };

  const handleChangeRole = async () => {
    if (!targetUserId) return;
    setIsManagingUser(true);
    setStatusMessage(null);
    try {
      await api.changeUserRole(targetUserId, newRole);
      setStatusMessage({ type: 'success', text: `User ${targetUserId} role changed to ${newRole}.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to change role.' });
    } finally {
      setIsManagingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-slate-100 flex flex-col">
      {/* Header — Identical height, style and logo as Dashboard TopHeader */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-[#0A0914]/95 backdrop-blur-xl px-6 flex items-center justify-between z-50 shadow-sm">
        <div className="flex items-center space-x-6">
          <Logo
            size="sm"
            showBadge={false}
            onClick={() => onNavigate('/dashboard')}
          />
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center space-x-3">
            <span className="font-bold text-sm text-white">Platform Governance Console</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Active</span>
          </div>

          <button
            onClick={() => signOut().then(() => onNavigate('/'))}
            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 border border-white/10 text-slate-400 text-xs flex items-center gap-1.5 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-28 sm:pt-32 pb-16 space-y-8">
        {/* Status banner */}
        {statusMessage && (
          <div className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Admin Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-[#0E1118] border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Platform Security</div>
                <div className="text-lg font-bold text-white">Live RBAC Active</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">Live profiles lookup with cached JWKS signature checks.</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0E1118] border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Pending Verifications</div>
                <div className="text-lg font-bold text-white">
                  {verifications.filter(v => v.status === 'Pending').length} Requests
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">Faculty ID and institutional email domain review queue.</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0E1118] border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Audit Logging</div>
                <div className="text-lg font-bold text-white">100% Immutable</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">Every role modification and approval is audited server-side.</p>
          </div>
        </div>

        {/* Section 1: Supervisor Verification Queue */}
        <div className="p-6 rounded-2xl bg-[#0E1118] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Supervisor Verification Queue</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px]">
                  {verifications.length} total
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Review faculty credentials and activate PI governance permissions.
              </p>
            </div>
            <button
              onClick={fetchQueue}
              className="p-2 rounded-xl bg-[#141824] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueue ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingQueue ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Loading supervisor verification queue...</span>
            </div>
          ) : verifications.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No supervisor verification requests found in the queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-3">Applicant & Institution</th>
                    <th className="py-3 px-3">Domain</th>
                    <th className="py-3 px-3">Document Path</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {verifications.map((req) => (
                    <tr key={req.id} className="hover:bg-[#141824]/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200">{req.user?.fullName || 'Applicant'}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          <span>{req.user?.institution || 'Academic Institute'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {req.institutionDomain}
                      </td>
                      <td className="py-3 px-3 font-mono text-indigo-400 truncate max-w-xs">
                        {req.documentUrl}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold ${
                          req.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : req.status === 'Rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {req.status === 'Pending' ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={actionLoadingId === req.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              disabled={actionLoadingId === req.id}
                              className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold text-xs transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: User Account & RBAC Controls */}
        <div className="p-6 rounded-2xl bg-[#0E1118] border border-slate-800/80 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Account Administration & Role Controls</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute privileged operations: role modification, account suspension, or forced password recovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target User ID (UUID)
                </label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="e.g. a0000000-0000-0000-0000-000000000004"
                  className="w-full bg-[#141824] border border-slate-700/60 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Assign Application Role
                </label>
                <div className="flex gap-2 items-center">
                  <HoverSelect
                    value={newRole}
                    onChange={(val) => setNewRole(val as UserRole)}
                    options={[
                      { value: 'Researcher', label: 'Researcher' },
                      { value: 'Supervisor', label: 'Supervisor' },
                      { value: 'Admin', label: 'Admin' },
                    ]}
                    className="flex-1"
                    buttonClassName="py-2"
                  />
                  <button
                    onClick={handleChangeRole}
                    disabled={isManagingUser || !targetUserId}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 h-[38px]"
                  >
                    Change Role
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 flex flex-col justify-end">
              <div className="flex gap-3">
                <button
                  onClick={handleSuspendUser}
                  disabled={isManagingUser || !targetUserId}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" />
                  <span>Suspend Account</span>
                </button>

                <button
                  onClick={handleForcePasswordReset}
                  disabled={isManagingUser || !targetUserId}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Force Password Reset</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Actions take effect immediately. Suspended accounts are blocked on their next API request without waiting for token expiry.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
