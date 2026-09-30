import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ExternalLink,
  ShieldCheck,
  Lock,
  Highlighter,
  FileQuestion,
  Layers,
  ArrowRight,
  Loader2,
  X,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { WhyDidICiteThisContext } from '@researchos/shared-types';

interface WhyDidICiteThisModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuscriptId: string;
  citationKey: string;
  onOpenPaper?: (paperId: string) => void;
}

export const WhyDidICiteThisModal: React.FC<WhyDidICiteThisModalProps> = ({
  isOpen,
  onClose,
  manuscriptId,
  citationKey,
  onOpenPaper,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WhyDidICiteThisContext | null>(null);

  const cleanKey = (citationKey || '').replace(/^\[@|\]$/g, '');

  useEffect(() => {
    if (!isOpen || !manuscriptId || !citationKey) return;

    let isMounted = true;
    const fetchContext = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getWhyDidICiteThis(manuscriptId, cleanKey);
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load citation context');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchContext();

    return () => {
      isMounted = false;
    };
  }, [isOpen, manuscriptId, citationKey, cleanKey]);

  if (!isOpen) return null;

  // Safe accessor fallbacks handling both canonical and alias payload keys
  const contextNote = data?.contextNote ?? (data as any)?.citation?.contextNote;
  const inTextLabel = data?.inTextLabel ?? (data as any)?.citation?.inTextLabel;
  const sidebar = data?.sidebarSummary ?? (data as any)?.sidebarFields;
  const highlightsList = data?.highlights ?? (data as any)?.annotations ?? [];
  const isMasked = data?.isMaskedNote ?? (data as any)?.isMasked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#0B0F17] border border-slate-800 shadow-2xl shadow-black/90 overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="why-cite-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="why-cite-title" className="text-base font-bold text-white tracking-tight">
                  Why Did I Cite This?
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  {`@${cleanKey}`}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Grounding evidence, sidebar extraction & privacy-scoped literature notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-56 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
              <p className="text-xs font-mono">Retrieving scholarly context & annotations...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Paper Overview Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white leading-snug">
                    {data.paper?.title || 'Referenced Literature'}
                  </h3>
                  {data.paper?.doi && (
                    <a
                      href={`https://doi.org/${data.paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Open DOI external link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span>{data.paper?.authors?.join(', ') || 'Unknown Authors'}</span>
                  {data.paper?.year && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {data.paper.year}
                    </span>
                  )}
                  {data.paper?.venue && (
                    <span className="text-slate-500 italic">
                      {data.paper.venue}
                    </span>
                  )}
                </div>

                {onOpenPaper && data.paper?.id && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPaper(data.paper.id);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium pt-1 transition-colors"
                  >
                    <span>Open in Paper Reader</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Author's Citation Context Note */}
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <FileQuestion className="w-3.5 h-3.5" />
                  Author's Citation Context
                </span>
                <p className="text-xs text-slate-200 italic leading-relaxed">
                  "{contextNote || 'No specific context note was provided at citation time.'}"
                </p>
                {inTextLabel && (
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    In-text marker: <span className="text-slate-400">{inTextLabel}</span>
                  </div>
                )}
              </div>

              {/* Structured Literature Insights (Sidebar Fields) */}
              {sidebar && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Structured Literature Synthesis
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {sidebar.researchGap && (
                      <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-semibold text-violet-400 uppercase">
                          Research Gap
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {sidebar.researchGap}
                        </p>
                      </div>
                    )}

                    {sidebar.methodology && (
                      <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-semibold text-blue-400 uppercase">
                          Methodology
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {sidebar.methodology}
                        </p>
                      </div>
                    )}

                    {sidebar.results && (
                      <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-semibold text-emerald-400 uppercase">
                          Key Results
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {sidebar.results}
                        </p>
                      </div>
                    )}

                    {(sidebar.limitations || sidebar.limitation) && (
                      <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-semibold text-amber-400 uppercase">
                          Limitations
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {sidebar.limitations || sidebar.limitation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Highlighted Annotations */}
              {highlightsList && highlightsList.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Highlighter className="w-3.5 h-3.5 text-slate-500" />
                    Key Excerpts from Paper ({highlightsList.length})
                  </h4>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {highlightsList.map((ann: any) => (
                      <div
                        key={ann.id}
                        className="p-3 rounded-lg bg-slate-900/30 border border-slate-800/80 space-y-1"
                      >
                        <p className="text-xs text-slate-300 italic border-l-2 border-amber-400/80 pl-2.5">
                          "{ann.highlightedText}"
                        </p>
                        {ann.stickyNote && (
                          <p className="text-[11px] text-slate-400 mt-1 pl-2.5">
                            Note: {ann.stickyNote}
                          </p>
                        )}
                        {ann.page && (
                          <span className="text-[10px] text-slate-500 block pl-2.5">
                            Page {ann.page}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy Governance Badge */}
              <div className="pt-2">
                {isMasked ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs">
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      <strong>Privacy Protected:</strong> Author-private notes and confidential annotations are masked per ResearchOS governance rules.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Verified Grounding:</strong> Full literature record loaded with authenticated research synthesis fields.
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
