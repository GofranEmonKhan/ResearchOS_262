import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Building2, 
  FileText, 
  RefreshCw, 
  Loader2
} from 'lucide-react';
import { SupervisorVerificationRequest } from '@researchos/shared-types';
import { api } from '../../lib/api.js';

interface AdminVerificationsTabProps {
  onNotify: (type: 'success' | 'error', text: string) => void;
  onRefreshOverview?: () => void;
}

export const AdminVerificationsTab: React.FC<AdminVerificationsTabProps> = ({
  onNotify,
  onRefreshOverview,
}) => {
  const [verifications, setVerifications] = useState<SupervisorVerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminSupervisorVerifications();
      setVerifications(data);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to load supervisor verification queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.approveSupervisorVerification(id);
      onNotify('success', 'Supervisor application approved. Profile role elevated to Supervisor.');
      await fetchQueue();
      onRefreshOverview?.();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to approve supervisor verification.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId || !rejectionReason.trim()) return;

    setActionLoadingId(rejectingId);
    try {
      await api.rejectSupervisorVerification(rejectingId, rejectionReason.trim());
      onNotify('success', 'Supervisor verification rejected and audit log recorded.');
      setRejectingId(null);
      setRejectionReason('');
      await fetchQueue();
      onRefreshOverview?.();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to reject verification.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = verifications.filter((v) => {
    if (statusFilter === 'ALL') return true;
    return v.status === statusFilter;
  });

  const pendingCount = verifications.filter((v) => v.status === 'Pending').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Status Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0E1017] border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Supervisor Verification Queue</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              pendingCount > 0 
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' 
                : 'bg-slate-800 text-slate-400'
            }`}>
              {pendingCount} Pending Action
            </span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Review academic faculty credentials, verify domain validity, and approve PI oversight privileges.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Status Tabs */}
          <div className="flex bg-[#141824] p-1 rounded-xl border border-slate-800 text-xs">
            {(['Pending', 'Approved', 'Rejected', 'ALL'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s === 'ALL' ? 'All Records' : s}
              </button>
            ))}
          </div>

          <button
            onClick={fetchQueue}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#141824] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-2xl bg-[#0E1017] border border-slate-800/90 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <span>Loading verification queue...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mb-1" />
            <p>No supervisor verification requests found in this view.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#121622] text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3.5 px-4">Applicant & Institution</th>
                  <th className="py-3.5 px-3">Domain</th>
                  <th className="py-3.5 px-3">Faculty Credential</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Submitted</th>
                  <th className="py-3.5 px-4 text-right">Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#141824]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100">{req.user?.fullName || 'Applicant Scholar'}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{req.user?.institution || 'Unspecified University'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-mono text-slate-200 px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-xs">
                        @{req.institutionDomain}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      {req.documentUrl ? (
                        <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-xs truncate max-w-[220px]" title={req.documentUrl}>
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{req.documentUrl}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">No document attached</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs ${
                        req.status === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : req.status === 'Rejected'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {req.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {req.status === 'Pending' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(req.id);
                              setRejectionReason('');
                            }}
                            disabled={actionLoadingId === req.id}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">
                          {req.status === 'Approved' ? 'Verified' : 'Declined'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#0D0F18] border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <XCircle className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Reject Supervisor Verification</h4>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Institutional domain mismatch with faculty list, illegible ID document..."
                  rows={3}
                  required
                  className="w-full bg-[#141824] border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionLoadingId) || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoadingId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
