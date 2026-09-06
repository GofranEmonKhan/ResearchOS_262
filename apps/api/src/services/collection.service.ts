import { supabaseAdmin } from '../supabase.js';
import { Collection, CreateCollectionDto, UpdateCollectionDto } from '@researchos/shared-types';
import { getPaperById, PaperError } from './paper.service.js';
import { createAuditLog } from './audit.service.js';

export function mapDbCollectionToCollection(row: any, paperCount: number = 0): Collection {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    colorHex: row.color_hex,
    paperCount,
  };
}

/**
 * Creates a new personal collection
 */
export async function createCollection(
  ownerId: string,
  dto: CreateCollectionDto
): Promise<Collection> {
  const trimmedName = dto.name?.trim();
  if (!trimmedName) {
    throw new PaperError('Collection name is required', 400);
  }

  const colorHex = dto.colorHex?.trim() || '#4F46E5';
  if (!/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
    throw new PaperError('colorHex must be a valid 6-character hex color (e.g. #4F46E5)', 400);
  }

  const { data: newRow, error } = await supabaseAdmin
    .from('collections')
    .insert({
      owner_id: ownerId,
      name: trimmedName,
      color_hex: colorHex,
    })
    .select('*')
    .single();

  if (error || !newRow) {
    throw new PaperError(error?.message || 'Failed to create collection', 500);
  }

  await createAuditLog({
    actorId: ownerId,
    action: 'create_collection',
    targetType: 'collection',
    targetId: newRow.id,
    metadata: { name: trimmedName },
  });

  return mapDbCollectionToCollection(newRow, 0);
}

/**
 * Lists all collections belonging to the user, with paper counts
 */
export async function listCollections(ownerId: string): Promise<Collection[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('collections')
    .select('*, paper_collections(count)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new PaperError(error.message, 500);
  }

  return (rows || []).map((row: any) => {
    const paperCount = row.paper_collections?.[0]?.count ?? 0;
    return mapDbCollectionToCollection(row, paperCount);
  });
}

/**
 * Gets single collection by ID
 */
export async function getCollectionById(collectionId: string): Promise<Collection | null> {
  const { data: row, error } = await supabaseAdmin
    .from('collections')
    .select('*, paper_collections(count)')
    .eq('id', collectionId)
    .single();

  if (error || !row) return null;
  const paperCount = row.paper_collections?.[0]?.count ?? 0;
  return mapDbCollectionToCollection(row, paperCount);
}

/**
 * Updates a collection (Owner-only)
 */
export async function updateCollection(
  collectionId: string,
  ownerId: string,
  dto: UpdateCollectionDto
): Promise<Collection> {
  const collection = await getCollectionById(collectionId);
  if (!collection) {
    throw new PaperError('Collection not found', 404);
  }

  if (collection.ownerId !== ownerId) {
    throw new PaperError('Only the collection owner can modify this collection', 403);
  }

  const updates: Record<string, any> = {};

  if (dto.name !== undefined) {
    const trimmed = dto.name.trim();
    if (!trimmed) throw new PaperError('Collection name cannot be empty', 400);
    updates.name = trimmed;
  }

  if (dto.colorHex !== undefined) {
    const trimmed = dto.colorHex.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
      throw new PaperError('colorHex must be a valid 6-character hex color (e.g. #4F46E5)', 400);
    }
    updates.color_hex = trimmed;
  }

  if (Object.keys(updates).length === 0) {
    return collection;
  }

  const { data: updatedRow, error } = await supabaseAdmin
    .from('collections')
    .update(updates)
    .eq('id', collectionId)
    .select('*, paper_collections(count)')
    .single();

  if (error || !updatedRow) {
    throw new PaperError(error?.message || 'Failed to update collection', 500);
  }

  await createAuditLog({
    actorId: ownerId,
    action: 'update_collection',
    targetType: 'collection',
    targetId: collectionId,
    metadata: updates,
  });

  const count = updatedRow.paper_collections?.[0]?.count ?? collection.paperCount ?? 0;
  return mapDbCollectionToCollection(updatedRow, count);
}

/**
 * Deletes a collection (Owner-only).
 * Junction table rows are cascaded without deleting papers.
 */
export async function deleteCollection(collectionId: string, ownerId: string): Promise<void> {
  const collection = await getCollectionById(collectionId);
  if (!collection) {
    throw new PaperError('Collection not found', 404);
  }

  if (collection.ownerId !== ownerId) {
    throw new PaperError('Only the collection owner can delete this collection', 403);
  }

  const { error } = await supabaseAdmin.from('collections').delete().eq('id', collectionId);
  if (error) {
    throw new PaperError(error.message, 500);
  }

  await createAuditLog({
    actorId: ownerId,
    action: 'delete_collection',
    targetType: 'collection',
    targetId: collectionId,
    metadata: { name: collection.name },
  });
}

/**
 * Adds a paper to a collection.
 * Caller must own the collection.
 */
export async function addPaperToCollection(
  collectionId: string,
  paperId: string,
  ownerId: string
): Promise<void> {
  const collection = await getCollectionById(collectionId);
  if (!collection) {
    throw new PaperError('Collection not found', 404);
  }

  if (collection.ownerId !== ownerId) {
    throw new PaperError('Only the collection owner can add papers to this collection', 403);
  }

  const paper = await getPaperById(paperId);
  if (!paper) {
    throw new PaperError('Paper not found', 404);
  }

  const { error } = await supabaseAdmin
    .from('paper_collections')
    .upsert({ paper_id: paperId, collection_id: collectionId }, { onConflict: 'paper_id,collection_id' });

  if (error) {
    throw new PaperError(error.message, 500);
  }

  await createAuditLog({
    actorId: ownerId,
    action: 'add_paper_to_collection',
    targetType: 'collection',
    targetId: collectionId,
    metadata: { paperId, collectionId },
  });
}

/**
 * Removes a paper from a collection (Owner-only).
 */
export async function removePaperFromCollection(
  collectionId: string,
  paperId: string,
  ownerId: string
): Promise<void> {
  const collection = await getCollectionById(collectionId);
  if (!collection) {
    throw new PaperError('Collection not found', 404);
  }

  if (collection.ownerId !== ownerId) {
    throw new PaperError('Only the collection owner can remove papers from this collection', 403);
  }

  const { error } = await supabaseAdmin
    .from('paper_collections')
    .delete()
    .eq('collection_id', collectionId)
    .eq('paper_id', paperId);

  if (error) {
    throw new PaperError(error.message, 500);
  }

  await createAuditLog({
    actorId: ownerId,
    action: 'remove_paper_from_collection',
    targetType: 'collection',
    targetId: collectionId,
    metadata: { paperId, collectionId },
  });
}
