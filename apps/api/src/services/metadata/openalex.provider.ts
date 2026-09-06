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
}

export const openAlexProvider = new OpenAlexProvider();
