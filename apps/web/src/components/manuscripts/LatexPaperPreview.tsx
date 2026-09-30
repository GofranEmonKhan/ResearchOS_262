import React, { useState } from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  Maximize2,
  Type,
  Image as ImageIcon,
  X,
  ExternalLink,
} from 'lucide-react';
import { Manuscript, ManuscriptSection, ManuscriptCitation } from '@researchos/shared-types';

interface LatexPaperPreviewProps {
  manuscript: Manuscript;
  sections: ManuscriptSection[];
  activeSectionId: string | null;
  activeSectionContent: string;
  citations: ManuscriptCitation[];
  figureAssets?: Record<string, string>;
  onCitationClick: (citationKey: string) => void;
}

export const LatexPaperPreview: React.FC<LatexPaperPreviewProps> = ({
  manuscript,
  sections,
  activeSectionId,
  activeSectionContent,
  citations,
  figureAssets,
  onCitationClick,
}) => {
  // Preview options
  const [previewScope, setPreviewScope] = useState<'full' | 'section'>('full');
  const [paperTheme, setPaperTheme] = useState<'dark' | 'light'>('dark');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Typography Preferences: Font Size & Font Family (UI-UX Pro Max readability enhancement)
  const [fontSizePreference, setFontSizePreference] = useState<'compact' | 'normal' | 'large'>('normal');
  const [fontFamilyPreference, setFontFamilyPreference] = useState<'serif' | 'sans'>('serif');

  // Lightbox Modal for Fullscreen Figure Inspection
  const [activeLightboxImage, setActiveLightboxImage] = useState<{
    url: string;
    caption: string;
    label?: string;
    figureNumber?: number;
  } | null>(null);

  const activeSection = sections.find((s) => s.id === activeSectionId);
  const isAbstractActive = activeSection?.sectionType === 'Abstract';

  // Dynamic abstract content: if editing Abstract section, reflect live editor buffer
  const displayAbstract = isAbstractActive
    ? activeSectionContent
    : manuscript.abstract || sections.find((s) => s.sectionType === 'Abstract')?.contentMarkdown || '';

  // Helper to resolve citation in-text label
  const getCitationLabel = (rawKey: string, _fallbackIndex?: number) => {
    const cleanKey = rawKey.replace(/^\[@|\]$/g, '');
    const found = citations.find(
      (c) => c.citationKey === rawKey || c.citationKey === cleanKey || c.citationKey === `[@${cleanKey}]`
    );
    if (found?.inTextLabel) {
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

  // Dynamic font sizing classes based on user readability preference
  const getBodyTypographyClasses = () => {
    const fontFamClass = fontFamilyPreference === 'serif' ? 'font-serif' : 'font-sans';
    switch (fontSizePreference) {
      case 'compact':
        return `${fontFamClass} text-xs sm:text-[13px] leading-[1.65]`;
      case 'large':
        return `${fontFamClass} text-base sm:text-[16px] leading-[1.8]`;
      case 'normal':
      default:
        return `${fontFamClass} text-sm sm:text-[14.5px] leading-[1.72]`;
    }
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
        className={`my-5 py-3.5 px-6 rounded-xl border transition-colors flex items-center justify-between font-serif text-sm md:text-base ${
          paperTheme === 'dark'
            ? 'bg-slate-900/90 border-amber-500/25 text-amber-200 shadow-lg'
            : 'bg-slate-50 border-slate-300 text-slate-900 shadow-sm'
        }`}
      >
        <div className="flex-1 text-center font-mono tracking-wider italic overflow-x-auto py-1 text-sm sm:text-base">
          {formatted}
        </div>
        <div
          className={`ml-4 text-xs font-mono font-bold shrink-0 select-none ${
            paperTheme === 'dark' ? 'text-amber-400/80' : 'text-slate-600'
          }`}
        >
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
      <div key={`table-${tIndex}`} className="my-6 overflow-x-auto">
        <div
          className={`text-center text-xs sm:text-sm font-serif font-bold italic mb-2.5 ${
            paperTheme === 'dark' ? 'text-amber-300' : 'text-slate-800'
          }`}
        >
          Table {tIndex}: Comparative Benchmark Evaluation
        </div>
        <table
          className={`w-full text-xs sm:text-sm font-serif border-collapse ${
            paperTheme === 'dark' ? 'text-slate-200' : 'text-slate-900'
          }`}
        >
          <thead>
            <tr
              className={`border-t-2 border-b ${
                paperTheme === 'dark' ? 'border-slate-700 bg-slate-900/70' : 'border-slate-900 bg-slate-100'
              }`}
            >
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
                                    className={`ml-1 inline-flex items-center underline font-mono text-xs ${
                                      paperTheme === 'dark'
                                        ? 'text-amber-400 hover:text-amber-300'
                                        : 'text-amber-700 hover:text-amber-800'
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
        <div
          className={`w-full border-b-2 mt-0.5 ${
            paperTheme === 'dark' ? 'border-slate-700' : 'border-slate-900'
          }`}
        />
      </div>
    );
  };

  // Figure Card Component: Renders LaTeX figure environments or Markdown images
  const renderFigureCard = (
    url: string,
    caption: string,
    label: string | undefined,
    figIndex: number,
    key: string | number
  ) => {
    // Resolve URL from figureAssets if it matches a registered relative path (e.g. figures/plot.png)
    let resolvedUrl = url;
    if (figureAssets) {
      if (figureAssets[url]) {
        resolvedUrl = figureAssets[url];
      } else if (figureAssets['figures/' + url]) {
        resolvedUrl = figureAssets['figures/' + url];
      } else if (url.startsWith('figures/') && figureAssets[url.replace('figures/', '')]) {
        resolvedUrl = figureAssets[url.replace('figures/', '')];
      } else {
        // Match by filename alone
        const bareFileName = url.replace(/^.*[\\/]/, '');
        const matchingKey = Object.keys(figureAssets).find((k) => k.endsWith(bareFileName));
        if (matchingKey && figureAssets[matchingKey]) {
          resolvedUrl = figureAssets[matchingKey];
        }
      }
    }

    return (
      <figure
        key={key}
        className={`my-6 p-4 rounded-xl border transition-all text-center group ${
          paperTheme === 'dark'
            ? 'bg-slate-900/60 border-slate-800/90 hover:border-amber-500/40 shadow-lg shadow-black/40'
            : 'bg-slate-50/80 border-slate-200 hover:border-slate-400 shadow-sm'
        }`}
      >
        {/* Figure Media Container */}
        <div
          onClick={() =>
            setActiveLightboxImage({
              url: resolvedUrl,
              caption: caption || `Figure ${figIndex}`,
              label,
              figureNumber: figIndex,
            })
          }
          className="relative inline-block max-w-full overflow-hidden rounded-lg cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.01]"
        >
          <img
            src={resolvedUrl}
            alt={caption || `Figure ${figIndex}`}
            className="max-h-[380px] w-auto mx-auto object-contain rounded-md shadow-md"
            onError={(e) => {
              // Fallback placeholder if image cannot be loaded
              const target = e.currentTarget;
              target.onerror = null;
              target.src =
                'https://placehold.co/800x450/0f172a/f59e0b?text=' +
                encodeURIComponent(`Figure: ${url}`);
            }}
          />
          {/* Zoom Overlay Hint */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-medium text-xs backdrop-blur-[1px]">
            <Maximize2 className="w-4 h-4 text-amber-400" />
            <span>Click to expand figure</span>
          </div>
        </div>

        {/* Figure Caption & LaTeX Label */}
        <figcaption
          className={`mt-3 text-center ${
            paperTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
          } ${getBodyTypographyClasses()}`}
        >
          <span
            className={`font-bold mr-1.5 ${
              paperTheme === 'dark' ? 'text-amber-400' : 'text-slate-900'
            }`}
          >
            {`Figure ${figIndex}:`}
          </span>
          <span className="italic">{caption || 'No caption provided.'}</span>
          {label && (
            <span
              className={`ml-2 inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full ${
                paperTheme === 'dark'
                  ? 'bg-slate-800/90 text-amber-400/80 border border-slate-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {`\\${label}`}
            </span>
          )}
          {url.startsWith('figures/') && (
            <span
              className={`ml-1.5 inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded ${
                paperTheme === 'dark'
                  ? 'text-slate-500 bg-slate-900 border border-slate-800'
                  : 'text-slate-500 bg-slate-100 border border-slate-200'
              }`}
              title="LaTeX Relative Asset Path"
            >
              {url}
            </span>
          )}
        </figcaption>
      </figure>
    );
  };

  // Section content parser: detects headings, equations, booktabs, figures, and rich paragraphs
  const renderSectionBody = (content: string) => {
    if (!content || !content.trim()) {
      return (
        <p className={`italic text-sm py-4 ${paperTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
          [This section is currently empty]
        </p>
      );
    }

    const blocks = content.split(/\n\n+/);
    let equationCount = 1;
    let tableCount = 1;
    let figureCount = 1;

    return blocks.map((block, bIdx) => {
      const trimmed = block.trim();

      // LaTeX Figure Environment: \begin{figure} ... \end{figure}
      if (trimmed.startsWith('\\begin{figure}') || trimmed.includes('\\begin{figure}')) {
        const urlMatch = trimmed.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/);
        const captionMatch = trimmed.match(/\\caption\{([^}]+)\}/);
        const labelMatch = trimmed.match(/\\label\{([^}]+)\}/);

        const imgUrl = urlMatch ? urlMatch[1] : '';
        const imgCaption = captionMatch ? captionMatch[1] : '';
        const imgLabel = labelMatch ? labelMatch[1] : undefined;

        if (imgUrl) {
          const renderedFigure = renderFigureCard(imgUrl, imgCaption, imgLabel, figureCount, `latex-fig-${bIdx}`);
          figureCount++;
          return renderedFigure;
        }
      }

      // Markdown Image: ![caption](url)
      const mdImgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (mdImgMatch) {
        const imgCaption = mdImgMatch[1];
        const rawUrl = mdImgMatch[2];
        const renderedFigure = renderFigureCard(rawUrl, imgCaption, undefined, figureCount, `md-fig-${bIdx}`);
        figureCount++;
        return renderedFigure;
      }

      // Heading 1 (# ...)
      if (trimmed.startsWith('# ')) {
        return (
          <h2
            key={bIdx}
            className={`text-base sm:text-lg font-bold font-serif uppercase tracking-wider mt-7 mb-3 pb-1.5 border-b ${
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
            className={`text-sm sm:text-base font-bold font-serif mt-5 mb-2.5 ${
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
            className={`text-xs sm:text-sm font-bold font-serif italic mt-4 mb-2 ${
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
            className={`my-4 pl-4 border-l-2 italic text-sm font-serif py-2 pr-3 rounded-r-lg ${
              paperTheme === 'dark'
                ? 'border-amber-500 text-slate-300 bg-amber-500/5'
                : 'border-amber-600 text-slate-700 bg-amber-50/50'
            }`}
          >
            {trimmed.replace(/^>\s*/, '')}
          </blockquote>
        );
      }

      // Standard Paragraph with inline math, citations, and inline figures
      const parts = trimmed.split(/(\[@[\w-]+\]|\$[^$]+\$)/g);

      return (
        <p
          key={bIdx}
          className={`mb-4 text-left tracking-normal ${
            paperTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'
          } ${getBodyTypographyClasses()}`}
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
                  className={`inline-flex items-center mx-0.5 px-2 py-0.5 rounded font-serif text-xs font-semibold cursor-pointer transition-all ${
                    paperTheme === 'dark'
                      ? 'text-amber-300 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/35 shadow-sm'
                      : 'text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300'
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
                  className={`font-mono italic text-xs sm:text-[13px] px-1.5 py-0.5 rounded mx-0.5 ${
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
      {/* ── Subheader Controls & Readability Toolbar ── */}
      <div className="min-h-10 border-b border-slate-800 bg-[#090D16] px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-serif italic font-semibold text-slate-200 flex items-center gap-1.5">
            <span className="text-amber-400 font-bold font-mono">LaTeX</span> Typeset Preview
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
            {previewScope === 'full' ? 'Full Article' : activeSection?.title || 'Section'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope Toggle */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => setPreviewScope('full')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                previewScope === 'full'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Paper
            </button>
            <button
              onClick={() => setPreviewScope('section')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                previewScope === 'section'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active Section
            </button>
          </div>

          {/* Typography Preferences (Font Family) */}
          <button
            onClick={() => setFontFamilyPreference(fontFamilyPreference === 'serif' ? 'sans' : 'serif')}
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-medium"
            title={`Toggle Font Family (Current: ${fontFamilyPreference === 'serif' ? 'Academic Serif' : 'Modern Sans'})`}
          >
            <Type className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{fontFamilyPreference === 'serif' ? 'Serif' : 'Sans'}</span>
          </button>

          {/* Font Size Preferences */}
          <div className="hidden sm:flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setFontSizePreference('compact')}
              className={`px-2 py-0.5 rounded transition-colors ${
                fontSizePreference === 'compact' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Compact Size (13px)"
            >
              13px
            </button>
            <button
              onClick={() => setFontSizePreference('normal')}
              className={`px-2 py-0.5 rounded transition-colors ${
                fontSizePreference === 'normal' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Standard Readable Size (14.5px)"
            >
              14.5px
            </button>
            <button
              onClick={() => setFontSizePreference('large')}
              className={`px-2 py-0.5 rounded transition-colors ${
                fontSizePreference === 'large' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Reading / Accessible Size (16px)"
            >
              16px
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
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Paper</span>
              </>
            )}
          </button>

          {/* Zoom */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 font-mono">
            <button
              onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
              className="hover:text-white px-1 font-bold"
              title="Zoom Out"
            >
              -
            </button>
            <span className="w-10 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
              className="hover:text-white px-1 font-bold"
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
          className={`mx-auto w-full max-w-3xl min-h-full rounded-xl transition-colors p-8 sm:p-12 md:p-14 shadow-2xl relative border ${
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
                <div
                  className={`text-[11px] uppercase font-mono tracking-widest font-bold mb-3 ${
                    paperTheme === 'dark' ? 'text-amber-400' : 'text-amber-800'
                  }`}
                >
                  Accepted for Publication in {manuscript.targetVenue}
                </div>
              )}

              {/* Title */}
              <h1
                className={`text-2xl sm:text-3xl md:text-4xl font-bold font-serif leading-tight mb-5 tracking-tight ${
                  paperTheme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                {manuscript.title}
              </h1>

              {/* Authors & Affiliation - Highly readable font sizes & contrast */}
              <div
                className={`text-sm sm:text-base font-serif mb-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 ${
                  paperTheme === 'dark' ? 'text-slate-100' : 'text-slate-800'
                }`}
              >
                <span className="font-semibold">Alex Chen</span>
                <sup
                  className={`text-xs font-bold font-mono ${
                    paperTheme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                  }`}
                >
                  1*
                </sup>
                <span className="text-slate-500">,</span>
                <span className="font-semibold">Sarah Vance</span>
                <sup
                  className={`text-xs font-bold font-mono ${
                    paperTheme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                  }`}
                >
                  2
                </sup>
              </div>

              {/* Institutional Affiliations */}
              <div
                className={`text-xs sm:text-[13px] font-serif space-y-1 max-w-xl mx-auto ${
                  paperTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                <div>
                  <sup className="font-mono font-bold mr-1">1</sup>
                  Computational Biology &amp; AI Laboratory, Massachusetts Institute of Technology, Cambridge, MA
                </div>
                <div>
                  <sup className="font-mono font-bold mr-1">2</sup>
                  Department of Computer Science &amp; AI, Stanford University, Stanford, CA
                </div>
                <div className="pt-1 flex items-center justify-center gap-1.5 text-xs">
                  <sup className="font-mono font-bold">*</sup>
                  <span className="italic">Corresponding author:</span>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-full border ${
                      paperTheme === 'dark'
                        ? 'bg-slate-800/90 text-amber-300 border-slate-700'
                        : 'bg-slate-100 text-slate-900 border-slate-300'
                    }`}
                  >
                    alex.chen@mit.edu
                  </span>
                </div>
              </div>

              {/* LaTeX \rule{\textwidth}{0.5pt} */}
              <div
                className={`w-full border-t my-6 ${
                  paperTheme === 'dark' ? 'border-slate-700/80' : 'border-slate-800'
                }`}
              />

              {/* Abstract Block - Clean, high contrast, readable */}
              {displayAbstract && (
                <div
                  className={`max-w-2xl mx-auto text-left mb-6 rounded-xl p-4 sm:p-5 transition-colors border ${
                    isAbstractActive && previewScope === 'full'
                      ? paperTheme === 'dark'
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                        : 'bg-amber-50/70 border-amber-400 shadow-sm'
                      : paperTheme === 'dark'
                      ? 'bg-slate-900/40 border-slate-800/80'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <h2
                      className={`font-serif font-bold text-xs uppercase tracking-wider ${
                        paperTheme === 'dark' ? 'text-amber-400' : 'text-slate-900'
                      }`}
                    >
                      Abstract
                    </h2>
                    {isAbstractActive && (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold shadow-sm">
                        Live Editing
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-left tracking-normal border-l-2 border-amber-500/60 pl-3.5 py-0.5 ${
                      paperTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                    } ${getBodyTypographyClasses()}`}
                  >
                    {displayAbstract.split(/(\[@[\w-]+\])/g).map((part, idx) => {
                      if (part.startsWith('[@') && part.endsWith(']')) {
                        const cleanK = part.slice(2, -1);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => onCitationClick(cleanK)}
                            className={`inline-flex items-center mx-0.5 px-2 py-0.5 rounded font-serif text-xs font-semibold cursor-pointer transition-colors ${
                              paperTheme === 'dark'
                                ? 'text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/35'
                                : 'text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                            }`}
                          >
                            {`[${getCitationLabel(part, idx)}]`}
                          </button>
                        );
                      }
                      return part;
                    })}
                  </div>
                  <div
                    className={`mt-3 pt-2.5 border-t text-xs sm:text-[13px] font-serif ${
                      paperTheme === 'dark'
                        ? 'border-slate-800 text-slate-400'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="font-bold text-slate-300">Keywords: </span>
                    Neural Architecture Search, Continuous Relaxation, High-Throughput Genomics, CAGI6, Saturation Mutagenesis.
                  </div>
                </div>
              )}

              {/* Bottom Abstract Rule */}
              <div
                className={`w-full border-t my-6 ${
                  paperTheme === 'dark' ? 'border-slate-700/80' : 'border-slate-800'
                }`}
              />
            </div>
          )}

          {/* ── Article Sections ── */}
          {previewScope === 'full' ? (
            <div className="space-y-7">
              {sections.map((section) => {
                const isCurrentActive = section.id === activeSectionId;
                const content = isCurrentActive ? activeSectionContent : section.contentMarkdown;

                // Abstract is rendered in the Title block above
                if (section.sectionType === 'Abstract') return null;

                return (
                  <div
                    key={section.id}
                    className={`relative rounded-xl transition-colors p-3 sm:p-4 ${
                      isCurrentActive
                        ? paperTheme === 'dark'
                          ? 'ring-1 ring-amber-500/40 bg-amber-500/5'
                          : 'ring-1 ring-amber-400/60 bg-amber-50/40'
                        : ''
                    }`}
                  >
                    {isCurrentActive && (
                      <span className="absolute -top-2.5 right-3 text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500 text-black font-bold uppercase shadow-sm">
                        Editing Active Section
                      </span>
                    )}
                    <h2
                      className={`text-base sm:text-lg font-bold font-serif uppercase tracking-wider mb-3.5 pb-1 border-b ${
                        paperTheme === 'dark'
                          ? 'text-white border-slate-800'
                          : 'text-slate-900 border-slate-200'
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
                    className={`text-lg sm:text-xl font-bold font-serif uppercase tracking-wider mb-4 pb-1 border-b ${
                      paperTheme === 'dark'
                        ? 'text-white border-slate-800'
                        : 'text-slate-900 border-slate-200'
                    }`}
                  >
                    {activeSection.title}
                  </h2>
                  {renderSectionBody(activeSectionContent)}
                </div>
              ) : (
                <p className="text-sm italic text-slate-500 text-center py-8">
                  No active section selected
                </p>
              )}
            </div>
          )}

          {/* ── Scholarly References Section ── */}
          {citations.length > 0 && previewScope === 'full' && (
            <div
              className={`mt-12 pt-7 border-t ${
                paperTheme === 'dark' ? 'border-slate-800' : 'border-slate-300'
              }`}
            >
              <h3
                className={`text-sm sm:text-base font-bold font-serif uppercase tracking-wider mb-4 ${
                  paperTheme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                References
              </h3>
              <ol className="list-none space-y-3 text-xs sm:text-[13px] font-serif leading-relaxed">
                {citations.map((cite, cIdx) => (
                  <li
                    key={cite.id || cIdx}
                    className={`flex items-start gap-2.5 ${
                      paperTheme === 'dark' ? 'text-slate-300' : 'text-slate-800'
                    }`}
                  >
                    <span
                      className={`font-bold font-mono shrink-0 ${
                        paperTheme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                      }`}
                    >
                      [{cIdx + 1}]
                    </span>
                    <div className="flex-1">
                      <span className="font-semibold text-slate-200">
                        {(cite.paper?.authors || ['Unknown Author']).join(', ')}
                      </span>{' '}
                      ({cite.paper?.year || 'n.d.'}).{' '}
                      <span className="italic">{cite.paper?.title}</span>.{' '}
                      <span className="font-medium text-amber-400/90">
                        {cite.paper?.venue}
                      </span>
                      {cite.paper?.doi && (
                        <span
                          className={`ml-1.5 font-mono text-[11px] ${
                            paperTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        >
                          DOI: {cite.paper.doi}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onCitationClick(cite.citationKey)}
                        className={`ml-2.5 inline-flex items-center gap-1 text-[11px] font-semibold font-sans hover:underline cursor-pointer ${
                          paperTheme === 'dark'
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-amber-700 hover:text-amber-800'
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

      {/* ── Figure Lightbox Modal ── */}
      {activeLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div
            className="max-w-4xl w-full bg-[#0D111D] border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl p-4 sm:p-6 relative animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span className="font-serif font-bold text-sm text-white">
                  {activeLightboxImage.figureNumber
                    ? `Figure ${activeLightboxImage.figureNumber} Preview`
                    : 'Figure Inspection'}
                </span>
                {activeLightboxImage.label && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                    \{activeLightboxImage.label}
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveLightboxImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Image */}
            <div className="max-h-[65vh] flex items-center justify-center overflow-auto rounded-lg bg-black/40 p-2">
              <img
                src={activeLightboxImage.url}
                alt={activeLightboxImage.caption}
                className="max-h-[60vh] max-w-full object-contain rounded-md"
              />
            </div>

            {/* Caption & Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <p className="font-serif italic text-sm pr-4 flex-1">
                {activeLightboxImage.caption}
              </p>
              <a
                href={activeLightboxImage.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-sans text-xs shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Open in Tab</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
