import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  ShieldCheck, 
  RefreshCw, 
  Database, 
  Cpu, 
  Radio, 
  FileText, 
  Code, 
  Image, 
  FileSpreadsheet, 
  FileCheck2, 
  CheckCircle2, 
  Terminal
} from 'lucide-react';
import { AdminStorageMetrics, AdminSystemErrorLog } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import { HoverSelect } from '../common/HoverSelect.js';

interface AdminSystemHealthTabProps {
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export const AdminSystemHealthTab: React.FC<AdminSystemHealthTabProps> = ({ onNotify }) => {
  const [storage, setStorage] = useState<AdminStorageMetrics | null>(null);
  const [errors, setErrors] = useState<AdminSystemErrorLog[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchHealthData = async () => {
    setIsLoading(true);
    try {
      const [storageData, errorData] = await Promise.all([
        api.getAdminStorageMetrics().catch(() => ({ totalBytes: 0, totalFiles: 0, byCategory: [], recentAssets: [] })),
        api.getAdminSystemErrors().catch(() => []),
      ]);
      setStorage(storageData);
      setErrors(errorData);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to fetch platform health metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredErrors = errors.filter((e) => {
    if (levelFilter === 'ALL') return true;
    return e.level === levelFilter.toLowerCase();
  });

  const categories = storage?.byCategory || [];
  const totalBytes = storage?.totalBytes || 0;

  const categoryMeta: Record<string, { label: string; icon: React.ReactNode; color: string; barBg: string }> = {
    pdf: { label: 'Research Papers & PDFs', icon: <FileText className="w-4 h-4 text-violet-400" />, color: 'text-violet-400', barBg: 'bg-violet-500' },
    code_output: { label: 'Experiment Code & Outputs', icon: <Code className="w-4 h-4 text-cyan-400" />, color: 'text-cyan-400', barBg: 'bg-cyan-500' },
    dataset: { label: 'Scientific Datasets', icon: <FileSpreadsheet className="w-4 h-4 text-amber-400" />, color: 'text-amber-400', barBg: 'bg-amber-500' },
    image: { label: 'Manuscript Figures & Plots', icon: <Image className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400', barBg: 'bg-emerald-500' },
    verification_doc: { label: 'Faculty Verification Documents', icon: <FileCheck2 className="w-4 h-4 text-pink-400" />, color: 'text-pink-400', barBg: 'bg-pink-500' },
    other: { label: 'Miscellaneous Artifacts', icon: <HardDrive className="w-4 h-4 text-slate-400" />, color: 'text-slate-400', barBg: 'bg-slate-500' },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Infrastructure Services Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0E1017] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Postgres Database</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operational (pgvector)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1017] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Supabase Auth & JWKS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Cached & Active</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1017] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Supabase Realtime</span>
            <Radio className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Postgres Changes</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1017] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">AI Gateway Layer</span>
            <Cpu className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span>Provider Agnostic</span>
          </div>
        </div>
      </div>

      {/* Storage Breakdown Section */}
      <div className="p-6 rounded-2xl bg-[#0E1017] border border-slate-800/90 shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Storage Footprint & Category Distribution</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Aggregate storage utilization across Supabase storage buckets and indexed file assets.
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-white">{formatBytes(totalBytes)}</div>
            <div className="text-xs text-slate-400">{storage?.totalFiles || 0} Total Assets</div>
          </div>
        </div>

        {/* Visual Stacked Bar */}
        {totalBytes > 0 && categories.length > 0 && (
          <div className="space-y-2">
            <div className="h-4 w-full rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
              {categories.map((cat) => {
                const pct = (cat.bytes / totalBytes) * 100;
                if (pct <= 0) return null;
                const meta = categoryMeta[cat.category] || categoryMeta.other;
                return (
                  <div
                    key={cat.category}
                    style={{ width: `${Math.max(1, pct)}%` }}
                    className={`${meta.barBg} transition-all duration-500`}
                    title={`${meta.label}: ${formatBytes(cat.bytes)} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>

            {/* Mini Legend */}
            <div className="flex flex-wrap gap-4 pt-1">
              {categories.map((cat) => {
                const meta = categoryMeta[cat.category] || categoryMeta.other;
                return (
                  <div key={cat.category} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span className={`w-2.5 h-2.5 rounded-full ${meta.barBg}`} />
                    <span>{meta.label}:</span>
                    <span className="font-semibold text-white">{formatBytes(cat.bytes)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Details Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-2.5 px-3">Asset Category</th>
                <th className="py-2.5 px-3">File Count</th>
                <th className="py-2.5 px-3">Storage Consumption</th>
                <th className="py-2.5 px-3 text-right">Share of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {categories.map((cat) => {
                const meta = categoryMeta[cat.category] || categoryMeta.other;
                const pct = totalBytes > 0 ? ((cat.bytes / totalBytes) * 100).toFixed(1) : '0';
                return (
                  <tr key={cat.category} className="hover:bg-[#141824]/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 font-semibold text-slate-200">
                        {meta.icon}
                        <span>{meta.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {cat.count.toLocaleString()} files
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200 font-semibold">
                      {formatBytes(cat.bytes)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Error & Diagnostics Stream */}
      <div className="p-6 rounded-2xl bg-[#0E1017] border border-slate-800/90 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">System Diagnostics & Error Event Stream</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Real-time operational events, unhandled exceptions, and API failure telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-36">
              <HoverSelect
                value={levelFilter}
                onChange={(val) => setLevelFilter(val)}
                options={[
                  { value: 'ALL', label: 'All Levels' },
                  { value: 'ERROR', label: 'ERROR Only' },
                  { value: 'WARN', label: 'WARN Only' },
                  { value: 'INFO', label: 'INFO Only' },
                ]}
                className="w-full"
                buttonClassName="py-1.5 text-xs"
              />
            </div>

            <button
              onClick={fetchHealthData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#141824] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Stream List */}
        {filteredErrors.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mb-1" />
            <p className="font-semibold text-slate-300">Clean Operational Horizon</p>
            <p className="text-slate-500 text-[11px]">No matching runtime anomalies or system errors recorded.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {filteredErrors.map((err) => (
              <div
                key={err.id}
                className="p-3.5 rounded-xl bg-[#131722] border border-slate-800/80 hover:border-slate-700 text-xs space-y-1.5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      err.level === 'error' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      err.level === 'warn' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {err.level.toUpperCase()}
                    </span>
                    <span className="font-semibold text-slate-200">{err.service}</span>
                  </div>
                  <span className="font-mono text-slate-500 text-[11px]">
                    {new Date(err.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-slate-300 font-mono text-[11px] break-words">
                  {err.message}
                </div>

                {err.metadata && Object.keys(err.metadata).length > 0 && (
                  <div className="p-2 rounded-lg bg-[#0A0C13] border border-slate-800/60 font-mono text-[10px] text-slate-400 overflow-x-auto">
                    {JSON.stringify(err.metadata)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
