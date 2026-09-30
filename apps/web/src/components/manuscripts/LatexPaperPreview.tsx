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
  // Preview options: Default to 'dark' for perfect harmony with ResearchOS dark canvas
  const [previewScope, setPreviewScope] = useState<'full' | 'section'>('full');
  const [paperTheme, setPaperTheme] = useState<'dark' | 'light'>('dark');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const activeSection = sections.find((s) => s.id === activeSectionId);
  const isAbstractActive = activeSection?.sectionType === 'Abstract';

  // Dynamic abstract content: if editing Abstract section, reflect live editor buffer
  const displayAbstract = isAbstractActive
    ? activeSectionContent
    : manuscript.abstract || sections.find((s) => s.sectionType === 'Abstract')?.contentMarkdown || '';

  // Helper to resolve citation in-text label (stripped of outer brackets so wrapping with [{...}] is never nested)
  const getCitationLabel = (rawKey: string, _fallbackIndex?: number) => {
    const cleanKey = rawKey.replace(/^\[@|\]$/g, '');
    const found = citations.find(
      (c) => c.citationKey === rawKey || c.citationKey === cleanKey || c.citationKey === `[@${cleanKey}]`
    );
    if (found?.inTextLabel) {
      // Strip any outer brackets to avoid double-bracket rendering like [[@Key]]
      const stripped = found.inTextLabel.replace(/^\[+|\]+$/g, '').trim();
      if (stripped) return stripped;
    }
    if (found?.paper?.authors && found.paper.authors.length > 0) {
      const firstAuthor = found.paper.authors[0].split(' ').pop() || found.paper.authors[0];
      const year = found.paper.year || '';
      return `${firstAuthor} et al., ${year}`;
    }
    return `@${cleanKey}`;
  };

  // Math equation renderer with equation numbering
  const renderMathBlock = (content: string, eqIndex: number) => {
    const mathExp = content.replace(/^\$\$\s*/, '').replace(/\s*\$\$$/, '');

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
        className={`my-4 py-3 px-5 rounded-lg border transition-colors flex items-center justify-between font-serif text-sm md:text-base ${
          paperTheme === 'dark'
            ? 'bg-slate-900/90 border-amber-500/20 text-amber-200 shadow-lg'
            : 'bg-slate-50 border-slate-300 text-slate-900 shadow-sm'
        }`}
      >
        <div className="flex-1 text-center font-mono tracking-wide italic overflow-x-auto py-1">
          {formatted}
        </div>
        <div className={`ml-4 text-xs font-mono font-bold shrink-0 select-none ${
          paperTheme === 'dark' ? 'text-amber-400/70' : 'text-slate-600'
        }`}>
          ({eqIndex})
        </div>
      </div>
    );
  };

  // Markdown table renderer into LaTeX booktabs
  const renderTableBlock = (lines: string[], tIndex: number) => {
    const headerLine = lines[0];
    const dataLines = lines.slice(2);

    const parseRow = (rowStr: string) =>
      rowStr
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    const headers = parseRow(headerLine);

    return (
      <div key={`table-${tIndex}`} className="my-5 overflow-x-auto">
        <div className={`text-center text-xs font-serif font-bold italic mb-2 ${
          paperTheme === 'dark' ? 'text-amber-300' : 'text-slate-800'
        }`}>
          Table {tIndex}: Comparative Benchmark Evaluation
        </div>
        <table className={`w-full text-xs font-serif border-collapse ${
          paperTheme === 'dark' ? 'text-slate-200' : 'text-slate-900'
        }`}>
          <thead>
            <tr className={`border-t-2 border-b ${
              paperTheme === 'dark' ? 'border-slate-700 bg-slate-900/60' : 'border-slate-900 bg-slate-100'
            }`}>
              {headers.map((h, i) => (
                <th key={i} className="py-2.5 px-3 text-left font-bold tracking-tight">
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
                    paperTheme === 'dark'
                      ? 'border-slate-800 hover:bg-slate-800/40'
                      : 'border-slate-200 hover:bg-amber-50/50'
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
                                    className={`ml-1 inline-flex items-center underline font-mono text-[10px] ${
                                      paperTheme === 'dark' ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'
                                    }`}
                                    title="View citation synthesis"
                                  >
                                    {`[${getCitationLabel(part, pI)}]`}
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
        <div className={`w-full border-b-2 mt-0.5 ${
          paperTheme === 'dark' ? 'border-slate-700' : 'border-slate-900'
        }`} />
      </div>
    );
  };

  // Section content parser
  const renderSectionBody = (content: string) => {
    if (!content || !content.trim()) {
      return (
        <p className={`italic text-xs py-3 ${paperTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
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
            className={`text-sm sm:text-base font-bold font-serif uppercase tracking-wider mt-5 mb-2 pb-1 border-b ${
              paperTheme === 'dark' ? 'text-amber-300 border-slate-800' : 'text-slate-900 border-slate-300'
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
            className={`text-xs sm:text-sm font-bold font-serif mt-4 mb-2 ${
              paperTheme === 'dark' ? 'text-slate-100' : 'text-slate-900'
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
            className={`text-xs font-bold font-serif italic mt-3 mb-1.5 ${
              paperTheme === 'dark' ? 'text-slate-300' : 'text-slate-800'
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
            className={`my-3 pl-4 border-l-2 italic text-xs font-serif py-1.5 pr-3 ${
              paperTheme === 'dark'
                ? 'border-amber-500 text-slate-300 bg-amber-500/5'
                : 'border-amber-600 text-slate-700 bg-amber-50/50'
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
            paperTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'
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
                  className={`inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded font-serif text-[11px] font-semibold cursor-pointer transition-all ${
                    paperTheme === 'dark'
                      ? 'text-amber-300 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 shadow-sm'
                      : 'text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                  }`}
                  title={`Click to view 'Why Did I Cite This?' for @${citeKey}`}
                >
                  {`[${label}]`}
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
                    paperTheme === 'dark'
                      ? 'bg-slate-900 text-amber-300 border border-amber-500/20'
                      : 'bg-slate-100 text-slate-900 border border-slate-300'
                  }`}
                >
                  {innerMath}
                </span>
              );
            }

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

          {/* Theme Toggle (Dark Scholarly vs Classic White Paper) */}
          <button
            onClick={() => setPaperTheme(paperTheme === 'dark' ? 'light' : 'dark')}
            className={`p-1 rounded-lg transition-colors flex items-center gap-1.5 text-[11px] px-2.5 font-medium border ${
              paperTheme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300'
            }`}
            title="Toggle Dark Scholarly / Classic White Paper Theme"
          >
            {paperTheme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                <span>Dark Theme</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Paper (White)</span>
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#070A12]">
        <div
          style={{
            zoom: zoomLevel !== 100 ? `${zoomLevel}%` : undefined,
            backgroundColor: paperTheme === 'dark' ? '#0D111D' : '#FFFFFF',
            color: paperTheme === 'dark' ? '#F1F5F9' : '#0F172A',
          }}
          className={`mx-auto w-full max-w-3xl min-h-full rounded-lg transition-colors p-8 sm:p-12 md:p-14 shadow-2xl relative border ${
            paperTheme === 'dark'
              ? 'border-slate-800/80 shadow-black/80'
              : 'border-slate-300 shadow-slate-900/20'
          }`}
        >
          {/* ── Classical LaTeX Title Block (always shown in Full view or Abstract view) ── */}
          {(previewScope === 'full' || isAbstractActive) && (
            <div className="text-center mb-8">
              {/* Journal / Venue Banner */}
              {manuscript.targetVenue && (
                <div className={`text-[10px] uppercase font-mono tracking-widest font-bold mb-2 ${
                  paperTheme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                }`}>
                  Accepted for Publication in {manuscript.targetVenue}
                </div>
              )}

              {/* Title */}
              <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold font-serif leading-tight mb-4 tracking-tight ${
                paperTheme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {manuscript.title}
              </h1>

              {/* Authors & Affiliation */}
              <div className={`text-xs font-serif mb-2 space-x-1 ${
                paperTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <span className="font-semibold">Alex Chen</span>
                <sup className={`text-[9px] font-bold ${paperTheme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>1*</sup>,
                <span className="font-semibold"> Sarah Vance</span>
                <sup className={`text-[9px] font-bold ${paperTheme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>2</sup>
              </div>

              <div className={`text-[10px] font-serif italic space-y-0.5 ${
                paperTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}>
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
              <div className={`w-full border-t my-5 ${
                paperTheme === 'dark' ? 'border-slate-700' : 'border-slate-800'
              }`} />

              {/* Abstract Block */}
              {displayAbstract && (
                <div className={`max-w-2xl mx-auto text-left mb-5 rounded-md p-3 transition-colors ${
                  isAbstractActive && previewScope === 'full'
                    ? paperTheme === 'dark'
                      ? 'bg-amber-500/10 border border-amber-500/30'
                      : 'bg-amber-50/60 border border-amber-300'
                    : ''
                }`}>
                  <div className={`text-center font-serif font-bold text-xs uppercase tracking-wider mb-2 ${
                    paperTheme === 'dark' ? 'text-amber-400' : 'text-slate-900'
                  }`}>
                    Abstract
                    {isAbstractActive && (
                      <span className="ml-2 text-[9px] font-mono font-normal uppercase px-1.5 py-0.5 rounded bg-amber-500 text-black font-bold">
                        Live Editing
                      </span>
                    )}
                  </div>
                  <div className={`text-xs font-serif leading-relaxed italic text-justify hyphens-auto ${
                    paperTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {displayAbstract.split(/(\[@[\w-]+\])/g).map((part, idx) => {
                      if (part.startsWith('[@') && part.endsWith(']')) {
                        const cleanK = part.slice(2, -1);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => onCitationClick(cleanK)}
                            className={`inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded font-serif text-[11px] font-semibold cursor-pointer ${
                              paperTheme === 'dark'
                                ? 'text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30'
                                : 'text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                            }`}
                          >
                            {`[${getCitationLabel(part, idx)}]`}
                          </button>
                        );
                      }
                      return part;
                    })}
                  </div>
                  <div className={`mt-2 text-[10px] font-serif ${
                    paperTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <span className="font-bold not-italic">Keywords: </span>
                    Neural Architecture Search, Continuous Relaxation, High-Throughput Genomics, CAGI6, Saturation Mutagenesis.
                  </div>
                </div>
              )}

              {/* Bottom Abstract Rule */}
              <div className={`w-full border-t my-5 ${
                paperTheme === 'dark' ? 'border-slate-700' : 'border-slate-800'
              }`} />
            </div>
          )}

          {/* ── Article Sections ── */}
          {previewScope === 'full' ? (
            <div className="space-y-6">
              {sections.map((section) => {
                const isCurrentActive = section.id === activeSectionId;
                const content = isCurrentActive ? activeSectionContent : section.contentMarkdown;

                // Abstract is rendered in the Title block above
                if (section.sectionType === 'Abstract') return null;

                return (
                  <div
                    key={section.id}
                    className={`relative rounded-md transition-colors p-3 ${
                      isCurrentActive
                        ? paperTheme === 'dark'
                          ? 'ring-1 ring-amber-500/40 bg-amber-500/5'
                          : 'ring-1 ring-amber-400/60 bg-amber-50/40'
                        : ''
                    }`}
                  >
                    {isCurrentActive && (
                      <span className="absolute -top-2.5 right-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500 text-black font-bold uppercase shadow-sm">
                        Editing Active Section
                      </span>
                    )}
                    <h2
                      className={`text-sm sm:text-base font-bold font-serif uppercase tracking-wider mb-2.5 ${
                        paperTheme === 'dark' ? 'text-white' : 'text-slate-900'
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
                      paperTheme === 'dark' ? 'text-white' : 'text-slate-900'
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
          {citations.length > 0 && previewScope === 'full' && (
            <div className={`mt-10 pt-6 border-t ${
              paperTheme === 'dark' ? 'border-slate-800' : 'border-slate-300'
            }`}>
              <h3 className={`text-xs font-bold font-serif uppercase tracking-wider mb-3 ${
                paperTheme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                References
              </h3>
              <ol className="list-none space-y-2.5 text-[11px] font-serif leading-relaxed">
                {citations.map((cite, cIdx) => (
                  <li
                    key={cite.id || cIdx}
                    className={`flex items-start gap-2 ${
                      paperTheme === 'dark' ? 'text-slate-300' : 'text-slate-800'
                    }`}
                  >
                    <span className={`font-bold font-mono shrink-0 ${
                      paperTheme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                    }`}>
                      [{cIdx + 1}]
                    </span>
                    <div className="flex-1">
                      <span className="font-semibold">
                        {(cite.paper?.authors || ['Unknown Author']).join(', ')}
                      </span>{' '}
                      ({cite.paper?.year || 'n.d.'}).{' '}
                      <span className="italic">{cite.paper?.title}</span>.{' '}
                      <span className="font-medium">
                        {cite.paper?.venue}
                      </span>
                      {cite.paper?.doi && (
                        <span className={`ml-1 font-mono text-[10px] ${
                          paperTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          DOI: {cite.paper.doi}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onCitationClick(cite.citationKey)}
                        className={`ml-2 inline-flex items-center gap-1 text-[10px] font-semibold font-sans hover:underline cursor-pointer ${
                          paperTheme === 'dark' ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'
                        }`}
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
