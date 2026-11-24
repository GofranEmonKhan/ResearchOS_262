import { supabaseAdmin } from '../supabase.js';
import {
  Paper,
  CreatePaperDto,
  UpdatePaperDto,
  PaperSearchParams,
  ReadingStatus,
  READING_STATUSES,
} from '@researchos/shared-types';
import { createFileAsset, deleteFileAsset, deleteStorageObject } from './fileAsset.service.js';
import { normalizeDoi } from './metadata/types.js';
import { createAuditLog } from './audit.service.js';

export class PaperError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'PaperError';
    this.statusCode = statusCode;
  }
}

/**
 * Maps database snake_case row to camelCase Paper contract
 */
export function mapDbPaperToPaper(row: any): Paper {
  return {
    id: row.id,
    uploaderId: row.uploader_id,
    projectId: row.project_id || null,
    title: row.title,
    authors: row.authors || [],
    year: row.year ?? null,
    doi: row.doi || null,
    venue: row.venue || null,
    fileAssetId: row.file_asset_id,
    readingStatus: row.reading_status as ReadingStatus,
    isRequiredReading: Boolean(row.is_required_reading),
    assignedBySupervisorId: row.assigned_by_supervisor_id || null,
    linkedTaskId: row.linked_task_id || null,
    metadataSource: row.metadata_source || 'user',
    metadataConfidence: Number(row.metadata_confidence ?? 0),
    metadataLastRefreshedAt: row.metadata_last_refreshed_at || null,
    createdAt: row.created_at,
    uploader: row.profiles
      ? {
          id: row.profiles.id,
          fullName: row.profiles.full_name,
          photoUrl: row.profiles.photo_url,
          role: row.profiles.role,
        }
      : undefined,
    fileAsset: row.file_assets
      ? {
          id: row.file_assets.id,
          storagePath: row.file_assets.storage_path,
          fileName: row.file_assets.file_name,
          mimeType: row.file_assets.mime_type,
          sizeBytes: Number(row.file_assets.size_bytes),
        }
      : undefined,
    collections: Array.isArray(row.paper_collections)
      ? row.paper_collections.map((pc: any) => pc.collections).filter(Boolean)
      : undefined,
  };
}

/**
 * Creates a new Paper with associated FileAsset.
 * Rolls back storage upload if database creation fails.
 */
export async function createPaper(dto: CreatePaperDto, uploaderId: string): Promise<Paper> {
  const trimmedTitle = dto.title?.trim();
  if (!trimmedTitle) {
    throw new PaperError('Title is required', 400);
  }

  const normalizedDoi = dto.doi ? normalizeDoi(dto.doi) : null;

  // Check duplicate DOI in user's library
  if (normalizedDoi) {
    const { data: existing } = await supabaseAdmin
      .from('papers')
      .select('id')
      .eq('uploader_id', uploaderId)
      .eq('doi', normalizedDoi)
      .maybeSingle();

    if (existing) {
      await deleteStorageObject(dto.storagePath);
      throw new PaperError('A paper with this DOI already exists in your library', 409);
    }
  }

  let fileAsset;
  try {
    fileAsset = await createFileAsset(
      uploaderId,
      dto.storagePath,
      dto.fileName,
      dto.mimeType,
      dto.sizeBytes
    );
  } catch (err: any) {
    // If fileAsset creation failed, clean up uploaded file in storage
    await deleteStorageObject(dto.storagePath);
    throw err;
  }

  try {
    const { data: newRow, error } = await supabaseAdmin
      .from('papers')
      .insert({
        uploader_id: uploaderId,
        title: trimmedTitle,
        authors: dto.authors || [],
        year: dto.year ?? null,
        doi: normalizedDoi,
        venue: dto.venue?.trim() || null,
        file_asset_id: fileAsset.id,
        reading_status: 'Unread',
        is_required_reading: false,
        metadata_source: dto.metadataSource || 'user',
        metadata_confidence: dto.metadataConfidence ?? 0,
        metadata_last_refreshed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select('*, profiles:uploader_id(*), file_assets:file_asset_id(*)')
      .single();

    if (error || !newRow) {
      throw new PaperError(error?.message || 'Failed to create paper record', 500);
    }

    await createAuditLog({
      actorId: uploaderId,
      action: 'create_paper',
      targetType: 'paper',
      targetId: newRow.id,
      metadata: { title: trimmedTitle, doi: normalizedDoi },
    });

    return mapDbPaperToPaper(newRow);
  } catch (err: any) {
    // Rollback: delete fileAsset (which also deletes storage object)
    if (fileAsset) {
      await deleteFileAsset(fileAsset.id);
    }
    throw err;
  }
}

/**
 * Retrieves a single paper by ID, validating viewer authorization
 */
export async function getPaperById(paperId: string): Promise<Paper | null> {
  const { data: row, error } = await supabaseAdmin
    .from('papers')
    .select('*, profiles:uploader_id(*), file_assets:file_asset_id(*), paper_collections(collections(*))')
    .eq('id', paperId)
    .single();

  if (error || !row) {
    return null;
  }

  return mapDbPaperToPaper(row);
}

/**
 * Lists papers accessible to the requester (personal + shared project papers)
 * Supports full metadata search, status filters, collection filters, and pagination.
 */
export async function listPapers(
  params: PaperSearchParams,
  requesterId: string
): Promise<{ papers: Paper[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  // Build query
  let query = supabaseAdmin
    .from('papers')
    .select('*, profiles:uploader_id(*), file_assets:file_asset_id(*), paper_collections(collections(*))', {
      count: 'exact',
    });

  // Project filter or default accessible scope
  if (params.projectId) {
    query = query.eq('project_id', params.projectId);
  } else {
    // Fetch projects where user is owner or member
    const { data: ownedProjects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('owner_id', requesterId);

    const { data: memberProjects } = await supabaseAdmin
      .from('project_members')
      .select('project_id')
      .eq('user_id', requesterId);

    const projectIds = [
      ...(ownedProjects || []).map((p) => p.id),
      ...(memberProjects || []).map((m) => m.project_id),
    ];

    if (projectIds.length > 0) {
      query = query.or(`uploader_id.eq.${requesterId},project_id.in.(${projectIds.join(',')})`);
    } else {
      query = query.eq('uploader_id', requesterId);
    }
  }

  // Reading status filter
  if (params.readingStatus) {
    query = query.eq('reading_status', params.readingStatus);
  }

  // Required reading filter
  if (typeof params.isRequiredReading === 'boolean') {
    query = query.eq('is_required_reading', params.isRequiredReading);
  }

  // Year filter
  if (params.year) {
    query = query.eq('year', params.year);
  }

  // Full-text metadata search (Title, Venue, Authors)
  if (params.q && params.q.trim()) {
    const searchTerm = params.q.trim();
    // Use tsvector search matching with websearch
    query = query.textSearch('search_vector', searchTerm, {
      type: 'websearch',
      config: 'english',
    });
  }

  // Pagination & ordering
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data: rows, error, count } = await query;

  if (error) {
    throw new PaperError(error.message, 500);
  }

  let papers = (rows || []).map(mapDbPaperToPaper);

  // If filtered by collection, filter in-memory if join filtering isn't nested
  if (params.collectionId) {
    const { data: collectionPaperIds } = await supabaseAdmin
      .from('paper_collections')
      .select('paper_id')
      .eq('collection_id', params.collectionId);

    const allowedIds = new Set((collectionPaperIds || []).map((cp) => cp.paper_id));
    papers = papers.filter((p) => allowedIds.has(p.id));
  }

  return {
    papers,
    total: count ?? papers.length,
    page,
    limit,
  };
}

/**
 * Updates paper attributes.
 * - Any authorized viewer can update readingStatus (bidirectional).
 * - Only the original uploader can update metadata (title, authors, year, doi, venue).
 */
export async function updatePaper(
  paperId: string,
  dto: UpdatePaperDto,
  actingUserId: string
): Promise<Paper> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  const updates: Record<string, any> = {};

  // 1. Reading status change (Authorized viewer allowed)
  if (dto.readingStatus !== undefined) {
    if (!READING_STATUSES[dto.readingStatus]) {
      throw new PaperError(`Invalid reading status: ${dto.readingStatus}`, 400);
    }
    updates.reading_status = dto.readingStatus;
  }

  // 2. Metadata changes (Uploader only)
  const hasMetadataChanges =
    dto.title !== undefined ||
    dto.authors !== undefined ||
    dto.year !== undefined ||
    dto.doi !== undefined ||
    dto.venue !== undefined;

  if (hasMetadataChanges) {
    if (paper.uploaderId !== actingUserId) {
      throw new PaperError('Only the original uploader can edit paper metadata', 403);
    }

    if (dto.title !== undefined) {
      const trimmed = dto.title.trim();
      if (!trimmed) throw new PaperError('Title cannot be empty', 400);
      updates.title = trimmed;
    }

    if (dto.authors !== undefined) {
      updates.authors = dto.authors;
    }

    if (dto.year !== undefined) {
      updates.year = dto.year;
    }

    if (dto.doi !== undefined) {
      updates.doi = dto.doi ? normalizeDoi(dto.doi) : null;
    }

    if (dto.venue !== undefined) {
      updates.venue = dto.venue ? dto.venue.trim() : null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return paper;
  }

  const { data: updatedRow, error } = await supabaseAdmin
    .from('papers')
    .update(updates)
    .eq('id', paperId)
    .select('*, profiles:uploader_id(*), file_assets:file_asset_id(*), paper_collections(collections(*))')
    .single();

  if (error || !updatedRow) {
    throw new PaperError(error?.message || 'Failed to update paper', 500);
  }

  await createAuditLog({
    actorId: actingUserId,
    action: 'update_paper',
    targetType: 'paper',
    targetId: paperId,
    metadata: updates,
  });

  return mapDbPaperToPaper(updatedRow);
}

/**
 * Shares a personal paper with a collaborative project.
 * Only the original uploader can share, and uploader must be an active project member.
 */
export async function sharePaperWithProject(
  paperId: string,
  projectId: string,
  actingUserId: string
): Promise<Paper> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  if (paper.uploaderId !== actingUserId) {
    throw new PaperError('Only the original uploader can share this paper', 403);
  }

  // Verify acting user is member or owner of destination project
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();

  if (!project) {
    throw new PaperError('Destination project not found', 404);
  }

  const isOwner = project.owner_id === actingUserId;
  const { data: member } = await supabaseAdmin
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', actingUserId)
    .maybeSingle();

  if (!isOwner && !member) {
    throw new PaperError('You can only share papers with projects you belong to', 403);
  }

  const { data: updatedRow, error } = await supabaseAdmin
    .from('papers')
    .update({ project_id: projectId })
    .eq('id', paperId)
    .select('*, profiles:uploader_id(*), file_assets:file_asset_id(*), paper_collections(collections(*))')
    .single();

  if (error || !updatedRow) {
    throw new PaperError(error?.message || 'Failed to share paper with project', 500);
  }

  await createAuditLog({
    actorId: actingUserId,
    action: 'share_paper',
    targetType: 'paper',
    targetId: paperId,
    metadata: { projectId },
  });

  return mapDbPaperToPaper(updatedRow);
}

/**
 * Marks a paper as Required Reading or clears required reading.
 * Requires Supervisor or CoSupervisor authorization on the shared project.
 */
export async function setRequiredReading(
  paperId: string,
  isRequired: boolean,
  linkedTaskId: string | null | undefined,
  supervisorId: string
): Promise<Paper> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  if (!paper.projectId) {
    throw new PaperError('Cannot set required reading on an unshared personal paper', 400);
  }

  // If task link provided, verify task belongs to the same project
  if (linkedTaskId) {
    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('id, project_id')
      .eq('id', linkedTaskId)
      .single();

    if (!task || task.project_id !== paper.projectId) {
      throw new PaperError('Linked task does not belong to the paper project', 400);
    }
  }

  const updates = {
    is_required_reading: isRequired,
    assigned_by_supervisor_id: isRequired ? supervisorId : null,
    linked_task_id: isRequired ? linkedTaskId || null : null,
  };

  const { data: updatedRow, error } = await supabaseAdmin
    .from('papers')
    .update(updates)
    .eq('id', paperId)
    .select('*, profiles:uploader_id(*), file_assets:file_asset_id(*), paper_collections(collections(*))')
    .single();

  if (error || !updatedRow) {
    throw new PaperError(error?.message || 'Failed to update required reading', 500);
  }

  await createAuditLog({
    actorId: supervisorId,
    action: isRequired ? 'set_required_reading' : 'clear_required_reading',
    targetType: 'paper',
    targetId: paperId,
    metadata: updates,
  });

  return mapDbPaperToPaper(updatedRow);
}

/**
 * Permanently deletes a paper, its database records (cascading),
 * and its underlying Supabase Storage PDF asset.
 */
export async function deletePaper(paperId: string, actingUserId: string): Promise<void> {
  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  if (paper.uploaderId !== actingUserId) {
    throw new PaperError('Only the original uploader can delete this paper', 403);
  }

  // 1. Delete paper row from database (cascades to annotations, comments, sidebar, etc.)
  const { error: deleteError } = await supabaseAdmin.from('papers').delete().eq('id', paperId);
  if (deleteError) {
    throw new PaperError(deleteError.message, 500);
  }

  // 2. Delete fileAsset and physical Storage object
  await deleteFileAsset(paper.fileAssetId, actingUserId);

  await createAuditLog({
    actorId: actingUserId,
    action: 'delete_paper',
    targetType: 'paper',
    targetId: paperId,
    metadata: { title: paper.title, fileAssetId: paper.fileAssetId },
  });
}
