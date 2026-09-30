import React, { useState } from 'react';
import {
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { Manuscript, ManuscriptSection, ManuscriptCitation } from '@researchos/shared-types';

interface LatexPaperPreviewProps {
  manuscript: Manuscript;
  sections: ManuscriptSection[];
  activeSectionId: string | null;
  activeSectionContent: string;
  citations: ManuscriptCitation[];
  onCitationClick: (citationKey: string) => void;
}

export const LatexPaperPreview: React.FC<LatexPaperPreviewProps> = ({
  manuscript,
  sections,
  activeSectionId,
  activeSectionContent,
  citations,
  onCitationClick,
}) => {
  // Preview options
  const [previewScope, setPreviewScope] = useState<'section' | 'full'>('full');
  const [paperTheme, setPaperTheme] = useState<'light' | 'dark'>('light');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const activeSection = sections.find((s) => s.id === activeSectionId);

  // Helper to resolve citation in-text label
  const getCitationLabel = (rawKey: string, fallbackIndex: number) => {
    const cleanKey = rawKey.replace(/^\[@|\]$/g, '');
    const found = citations.find(
      (c) => c.citationKey === rawKey || c.citationKey === cleanKey || c.citationKey === `[@${cleanKey}]`
    );
    if (found?.inTextLabel) return found.inTextLabel;
    if (found?.paper?.authors && found.paper.authors.length > 0) {
      const firstAuthor = found.paper.authors[0].split(' ').pop() || found.paper.authors[0];
      const year = found.paper.year || '';
      return `${firstAuthor} et al., ${year}`;
    }
    return `[${fallbackIndex + 1}]`;
  };

  // Math equation renderer with equation numbering
  const renderMathBlock = (content: string, eqIndex: number) => {
    // Clean up $$ delimiters
    const mathExp = content.replace(/^\$\$\s*/, '').replace(/\s*\$\$$/, '');

    // Format simple symbols into clean unicode / math typesetting
    const formatted = mathExp
      .replace(/\\mathcal\{L\}/g, 'ℒ')
      .replace(/\\mathcal\{G\}/g, '𝒢')
      .replace(/\\mathcal\{V\}/g, '𝒱')
      .replace(/\\mathcal\{E\}/g, 'ℰ')
      .replace(/\\mathcal\{O\}/g, '𝒪')
      .replace(/\\min/g, 'min')
      .replace(/\\arg\\min/g, 'arg min')
      .replace(/\\sum/g, '∑')
      .replace(/\\nabla/g, '∇')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\xi/g, 'ξ')
      .replace(/\\approx/g, '≈')
      .replace(/\\quad/g, '    ')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\\in/g, '∈')
      .replace(/\\bar\{o\}/g, 'ō');

    return (
      <div
        key={`eq-${eqIndex}`}
        className={`my-4 py-3 px-4 rounded border transition-colors flex items-center justify-between font-serif text-sm md:text-base ${
          paperTheme === 'light'
            ? 'bg-slate-50/80 border-slate-200 text-slate-900 shadow-inner'
            : 'bg-slate-900/60 border-slate-800 text-slate-100'
        }`}
      >
        <div className="flex-1 text-center font-mono tracking-wide italic overflow-x-auto py-1">
          {formatted}
        </div>
        <div className={`ml-4 text-xs font-mono font-semibold shrink-0 select-none ${
          paperTheme === 'light' ? 'text-slate-500' : 'text-slate-400'
        }`}>
          ({eqIndex})
        </div>
      </div>
    );
  };

  // Markdown table renderer into LaTeX booktabs
  const renderTableBlock = (lines: string[], tIndex: number) => {
    const headerLine = lines[0];
    const dataLines = lines.slice(2); // Skip separator row

    const parseRow = (rowStr: string) =>
      rowStr
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    const headers = parseRow(headerLine);

    return (
      <div key={`table-${tIndex}`} className="my-5 overflow-x-auto">
        <div className={`text-center text-xs font-serif font-bold italic mb-1.5 ${
          paperTheme === 'light' ? 'text-slate-700' : 'text-slate-300'
        }`}>
          Table {tIndex}: Comparative Benchmark Evaluation
        </div>
        <table className={`w-full text-xs font-serif border-collapse ${
          paperTheme === 'light' ? 'text-slate-900' : 'text-slate-200'
        }`}>
          {/* Top rule */}
          <thead>
            <tr className={`border-t-2 border-b ${
              paperTheme === 'light' ? 'border-slate-900 bg-slate-100/50' : 'border-slate-300 bg-slate-800/40'
            }`}>
              {headers.map((h, i) => (
                <th key={i} className="py-2 px-3 text-left font-bold tracking-tight">
                  {h.replace(/\*\*/g, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataLines.map((dRow, rIdx) => {
              const cells = parseRow(dRow);
              return (
                <tr
                  key={rIdx}
                  className={`border-b transition-colors ${
                    paperTheme === 'light'
                      ? 'border-slate-200 hover:bg-amber-50/40'
                      : 'border-slate-800 hover:bg-slate-800/30'
                  }`}
                >
                  {cells.map((cell, cIdx) => {
                    const isBold = cell.startsWith('**') && cell.endsWith('**');
                    const cleanCell = cell.replace(/\*\*/g, '');
                    const hasCitation = cleanCell.match(/(\[@[\w-]+\])/);

                    return (
                      <td key={cIdx} className={`py-2 px-3 ${isBold ? 'font-bold' : ''}`}>
                        {hasCitation ? (
                          <span>
                            {cleanCell.split(/(\[@[\w-]+\])/g).map((part, pI) => {
                              if (part.startsWith('[@') && part.endsWith(']')) {
                                const k = part.slice(2, -1);
                                return (
                                  <button
                                    key={pI}
                                    type="button"
                                    onClick={() => onCitationClick(k)}
                                    className="ml-1 inline-flex items-center text-amber-600 hover:text-amber-700 underline font-mono text-[10px]"
                                    title="View citation synthesis"
                                  >
                                    [{getCitationLabel(part, pI)}]
                                  </button>
                                );
                              }
                              return part;
                            })}
                          </span>
                        ) : (
                          cleanCell
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Bottom rule */}
        <div className={`w-full border-b-2 mt-0.5 ${
          paperTheme === 'light' ? 'border-slate-900' : 'border-slate-300'
        }`} />
      </div>
    );
  };

  // Content block parser that handles headings, paragraphs, display equations, inline math, and tables
  const renderSectionBody = (content: string) => {
    if (!content.trim()) {
      return (
        <p className={`italic text-xs py-4 ${paperTheme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
          [This section is currently empty]
        </p>
      );
    }

    const blocks = content.split(/\n\n+/);
    let equationCount = 1;
    let tableCount = 1;

    return blocks.map((block, bIdx) => {
      const trimmed = block.trim();

      // Heading 1 (# ...)
      if (trimmed.startsWith('# ')) {
        return (
          <h2
            key={bIdx}
            className={`text-base font-bold font-serif uppercase tracking-wider mt-6 mb-2 pb-1 border-b ${
              paperTheme === 'light' ? 'text-slate-900 border-slate-300' : 'text-white border-slate-800'
            }`}
          >
            {trimmed.replace('# ', '')}
          </h2>
        );
      }

      // Heading 2 (## ...)
      if (trimmed.startsWith('## ')) {
        return (
          <h3
            key={bIdx}
            className={`text-sm font-bold font-serif mt-5 mb-2 ${
              paperTheme === 'light' ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            {trimmed.replace('## ', '')}
          </h3>
        );
      }

      // Heading 3 (### ...)
      if (trimmed.startsWith('### ')) {
        return (
          <h4
            key={bIdx}
            className={`text-xs font-bold font-serif italic mt-4 mb-1.5 ${
              paperTheme === 'light' ? 'text-slate-800' : 'text-slate-300'
            }`}
          >
            {trimmed.replace('### ', '')}
          </h4>
        );
      }

      // Display Equation ($$ ... $$)
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
        const rendered = renderMathBlock(trimmed, equationCount);
        equationCount++;
        return rendered;
      }

      // Markdown Table
      if (trimmed.includes('|') && trimmed.includes('---')) {
        const lines = trimmed.split('\n').filter((l) => l.trim().startsWith('|'));
        if (lines.length >= 3) {
          const renderedTable = renderTableBlock(lines, tableCount);
          tableCount++;
          return renderedTable;
        }
      }

      // Blockquote (> ...)
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote
            key={bIdx}
            className={`my-3 pl-4 border-l-2 italic text-xs font-serif ${
              paperTheme === 'light'
                ? 'border-amber-600 text-slate-700 bg-amber-50/30 py-2 pr-3'
                : 'border-amber-500 text-slate-300 bg-amber-500/5 py-2 pr-3'
            }`}
          >
            {trimmed.replace(/^>\s*/, '')}
          </blockquote>
        );
      }

      // Standard Paragraph with inline math and citations
      const parts = trimmed.split(/(\[@[\w-]+\]|\$[^$]+\$)/g);

      return (
        <p
          key={bIdx}
          className={`text-xs font-serif leading-relaxed mb-3 text-justify hyphens-auto ${
            paperTheme === 'light' ? 'text-slate-800' : 'text-slate-200'
          }`}
        >
          {parts.map((part, pIdx) => {
            // Citation badge [@CitationKey]
            if (part.startsWith('[@') && part.endsWith(']')) {
              const citeKey = part.slice(2, -1);
              const label = getCitationLabel(part, pIdx);
              return (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => onCitationClick(citeKey)}
                  className={`inline-flex items-center mx-0.5 px-1 py-0.2 rounded font-serif text-[11px] font-semibold cursor-pointer transition-all ${
                    paperTheme === 'light'
                      ? 'text-amber-800 bg-amber-100 hover:bg-amber-200 hover:text-amber-900 border border-amber-300'
                      : 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30'
                  }`}
                  title={`Click to view 'Why Did I Cite This?' for @${citeKey}`}
                >
                  [{label}]
                </button>
              );
            }

            // Inline Math ($ ... $)
            if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
              const innerMath = part
                .slice(1, -1)
                .replace(/\\mathcal\{L\}/g, 'ℒ')
                .replace(/\\mathcal\{G\}/g, '𝒢')
                .replace(/\\mathcal\{O\}/g, '𝒪')
                .replace(/\\min/g, 'min')
                .replace(/\\alpha/g, 'α')
                .replace(/\\beta/g, 'β')
                .replace(/\\xi/g, 'ξ')
                .replace(/\\in/g, '∈')
                .replace(/\\text\{([^}]+)\}/g, '$1');

              return (
                <span
                  key={pIdx}
                  className={`font-mono italic text-[11px] px-1 py-0.5 rounded mx-0.5 ${
                    paperTheme === 'light'
                      ? 'bg-slate-100 text-slate-900 border border-slate-200'
                      : 'bg-slate-900 text-amber-200 border border-slate-800'
                  }`}
                >
                  {innerMath}
                </span>
              );
            }

            // Bold/Italic markdown
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#06080F] overflow-hidden select-text">
      {/* ── Subheader Controls ── */}
      <div className="h-10 border-b border-slate-800 bg-[#090D16] px-4 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-serif italic font-semibold text-slate-300 flex items-center gap-1.5">
            <span className="text-amber-400 font-bold font-mono">LaTeX</span> Typeset Preview
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            {previewScope === 'full' ? 'Full Article' : activeSection?.title || 'Section'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope Toggle */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => setPreviewScope('full')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                previewScope === 'full'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Paper
            </button>
            <button
              onClick={() => setPreviewScope('section')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                previewScope === 'section'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active Section
            </button>
          </div>

          {/* Theme Toggle (Classic Paper vs Dark) */}
          <button
            onClick={() => setPaperTheme(paperTheme === 'light' ? 'dark' : 'light')}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px] px-2"
            title="Toggle Classic Paper / Dark Theme"
          >
            {paperTheme === 'light' ? (
              <>
                <Moon className="w-3 h-3 text-blue-400" />
                <span className="hidden sm:inline">Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Paper</span>
              </>
            )}
          </button>

          {/* Zoom */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
            <button
              onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
              className="hover:text-white px-0.5"
              title="Zoom Out"
            >
              -
            </button>
            <span>{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
              className="hover:text-white px-0.5"
              title="Zoom In"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Document Surface ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center bg-[#070A12]/80">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className={`w-full max-w-3xl rounded-sm transition-all duration-150 p-8 sm:p-12 md:p-14 shadow-2xl relative ${
            paperTheme === 'light'
              ? 'bg-[#FCFCFA] text-slate-900 border border-slate-300 ring-1 ring-black/5 shadow-slate-950/40'
              : 'bg-[#0E131F] text-slate-100 border border-slate-800 shadow-black/80'
          }`}
        >
          {/* ── Classical LaTeX Title Block ── */}
          <div className="text-center mb-8">
            {/* Journal / Venue Banner */}
            {manuscript.targetVenue && (
              <div className="text-[10px] uppercase font-mono tracking-widest text-amber-600 dark:text-amber-400 font-bold mb-2">
                Accepted for Publication in {manuscript.targetVenue}
              </div>
            )}

            {/* Title */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif leading-tight mb-4 tracking-tight">
              {manuscript.title}
            </h1>

            {/* Authors & Affiliation */}
            <div className="text-xs font-serif mb-2 text-slate-700 dark:text-slate-300 space-x-1">
              <span className="font-semibold">Alex Chen</span>
              <sup className="text-[9px] text-amber-600 font-bold">1*</sup>,
              <span className="font-semibold"> Sarah Vance</span>
              <sup className="text-[9px] text-amber-600 font-bold">2</sup>
            </div>

            <div className="text-[10px] font-serif italic text-slate-500 dark:text-slate-400 space-y-0.5">
              <div>
                <sup>1</sup> Computational Biology & AI Laboratory, MIT, Cambridge, MA
              </div>
              <div>
                <sup>2</sup> Department of Computer Science & AI, Stanford University, Stanford, CA
              </div>
              <div>
                <sup>*</sup> Corresponding author. Correspondence: <span className="font-mono">alex.chen@mit.edu</span>
              </div>
            </div>

            {/* LaTeX \rule{\textwidth}{0.5pt} */}
            <div className={`w-full border-t my-5 ${paperTheme === 'light' ? 'border-slate-800' : 'border-slate-700'}`} />

            {/* Abstract Block */}
            {manuscript.abstract && (
              <div className="max-w-2xl mx-auto text-left mb-5">
                <div className="text-center font-serif font-bold text-xs uppercase tracking-wider mb-2">
                  Abstract
                </div>
                <div className={`text-xs font-serif leading-relaxed italic text-justify hyphens-auto ${
                  paperTheme === 'light' ? 'text-slate-800' : 'text-slate-200'
                }`}>
                  {manuscript.abstract.split(/(\[@[\w-]+\])/g).map((part, idx) => {
                    if (part.startsWith('[@') && part.endsWith(']')) {
                      const cleanK = part.slice(2, -1);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onCitationClick(cleanK)}
                          className={`inline-flex items-center mx-0.5 px-1 py-0.2 rounded font-serif text-[11px] font-semibold cursor-pointer ${
                            paperTheme === 'light'
                              ? 'text-amber-800 bg-amber-100 hover:bg-amber-200'
                              : 'text-amber-300 bg-amber-500/20 hover:bg-amber-500/30'
                          }`}
                        >
                          [{getCitationLabel(part, idx)}]
                        </button>
                      );
                    }
                    return part;
                  })}
                </div>
                <div className="mt-2 text-[10px] font-serif text-slate-500 dark:text-slate-400">
                  <span className="font-bold not-italic">Keywords: </span>
                  Neural Architecture Search, Continuous Relaxation, High-Throughput Genomics, CAGI6, Saturation Mutagenesis.
                </div>
              </div>
            )}

            {/* Bottom Abstract Rule */}
            <div className={`w-full border-t my-5 ${paperTheme === 'light' ? 'border-slate-800' : 'border-slate-700'}`} />
          </div>

          {/* ── Article Sections ── */}
          {previewScope === 'full' ? (
            <div className="space-y-6">
              {sections.map((section) => {
                const isCurrentActive = section.id === activeSectionId;
                const content = isCurrentActive ? activeSectionContent : section.contentMarkdown;

                // Don't duplicate abstract if already rendered above
                if (section.sectionType === 'Abstract') return null;

                return (
                  <div
                    key={section.id}
                    className={`relative ${
                      isCurrentActive
                        ? paperTheme === 'light'
                          ? 'ring-1 ring-amber-400/40 rounded p-2 bg-amber-50/10'
                          : 'ring-1 ring-amber-500/30 rounded p-2 bg-amber-500/5'
                        : ''
                    }`}
                  >
                    {isCurrentActive && (
                      <span className="absolute -top-2.5 right-2 text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500 text-black font-bold uppercase">
                        Editing Active Section
                      </span>
                    )}
                    <h2
                      className={`text-sm sm:text-base font-bold font-serif uppercase tracking-wider mb-2.5 ${
                        paperTheme === 'light' ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {section.title}
                    </h2>
                    {renderSectionBody(content)}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {activeSection ? (
                <div>
                  <h2
                    className={`text-base font-bold font-serif uppercase tracking-wider mb-3 ${
                      paperTheme === 'light' ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {activeSection.title}
                  </h2>
                  {renderSectionBody(activeSectionContent)}
                </div>
              ) : (
                <p className="text-xs italic text-slate-500 text-center py-8">
                  No active section selected
                </p>
              )}
            </div>
          )}

          {/* ── Scholarly References Section ── */}
          {citations.length > 0 && (
            <div className="mt-10 pt-6 border-t border-slate-300 dark:border-slate-800">
              <h3 className={`text-xs font-bold font-serif uppercase tracking-wider mb-3 ${
                paperTheme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>
                References
              </h3>
              <ol className="list-none space-y-2 text-[11px] font-serif leading-relaxed">
                {citations.map((cite, cIdx) => (
                  <li
                    key={cite.id || cIdx}
                    className={`flex items-start gap-2 ${
                      paperTheme === 'light' ? 'text-slate-800' : 'text-slate-300'
                    }`}
                  >
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono shrink-0">
                      [{cIdx + 1}]
                    </span>
                    <div className="flex-1">
                      <span className="font-semibold">
                        {(cite.paper?.authors || ['Unknown Author']).join(', ')}
                      </span>{' '}
                      ({cite.paper?.year || 'n.d.'}).{' '}
                      <span className="italic">{cite.paper?.title}</span>.{' '}
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        {cite.paper?.venue}
                      </span>
                      {cite.paper?.doi && (
                        <span className="ml-1 font-mono text-[10px] text-slate-500">
                          DOI: {cite.paper.doi}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onCitationClick(cite.citationKey)}
                        className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold font-sans text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                        title="Open 'Why Did I Cite This?' analysis"
                      >
                        <Sparkles className="w-3 h-3 inline" />
                        Why cited?
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
