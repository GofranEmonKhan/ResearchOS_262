import { supabaseAdmin } from '../supabase.js';
import {
  ManuscriptCitation,
  InsertCitationDto,
  WhyDidICiteThisContext,
  Paper,
} from '@researchos/shared-types';

export class CitationService {
  /**
   * Insert a citation into a manuscript
   */
  static async insertCitation(
    manuscriptId: string,
    userId: string,
    dto: InsertCitationDto
  ): Promise<ManuscriptCitation> {
    if (!dto.citationKey || !dto.citationKey.trim()) {
      throw new Error('Citation key is required (e.g. vaswani2017attention)');
    }

    if (!dto.paperId) {
      throw new Error('Linked paper ID is required');
    }

    // Verify paper exists
    const { data: paper, error: paperErr } = await supabaseAdmin
      .from('papers')
      .select('id, title, authors, year, venue, doi')
      .eq('id', dto.paperId)
      .single();

    if (paperErr || !paper) {
      throw new Error('Selected paper was not found in literature database');
    }

    // Check duplicate citation key in this manuscript
    const { data: existing } = await supabaseAdmin
      .from('manuscript_citations')
      .select('id')
      .eq('manuscript_id', manuscriptId)
      .eq('citation_key', dto.citationKey.trim())
      .maybeSingle();

    if (existing) {
      throw new Error(`Citation key '${dto.citationKey.trim()}' already exists in this manuscript`);
    }

    const { data: citation, error } = await supabaseAdmin
      .from('manuscript_citations')
      .insert({
        manuscript_id: manuscriptId,
        section_id: dto.sectionId || null,
        paper_id: dto.paperId,
        citation_key: dto.citationKey.trim(),
        in_text_label: dto.inTextLabel || null,
        context_note: dto.contextNote || null,
        created_by: userId,
      })
      .select('*, paper:paper_id(id, title, authors, year, venue, doi), creator:created_by(id, full_name, photo_url)')
      .single();

    if (error || !citation) {
      throw new Error(`Failed to insert citation: ${error?.message}`);
    }

    // Log revision
    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      section_id: dto.sectionId || null,
      actor_id: userId,
      action: 'CitationInserted',
      details: { citationKey: dto.citationKey.trim(), paperTitle: paper.title },
    });

    return {
      id: citation.id,
      manuscriptId: citation.manuscript_id,
      sectionId: citation.section_id,
      paperId: citation.paper_id,
      citationKey: citation.citation_key,
      inTextLabel: citation.in_text_label,
      contextNote: citation.context_note,
      createdBy: citation.created_by,
      createdAt: citation.created_at,
      paper: citation.paper,
      creator: citation.creator ? {
        id: citation.creator.id,
        fullName: citation.creator.full_name,
        photoUrl: citation.creator.photo_url,
      } : null,
    };
  }

  /**
   * Remove a citation from a manuscript
   */
  static async removeCitation(
    citationId: string,
    manuscriptId: string,
    userId: string
  ): Promise<void> {
    const { data: citation } = await supabaseAdmin
      .from('manuscript_citations')
      .select('citation_key')
      .eq('id', citationId)
      .eq('manuscript_id', manuscriptId)
      .single();

    const { error } = await supabaseAdmin
      .from('manuscript_citations')
      .delete()
      .eq('id', citationId)
      .eq('manuscript_id', manuscriptId);

    if (error) {
      throw new Error(`Failed to remove citation: ${error.message}`);
    }

    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: userId,
      action: 'CitationRemoved',
      details: { citationKey: citation?.citation_key },
    });
  }

  /**
   * Get "Why Did I Cite This?" Context with Option A Dynamic Masking
   */
  static async getWhyDidICiteThisContext(
    manuscriptId: string,
    citationKey: string,
    requestingUserId: string
  ): Promise<WhyDidICiteThisContext> {
    const cleanKey = citationKey.replace(/^\[@|\]$/g, '');
    const bracketedKey = `[@${cleanKey}]`;

    const { data: citation, error: citErr } = await supabaseAdmin
      .from('manuscript_citations')
      .select('*')
      .eq('manuscript_id', manuscriptId)
      .or(`citation_key.eq."${cleanKey}",citation_key.eq."${bracketedKey}"`)
      .limit(1)
      .maybeSingle();

    if (citErr || !citation) {
      throw new Error(`Citation '${citationKey}' not found in manuscript`);
    }

    const { data: paper, error: paperErr } = await supabaseAdmin
      .from('papers')
      .select('*')
      .eq('id', citation.paper_id)
      .single();

    if (paperErr || !paper) {
      throw new Error(`Linked paper for citation '${citationKey}' not found`);
    }

    // Fetch Paper Highlights / Annotations
    const { data: annotations } = await supabaseAdmin
      .from('paper_annotations')
      .select('id, page, highlighted_text, sticky_note')
      .eq('paper_id', paper.id)
      .limit(20);

    const highlights = (annotations || []).map((a: any) => ({
      id: a.id,
      page: a.page,
      highlightedText: a.highlighted_text,
      stickyNote: a.sticky_note,
    }));

    // Fetch Sidebar Fields
    const { data: sidebar } = await supabaseAdmin
      .from('paper_sidebar_fields')
      .select('*')
      .eq('paper_id', paper.id)
      .maybeSingle();

    let sidebarSummary = null;
    let isMaskedNote = false;

    if (sidebar) {
      // Check privacy for personal notes
      const isUploader = paper.uploader_id === requestingUserId;
      const isVisible = Boolean(sidebar.personal_notes_visible);

      let personalNotes: string | null = sidebar.personal_notes || null;
      if (!isUploader && !isVisible) {
        personalNotes = null;
        isMaskedNote = true;
      }

      sidebarSummary = {
        researchGap: sidebar.research_gap || null,
        methodology: sidebar.methodology || null,
        results: sidebar.results || null,
        limitations: sidebar.limitation || null,
        personalNotes,
      };
    }

    return {
      citationKey: citation.citation_key,
      inTextLabel: citation.in_text_label,
      contextNote: citation.context_note,
      paper: {
        id: paper.id,
        title: paper.title,
        authors: paper.authors || [],
        year: paper.year,
        venue: paper.venue,
        doi: paper.doi,
      },
      highlights,
      sidebarSummary,
      isMaskedNote,
    };
  }

  /**
   * Search literature papers for citation picker
   */
  static async searchLiteratureForCitation(
    projectId: string,
    query: string = ''
  ): Promise<Partial<Paper>[]> {
    let q = supabaseAdmin
      .from('papers')
      .select('id, title, authors, year, venue, doi, reading_status')
      .or(`project_id.eq.${projectId},project_id.is.null`)
      .limit(30);

    if (query && query.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`title.ilike.${term},venue.ilike.${term}`);
    }

    const { data, error } = await q;
    if (error) {
      throw new Error(`Failed to search literature: ${error.message}`);
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      authors: p.authors || [],
      year: p.year,
      venue: p.venue,
      doi: p.doi,
      readingStatus: p.reading_status,
    }));
  }
}
