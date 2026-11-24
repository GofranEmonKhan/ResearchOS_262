import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Code, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  Terminal,
  Globe
} from 'lucide-react';
import { AuditLog } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import { HoverSelect } from '../common/HoverSelect.js';

interface AdminAuditLogsTabProps {
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export const AdminAuditLogsTab: React.FC<AdminAuditLogsTabProps> = ({ onNotify }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminAuditLogs({
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        targetType: targetTypeFilter !== 'ALL' ? targetTypeFilter : undefined,
        search: searchQuery.trim() || undefined,
        page,
        limit,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to fetch audit trails.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, targetTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('SUSPEND') || action.includes('REJECT') || action.includes('DELETE')) {
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
    }
    if (action.includes('APPROVE') || action.includes('VERIFIED') || action.includes('RESOLVE')) {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    }
    if (action.includes('ROLE') || action.includes('AI_')) {
      return 'bg-violet-500/10 text-violet-400 border border-violet-500/30';
    }
    return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30';
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0E1017] border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Platform Audit & Security Log Explorer</span>
            <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
              {total} Events Indexed
            </span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Immutable log of all privileged mutations, role elevations, suspensions, and system decisions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="self-start md:self-auto px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <form onSubmit={handleSearchSubmit} className="sm:col-span-6 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by actor identity, action type, or target ID..."
            className="w-full bg-[#0E1017] border border-slate-800 rounded-xl pl-9 pr-20 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Filter
          </button>
        </form>

        <div className="sm:col-span-3">
          <HoverSelect
            value={actionFilter}
            onChange={(val) => { setActionFilter(val); setPage(1); }}
            options={[
              { value: 'ALL', label: 'All Action Types' },
              { value: 'USER_ROLE_CHANGED', label: 'USER_ROLE_CHANGED' },
              { value: 'USER_SUSPENDED', label: 'USER_SUSPENDED' },
              { value: 'USER_PASSWORD_RESET_FORCED', label: 'USER_PASSWORD_RESET_FORCED' },
              { value: 'SUPERVISOR_APPROVED', label: 'SUPERVISOR_APPROVED' },
              { value: 'SUPERVISOR_REJECTED', label: 'SUPERVISOR_REJECTED' },
              { value: 'DELETION_REQUEST_APPROVED', label: 'DELETION_REQUEST_APPROVED' },
              { value: 'DELETION_REQUEST_REJECTED', label: 'DELETION_REQUEST_REJECTED' },
              { value: 'AI_CONFIG_UPDATED', label: 'AI_CONFIG_UPDATED' },
            ]}
            className="w-full"
            buttonClassName="py-2 text-xs"
          />
        </div>

        <div className="sm:col-span-3">
          <HoverSelect
            value={targetTypeFilter}
            onChange={(val) => { setTargetTypeFilter(val); setPage(1); }}
            options={[
              { value: 'ALL', label: 'All Target Entities' },
              { value: 'Profile', label: 'Profile Entities' },
              { value: 'Project', label: 'Project Entities' },
              { value: 'SupervisorVerification', label: 'Supervisor Verification' },
              { value: 'DeletionRequest', label: 'Deletion Request' },
              { value: 'MarketplaceListing', label: 'Marketplace Listing' },
              { value: 'AiConfig', label: 'AI Config' },
            ]}
            className="w-full"
            buttonClassName="py-2 text-xs"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl bg-[#0E1017] border border-slate-800/90 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            <span>Retrieving immutable audit records...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No audit events found matching the specified parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#121622] text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-3">Actor Identity</th>
                  <th className="py-3.5 px-3">Action Type</th>
                  <th className="py-3.5 px-3">Target Entity</th>
                  <th className="py-3.5 px-3">IP Address</th>
                  <th className="py-3.5 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => {
                  const isExpanded = Boolean(expandedLogIds[log.id]);
                  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-[#141824]/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                          <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                          <div className="text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <span>{log.actorName || 'System'}</span>
                            {log.actorRole && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                {log.actorRole}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate max-w-[140px]">
                            {log.actorId ? log.actorId.slice(0, 8) + '...' : 'Internal'}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold ${getActionBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-slate-300 text-xs">
                          <div className="text-slate-200 font-semibold">{log.targetType}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {log.targetId || 'Global Platform'}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-slate-500" />
                            <span>{log.ipAddress || 'Internal'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {hasMetadata ? (
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#181D2D] hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Code className="w-3.5 h-3.5 text-violet-400" />
                              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable JSON Metadata Drawer */}
                      {isExpanded && hasMetadata && (
                        <tr className="bg-[#0B0D14]">
                          <td colSpan={6} className="p-4 border-b border-slate-800">
                            <div className="p-3 rounded-xl bg-[#07090F] border border-slate-800/80 font-mono text-[11px] text-slate-300 space-y-1">
                              <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-800">
                                <span className="flex items-center gap-1.5">
                                  <Terminal className="w-3.5 h-3.5 text-violet-400" />
                                  <span>Audit Payload Metadata</span>
                                </span>
                                <span className="text-[10px]">Immutable Record ID: {log.id}</span>
                              </div>
                              <pre className="overflow-x-auto text-violet-200 pt-2 leading-relaxed">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-[#10131E] text-xs text-slate-400">
          <div>
            Showing <span className="text-slate-200 font-semibold">{logs.length}</span> of{' '}
            <span className="text-slate-200 font-semibold">{total}</span> audit records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg bg-[#161B28] hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg bg-[#161B28] hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
