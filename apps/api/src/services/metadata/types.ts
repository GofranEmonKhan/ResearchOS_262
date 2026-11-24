import { MetadataCandidate, MetadataSource } from '@researchos/shared-types';

export interface IMetadataProvider {
  name: MetadataSource;
  lookupByDoi(doi: string): Promise<MetadataCandidate | null>;
  search(query: string, limit?: number): Promise<MetadataCandidate[]>;
}

export interface MatchQuery {
  title?: string;
  authors?: string[];
  year?: number;
  doi?: string;
}

/**
 * Normalizes DOI strings into canonical form (e.g. 10.1145/1234567).
 * Removes URL prefixes (https://doi.org/, http://dx.doi.org/), 'doi:', and trailing punctuation.
 */
export function normalizeDoi(rawDoi: string): string {
  if (!rawDoi || typeof rawDoi !== 'string') return '';
  let doi = rawDoi.trim();
  doi = doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  doi = doi.replace(/^doi:\s*/i, '');
  doi = doi.replace(/[.,;:/)\]]+$/, '').trim();
  return doi;
}

/**
 * Tokenizes and normalizes text for string similarity comparisons
 */
function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

/**
 * Calculates Jaccard similarity between two token sets
 */
function tokenJaccard(tokensA: Set<string>, tokensB: Set<string>): number {
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection++;
    }
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Calculates a confidence score between 0.0 and 1.0 for a metadata candidate.
 * Weighted:
 * - Exact DOI match: 0.98
 * - Title match: 60%
 * - Author overlap: 25%
 * - Publication year match: 15%
 */
export function calculateConfidence(query: MatchQuery, candidate: MetadataCandidate): number {
  // If DOI was queried and matches candidate DOI exactly
  if (query.doi && candidate.doi && normalizeDoi(query.doi).toLowerCase() === normalizeDoi(candidate.doi).toLowerCase()) {
    return 0.98;
  }

  let totalScore = 0;
  let totalWeight = 0;

  // 1. Title Similarity (Weight: 0.60)
  if (query.title && candidate.title) {
    const queryTokens = tokenize(query.title);
    const candidateTokens = tokenize(candidate.title);
    const titleSim = tokenJaccard(queryTokens, candidateTokens);
    totalScore += titleSim * 0.60;
    totalWeight += 0.60;
  }

  // 2. Author Overlap (Weight: 0.25)
  if (query.authors && query.authors.length > 0 && candidate.authors && candidate.authors.length > 0) {
    const queryAuthorTokens = new Set(query.authors.map((a) => a.toLowerCase().trim()));
    let authorMatches = 0;
    for (const candAuthor of candidate.authors) {
      const candLower = candAuthor.toLowerCase().trim();
      const hasMatch = Array.from(queryAuthorTokens).some(
        (qa) => candLower.includes(qa) || qa.includes(candLower)
      );
      if (hasMatch) authorMatches++;
    }
    const authorSim = authorMatches / Math.max(query.authors.length, 1);
    totalScore += Math.min(authorSim, 1.0) * 0.25;
    totalWeight += 0.25;
  }

  // 3. Year Match (Weight: 0.15)
  if (query.year && candidate.year) {
    const diff = Math.abs(query.year - candidate.year);
    let yearSim = 0;
    if (diff === 0) {
      yearSim = 1.0;
    } else if (diff === 1) {
      yearSim = 0.5;
    }
    totalScore += yearSim * 0.15;
    totalWeight += 0.15;
  }

  if (totalWeight === 0) {
    return candidate.confidence || 0.5;
  }

  const normalized = totalScore / totalWeight;
  return Math.min(1.0, Math.max(0.0, Number(normalized.toFixed(2))));
}
