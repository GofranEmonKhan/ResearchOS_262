import { supabaseAdmin } from '../supabase.js';
import { FileAsset } from '@researchos/shared-types';
import { createAuditLog } from './audit.service.js';

export const PAPERS_BUCKET = 'papers';
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour
export const ALLOWED_MIME_TYPES = ['application/pdf'];

const STORAGE_PATH_REGEX = /^[a-f0-9-]+\/[a-f0-9-]+\.pdf$/i;

export class FileAssetError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'FileAssetError';
    this.statusCode = statusCode;
  }
}

/**
 * Maps database snake_case row to camelCase FileAsset contract
 */
export function mapDbFileAssetToFileAsset(row: any): FileAsset {
  return {
    id: row.id,
    ownerId: row.owner_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    createdAt: row.created_at,
  };
}

/**
 * Validates that the storage path follows the strict `{userId}/{uuid}.pdf` convention
 * and ensures the path is scoped to the authenticated user.
 */
export function validateStoragePath(storagePath: string, userId: string): void {
  if (!storagePath || typeof storagePath !== 'string') {
    throw new FileAssetError('Missing or invalid storagePath', 400);
  }

  if (!STORAGE_PATH_REGEX.test(storagePath)) {
    throw new FileAssetError(
      'Invalid storage path format. Must strictly be {userId}/{uuid}.pdf',
      400
    );
  }

  const [pathUserId] = storagePath.split('/');
  if (pathUserId !== userId) {
    throw new FileAssetError(
      'Storage path ownership mismatch: path prefix does not match authenticated user',
      403
    );
  }
}

/**
 * Validates file metadata (PDF format, mime type, and 50MB size limit)
 */
export function validatePdfMetadata(fileName: string, mimeType: string, sizeBytes: number): void {
  if (!fileName || !fileName.toLowerCase().endsWith('.pdf')) {
    throw new FileAssetError('Only PDF files (.pdf) are allowed', 400);
  }

  if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    throw new FileAssetError(`Invalid MIME type: ${mimeType}. Expected application/pdf`, 400);
  }

  if (typeof sizeBytes !== 'number' || sizeBytes <= 0) {
    throw new FileAssetError('Invalid file size: size must be greater than 0 bytes', 400);
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new FileAssetError(
      `File size exceeds limit of 50MB (received ${(sizeBytes / (1024 * 1024)).toFixed(2)}MB)`,
      400
    );
  }
}

/**
 * Creates a new FileAsset record in the database for an uploaded PDF.
 */
export async function createFileAsset(
  ownerId: string,
  storagePath: string,
  fileName: string,
  mimeType: string,
  sizeBytes: number
): Promise<FileAsset> {
  validateStoragePath(storagePath, ownerId);
  validatePdfMetadata(fileName, mimeType, sizeBytes);

  const { data: newRow, error } = await supabaseAdmin
    .from('file_assets')
    .insert({
      owner_id: ownerId,
      storage_path: storagePath,
      file_name: fileName.trim(),
      mime_type: mimeType.toLowerCase(),
      size_bytes: sizeBytes,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !newRow) {
    throw new FileAssetError(error?.message || 'Failed to create file asset record', 500);
  }

  await createAuditLog({
    actorId: ownerId,
    action: 'create_file_asset',
    targetType: 'file_asset',
    targetId: newRow.id,
    metadata: { fileName, sizeBytes, storagePath },
  });

  return mapDbFileAssetToFileAsset(newRow);
}

/**
 * Retrieves a FileAsset by ID
 */
export async function getFileAssetById(fileAssetId: string): Promise<FileAsset | null> {
  const { data: row, error } = await supabaseAdmin
    .from('file_assets')
    .select('*')
    .eq('id', fileAssetId)
    .single();

  if (error || !row) {
    return null;
  }

  return mapDbFileAssetToFileAsset(row);
}

/**
 * Generates a 1-hour signed download URL for an authorized paper viewer.
 * Enforces ownership and project membership boundaries:
 * - Admin role is explicitly denied paper content access (AC-18).
 * - Uploader is allowed.
 * - Project member / owner of shared project is allowed.
 * - All other users are rejected with 403 Forbidden.
 */
export async function getSignedUrl(
  fileAssetId: string,
  requesterId: string,
  requesterRole?: string
): Promise<{ signedUrl: string; url: string; fileName: string; expiresIn: number }> {
  // Spec 03 & AC-18: Admin cannot access paper content
  if (requesterRole === 'Admin') {
    throw new FileAssetError('Access denied: Admins cannot access paper content', 403);
  }

  const fileAsset = await getFileAssetById(fileAssetId);
  if (!fileAsset) {
    throw new FileAssetError('File asset not found', 404);
  }

  // Look up associated paper to verify authorization
  const { data: paper } = await supabaseAdmin
    .from('papers')
    .select('id, uploader_id, project_id')
    .eq('file_asset_id', fileAssetId)
    .maybeSingle();

  if (paper) {
    // 1. Direct uploader access
    if (paper.uploader_id === requesterId) {
      // Authorized
    } else if (paper.project_id) {
      // 2. Shared project member check
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', paper.project_id)
        .single();

      const isProjectOwner = project?.owner_id === requesterId;

      const { data: member } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('project_id', paper.project_id)
        .eq('user_id', requesterId)
        .maybeSingle();

      const isProjectMember = !!member;

      if (!isProjectOwner && !isProjectMember) {
        throw new FileAssetError(
          'Access denied: You do not have permission to view or download this paper',
          403
        );
      }
    } else {
      // Paper is private to uploader and requester is not uploader
      throw new FileAssetError(
        'Access denied: You do not have permission to view or download this paper',
        403
      );
    }
  } else {
    // Provisional/draft file asset not yet linked to a paper — owner only
    if (fileAsset.ownerId !== requesterId) {
      throw new FileAssetError(
        'Access denied: You do not have permission to access this provisional file asset',
        403
      );
    }
  }

  const { data: signedData, error: signError } = await supabaseAdmin.storage
    .from(PAPERS_BUCKET)
    .createSignedUrl(fileAsset.storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (signError || !signedData?.signedUrl) {
    throw new FileAssetError(
      signError?.message || 'Failed to generate signed download URL for paper asset',
      500
    );
  }

  return {
    signedUrl: signedData.signedUrl,
    url: signedData.signedUrl,
    fileName: fileAsset.fileName,
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  };
}

/**
 * Deletes a storage object directly from Supabase Storage.
 * Used for orphan rollback when paper creation fails.
 */
export async function deleteStorageObject(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    await supabaseAdmin.storage.from(PAPERS_BUCKET).remove([storagePath]);
  } catch (err) {
    console.error(`Failed to delete storage object at ${storagePath}:`, err);
  }
}

/**
 * Permanently deletes a FileAsset DB record and its underlying Storage object.
 */
export async function deleteFileAsset(fileAssetId: string, actorId?: string): Promise<void> {
  const fileAsset = await getFileAssetById(fileAssetId);
  if (!fileAsset) return;

  // 1. Delete object from Supabase Storage
  await deleteStorageObject(fileAsset.storagePath);

  // 2. Delete row from public.file_assets
  const { error } = await supabaseAdmin.from('file_assets').delete().eq('id', fileAssetId);
  if (error) {
    throw new FileAssetError(error.message, 500);
  }

  if (actorId) {
    await createAuditLog({
      actorId,
      action: 'delete_file_asset',
      targetType: 'file_asset',
      targetId: fileAssetId,
      metadata: { storagePath: fileAsset.storagePath },
    });
  }
}
