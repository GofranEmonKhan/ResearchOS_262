import { MetadataCandidate, MetadataResult } from '@researchos/shared-types';
import { supabaseAdmin } from '../../supabase.js';
import { PAPERS_BUCKET, validateStoragePath, FileAssetError } from '../fileAsset.service.js';
import { crossRefProvider } from './crossref.provider.js';
import { openAlexProvider } from './openalex.provider.js';
import { extractDoiFromPdfBuffer } from './pdfExtraction.service.js';
import { calculateConfidence, normalizeDoi } from './types.js';

export const HIGH_CONFIDENCE_THRESHOLD = 0.85;
export const MIN_CANDIDATE_CONFIDENCE = 0.40;

/**
 * Derives a clean search query string from a file name
 * e.g. "Attention_Is_All_You_Need_1706.03762v7.pdf" -> "Attention Is All You Need"
 */
export function cleanFileNameToQuery(fileName: string): string {
  if (!fileName) return '';
  let cleaned = fileName.replace(/\.pdf$/i, '');
  // Replace underscores and dashes with spaces
  cleaned = cleaned.replace(/[_-]+/g, ' ');
  // Remove common hash or arXiv tags like 1706.03762v7
  cleaned = cleaned.replace(/\b\d{4}\.\d{4,5}(?:v\d+)?\b/gi, '');
  // Remove extra whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Deduplicates and ranks metadata candidates by confidence
 */
function deduplicateAndRank(
  candidates: MetadataCandidate[],
  queryTitle: string
): MetadataCandidate[] {
  const seenDois = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: MetadataCandidate[] = [];

  for (const cand of candidates) {
    const normDoi = cand.doi ? normalizeDoi(cand.doi).toLowerCase() : null;
    const normTitle = cand.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normDoi && seenDois.has(normDoi)) continue;
    if (seenTitles.has(normTitle)) continue;

    if (normDoi) seenDois.add(normDoi);
    seenTitles.add(normTitle);

    // Re-score based on query
    const confidence = calculateConfidence({ title: queryTitle }, cand);
    unique.push({
      ...cand,
      confidence,
    });
  }

  // Sort descending by confidence
  return unique.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Main Metadata Resolution Pipeline:
 * 1. Validates storage path format & user ownership.
 * 2. Downloads uploaded PDF from Supabase Storage.
 * 3. Extracts DOI from the first 2 pages of the PDF.
 * 4. If DOI found -> look up via CrossRef (fallback OpenAlex).
 * 5. If no DOI or lookup fails -> search CrossRef & OpenAlex by cleaned file name query.
 * 6. Categorizes result as:
 *    - 'resolved': High confidence (>= 0.85) candidate found (auto-selected for user confirmation).
 *    - 'candidates': 1..5 candidates found (user manually selects candidate).
 *    - 'manual': No candidates meet the minimum threshold (user enters metadata manually).
 */
export async function resolveMetadata(
  storagePath: string,
  fileName: string,
  userId: string
): Promise<MetadataResult> {
  // 1. Validate storage path convention and user prefix
  validateStoragePath(storagePath, userId);

  // 2. Retrieve PDF file buffer from Supabase Storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from(PAPERS_BUCKET)
    .download(storagePath);

  if (downloadError || !fileData) {
    throw new FileAssetError(
      downloadError?.message || 'Failed to download PDF from storage for metadata resolution',
      400
    );
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer());

  // 3. Attempt DOI extraction from the PDF text (first 2 pages)
  const extractedDoi = await extractDoiFromPdfBuffer(pdfBuffer);

  if (extractedDoi) {
    // 4a. CrossRef lookup by DOI
    let candidate = await crossRefProvider.lookupByDoi(extractedDoi);

    // 4b. OpenAlex fallback by DOI
    if (!candidate) {
      candidate = await openAlexProvider.lookupByDoi(extractedDoi);
    }

    if (candidate) {
      // High confidence direct DOI match
      return {
        status: 'resolved',
        paper: {
          ...candidate,
          confidence: Math.max(candidate.confidence, 0.95),
        },
      };
    }
  }

  // 5. Fallback Search by clean title derived from fileName
  const cleanQuery = cleanFileNameToQuery(fileName);
  if (!cleanQuery) {
    return { status: 'manual' };
  }

  const [crossRefResults, openAlexResults] = await Promise.all([
    crossRefProvider.search(cleanQuery, 4),
    openAlexProvider.search(cleanQuery, 4),
  ]);

  const allCandidates = [...crossRefResults, ...openAlexResults];
  const ranked = deduplicateAndRank(allCandidates, cleanQuery);
  const eligible = ranked.filter((c) => c.confidence >= MIN_CANDIDATE_CONFIDENCE);

  if (eligible.length === 0) {
    return { status: 'manual' };
  }

  const topCandidate = eligible[0];
  if (topCandidate.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return {
      status: 'resolved',
      paper: topCandidate,
      candidates: eligible.slice(1, 4),
    };
  }

  return {
    status: 'candidates',
    candidates: eligible.slice(0, 5),
  };
}
