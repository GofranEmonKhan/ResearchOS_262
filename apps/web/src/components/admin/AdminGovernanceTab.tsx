import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  FolderKanban, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  MessageSquare, 
  ShoppingBag, 
  Loader2 
} from 'lucide-react';
import { DeletionRequest } from '@researchos/shared-types';
import { api } from '../../lib/api.js';

interface AdminGovernanceTabProps {
  onNotify: (type: 'success' | 'error', text: string) => void;
  onNavigate: (route: string) => void;
  onRefreshOverview?: () => void;
}

export const AdminGovernanceTab: React.FC<AdminGovernanceTabProps> = ({
  onNotify,
  onNavigate,
  onRefreshOverview,
}) => {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'ALL'>('Pending');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Reject dialog state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Approve dialog state (confirming irreversible cascade)
  const [approvingRequest, setApprovingRequest] = useState<DeletionRequest | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminDeletionRequests({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      const data = Array.isArray(res) ? res : Array.isArray((res as any)?.requests) ? (res as any).requests : [];
      setRequests(data);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to fetch deletion requests.');
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApproveConfirm = async () => {
    if (!approvingRequest) return;

    setActionLoadingId(approvingRequest.id);
    try {
      await api.approveDeletionRequest(approvingRequest.id);
      onNotify('success', 'Project deletion approved and cascaded successfully. Audit log recorded.');
      setApprovingRequest(null);
      await fetchRequests();
      onRefreshOverview?.();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to approve deletion request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId || !rejectReason.trim()) return;

    setActionLoadingId(rejectingId);
    try {
      await api.rejectDeletionRequest(rejectingId, rejectReason.trim());
      onNotify('success', 'Deletion request rejected.');
      setRejectingId(null);
      setRejectReason('');
      await fetchRequests();
      onRefreshOverview?.();
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to reject deletion request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const safeRequests = Array.isArray(requests) ? requests : [];
  const pendingCount = safeRequests.filter((r) => r.status === 'Pending').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Moderation & Governance Hub Fast-Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Marketplace Hub Link */}
        <div className="p-5 rounded-2xl bg-[#0E1017] border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Marketplace & Escrow Governance</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Arbitrate service disputes, approve pending listings, and review booking milestones.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('/admin/marketplace')}
            className="self-start px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Marketplace Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Community Forum Hub Link */}
        <div className="p-5 rounded-2xl bg-[#0E1017] border border-slate-800 hover:border-pink-500/40 transition-all flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Community & Forum Moderation</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review flagged discussions, pinned topics, and enforce academic community guidelines.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('/community')}
            className="self-start px-4 py-2 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Community Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Project Deletion Queue Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0E1017] border border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Project Deletion Approval Queue</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                pendingCount > 0 
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' 
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {pendingCount} Pending Deletions
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Review formal workspace deletion requests submitted by Project Owners per Spec 09 governance.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
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
                  {s === 'ALL' ? 'All Requests' : s}
                </button>
              ))}
            </div>

            <button
              onClick={fetchRequests}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#141824] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh Deletion Requests"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Requests Table */}
        <div className="rounded-2xl bg-[#0E1017] border border-slate-800/90 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
              <span>Fetching deletion queue...</span>
            </div>
          ) : safeRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mb-1" />
              <p>No project deletion requests found in this view.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#121622] text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3.5 px-4">Target Entity</th>
                    <th className="py-3.5 px-3">Requester</th>
                    <th className="py-3.5 px-3">Reason for Deletion</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Submitted</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {safeRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#141824]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <FolderKanban className="w-3.5 h-3.5 text-rose-400" />
                          <span>{req.targetType || 'Entity'}: {req.targetId ? req.targetId.slice(0, 8) : 'unknown'}...</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {req.targetId}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-mono text-slate-300 text-xs">
                          {req.requestedBy ? req.requestedBy.slice(0, 8) : 'unknown'}...
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-slate-200 text-xs max-w-sm">
                          {req.reason}
                        </div>
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
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'Pending' ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => setApprovingRequest(req)}
                              disabled={actionLoadingId === req.id}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Approve Deletion</span>
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(req.id);
                                setRejectReason('');
                              }}
                              disabled={actionLoadingId === req.id}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">Decided</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Approving Irreversible Deletion */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#0D0F18] border border-rose-500/30 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Approve Irreversible Project Wipe</h4>
                <p className="text-xs text-rose-400/90 font-mono">Target: {approvingRequest.targetId.slice(0, 8)}...</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                Approving this request will <span className="font-bold text-rose-400">permanently delete</span> the project workspace and cascade deletion across all associated tasks, paper links, milestones, and metadata.
              </p>
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-300 text-[11px]">
                Reason: "{approvingRequest.reason}"
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setApprovingRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveConfirm}
                disabled={Boolean(actionLoadingId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {actionLoadingId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Execute Irreversible Wipe</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Deletion Reason Dialog */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#0D0F18] border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <XCircle className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Reject Project Deletion Request</h4>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Project is associated with pending grant deliverables or open milestone audits..."
                  rows={3}
                  required
                  className="w-full bg-[#141824] border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
                  disabled={Boolean(actionLoadingId) || !rejectReason.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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
