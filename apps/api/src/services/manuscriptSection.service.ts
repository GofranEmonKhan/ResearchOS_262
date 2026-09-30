import { supabaseAdmin } from '../supabase.js';
import {
  ManuscriptSection,
  CreateManuscriptSectionDto,
  UpdateManuscriptSectionDto,
  ReorderSectionsDto,
} from '@researchos/shared-types';
import { ManuscriptService } from './manuscript.service.js';

export class ManuscriptSectionService {
  /**
   * Helper to map DB row to ManuscriptSection
   */
  private static mapSection(row: any): ManuscriptSection {
    return {
      id: row.id,
      manuscriptId: row.manuscript_id,
      title: row.title,
      sectionType: row.section_type,
      orderIndex: row.order_index,
      contentMarkdown: row.content_markdown || '',
      contentLatex: row.content_latex || '',
      wordCount: row.word_count || 0,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      updater: row.updater ? {
        id: row.updater.id,
        fullName: row.updater.full_name,
        photoUrl: row.updater.photo_url,
      } : null,
    };
  }

  /**
   * Create a new section
   */
  static async createSection(
    manuscriptId: string,
    userId: string,
    dto: CreateManuscriptSectionDto
  ): Promise<ManuscriptSection> {
    if (!dto.title || !dto.title.trim()) {
      throw new Error('Section title is required');
    }

    let order = dto.orderIndex;
    if (order === undefined) {
      const { count } = await supabaseAdmin
        .from('manuscript_sections')
        .select('*', { count: 'exact', head: true })
        .eq('manuscript_id', manuscriptId);
      order = count || 0;
    }

    const wordCount = ManuscriptService.countWords(dto.contentMarkdown || dto.contentLatex || '');

    const { data: section, error } = await supabaseAdmin
      .from('manuscript_sections')
      .insert({
        manuscript_id: manuscriptId,
        title: dto.title.trim(),
        section_type: dto.sectionType || 'Custom',
        order_index: order,
        content_markdown: dto.contentMarkdown || '',
        content_latex: dto.contentLatex || '',
        word_count: wordCount,
        updated_by: userId,
      })
      .select('*, updater:updated_by(id, full_name, photo_url)')
      .single();

    if (error || !section) {
      throw new Error(`Failed to create section: ${error?.message}`);
    }

    // Touch manuscript updated_at
    await supabaseAdmin
      .from('manuscripts')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', manuscriptId);

    // Revision Log
    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      section_id: section.id,
      actor_id: userId,
      action: 'SectionCreated',
      details: { title: section.title, orderIndex: section.order_index },
    });

    return this.mapSection(section);
  }

  /**
   * Update/Autosave section content and recalculate word count
   */
  static async updateSection(
    sectionId: string,
    manuscriptId: string,
    userId: string,
    dto: UpdateManuscriptSectionDto
  ): Promise<ManuscriptSection> {
    const updates: Record<string, any> = {
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    if (dto.title !== undefined) updates.title = dto.title.trim();
    if (dto.sectionType !== undefined) updates.section_type = dto.sectionType;
    if (dto.orderIndex !== undefined) updates.order_index = dto.orderIndex;
    if (dto.contentMarkdown !== undefined) updates.content_markdown = dto.contentMarkdown;
    if (dto.contentLatex !== undefined) updates.content_latex = dto.contentLatex;

    if (dto.contentMarkdown !== undefined || dto.contentLatex !== undefined) {
      const textToCount = dto.contentMarkdown !== undefined ? dto.contentMarkdown : dto.contentLatex || '';
      updates.word_count = ManuscriptService.countWords(textToCount);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('manuscript_sections')
      .update(updates)
      .eq('id', sectionId)
      .eq('manuscript_id', manuscriptId)
      .select('*, updater:updated_by(id, full_name, photo_url)')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update section: ${error?.message}`);
    }

    // Touch manuscript updated_at
    await supabaseAdmin
      .from('manuscripts')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', manuscriptId);

    return this.mapSection(updated);
  }

  /**
   * Reorder multiple sections
   */
  static async reorderSections(
    manuscriptId: string,
    userId: string,
    dto: ReorderSectionsDto
  ): Promise<ManuscriptSection[]> {
    for (const item of dto.sectionOrders) {
      await supabaseAdmin
        .from('manuscript_sections')
        .update({
          order_index: item.orderIndex,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.sectionId)
        .eq('manuscript_id', manuscriptId);
    }

    await supabaseAdmin
      .from('manuscripts')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', manuscriptId);

    const { data: sections, error } = await supabaseAdmin
      .from('manuscript_sections')
      .select('*, updater:updated_by(id, full_name, photo_url)')
      .eq('manuscript_id', manuscriptId)
      .order('order_index', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch reordered sections: ${error.message}`);
    }

    return (sections || []).map(this.mapSection);
  }

  /**
   * Delete section
   */
  static async deleteSection(
    sectionId: string,
    manuscriptId: string,
    userId: string
  ): Promise<void> {
    const { data: section } = await supabaseAdmin
      .from('manuscript_sections')
      .select('title')
      .eq('id', sectionId)
      .eq('manuscript_id', manuscriptId)
      .single();

    const { error } = await supabaseAdmin
      .from('manuscript_sections')
      .delete()
      .eq('id', sectionId)
      .eq('manuscript_id', manuscriptId);

    if (error) {
      throw new Error(`Failed to delete section: ${error.message}`);
    }

    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: userId,
      action: 'SectionDeleted',
      details: { sectionId, title: section?.title },
    });
  }
}
