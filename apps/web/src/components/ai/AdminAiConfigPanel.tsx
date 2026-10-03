import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ShieldAlert,
  BarChart3,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  Lock,
  DollarSign,
  TrendingUp,
  Key,
} from 'lucide-react';
import {
  AiProviderConfig,
  AiQuota,
  BlockedPromptRule,
  AdminAiUsageAnalytics,
  AiProviderEnum,
  UserRole,
} from '@researchos/shared-types';
import { api } from '../../lib/api.js';

interface AdminAiConfigPanelProps {
  onNotify?: (type: 'success' | 'error', text: string) => void;
}

export const AdminAiConfigPanel: React.FC<AdminAiConfigPanelProps> = ({ onNotify }) => {
  // Navigation sub-tab: 'engine' | 'quotas' | 'policy' | 'analytics'
  const [activeTab, setActiveTab] = useState<'engine' | 'quotas' | 'policy' | 'analytics'>('engine');

  // Loading States
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [savingQuotaRole, setSavingQuotaRole] = useState<string | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  // Data States
  const [config, setConfig] = useState<AiProviderConfig | null>(null);
  const [quotas, setQuotas] = useState<AiQuota[]>([]);
  const [blockedRules, setBlockedRules] = useState<BlockedPromptRule[]>([]);
  const [analytics, setAnalytics] = useState<AdminAiUsageAnalytics | null>(null);

  // Form State: Provider Config
  const [providerForm, setProviderForm] = useState<{
    provider: AiProviderEnum;
    model: string;
    apiKeyRef: string;
    isActive: boolean;
  }>({
    provider: 'Gemini',
    model: 'gemini-1.5-pro',
    apiKeyRef: 'GEMINI_API_KEY',
    isActive: true,
  });

  // Form State: Quotas local edit buffers (role -> token limit)
  const [quotaInputs, setQuotaInputs] = useState<Record<string, number>>({});

  // Form State: New Blocked Prompt Rule
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleReason, setNewRuleReason] = useState('');
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);

  // Local feedback message
  const [localMessage, setLocalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setLocalMessage({ type, text });
    if (onNotify) onNotify(type, text);
  };

  // Load all Admin AI data
  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoadingAll(true);

    try {
      const [cfgRes, quotasRes, rulesRes, analyticsRes] = await Promise.all([
        api.getAdminAiConfig().catch((err) => {
          console.warn('Failed to load AI config:', err);
          return null;
        }),
        api.getAdminAiQuotas().catch((err) => {
          console.warn('Failed to load AI quotas:', err);
          return [] as AiQuota[];
        }),
        api.getAdminAiBlockedRules().catch((err) => {
          console.warn('Failed to load blocked rules:', err);
          return [] as BlockedPromptRule[];
        }),
        api.getAdminAiUsageAnalytics().catch((err) => {
          console.warn('Failed to load usage analytics:', err);
          return null;
        }),
      ]);

      if (cfgRes && (cfgRes as any).provider) {
        setConfig(cfgRes);
        setProviderForm({
          provider: cfgRes.provider,
          model: cfgRes.model,
          apiKeyRef: cfgRes.apiKeyRef,
          isActive: cfgRes.isActive,
        });
      }

      setQuotas(quotasRes);
      const initialQuotaInputs: Record<string, number> = {};
      quotasRes.forEach((q) => {
        initialQuotaInputs[q.role] = q.monthlyTokenLimit;
      });
      setQuotaInputs(initialQuotaInputs);

      setBlockedRules(rulesRes);
      setAnalytics(analyticsRes);
    } catch (err: any) {
      notify('error', err.message || 'Failed to initialize AI governance settings.');
    } finally {
      setIsLoadingAll(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update Provider Config
  const handleSaveProviderConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setLocalMessage(null);
    try {
      const updated = await api.updateAdminAiConfig(providerForm);
      setConfig(updated);
      notify('success', `Active AI provider updated to ${updated.provider.toUpperCase()} (${updated.model}).`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to update AI provider configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Preset model helper when switching provider
  const handleSelectProvider = (prov: AiProviderEnum) => {
    let defaultModel = 'gemini-1.5-pro';
    let defaultEnvVar = 'GEMINI_API_KEY';

    if (prov === 'OpenAI') {
      defaultModel = 'gpt-4o';
      defaultEnvVar = 'OPENAI_API_KEY';
    }

    setProviderForm((prev) => ({
      ...prev,
      provider: prov,
      model: defaultModel,
      apiKeyRef: defaultEnvVar,
    }));
  };

  // Update Quota
  const handleSaveQuota = async (role: UserRole) => {
    const limit = quotaInputs[role];
    if (limit === undefined || isNaN(limit) || limit < 0) {
      notify('error', 'Token limit must be a positive integer.');
      return;
    }

    setSavingQuotaRole(role);
    setLocalMessage(null);
    try {
      const updated = await api.updateAdminAiQuota(role, Number(limit));
      setQuotas((prev) => prev.map((q) => (q.role === role ? updated : q)));
      notify('success', `Monthly quota for role ${role} updated to ${limit.toLocaleString()} tokens.`);
    } catch (err: any) {
      notify('error', err.message || `Failed to update quota for ${role}.`);
    } finally {
      setSavingQuotaRole(null);
    }
  };

  // Create Blocked Rule
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRulePattern.trim()) {
      notify('error', 'Pattern string is required.');
      return;
    }
    if (!newRuleReason.trim()) {
      notify('error', 'Reason/policy category is required.');
      return;
    }

    setIsCreatingRule(true);
    setLocalMessage(null);
    try {
      const created = await api.createAdminAiBlockedRule({
        pattern: newRulePattern.trim(),
        reason: newRuleReason.trim(),
      });
      setBlockedRules((prev) => [created, ...prev]);
      setNewRulePattern('');
      setNewRuleReason('');
      setIsAddRuleOpen(false);
      notify('success', `Content policy rule added: "${created.pattern}".`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to create blocked prompt rule.');
    } finally {
      setIsCreatingRule(false);
    }
  };

  // Delete Blocked Rule
  const handleDeleteRule = async (id: string, pattern: string) => {
    if (!window.confirm(`Delete rule matching "${pattern}"?`)) return;

    setDeletingRuleId(id);
    setLocalMessage(null);
    try {
      await api.deleteAdminAiBlockedRule(id);
      setBlockedRules((prev) => prev.filter((r) => r.id !== id));
      notify('success', `Content policy rule deleted: "${pattern}".`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to delete blocked prompt rule.');
    } finally {
      setDeletingRuleId(null);
    }
  };

  if (isLoadingAll) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        <span>Loading AI governance and configuration data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Local Feedback Toast / Banner */}
      {localMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            localMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {localMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{localMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setLocalMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Persistent AI Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Engine */}
        <div className="p-4 rounded-2xl bg-[#0E1118] border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Engine Status</span>
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white uppercase tracking-wide">
                {config?.provider || 'Gemini'}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  config?.isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${config?.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}
                />
                {config?.isActive ? 'Online' : 'Disabled'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
              {config?.model || 'gemini-1.5-pro'}
            </div>
          </div>
        </div>

        {/* Card 2: Total Token Usage */}
        <div className="p-4 rounded-2xl bg-[#0E1118] border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Tokens</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-white font-mono">
              {(analytics?.totalTokensThisMonth || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3 text-blue-400" />
              <span>Current billing cycle</span>
            </div>
          </div>
        </div>

        {/* Card 3: Estimated Cost */}
        <div className="p-4 rounded-2xl bg-[#0E1118] border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estimated Spend</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              ${(analytics?.totalCostUsdThisMonth || 0).toFixed(4)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Reflects provider inference rate
            </div>
          </div>
        </div>

        {/* Card 4: Content Policy Rules */}
        <div className="p-4 rounded-2xl bg-[#0E1118] border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Prompt Policies</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-white font-mono">
              {blockedRules.length} Rules Active
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Substring violation filtering
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gradient-to-b from-[#0d0e21]/90 to-[#070814]/90 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('engine')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'engine'
                ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-violet-600/30 border border-violet-400/40 ring-1 ring-white/20'
                : 'bg-gradient-to-b from-slate-800/40 to-slate-900/60 hover:from-slate-700/50 hover:to-slate-800/70 text-slate-300 hover:text-white border border-slate-700/40 hover:border-violet-500/30'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Provider & Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quotas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'quotas'
                ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-violet-600/30 border border-violet-400/40 ring-1 ring-white/20'
                : 'bg-gradient-to-b from-slate-800/40 to-slate-900/60 hover:from-slate-700/50 hover:to-slate-800/70 text-slate-300 hover:text-white border border-slate-700/40 hover:border-violet-500/30'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Role Quotas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'policy'
                ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-violet-600/30 border border-violet-400/40 ring-1 ring-white/20'
                : 'bg-gradient-to-b from-slate-800/40 to-slate-900/60 hover:from-slate-700/50 hover:to-slate-800/70 text-slate-300 hover:text-white border border-slate-700/40 hover:border-violet-500/30'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Content Policies ({blockedRules.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-violet-600/30 border border-violet-400/40 ring-1 ring-white/20'
                : 'bg-gradient-to-b from-slate-800/40 to-slate-900/60 hover:from-slate-700/50 hover:to-slate-800/70 text-slate-300 hover:text-white border border-slate-700/40 hover:border-violet-500/30'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Usage Analytics</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 hover:from-slate-700/90 hover:to-slate-800/90 border border-slate-700/60 hover:border-violet-500/40 text-slate-200 hover:text-white text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          title="Refresh AI configuration and usage stats"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-violet-400' : ''}`} />
          <span>Sync Data</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Provider & Model Configuration */}
      {/* ========================================================================= */}
      {activeTab === 'engine' && (
        <div className="p-6 rounded-2xl bg-[#0E1118] border border-slate-800/80 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-violet-400" />
                <span>AI Provider & LLM Engine Settings</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure the primary inference backend. ResearchOS utilizes an agnostic provider adapter layer so Express never hardcodes third-party dependencies.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-950/40 border border-violet-800/40 text-[11px] text-violet-300 shrink-0">
              <Lock className="w-3.5 h-3.5 text-violet-400" />
              <span>Zero Raw Keys in DB</span>
            </div>
          </div>

          <form onSubmit={handleSaveProviderConfig} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Active Provider Adapter
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Gemini', 'OpenAI'] as AiProviderEnum[]).map((prov) => {
                    const isSelected = providerForm.provider === prov;
                    return (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => handleSelectProvider(prov)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600/20 border-violet-500 text-white shadow-sm shadow-violet-500/20'
                            : 'bg-[#141824] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider">{prov}</span>
                        <span className="text-[10px] text-slate-500 mt-1 font-mono">
                          {prov === 'Gemini' ? 'Google DeepMind' : 'OpenAI Platform'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Model Identifier
                </label>
                <input
                  type="text"
                  value={providerForm.model}
                  onChange={(e) => setProviderForm({ ...providerForm, model: e.target.value })}
                  placeholder="e.g. gemini-1.5-pro, gpt-4o, claude-3-5-sonnet-20241022"
                  className="w-full bg-[#141824] border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Must match the exact model identifier supported by the active provider client SDK.
                </p>
              </div>

              {/* API Key Environment Variable Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  API Key Environment Variable Reference
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={providerForm.apiKeyRef}
                    onChange={(e) => setProviderForm({ ...providerForm, apiKeyRef: e.target.value })}
                    placeholder="e.g. GEMINI_API_KEY, OPENAI_API_KEY"
                    className="w-full bg-[#141824] border border-slate-700/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  The backend reads <code className="text-violet-300">process.env[apiKeyRef]</code> at runtime. Never enter plain text keys.
                </p>
              </div>

              {/* Active Toggle Switch */}
              <div className="flex flex-col justify-end">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Platform AI Availability
                </label>
                <div className="p-3 rounded-xl bg-[#141824] border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-200">Enable AI Engine</div>
                    <div className="text-[11px] text-slate-500">
                      When disabled, all endpoints return HTTP 503 to preserve budget.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={providerForm.isActive}
                      onChange={(e) => setProviderForm({ ...providerForm, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-violet-600/35 border border-violet-400/40 ring-1 ring-white/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSavingConfig ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Engine Config...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Save Engine Configuration</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Role Quota Management */}
      {/* ========================================================================= */}
      {activeTab === 'quotas' && (
        <div className="p-6 rounded-2xl bg-[#0E1118] border border-slate-800/80 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-violet-400" />
                <span>Monthly Token Quotas by Role</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enforce platform-level resource bounds. Users who exceed their role limit receive HTTP 429 until the next calendar month cycle.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Monthly Token Limit</th>
                  <th className="py-3 px-3">Last Updated</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(['Researcher', 'Supervisor', 'Admin'] as UserRole[]).map((role) => {
                  const quotaRecord = quotas.find((q) => q.role === role);
                  const currentInputValue = quotaInputs[role] ?? quotaRecord?.monthlyTokenLimit ?? 0;
                  const isSavingThis = savingQuotaRole === role;

                  return (
                    <tr key={role} className="hover:bg-[#141824]/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                            role === 'Admin'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : role === 'Supervisor'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {role}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2 max-w-xs">
                          <input
                            type="number"
                            min="0"
                            step="50000"
                            value={currentInputValue}
                            onChange={(e) =>
                              setQuotaInputs({ ...quotaInputs, [role]: parseInt(e.target.value, 10) || 0 })
                            }
                            className="w-44 bg-[#141824] border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-violet-500"
                          />
                          <span className="text-[11px] text-slate-500">tokens / mo</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                        {quotaRecord?.updatedAt
                          ? new Date(quotaRecord.updatedAt).toLocaleDateString()
                          : 'System Default'}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => handleSaveQuota(role)}
                          className="px-3.5 py-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600 text-violet-200 hover:text-white border border-violet-500/40 text-xs font-semibold transition-all disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                        >
                          {isSavingThis ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Update Limit</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <span className="font-semibold text-slate-300">Policy Note:</span>
            <span>All token usage calculations are aggregated from server-verified AI calls in `ai_usage_logs`.</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Blocked Prompt Content Policy */}
      {/* ========================================================================= */}
      {activeTab === 'policy' && (
        <div className="p-6 rounded-2xl bg-[#0E1118] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Blocked Prompt Rules (Academic Integrity & Safety)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Requests containing matching substring patterns are rejected with HTTP 400 before provider invocation, logging 0 tokens.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddRuleOpen(!isAddRuleOpen)}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddRuleOpen ? 'Close Form' : 'Add Policy Rule'}</span>
            </button>
          </div>

          {/* Add Rule Form */}
          {isAddRuleOpen && (
            <form
              onSubmit={handleCreateRule}
              className="p-4 rounded-xl bg-[#141824] border border-violet-500/30 space-y-3 animate-in fade-in duration-150"
            >
              <div className="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>New Substring Policy Rule</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Forbidden Pattern (Case-insensitive substring)
                  </label>
                  <input
                    type="text"
                    value={newRulePattern}
                    onChange={(e) => setNewRulePattern(e.target.value)}
                    placeholder="e.g. bypass peer review, fabricate results"
                    className="w-full bg-[#0E1118] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Violation Reason / Category
                  </label>
                  <input
                    type="text"
                    value={newRuleReason}
                    onChange={(e) => setNewRuleReason(e.target.value)}
                    placeholder="e.g. Academic integrity policy violation"
                    className="w-full bg-[#0E1118] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRule}
                  className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingRule ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Adding Rule...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Enforce Rule</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Rules Table */}
          {blockedRules.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No blocked prompt rules configured. Standard provider content filters apply.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-3">Forbidden Pattern</th>
                    <th className="py-3 px-3">Reason / Policy</th>
                    <th className="py-3 px-3">Created</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {blockedRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-[#141824]/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-rose-300">
                        "{rule.pattern}"
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {rule.reason}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(rule.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          disabled={deletingRuleId === rule.id}
                          onClick={() => handleDeleteRule(rule.id, rule.pattern)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Delete policy rule"
                        >
                          {deletingRuleId === rule.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Usage Analytics & Top Researchers */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          {/* Role Breakdown Progress Cards */}
          <div className="p-6 rounded-2xl bg-[#0E1118] border border-slate-800/80 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <span>Token Consumption by Application Role</span>
            </h3>
            <p className="text-xs text-slate-400">
              Aggregated from live telemetry logs for the current calendar month.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {(analytics?.byRole || []).map((item) => {
                const totalTokens = analytics?.totalTokensThisMonth || 1;
                const percentage = Math.round((item.tokensUsed / Math.max(1, totalTokens)) * 100);

                return (
                  <div
                    key={item.role}
                    className="p-4 rounded-xl bg-[#141824] border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{item.role}</span>
                      <span className="text-xs font-mono font-bold text-violet-300">{percentage}%</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{item.tokensUsed.toLocaleString()} tokens</span>
                      <span className="text-emerald-400">${item.costUsd.toFixed(4)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Users Consumption Table */}
          <div className="p-6 rounded-2xl bg-[#0E1118] border border-slate-800/80 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Top AI Consuming Researchers</span>
            </h3>

            {!analytics?.topUsers || analytics.topUsers.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No individual usage recorded in the current billing cycle.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                      <th className="py-3 px-3">Rank</th>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">User ID</th>
                      <th className="py-3 px-3">Tokens Used</th>
                      <th className="py-3 px-3 text-right">Estimated Cost (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {analytics.topUsers.map((u, idx) => (
                      <tr key={u.userId} className="hover:bg-[#141824]/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-200">
                          {u.fullName || 'Researcher'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500 truncate max-w-xs">
                          {u.userId}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-200">
                          {u.tokensUsed.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                          ${u.costUsd.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
