import { supabaseAdmin } from '../supabase.js';
import {
  Manuscript,
  ManuscriptAuthor,
  ManuscriptSection,
  ManuscriptCitation,
  ManuscriptVersion,
  ManuscriptRevisionLog,
  ManuscriptChecklistItem,
  CreateManuscriptDto,
  UpdateManuscriptDto,
  AddManuscriptAuthorDto,
  UpdateManuscriptAuthorDto,
  TransitionManuscriptStatusDto,
  ManuscriptSearchParams,
  ManuscriptListResponse,
  ManuscriptStatus,
  ManuscriptSectionType,
} from '@researchos/shared-types';
import { createNotification } from './notification.service.js';

export class ManuscriptService {
  /**
   * Helper to count words in markdown/text
   */
  static countWords(text: string = ''): number {
    if (!text || !text.trim()) return 0;
    // Strip markdown formatting symbols roughly and split by whitespace
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // code blocks
      .replace(/`.*?`/g, '') // inline code
      .replace(/#+\s+/g, '') // headers
      .replace(/!\[.*?\]\(.*?\)/g, '') // images
      .replace(/\[.*?\]\(.*?\)/g, '$1') // links
      .replace(/[*_~>]/g, '') // formatting chars
      .trim();
    const words = cleanText.split(/\s+/).filter(Boolean);
    return words.length;
  }

  /**
   * Helper to map DB row to Manuscript entity
   */
  private static mapManuscript(row: any): Manuscript {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      abstract: row.abstract,
      targetVenue: row.target_venue,
      status: row.status as ManuscriptStatus,
      createdBy: row.created_by,
      supervisorId: row.supervisor_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      project: row.projects ? {
        id: row.projects.id,
        title: row.projects.title,
        status: row.projects.status,
      } : undefined,
      creator: row.creator ? {
        id: row.creator.id,
        fullName: row.creator.full_name,
        photoUrl: row.creator.photo_url,
        role: row.creator.role,
      } : undefined,
      supervisor: row.supervisor ? {
        id: row.supervisor.id,
        fullName: row.supervisor.full_name,
        photoUrl: row.supervisor.photo_url,
        role: row.supervisor.role,
      } : undefined,
    };
  }

  /**
   * Create a new manuscript in a project
   */
  static async createManuscript(userId: string, dto: CreateManuscriptDto): Promise<Manuscript> {
    if (!dto.title || !dto.title.trim()) {
      throw new Error('Manuscript title is required');
    }

    // Verify user is project member or owner
    const { data: project, error: projErr } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id')
      .eq('id', dto.projectId)
      .single();

    if (projErr || !project) {
      throw new Error('Project not found');
    }

    const isOwner = project.owner_id === userId;
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', dto.projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!isOwner && !member) {
      throw new Error('Access denied: You are not a member of this project');
    }

    // Insert manuscript
    const { data: manuscript, error: createErr } = await supabaseAdmin
      .from('manuscripts')
      .insert({
        project_id: dto.projectId,
        title: dto.title.trim(),
        abstract: dto.abstract || null,
        target_venue: dto.targetVenue || null,
        status: 'Draft',
        created_by: userId,
        supervisor_id: project.owner_id,
      })
      .select('*')
      .single();

    if (createErr || !manuscript) {
      throw new Error(`Failed to create manuscript: ${createErr?.message}`);
    }

    // Insert author(s)
    const authorsToInsert = [];
    if (dto.authors && dto.authors.length > 0) {
      for (const a of dto.authors) {
        authorsToInsert.push({
          manuscript_id: manuscript.id,
          user_id: a.userId,
          author_order: a.authorOrder,
          affiliation: a.affiliation || null,
          is_corresponding: Boolean(a.isCorresponding),
        });
      }
    } else {
      // Default: creator is 1st author
      authorsToInsert.push({
        manuscript_id: manuscript.id,
        user_id: userId,
        author_order: 1,
        affiliation: null,
        is_corresponding: true,
      });
    }

    await supabaseAdmin.from('manuscript_authors').insert(authorsToInsert);

    // Create default IMRAD sections if requested (or default true)
    if (dto.defaultSections !== false) {
      const defaultSectionsList: { title: string; section_type: ManuscriptSectionType; order_index: number }[] = [
        { title: 'Abstract', section_type: 'Abstract', order_index: 0 },
        { title: 'Introduction', section_type: 'Introduction', order_index: 1 },
        { title: 'Related Work', section_type: 'RelatedWork', order_index: 2 },
        { title: 'Methodology', section_type: 'Methodology', order_index: 3 },
        { title: 'Experiments', section_type: 'Experiments', order_index: 4 },
        { title: 'Results', section_type: 'Results', order_index: 5 },
        { title: 'Discussion', section_type: 'Discussion', order_index: 6 },
        { title: 'Conclusion', section_type: 'Conclusion', order_index: 7 },
      ];

      const sectionsToInsert = defaultSectionsList.map((s) => ({
        manuscript_id: manuscript.id,
        title: s.title,
        section_type: s.section_type,
        order_index: s.order_index,
        content_markdown: '',
        content_latex: '',
        word_count: 0,
        updated_by: userId,
      }));

      await supabaseAdmin.from('manuscript_sections').insert(sectionsToInsert);
    }

    // Create default submission checklist items
    const defaultChecklist = [
      { label: 'Ethics & Institutional Clearance', is_completed: false, is_locked: true, order_index: 0 },
      { label: 'Dataset & Source Code Availability Statement', is_completed: false, is_locked: false, order_index: 1 },
      { label: 'All Citations Verified in Literature Manager', is_completed: false, is_locked: false, order_index: 2 },
      { label: 'Supervisor Final Approval Granted', is_completed: false, is_locked: true, order_index: 3 },
    ];

    const checklistToInsert = defaultChecklist.map((c) => ({
      manuscript_id: manuscript.id,
      label: c.label,
      is_completed: c.is_completed,
      is_locked: c.is_locked,
      order_index: c.order_index,
    }));

    await supabaseAdmin.from('manuscript_checklist_items').insert(checklistToInsert);

    // Revision Log
    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscript.id,
      actor_id: userId,
      action: 'ManuscriptCreated',
      details: { title: manuscript.title },
    });

    return this.getManuscriptById(manuscript.id, userId);
  }

  /**
   * Get single manuscript with all joined data
   */
  static async getManuscriptById(manuscriptId: string, currentUserId: string): Promise<Manuscript> {
    const { data: row, error } = await supabaseAdmin
      .from('manuscripts')
      .select('*, projects:project_id(id, title, status), creator:created_by(id, full_name, photo_url, role), supervisor:supervisor_id(id, full_name, photo_url, role)')
      .eq('id', manuscriptId)
      .single();

    if (error || !row) {
      throw new Error('Manuscript not found');
    }

    const manuscript = this.mapManuscript(row);

    // Fetch Authors
    const { data: authors } = await supabaseAdmin
      .from('manuscript_authors')
      .select('*, user:user_id(id, full_name, photo_url, role, institution)')
      .eq('manuscript_id', manuscriptId)
      .order('author_order', { ascending: true });

    manuscript.authors = (authors || []).map((a: any) => ({
      id: a.id,
      manuscriptId: a.manuscript_id,
      userId: a.user_id,
      authorOrder: a.author_order,
      affiliation: a.affiliation,
      isCorresponding: a.is_corresponding,
      createdAt: a.created_at,
      user: a.user ? {
        id: a.user.id,
        fullName: a.user.full_name,
        photoUrl: a.user.photo_url,
        role: a.user.role,
        institution: a.user.institution,
      } : null,
    }));

    // Fetch Sections
    const { data: sections } = await supabaseAdmin
      .from('manuscript_sections')
      .select('*, updater:updated_by(id, full_name, photo_url)')
      .eq('manuscript_id', manuscriptId)
      .order('order_index', { ascending: true });

    manuscript.sections = (sections || []).map((s: any) => ({
      id: s.id,
      manuscriptId: s.manuscript_id,
      title: s.title,
      sectionType: s.section_type,
      orderIndex: s.order_index,
      contentMarkdown: s.content_markdown || '',
      contentLatex: s.content_latex || '',
      wordCount: s.word_count || 0,
      updatedBy: s.updated_by,
      updatedAt: s.updated_at,
      createdAt: s.created_at,
      updater: s.updater ? {
        id: s.updater.id,
        fullName: s.updater.full_name,
        photoUrl: s.updater.photo_url,
      } : null,
    }));

    // Calculate total word count
    manuscript.totalWordCount = manuscript.sections.reduce((acc, s) => acc + (s.wordCount || 0), 0);

    // Fetch Citations
    const { data: citations } = await supabaseAdmin
      .from('manuscript_citations')
      .select('*, paper:paper_id(id, title, authors, year, venue, doi), creator:created_by(id, full_name, photo_url)')
      .eq('manuscript_id', manuscriptId)
      .order('created_at', { ascending: true });

    manuscript.citations = (citations || []).map((c: any) => ({
      id: c.id,
      manuscriptId: c.manuscript_id,
      sectionId: c.section_id,
      paperId: c.paper_id,
      citationKey: c.citation_key,
      inTextLabel: c.in_text_label,
      contextNote: c.context_note,
      createdBy: c.created_by,
      createdAt: c.created_at,
      paper: c.paper,
      creator: c.creator ? {
        id: c.creator.id,
        fullName: c.creator.full_name,
        photoUrl: c.creator.photo_url,
      } : null,
    }));

    // Fetch Review Assignments
    const { data: assignments } = await supabaseAdmin
      .from('review_assignments')
      .select('*, reviewer:reviewer_id(id, full_name, photo_url, role, institution), assigner:assigned_by(id, full_name, photo_url)')
      .eq('manuscript_id', manuscriptId)
      .order('created_at', { ascending: true });

    manuscript.reviewAssignments = (assignments || []).map((ra: any) => ({
      id: ra.id,
      manuscriptId: ra.manuscript_id,
      reviewerId: ra.reviewer_id,
      assignedBy: ra.assigned_by,
      deadline: ra.deadline,
      status: ra.status,
      createdAt: ra.created_at,
      reviewer: ra.reviewer ? {
        id: ra.reviewer.id,
        fullName: ra.reviewer.full_name,
        photoUrl: ra.reviewer.photo_url,
        role: ra.reviewer.role,
        institution: ra.reviewer.institution,
      } : null,
      assigner: ra.assigner ? {
        id: ra.assigner.id,
        fullName: ra.assigner.full_name,
        photoUrl: ra.assigner.photo_url,
      } : null,
    }));

    // Fetch Review Comments
    const { data: comments } = await supabaseAdmin
      .from('review_comments')
      .select('*, reviewer:reviewer_id(id, full_name, photo_url, role), resolver:resolved_by(id, full_name, photo_url), section:section_id(id, title, order_index)')
      .eq('manuscript_id', manuscriptId)
      .order('created_at', { ascending: true });

    manuscript.comments = (comments || []).map((rc: any) => ({
      id: rc.id,
      manuscriptId: rc.manuscript_id,
      sectionId: rc.section_id,
      reviewerId: rc.reviewer_id,
      parentCommentId: rc.parent_comment_id,
      highlightedText: rc.highlighted_text,
      commentText: rc.comment_text,
      severity: rc.severity,
      status: rc.status,
      fixNote: rc.fix_note,
      resolvedBy: rc.resolved_by,
      resolvedAt: rc.resolved_at,
      createdAt: rc.created_at,
      updatedAt: rc.updated_at,
      reviewer: rc.reviewer ? {
        id: rc.reviewer.id,
        fullName: rc.reviewer.full_name,
        photoUrl: rc.reviewer.photo_url,
        role: rc.reviewer.role,
      } : null,
      resolver: rc.resolver ? {
        id: rc.resolver.id,
        fullName: rc.resolver.full_name,
        photoUrl: rc.resolver.photo_url,
      } : null,
      section: rc.section,
    }));

    manuscript.openCommentsCount = manuscript.comments.filter(
      (c) => c.status === 'Open' || c.status === 'Reopened' || c.status === 'FixedByResearcher'
    ).length;

    manuscript.unresolvedMajorCount = manuscript.comments.filter(
      (c) =>
        (c.severity === 'MajorScientific' || c.severity === 'CriticalFlaw') &&
        c.status !== 'Resolved'
    ).length;

    // Fetch Checklist Items
    const { data: checklist } = await supabaseAdmin
      .from('manuscript_checklist_items')
      .select('*, completedByUser:completed_by(id, full_name, photo_url)')
      .eq('manuscript_id', manuscriptId)
      .order('order_index', { ascending: true });

    manuscript.checklistItems = (checklist || []).map((ci: any) => ({
      id: ci.id,
      manuscriptId: ci.manuscript_id,
      label: ci.label,
      isCompleted: ci.is_completed,
      completedBy: ci.completed_by,
      completedAt: ci.completed_at,
      isLocked: ci.is_locked,
      orderIndex: ci.order_index,
      createdAt: ci.created_at,
      completedByUser: ci.completedByUser ? {
        id: ci.completedByUser.id,
        fullName: ci.completedByUser.full_name,
        photoUrl: ci.completedByUser.photo_url,
      } : null,
    }));

    return manuscript;
  }

  /**
   * List manuscripts accessible by the user
   */
  static async listManuscripts(
    userId: string,
    params: ManuscriptSearchParams
  ): Promise<ManuscriptListResponse> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('manuscripts')
      .select('*, projects:project_id(id, title, status), creator:created_by(id, full_name, photo_url, role)', { count: 'exact' });

    if (params.projectId) {
      query = query.eq('project_id', params.projectId);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      query = query.or(`title.ilike.${term},abstract.ilike.${term},target_venue.ilike.${term}`);
    }

    query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: rows, count, error } = await query;
    if (error) {
      throw new Error(`Failed to list manuscripts: ${error.message}`);
    }

    const total = count || 0;
    const manuscripts = (rows || []).map(this.mapManuscript);

    return {
      manuscripts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Update manuscript metadata
   */
  static async updateManuscript(
    manuscriptId: string,
    userId: string,
    dto: UpdateManuscriptDto
  ): Promise<Manuscript> {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.title !== undefined) updates.title = dto.title.trim();
    if (dto.abstract !== undefined) updates.abstract = dto.abstract;
    if (dto.targetVenue !== undefined) updates.target_venue = dto.targetVenue;

    const { error } = await supabaseAdmin
      .from('manuscripts')
      .update(updates)
      .eq('id', manuscriptId);

    if (error) {
      throw new Error(`Failed to update manuscript: ${error.message}`);
    }

    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: userId,
      action: 'ManuscriptMetadataUpdated',
      details: dto,
    });

    return this.getManuscriptById(manuscriptId, userId);
  }

  /**
   * Transition manuscript status through state machine
   */
  static async transitionManuscriptStatus(
    manuscriptId: string,
    userId: string,
    dto: TransitionManuscriptStatusDto
  ): Promise<Manuscript> {
    const current = await this.getManuscriptById(manuscriptId, userId);
    const fromStatus = current.status;
    const toStatus = dto.status;

    if (fromStatus === toStatus) {
      return current;
    }

    // Fetch user access roles
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', current.projectId)
      .single();

    const isSupervisor = project?.owner_id === userId || current.supervisorId === userId;
    const isAuthor = current.authors?.some((a) => a.userId === userId) || current.createdBy === userId;

    // Validate state transitions
    const validTransitions: Record<ManuscriptStatus, ManuscriptStatus[]> = {
      Draft: ['UnderInternalReview', 'Archived'],
      UnderInternalReview: ['Revising', 'ReadyForSubmission', 'Draft', 'Archived'],
      Revising: ['UnderInternalReview', 'ReadyForSubmission', 'Archived'],
      ReadyForSubmission: ['Submitted', 'Revising', 'Archived'],
      Submitted: ['Published', 'Revising', 'Archived'],
      Published: ['Archived'],
      Archived: ['Draft'],
    };

    if (!validTransitions[fromStatus]?.includes(toStatus)) {
      throw new Error(`Invalid status transition from '${fromStatus}' to '${toStatus}'`);
    }

    // Additional rules:
    // 1. ReadyForSubmission requires Supervisor role, checklist complete, and 0 unresolved major comments
    if (toStatus === 'ReadyForSubmission') {
      if (!isSupervisor) {
        throw new Error('Access denied: Only the project supervisor can mark a manuscript ReadyForSubmission');
      }

      // Check checklist items
      const incompleteChecklist = current.checklistItems?.filter((ci) => !ci.isCompleted);
      if (incompleteChecklist && incompleteChecklist.length > 0) {
        throw new Error(
          `Cannot mark ReadyForSubmission: ${incompleteChecklist.length} checklist item(s) are incomplete`
        );
      }

      // Check unresolved major / critical comments
      if (current.unresolvedMajorCount && current.unresolvedMajorCount > 0) {
        throw new Error(
          `Cannot mark ReadyForSubmission: There are ${current.unresolvedMajorCount} unresolved Major or Critical review comment(s)`
        );
      }
    }

    // 2. Archived requires Supervisor
    if (toStatus === 'Archived' && !isSupervisor) {
      throw new Error('Access denied: Only the project supervisor can archive a manuscript');
    }

    const { error: updateErr } = await supabaseAdmin
      .from('manuscripts')
      .update({
        status: toStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', manuscriptId);

    if (updateErr) {
      throw new Error(`Failed to update manuscript status: ${updateErr.message}`);
    }

    // Create revision log
    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: userId,
      action: 'StatusTransitioned',
      details: { fromStatus, toStatus, note: dto.note },
    });

    // Notify authors and supervisor
    const notifyUserIds = new Set<string>();
    current.authors?.forEach((a) => {
      if (a.userId !== userId) notifyUserIds.add(a.userId);
    });
    if (current.supervisorId && current.supervisorId !== userId) {
      notifyUserIds.add(current.supervisorId);
    }

    for (const recipientId of notifyUserIds) {
      await createNotification({
        userId: recipientId,
        type: 'ManuscriptStatusChanged',
        payload: {
          manuscriptId,
          manuscriptTitle: current.title,
          fromStatus,
          toStatus,
          actorId: userId,
        },
      });
    }

    return this.getManuscriptById(manuscriptId, userId);
  }

  /**
   * Add author to manuscript
   */
  static async addAuthor(
    manuscriptId: string,
    actorId: string,
    dto: AddManuscriptAuthorDto
  ): Promise<ManuscriptAuthor[]> {
    const { data: manuscript } = await supabaseAdmin
      .from('manuscripts')
      .select('project_id')
      .eq('id', manuscriptId)
      .single();

    if (!manuscript) throw new Error('Manuscript not found');

    // Author must be a member of the project or the project owner
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', manuscript.project_id)
      .single();

    const isProjectOwner = project?.owner_id === dto.userId;
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', manuscript.project_id)
      .eq('user_id', dto.userId)
      .maybeSingle();

    if (!isProjectOwner && !member) {
      throw new Error('Author must be a member of the project');
    }

    // Determine order
    let order = dto.authorOrder;
    if (!order) {
      const { count } = await supabaseAdmin
        .from('manuscript_authors')
        .select('*', { count: 'exact', head: true })
        .eq('manuscript_id', manuscriptId);
      order = (count || 0) + 1;
    }

    const { data: author, error } = await supabaseAdmin
      .from('manuscript_authors')
      .insert({
        manuscript_id: manuscriptId,
        user_id: dto.userId,
        author_order: order,
        affiliation: dto.affiliation || null,
        is_corresponding: Boolean(dto.isCorresponding),
      })
      .select('*, user:user_id(id, full_name, photo_url, role)')
      .single();

    if (error) {
      throw new Error(`Failed to add author: ${error.message}`);
    }

    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: actorId,
      action: 'AuthorAdded',
      details: { addedUserId: dto.userId, authorOrder: order },
    });

    const { data: allAuthors } = await supabaseAdmin
      .from('manuscript_authors')
      .select('*, user:user_id(id, full_name, photo_url, role)')
      .eq('manuscript_id', manuscriptId)
      .order('author_order', { ascending: true });

    return (allAuthors || []).map((a: any) => ({
      id: a.id,
      manuscriptId: a.manuscript_id,
      userId: a.user_id,
      authorOrder: a.author_order,
      affiliation: a.affiliation,
      isCorresponding: a.is_corresponding,
      createdAt: a.created_at,
      user: a.user,
    }));
  }

  /**
   * Remove author from manuscript
   */
  static async removeAuthor(
    manuscriptId: string,
    actorId: string,
    authorUserId: string
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('manuscript_authors')
      .delete()
      .eq('manuscript_id', manuscriptId)
      .eq('user_id', authorUserId);

    if (error) {
      throw new Error(`Failed to remove author: ${error.message}`);
    }

    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: actorId,
      action: 'AuthorRemoved',
      details: { removedUserId: authorUserId },
    });
  }

  /**
   * Create a frozen snapshot version
   */
  static async createSnapshotVersion(
    manuscriptId: string,
    userId: string,
    versionName: string
  ): Promise<ManuscriptVersion> {
    if (!versionName || !versionName.trim()) {
      throw new Error('Version name is required');
    }

    const manuscript = await this.getManuscriptById(manuscriptId, userId);

    // Get max version number
    const { data: versions } = await supabaseAdmin
      .from('manuscript_versions')
      .select('version_number')
      .eq('manuscript_id', manuscriptId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextNumber = (versions && versions[0] ? versions[0].version_number : 0) + 1;

    const snapshotData = {
      title: manuscript.title,
      abstract: manuscript.abstract,
      targetVenue: manuscript.targetVenue,
      status: manuscript.status,
      sections: (manuscript.sections || []).map((s) => ({
        title: s.title,
        sectionType: s.sectionType,
        orderIndex: s.orderIndex,
        contentMarkdown: s.contentMarkdown,
        contentLatex: s.contentLatex,
        wordCount: s.wordCount,
      })),
      authors: (manuscript.authors || []).map((a) => ({
        userId: a.userId,
        fullName: a.user?.fullName,
        authorOrder: a.authorOrder,
        affiliation: a.affiliation,
        isCorresponding: a.isCorresponding,
      })),
      citations: (manuscript.citations || []).map((c) => ({
        citationKey: c.citationKey,
        inTextLabel: c.inTextLabel,
        paperTitle: c.paper?.title,
        paperDoi: c.paper?.doi,
        contextNote: c.contextNote,
      })),
    };

    const { data: created, error } = await supabaseAdmin
      .from('manuscript_versions')
      .insert({
        manuscript_id: manuscriptId,
        version_number: nextNumber,
        version_name: versionName.trim(),
        snapshot_data: snapshotData,
        created_by: userId,
      })
      .select('*, creator:created_by(id, full_name, photo_url)')
      .single();

    if (error || !created) {
      throw new Error(`Failed to create version: ${error?.message}`);
    }

    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: userId,
      action: 'VersionSnapshotCreated',
      details: { versionNumber: nextNumber, versionName: versionName.trim() },
    });

    return {
      id: created.id,
      manuscriptId: created.manuscript_id,
      versionNumber: created.version_number,
      versionName: created.version_name,
      snapshotData: created.snapshot_data,
      createdBy: created.created_by,
      createdAt: created.created_at,
      creator: created.creator ? {
        id: created.creator.id,
        fullName: created.creator.full_name,
        photoUrl: created.creator.photo_url,
      } : null,
    };
  }

  /**
   * Get version history
   */
  static async getVersions(manuscriptId: string): Promise<ManuscriptVersion[]> {
    const { data: versions, error } = await supabaseAdmin
      .from('manuscript_versions')
      .select('*, creator:created_by(id, full_name, photo_url)')
      .eq('manuscript_id', manuscriptId)
      .order('version_number', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch versions: ${error.message}`);
    }

    return (versions || []).map((v: any) => ({
      id: v.id,
      manuscriptId: v.manuscript_id,
      versionNumber: v.version_number,
      versionName: v.version_name,
      snapshotData: v.snapshot_data,
      createdBy: v.created_by,
      createdAt: v.created_at,
      creator: v.creator ? {
        id: v.creator.id,
        fullName: v.creator.full_name,
        photoUrl: v.creator.photo_url,
      } : null,
    }));
  }

  /**
   * Restore a historical snapshot into current sections
   */
  static async restoreVersion(
    manuscriptId: string,
    userId: string,
    versionId: string
  ): Promise<Manuscript> {
    const { data: version, error: vErr } = await supabaseAdmin
      .from('manuscript_versions')
      .select('*')
      .eq('id', versionId)
      .eq('manuscript_id', manuscriptId)
      .single();

    if (vErr || !version) {
      throw new Error('Version snapshot not found');
    }

    const snapshot = version.snapshot_data;

    // Delete existing sections
    await supabaseAdmin.from('manuscript_sections').delete().eq('manuscript_id', manuscriptId);

    // Re-insert sections from snapshot
    if (snapshot.sections && snapshot.sections.length > 0) {
      const sectionsToInsert = snapshot.sections.map((s: any) => ({
        manuscript_id: manuscriptId,
        title: s.title,
        section_type: s.sectionType || 'Custom',
        order_index: s.orderIndex,
        content_markdown: s.contentMarkdown || '',
        content_latex: s.contentLatex || '',
        word_count: s.wordCount || 0,
        updated_by: userId,
      }));

      await supabaseAdmin.from('manuscript_sections').insert(sectionsToInsert);
    }

    // Update metadata if present
    await supabaseAdmin
      .from('manuscripts')
      .update({
        title: snapshot.title,
        abstract: snapshot.abstract || null,
        target_venue: snapshot.targetVenue || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', manuscriptId);

    await supabaseAdmin.from('manuscript_revision_logs').insert({
      manuscript_id: manuscriptId,
      actor_id: userId,
      action: 'VersionRestored',
      details: { versionNumber: version.version_number, versionName: version.version_name },
    });

    return this.getManuscriptById(manuscriptId, userId);
  }

  /**
   * Get revision logs
   */
  static async getRevisionLogs(manuscriptId: string): Promise<ManuscriptRevisionLog[]> {
    const { data: logs, error } = await supabaseAdmin
      .from('manuscript_revision_logs')
      .select('*, actor:actor_id(id, full_name, photo_url, role)')
      .eq('manuscript_id', manuscriptId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Failed to fetch revision logs: ${error.message}`);
    }

    return (logs || []).map((l: any) => ({
      id: l.id,
      manuscriptId: l.manuscript_id,
      sectionId: l.section_id,
      actorId: l.actor_id,
      action: l.action,
      details: l.details,
      createdAt: l.created_at,
      actor: l.actor ? {
        id: l.actor.id,
        fullName: l.actor.full_name,
        photoUrl: l.actor.photo_url,
        role: l.actor.role,
      } : null,
    }));
  }
}
