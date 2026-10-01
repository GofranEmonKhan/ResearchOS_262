import { MetadataCandidate } from '@researchos/shared-types';
import { IMetadataProvider, normalizeDoi } from './types.js';

export class OpenAlexProvider implements IMetadataProvider {
  name = 'openalex' as const;
  private mailto: string;

  constructor() {
    this.mailto = process.env.CROSSREF_MAILTO || 'gofranemon@gmail.com';
  }

  private get headers(): Record<string, string> {
    return {
      'User-Agent': `ResearchOS/1.0 (mailto:${this.mailto})`,
      Accept: 'application/json',
    };
  }

  private mapWorkToCandidate(work: any, defaultConfidence = 0.80): MetadataCandidate {
    const authors: string[] = (work.authorships || [])
      .map((a: any) => a.author?.display_name?.trim())
      .filter((a: string | undefined): a is string => Boolean(a && a.length > 0));

    const year = work.publication_year ? Number(work.publication_year) : null;
    const doi = work.doi ? normalizeDoi(work.doi) : null;
    const title = (work.title || work.display_name || 'Untitled').trim();
    const venue =
      work.primary_location?.source?.display_name ||
      work.host_venue?.name ||
      null;

    return {
      title,
      authors,
      year,
      doi,
      venue: venue ? venue.trim() : null,
      source: 'openalex',
      confidence: defaultConfidence,
    };
  }

  /**
   * Look up exact work by normalized DOI from OpenAlex API
   */
  async lookupByDoi(rawDoi: string): Promise<MetadataCandidate | null> {
    const doi = normalizeDoi(rawDoi);
    if (!doi) return null;

    try {
      const url = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(this.mailto)}`;
      const response = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        return null;
      }

      const work: any = await response.json();
      if (!work || !work.id) return null;

      return this.mapWorkToCandidate(work, 0.92);
    } catch (err) {
      console.warn(`OpenAlex lookup error for DOI ${doi}:`, (err as Error).message);
      return null;
    }
  }

  /**
   * Search OpenAlex works by search query string
   */
  async search(query: string, limit = 5): Promise<MetadataCandidate[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(trimmed)}&per-page=${limit}&mailto=${encodeURIComponent(this.mailto)}`;
      const response = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        return [];
      }

      const json: any = await response.json();
      const results = json?.results;
      if (!Array.isArray(results)) return [];

      return results.map((work: any) => this.mapWorkToCandidate(work, 0.70));
    } catch (err) {
      console.warn(`OpenAlex search error for query "${trimmed}":`, (err as Error).message);
      return [];
    }
  }

  /**
   * Discovers rich academic papers matching a research topic for AI literature review.
   * Returns abstracts, citation metrics, DOIs, and Open Access URLs.
   */
  async searchDiscoveredWorks(
    query: string,
    limit = 10,
    yearRange?: { from?: number; to?: number }
  ): Promise<Array<{
    id: string;
    title: string;
    authors: string[];
    year: number | null;
    venue: string | null;
    doi: string | null;
    abstract: string | null;
    citationCount: number;
    isOpenAccess: boolean;
    pdfUrl?: string | null;
    landingPageUrl?: string | null;
  }>> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      let filterParam = '';
      if (yearRange?.from && yearRange?.to) {
        filterParam = `&filter=publication_year:${yearRange.from}-${yearRange.to}`;
      } else if (yearRange?.from) {
        filterParam = `&filter=from_publication_date:${yearRange.from}-01-01`;
      } else if (yearRange?.to) {
        filterParam = `&filter=to_publication_date:${yearRange.to}-12-31`;
      }

      const clampedLimit = Math.min(Math.max(1, limit), 20);
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(trimmed)}&per-page=${clampedLimit}&sort=relevance_score:desc${filterParam}&mailto=${encodeURIComponent(this.mailto)}`;

      const response = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        console.warn(`OpenAlex searchDiscoveredWorks returned status ${response.status}`);
        return [];
      }

      const json: any = await response.json();
      const results = json?.results;
      if (!Array.isArray(results)) return [];

      return results.map((work: any) => {
        const authors: string[] = (work.authorships || [])
          .map((a: any) => a.author?.display_name?.trim())
          .filter((a: string | undefined): a is string => Boolean(a && a.length > 0));

        const year = work.publication_year ? Number(work.publication_year) : null;
        const doi = work.doi ? normalizeDoi(work.doi) : null;
        const title = (work.title || work.display_name || 'Untitled').trim();
        const venue =
          work.primary_location?.source?.display_name ||
          work.host_venue?.name ||
          null;

        const abstract = reconstructAbstract(work.abstract_inverted_index);
        const citationCount = Number(work.cited_by_count || 0);
        const isOpenAccess = Boolean(work.open_access?.is_oa);
        const pdfUrl = work.open_access?.oa_url || work.primary_location?.pdf_url || null;
        const landingPageUrl = work.primary_location?.landing_page_url || work.doi || null;

        return {
          id: work.id || doi || `work-${Math.random().toString(36).slice(2, 9)}`,
          title,
          authors,
          year,
          venue: venue ? venue.trim() : null,
          doi,
          abstract,
          citationCount,
          isOpenAccess,
          pdfUrl,
          landingPageUrl,
        };
      });
    } catch (err) {
      console.warn(`OpenAlex discovery error for query "${trimmed}":`, (err as Error).message);
      return [];
    }
  }
}

/**
 * Reconstructs a readable abstract string from OpenAlex's abstract_inverted_index representation.
 */
export function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string | null {
  if (!invertedIndex || typeof invertedIndex !== 'object') return null;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (Array.isArray(positions)) {
      for (const pos of positions) {
        words[pos] = word;
      }
    }
  }
  const joined = words.filter(Boolean).join(' ').trim();
  return joined.length > 0 ? joined : null;
}

export const openAlexProvider = new OpenAlexProvider();

