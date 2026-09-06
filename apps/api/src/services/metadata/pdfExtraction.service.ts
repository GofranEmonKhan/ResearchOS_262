import pdf from 'pdf-parse';
import { normalizeDoi } from './types.js';

// Comprehensive DOI pattern covering CrossRef, ACM, IEEE, Nature, Springer, arXiv DOI formats
const DOI_REGEX = /\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/gi;

/**
 * Extracts raw text from the first N pages of a PDF buffer
 */
export async function extractTextFromPdfBuffer(
  pdfBuffer: Buffer,
  maxPages = 2
): Promise<string> {
  try {
    const parseFn: any = typeof pdf === 'function' ? pdf : (pdf as any).default;
    const data = await parseFn(pdfBuffer, { max: maxPages });
    return data.text || '';
  } catch (err) {
    console.warn('PDF text extraction error:', (err as Error).message);
    return '';
  }
}

/**
 * Scans text content for standard DOI patterns and returns the first valid normalized DOI
 */
export function extractDoiFromText(text: string): string | null {
  if (!text) return null;

  const matches = text.match(DOI_REGEX);
  if (!matches || matches.length === 0) return null;

  for (const match of matches) {
    const cleaned = normalizeDoi(match);
    // Basic structural validation: starts with '10.', contains '/', and is reasonably long
    if (cleaned.startsWith('10.') && cleaned.includes('/') && cleaned.length >= 7) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Extracts DOI from the first 2 pages of a PDF buffer
 */
export async function extractDoiFromPdfBuffer(pdfBuffer: Buffer): Promise<string | null> {
  const text = await extractTextFromPdfBuffer(pdfBuffer, 2);
  return extractDoiFromText(text);
}
