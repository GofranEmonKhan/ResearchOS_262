import { Paper } from '@researchos/shared-types';
import { listPapers, PaperError } from './paper.service.js';

/**
 * Generates a standard citation key: [FirstAuthorLastName][Year][FirstTitleWord]
 */
function generateCitationKey(paper: Paper): string {
  let authorPart = 'Unknown';
  if (paper.authors && paper.authors.length > 0) {
    const firstAuthor = paper.authors[0];
    const parts = firstAuthor.trim().split(/\s+/);
    authorPart = parts[parts.length - 1].replace(/[^A-Za-z0-9]/g, '');
  }

  const yearPart = paper.year ? String(paper.year) : 'ND';
  const titlePart = (paper.title || 'Paper')
    .trim()
    .split(/\s+/)[0]
    .replace(/[^A-Za-z0-9]/g, '');

  return `${authorPart}${yearPart}${titlePart}`;
}

/**
 * Formats a list of papers into BibTeX entries
 */
export function formatBibTeX(papers: Paper[]): string {
  if (papers.length === 0) return '';

  return papers
    .map((paper) => {
      const citeKey = generateCitationKey(paper);
      const authorsStr = (paper.authors || []).join(' and ');

      const lines = [
        `@article{${citeKey},`,
        `  title = {${paper.title}},`,
      ];

      if (authorsStr) {
        lines.push(`  author = {${authorsStr}},`);
      }
      if (paper.year) {
        lines.push(`  year = {${paper.year}},`);
      }
      if (paper.venue) {
        lines.push(`  journal = {${paper.venue}},`);
      }
      if (paper.doi) {
        lines.push(`  doi = {${paper.doi}},`);
      }

      // Remove trailing comma from last field
      lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
      lines.push('}');

      return lines.join('\n');
    })
    .join('\n\n');
}

/**
 * Formats a list of papers into RIS entries
 */
export function formatRIS(papers: Paper[]): string {
  if (papers.length === 0) return '';

  return papers
    .map((paper) => {
      const lines = [
        'TY  - JOUR',
        `TI  - ${paper.title}`,
      ];

      for (const author of paper.authors || []) {
        lines.push(`AU  - ${author}`);
      }

      if (paper.year) {
        lines.push(`PY  - ${paper.year}`);
      }
      if (paper.venue) {
        lines.push(`JO  - ${paper.venue}`);
      }
      if (paper.doi) {
        lines.push(`DO  - ${paper.doi}`);
      }

      lines.push('ER  - ');
      return lines.join('\n');
    })
    .join('\n\n');
}

/**
 * Resolves papers by parameters and exports them in BibTeX or RIS format
 */
export async function exportPapers(
  params: {
    format: 'bibtex' | 'ris';
    paperIds?: string[];
    projectId?: string;
    collectionId?: string;
  },
  requesterId: string
): Promise<{ content: string; contentType: string; fileName: string }> {
  const { format, paperIds, projectId, collectionId } = params;

  if (format !== 'bibtex' && format !== 'ris') {
    throw new PaperError('Export format must be "bibtex" or "ris"', 400);
  }

  // Retrieve papers accessible to user matching criteria
  const { papers: allAccessible } = await listPapers(
    {
      projectId,
      collectionId,
      limit: 100,
    },
    requesterId
  );

  let papers = allAccessible;

  if (paperIds && paperIds.length > 0) {
    const idSet = new Set(paperIds);
    papers = papers.filter((p) => idSet.has(p.id));
  }

  let content: string;
  let contentType: string;
  let ext: string;

  if (format === 'bibtex') {
    content = formatBibTeX(papers);
    contentType = 'application/x-bibtex';
    ext = 'bib';
  } else {
    content = formatRIS(papers);
    contentType = 'application/x-research-info-systems';
    ext = 'ris';
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `researchos-export-${timestamp}.${ext}`;

  return { content, contentType, fileName };
}
