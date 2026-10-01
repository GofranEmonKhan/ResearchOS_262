/**
 * Embedding Pipeline Service (Phase 8.3)
 *
 * Handles the full PDF→chunks→embeddings→pgvector pipeline.
 *
 * Pipeline:
 *   PDF stored in Supabase Storage
 *   → download bytes
 *   → extract text (pdf-parse)
 *   → paragraph-aware chunking (~1000 chars, 100-char overlap)
 *   → Gemini text-embedding-004 (768-dim)
 *   → upsert into public.embeddings (owner_id = uploader's userId)
 *
 * Fire-and-forget usage:
 *   The paper upload route calls schedulePaperEmbedding() without awaiting it.
 *   Failures are logged server-side but never surface to the caller.
 *
 * Manual re-trigger:
 *   POST /ai/papers/:paperId/embed — re-queues embedding for an already-uploaded paper.
 *
 * Security:
 *   owner_id on every Embedding row = the uploading user's id.
 *   match_embeddings() always filters by owner_id_filter = req.userId.
 *   AI never accesses embeddings belonging to a different user.
 */

import pdfParse from 'pdf-parse';
import { supabaseAdmin } from '../../supabase.js';
import { getActiveProvider, ProviderNotConfiguredError } from './index.js';

// ─── Chunking constants ───────────────────────────────────────────────────────
const CHUNK_TARGET_CHARS  = 1000;   // approximate chars per chunk
const CHUNK_OVERLAP_CHARS = 100;    // overlap between consecutive chunks
const MIN_CHUNK_CHARS     = 50;     // discard chunks shorter than this

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fire-and-forget wrapper.
 * Call this after returning 201 to the client; never await it.
 * Failures are logged to console but do not affect the paper record.
 */
export function schedulePaperEmbedding(params: {
  paperId: string;
  fileAssetId: string;
  storagePath: string;
  ownerId: string;
}): void {
  runPaperEmbedding(params).catch(err => {
    console.error(`[Embedding] Background embedding failed for paper ${params.paperId}:`, err?.message ?? err);
  });
}

/**
 * Synchronous re-trigger (used by manual re-trigger endpoint).
 * Waits for completion and surfaces errors to the route handler.
 */
export async function retriggerPaperEmbedding(params: {
  paperId: string;
  ownerId: string;
}): Promise<{ chunksEmbedded: number }> {
  // Fetch paper + file asset
  const { data: paper, error: paperErr } = await supabaseAdmin
    .from('papers')
    .select('id, file_asset_id, uploader_id, file_assets:file_asset_id(storage_path)')
    .eq('id', params.paperId)
    .eq('uploader_id', params.ownerId)
    .maybeSingle();

  if (paperErr || !paper) {
    throw new EmbeddingError('Paper not found or access denied.', 404);
  }

  const fileAsset = Array.isArray(paper.file_assets)
    ? paper.file_assets[0]
    : paper.file_assets as any;

  if (!fileAsset?.storage_path) {
    throw new EmbeddingError('Paper has no associated file.', 400);
  }

  const count = await runPaperEmbedding({
    paperId: params.paperId,
    fileAssetId: paper.file_asset_id,
    storagePath: fileAsset.storage_path,
    ownerId: params.ownerId,
  });

  return { chunksEmbedded: count };
}

// ─── Core pipeline ────────────────────────────────────────────────────────────

async function runPaperEmbedding(params: {
  paperId: string;
  fileAssetId: string;
  storagePath: string;
  ownerId: string;
}): Promise<number> {
  const { paperId, storagePath, ownerId } = params;

  // 1. Check provider is available (fail-fast before downloading PDF)
  let provider;
  try {
    provider = await getActiveProvider();
  } catch (err) {
    if (err instanceof ProviderNotConfiguredError) {
      console.warn(`[Embedding] No AI provider configured — skipping embedding for paper ${paperId}`);
      return 0;
    }
    throw err;
  }

  // 2. Download PDF bytes from Supabase Storage
  const { data: blob, error: dlErr } = await supabaseAdmin
    .storage
    .from('papers')
    .download(storagePath);

  if (dlErr || !blob) {
    throw new Error(`Failed to download PDF from storage: ${dlErr?.message ?? 'no blob'}`);
  }

  // 3. Extract text via pdf-parse
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  let fullText: string;
  try {
    const parsed = await pdfParse(buffer);
    fullText = parsed.text ?? '';
  } catch (parseErr: any) {
    throw new Error(`PDF text extraction failed: ${parseErr.message}`);
  }

  if (!fullText.trim()) {
    console.warn(`[Embedding] Paper ${paperId} produced no extractable text (scanned PDF?). Skipping.`);
    return 0;
  }

  // 4. Chunk text (paragraph-aware with overlap)
  const chunks = chunkText(fullText);
  if (chunks.length === 0) {
    return 0;
  }

  // 5. Delete existing embeddings for this paper (clean re-embed)
  await supabaseAdmin
    .from('embeddings')
    .delete()
    .eq('source_type', 'Paper')
    .eq('source_id', paperId)
    .eq('owner_id', ownerId);

  // 6. Embed in batches of 10 (respects Gemini free-tier rate limits)
  const BATCH_SIZE = 10;
  let insertedCount = 0;

  for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
    const batch = chunks.slice(batchStart, batchStart + BATCH_SIZE);

    let embeddingsResult: number[][] | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await provider.embed({ texts: batch });
        embeddingsResult = res.embeddings;
        break;
      } catch (embErr: any) {
        if (attempt === 3) {
          console.error(`[Embedding] Batch ${batchStart} failed after 3 attempts:`, embErr.message);
          break;
        }
        const waitMs = attempt * 2000;
        console.warn(`[Embedding] Provider embed failed (${embErr.message}), retrying in ${waitMs}ms...`);
        await delay(waitMs);
      }
    }

    if (!embeddingsResult || embeddingsResult.length === 0) {
      continue;
    }

    const rows = batch.map((chunk, i) => ({
      source_type:  'Paper' as const,
      source_id:    paperId,
      owner_id:     ownerId,
      chunk_index:  batchStart + i,
      // pgvector expects a JSON array formatted as a string or plain number[]
      vector:       JSON.stringify(embeddingsResult![i]),
    }));

    const { error: insertErr } = await supabaseAdmin
      .from('embeddings')
      .insert(rows);

    if (insertErr) {
      console.error(`[Embedding] Insert failed for paper ${paperId} batch ${batchStart}:`, insertErr.message);
      // Continue remaining batches rather than aborting the whole job
      continue;
    }

    insertedCount += batch.length;

    // Pacing delay between batches to respect rate limits
    if (batchStart + BATCH_SIZE < chunks.length) {
      await delay(600);
    }
  }

  console.info(`[Embedding] Paper ${paperId}: embedded ${insertedCount}/${chunks.length} chunks for owner ${ownerId}`);
  return insertedCount;
}

// ─── Text Chunking ────────────────────────────────────────────────────────────

/**
 * Paragraph-aware chunker.
 *
 * Strategy:
 *  1. Split on double-newlines (paragraph boundaries).
 *  2. Accumulate paragraphs until the chunk reaches CHUNK_TARGET_CHARS.
 *  3. Add CHUNK_OVERLAP_CHARS from the previous chunk to each new chunk.
 *  4. Discard chunks shorter than MIN_CHUNK_CHARS.
 */
function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.length >= MIN_CHUNK_CHARS);

  const chunks: string[] = [];
  let current = '';
  let overlap = '';

  for (const para of paragraphs) {
    const candidate = overlap ? `${overlap} ${current} ${para}`.trim() : `${current} ${para}`.trim();

    if (candidate.length >= CHUNK_TARGET_CHARS && current.length > 0) {
      const chunk = current.trim();
      if (chunk.length >= MIN_CHUNK_CHARS) {
        chunks.push(chunk);
      }
      // Set overlap from end of current chunk
      overlap = current.slice(-CHUNK_OVERLAP_CHARS).trim();
      current = para;
    } else {
      current = candidate;
    }
  }

  // Push final chunk
  const finalChunk = current.trim();
  if (finalChunk.length >= MIN_CHUNK_CHARS) {
    chunks.push(finalChunk);
  }

  return chunks;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class EmbeddingError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'EmbeddingError';
    this.statusCode = statusCode;
  }
}
