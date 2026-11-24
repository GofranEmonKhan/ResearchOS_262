import { MetadataCandidate } from '@researchos/shared-types';
import { IMetadataProvider, normalizeDoi } from './types.js';

export class CrossRefProvider implements IMetadataProvider {
  name = 'crossref' as const;
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

  private mapItemToCandidate(item: any, defaultConfidence = 0.85): MetadataCandidate {
    const authors: string[] = (item.author || [])
      .map((a: any) => {
        if (a.name) return a.name.trim();
        const parts = [a.given, a.family].filter(Boolean);
        return parts.join(' ').trim();
      })
      .filter((a: string) => a.length > 0);

    const year =
      item.issued?.['date-parts']?.[0]?.[0] ||
      item.created?.['date-parts']?.[0]?.[0] ||
      null;

    const doi = item.DOI ? normalizeDoi(item.DOI) : null;
    const title = Array.isArray(item.title) ? item.title[0] || 'Untitled' : item.title || 'Untitled';
    const venue = item['container-title']?.[0] || null;

    return {
      title: title.trim(),
      authors,
      year: year ? Number(year) : null,
      doi,
      venue: venue ? venue.trim() : null,
      source: 'crossref',
      confidence: defaultConfidence,
    };
  }

  /**
   * Look up exact work by normalized DOI from CrossRef REST API
   */
  async lookupByDoi(rawDoi: string): Promise<MetadataCandidate | null> {
    const doi = normalizeDoi(rawDoi);
    if (!doi) return null;

    try {
      const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(this.mailto)}`;
      const response = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        return null;
      }

      const json: any = await response.json();
      const message = json?.message;
      if (!message) return null;

      return this.mapItemToCandidate(message, 0.95);
    } catch (err) {
      console.warn(`CrossRef lookup error for DOI ${doi}:`, (err as Error).message);
      return null;
    }
  }

  /**
   * Search CrossRef works by bibliographic query string
   */
  async search(query: string, limit = 5): Promise<MetadataCandidate[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(trimmed)}&rows=${limit}&mailto=${encodeURIComponent(this.mailto)}`;
      const response = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        return [];
      }

      const json: any = await response.json();
      const items = json?.message?.items;
      if (!Array.isArray(items)) return [];

      return items.map((item: any) => this.mapItemToCandidate(item, 0.75));
    } catch (err) {
      console.warn(`CrossRef search error for query "${trimmed}":`, (err as Error).message);
      return [];
    }
  }
}

export const crossRefProvider = new CrossRefProvider();
