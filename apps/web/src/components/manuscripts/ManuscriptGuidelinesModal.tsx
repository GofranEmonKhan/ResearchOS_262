import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Calculator,
  CheckSquare,
  Code,
  Copy,
  Check,
  FileText,
} from 'lucide-react';

interface ManuscriptGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSnippet?: (snippet: string) => void;
}

export const ManuscriptGuidelinesModal: React.FC<ManuscriptGuidelinesModalProps> = ({
  isOpen,
  onClose,
  onInsertSnippet,
}) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'imrad' | 'citations' | 'figures' | 'math' | 'review' | 'shortcuts'>('quickstart');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleInsertSnippet = (snippet: string) => {
    if (onInsertSnippet) {
      onInsertSnippet(snippet);
      onClose();
    }
  };

  const navItems = [
    { id: 'quickstart', label: '1. Quickstart Guide', icon: FileText },
    { id: 'imrad', label: '2. IMRAD Structure', icon: Layers },
    { id: 'citations', label: '3. Citations & BibTeX', icon: BookOpen },
    { id: 'figures', label: '4. LaTeX Figures & Media', icon: ImageIcon },
    { id: 'math', label: '5. LaTeX Math & Equations', icon: Calculator },
    { id: 'review', label: '6. Reviews & Governance', icon: CheckSquare },
    { id: 'shortcuts', label: '7. Shortcuts & Cheatsheet', icon: Code },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#0A0E1A] border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#070A12] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Manuscript Authoring Guide & Cheatsheet
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  LaTeX & Markdown Hybrid
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Official guide to drafting, citing, illustrating, and publishing camera-ready manuscripts in ResearchOS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Layout: Sidebar Navigation + Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Tabs */}
          <aside className="w-56 border-r border-slate-800 bg-[#080B14] p-3 space-y-1 overflow-y-auto shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Right Main Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#070A12] text-slate-300 text-xs leading-relaxed">
            {/* 1. Quickstart Guide */}
            {activeTab === 'quickstart' && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="text-base font-bold text-white mb-1">Quickstart: How to Use the Editor</h4>
                  <p className="text-slate-400 text-xs">
                    ResearchOS combines a real-time Markdown/LaTeX scholarly editor with live typeset preview and peer-review governance.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Column 1</span>
                    <h5 className="font-semibold text-slate-100">Section Navigator</h5>
                    <p className="text-[11px] text-slate-400">
                      Hover to expand or pin open. Reorder sections with Up/Down arrows and monitor section word counts.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Column 2</span>
                    <h5 className="font-semibold text-slate-100">Scholarly Editor & Split</h5>
                    <p className="text-[11px] text-slate-400">
                      Draft with rich Markdown, math (<code className="text-amber-300">$...$</code>), figures, and tables. Drag the split divider to adjust editor/preview widths.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Column 3</span>
                    <h5 className="font-semibold text-slate-100">Context & Governance Drawer</h5>
                    <p className="text-[11px] text-slate-400">
                      Link project literature, inspect "Why Did I Cite This?", track peer reviews, and complete supervisor sign-off items.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                  <h5 className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Three Pillars of Camera-Ready Publishing
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    <li><strong>Evidence Anchors:</strong> Always link in-text citations to verified papers in your project repository.</li>
                    <li><strong>Rigorous Review:</strong> Address all reviewer comments with explicit justification notes before requesting sign-off.</li>
                    <li><strong>Governance Lock:</strong> Supervisor checklist approval is mandatory before marking a manuscript as <span className="font-mono text-amber-400">ReadyForSubmission</span>.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 2. IMRAD Structure */}
            {activeTab === 'imrad' && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="text-base font-bold text-white mb-1">IMRAD Academic Structure</h4>
                  <p className="text-slate-400 text-xs">
                    ResearchOS defaults to the internationally accepted standard for empirical scientific literature.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { type: 'Abstract', purpose: 'High-level synthesis: background, hypothesis, primary result, and impact. Reflected dynamically in the camera-ready title block.' },
                    { type: 'Introduction', purpose: 'Context, research gap, formulation of problem, and concrete contributions.' },
                    { type: 'Related Work', purpose: 'Literature synthesis positioning this paper relative to established benchmarks and prior foundations.' },
                    { type: 'Methodology', purpose: 'Formulas, algorithmic architecture DAGs, mathematical formulation, and implementation specs.' },
                    { type: 'Experiments', purpose: 'Datasets, baseline configurations, hardware environments, and ablation setup.' },
                    { type: 'Results', purpose: 'Quantitative comparison tables, metrics (accuracy, throughput), and statistical validation.' },
                    { type: 'Discussion', purpose: 'Interpretation of results, scientific significance, limitations, and threats to validity.' },
                    { type: 'Conclusion', purpose: 'Closing synthesis and concrete future research directions.' },
                  ].map((sec, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start gap-3">
                      <span className="font-mono font-bold text-amber-400 text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h5 className="font-bold text-slate-100 text-xs">{sec.type}</h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">{sec.purpose}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Citations & BibTeX */}
            {activeTab === 'citations' && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="text-base font-bold text-white mb-1">Scholarly Citations & In-Text Markers</h4>
                  <p className="text-slate-400 text-xs">
                    Citations are grounded directly in your project's literature repository to ensure verifiable scientific attribution.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <h5 className="font-semibold text-slate-200 mb-1">1. How to Insert a Citation</h5>
                    <p className="text-[11px] text-slate-400">
                      Click the <span className="font-bold text-amber-400">+ Cite Literature</span> button in the top toolbar or the plus icon in the Citations drawer. Select any paper from your project repository, define the citation key (e.g. <code className="text-amber-300">Vaswani2017Attention</code>), and specify an optional in-text label.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-200 mb-1">2. In-Text Citation Syntax</h5>
                    <p className="text-[11px] text-slate-400 mb-2">
                      Use the bracketed at-key syntax anywhere in your section text. The preview renderer will automatically format it according to scholarly standards:
                    </p>
                    <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-amber-300 border border-slate-800 flex items-center justify-between">
                      <code>Prior work in transformer attention [@Vaswani2017Attention] demonstrated...</code>
                      <button
                        onClick={() => copyToClipboard('[@Vaswani2017Attention]', 'cit-sample')}
                        className="p-1 hover:text-white text-slate-400"
                        title="Copy syntax"
                      >
                        {copiedKey === 'cit-sample' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-200 mb-1">3. Why Did I Cite This? (AI Contextual Intelligence)</h5>
                    <p className="text-[11px] text-slate-400">
                      Click the <span className="font-bold text-amber-300">Why Cited?</span> button on any citation card to view AI synthesis of what findings from that paper are cited and how they support your argument.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-200 mb-1">4. Automatic References Section</h5>
                    <p className="text-[11px] text-slate-400">
                      At the bottom of the camera-ready paper preview, ResearchOS automatically compiles the formal bibliographic reference list complete with DOIs and venue citations.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. LaTeX Figures & Media */}
            {activeTab === 'figures' && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="text-base font-bold text-white mb-1">LaTeX Figures & Illustration Environments</h4>
                  <p className="text-slate-400 text-xs">
                    Incorporate architecture diagrams, loss curves, and benchmark matrices using standard LaTeX figure syntax.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <h5 className="font-semibold text-slate-200 mb-1">1. LaTeX Figure Environment Syntax</h5>
                    <div className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800 space-y-1 relative group">
                      <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                        {onInsertSnippet && (
                          <button
                            onClick={() => handleInsertSnippet(`\\begin{figure}[h]
  \\centering
  \\includegraphics[width=0.9\\linewidth]{figures/cell_topology.png}
  \\caption{Neural Architecture Search cell topology with continuous relaxation.}
  \\label{fig:cell-topology}
\\end{figure}`)}
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold border border-amber-500/30 transition-colors"
                          >
                            Insert
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard(`\\begin{figure}[h]
  \\centering
  \\includegraphics[width=0.9\\linewidth]{figures/cell_topology.png}
  \\caption{Neural Architecture Search cell topology with continuous relaxation.}
  \\label{fig:cell-topology}
\\end{figure}`, 'fig-sample')}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Copy figure code"
                        >
                          {copiedKey === 'fig-sample' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <pre className="text-amber-300">{`\\begin{figure}[h]
  \\centering
  \\includegraphics[width=0.9\\linewidth]{figures/cell_topology.png}
  \\caption{Neural Architecture Search cell topology with continuous relaxation.}
  \\label{fig:cell-topology}
\\end{figure}`}</pre>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-200 mb-1">2. In-Text Figure Reference</h5>
                    <p className="text-[11px] text-slate-400 mb-1.5">
                      Reference your figure in paragraphs using <code className="text-amber-300 font-mono">{'\\ref{fig:label}'}</code>:
                    </p>
                    <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-slate-300 border border-slate-800">
                      {'As illustrated in Figure \\ref{fig:cell-topology}, the edge operations...'}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-200 mb-1">3. Interactive Figure Uploader</h5>
                    <p className="text-[11px] text-slate-400">
                      Click the <span className="font-bold text-amber-400">Insert Figure</span> icon on the toolbar to open the figure uploader. You can drop any image, select preset diagrams, and configure widths with live preview.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Math & Equations */}
            {activeTab === 'math' && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="text-base font-bold text-white mb-1">Mathematical Formulae & Equations</h4>
                  <p className="text-slate-400 text-xs">
                    ResearchOS renders both inline mathematics and full display equation blocks with automatic numbering.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <h5 className="font-semibold text-slate-200 mb-1">1. Inline Mathematics</h5>
                    <p className="text-[11px] text-slate-400 mb-1.5">
                      Enclose formulas in single dollar signs <code className="text-amber-300">$ ... $</code>:
                    </p>
                    <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-amber-300 border border-slate-800 flex items-center justify-between">
                      <code>{'The loss function minimizes $\\mathcal{L}(w, \\alpha)$ over parameter space.'}</code>
                      <div className="flex items-center gap-1.5">
                        {onInsertSnippet && (
                          <button
                            onClick={() => handleInsertSnippet('$\\mathcal{L}(w, \\alpha)$')}
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold border border-amber-500/30 transition-colors"
                          >
                            Insert
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard('$\\mathcal{L}(w, \\alpha)$', 'math-inline')}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          {copiedKey === 'math-inline' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-200 mb-1">2. Display Block Equations (Numbered)</h5>
                    <p className="text-[11px] text-slate-400 mb-1.5">
                      Enclose full display equations in double dollar signs <code className="text-amber-300">$$ ... $$</code>. The preview automatically numbers them:
                    </p>
                    <div className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-amber-300 border border-slate-800 flex items-center justify-between">
                      <pre>{'$$ \\min_{\\alpha} \\mathcal{L}_{val}(w^*(\\alpha), \\alpha) \\quad \\text{s.t.} \\quad w^*(\\alpha) = \\arg\\min_{w} \\mathcal{L}_{train}(w, \\alpha) $$'}</pre>
                      <div className="flex items-center gap-1.5">
                        {onInsertSnippet && (
                          <button
                            onClick={() => handleInsertSnippet('$$ \\min_{\\alpha} \\mathcal{L}_{val}(w^*(\\alpha), \\alpha) $$')}
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold border border-amber-500/30 transition-colors"
                          >
                            Insert
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard('$$ \\min_{\\alpha} \\mathcal{L}_{val}(w^*(\\alpha), \\alpha) $$', 'math-block')}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          {copiedKey === 'math-block' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-200 mb-1">3. Supported Symbols & Greek Letters</h5>
                    <div className="grid grid-cols-4 gap-2 text-[11px] font-mono text-slate-300">
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">\alpha → α</div>
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">\beta → β</div>
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">\nabla → ∇</div>
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">\sum → ∑</div>
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">{`\\mathcal{L} → ℒ`}</div>
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">\in → ∈</div>
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">\approx → ≈</div>
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">{`\\frac{a}{b} → (a/b)`}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Reviews & Governance */}
            {activeTab === 'review' && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="text-base font-bold text-white mb-1">Peer Review & Submission Governance</h4>
                  <p className="text-slate-400 text-xs">
                    ResearchOS prevents unreviewed papers from submission through mandatory peer review and supervisor sign-offs.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <h5 className="font-bold text-amber-300">Anchored Snippet Comments</h5>
                    <p className="text-[11px] text-slate-400">
                      Reviewers highlight any text snippet in the preview or editor and submit severity-tagged comments: <span className="font-bold text-rose-400">Major Scientific</span>, <span className="font-bold text-amber-400">Minor Method</span>, or <span className="font-bold text-blue-400">Grammar/Typo</span>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <h5 className="font-bold text-amber-300">Mandatory Author Fix Notes</h5>
                    <p className="text-[11px] text-slate-400">
                      Authors cannot simply dismiss review comments. Addressing a comment requires submitting an explicit fix note detailing what changes were made in the manuscript.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <h5 className="font-bold text-amber-300">Supervisor Governance Lock</h5>
                    <p className="text-[11px] text-slate-400">
                      Checklist items such as IRB ethics approval, code reproducibility, and open data compliance require supervisor sign-off before the manuscript can transition to <code className="text-amber-300">ReadyForSubmission</code>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Shortcuts & Cheatsheet */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="text-base font-bold text-white mb-1">Keyboard Shortcuts & Markdown Cheatsheet</h4>
                  <p className="text-slate-400 text-xs">
                    Accelerate your academic writing workflow with standard hotkeys.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'Ctrl + B', action: 'Bold text (**text**)' },
                    { key: 'Ctrl + I', action: 'Italic text (*text*)' },
                    { key: 'Ctrl + H', action: 'Subsection Heading (### Title)' },
                    { key: 'Ctrl + M', action: 'Insert Math formula ($...$)' },
                    { key: 'Ctrl + K', action: 'Insert LaTeX display equation ($$...$$)' },
                    { key: 'Ctrl + Shift + F', action: 'Open Insert Figure dialog' },
                    { key: 'Ctrl + Shift + C', action: 'Open Literature Citation modal' },
                    { key: 'Ctrl + S', action: 'Force save section draft immediately' },
                  ].map((sc, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300 font-medium">{sc.action}</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-400 border border-slate-700 font-bold shadow-sm">
                        {sc.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#070A12] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Tip: Double-click the resizer bar anytime to reset the editor and preview to a 50/50 split.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer"
          >
            Got it, return to editor
          </button>
        </div>
      </div>
    </div>
  );
};
