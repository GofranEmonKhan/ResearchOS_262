import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Trash2,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { ForumReport, ReportStatus, ReportTargetType } from '@researchos/shared-types';
import { getAuthToken } from '../../lib/api.js';

interface AdminModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReports?: ForumReport[];
}

export const AdminModerationModal: React.FC<AdminModerationModalProps> = ({
  isOpen,
  onClose,
  initialReports,
}) => {
  const [reports, setReports] = useState<ForumReport[]>(initialReports || []);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'All'>('Pending');
  const [selectedTargetType, setSelectedTargetType] = useState<ReportTargetType | 'All'>('All');
  const [isLoading, setIsLoading] = useState(!initialReports);
  const [actionNotesMap, setActionNotesMap] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams();
      if (selectedStatus !== 'All') params.append('status', selectedStatus);
      if (selectedTargetType !== 'All') params.append('targetType', selectedTargetType);

      const res = await fetch(`/api/admin/forum/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to load moderation reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen, selectedStatus, selectedTargetType]);

  if (!isOpen) return null;

  const handleAction = async (reportId: string, action: 'DeleteContent' | 'WarnUser' | 'Dismiss') => {
    setIsProcessing(reportId);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/forum/reports/${reportId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          actionNotes: actionNotesMap[reportId] || undefined,
        }),
      });

      if (res.ok) {
        fetchReports();
      }
    } catch (err) {
      console.error('Failed to resolve report:', err);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0C0B1B] border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-rose-950/10">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Community Moderation Queue
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Admin Only
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status:</span>
            {(['All', 'Pending', 'ActionTaken', 'Dismissed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedStatus === st
                    ? 'bg-rose-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Type:</span>
            {(['All', 'Post', 'Answer', 'Comment', 'DirectMessage'] as const).map((tt) => (
              <button
                key={tt}
                onClick={() => setSelectedTargetType(tt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedTargetType === tt
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tt}
              </button>
            ))}
          </div>
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-sm">
              No reports matching the selected filters. Community is healthy!
            </div>
          ) : (
            reports.map((r) => {
              const isDM = r.targetType === 'DirectMessage';

              return (
                <div
                  key={r.id}
                  className="p-5 bg-[#111024] border border-white/10 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {r.targetType}
                      </span>
                      <span className="text-xs text-slate-400">
                        Reported by{' '}
                        <strong className="text-slate-200">{r.reporter?.fullName || 'Anonymous'}</strong>{' '}
                        on {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        r.status === 'Pending'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : r.status === 'ActionTaken'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  {/* Reason */}
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs space-y-1">
                    <span className="font-semibold text-rose-300">Reason: {r.reason}</span>
                    {r.description && <p className="text-slate-300">{r.description}</p>}
                  </div>

                  {/* Target Content Snippet (Protected by AC-13) */}
                  <div className={`p-3 rounded-xl text-xs border ${
                    isDM ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-300'
                  }`}>
                    {isDM ? (
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <strong>AC-13 Privacy Protection Enforced:</strong> {r.targetSummary}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <strong>Target Content:</strong> {r.targetSummary || 'Content unavailable'}
                      </div>
                    )}
                  </div>

                  {/* Actions (if Pending) */}
                  {r.status === 'Pending' && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                      <input
                        type="text"
                        placeholder="Resolution notes (optional)..."
                        value={actionNotesMap[r.id] || ''}
                        onChange={(e) =>
                          setActionNotesMap({ ...actionNotesMap, [r.id]: e.target.value })
                        }
                        className="flex-1 min-w-[200px] px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(r.id, 'DeleteContent')}
                          disabled={isProcessing === r.id}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Content
                        </button>

                        <button
                          onClick={() => handleAction(r.id, 'WarnUser')}
                          disabled={isProcessing === r.id}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Warn User
                        </button>


                        <button
                          onClick={() => handleAction(r.id, 'Dismiss')}
                          disabled={isProcessing === r.id}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Resolution Notes display if resolved */}
                  {r.status !== 'Pending' && (
                    <div className="text-[11px] text-slate-400 pt-1">
                      Resolution: <strong>{r.actionTaken || 'Resolved'}</strong>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
