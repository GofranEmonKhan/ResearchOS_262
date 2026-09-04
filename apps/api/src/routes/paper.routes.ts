import { Router, Request, Response } from 'express';
import { authenticate, requireStatus } from '../middleware/auth.js';
import {
  requirePaperViewer,
  requirePaperUploader,
  requirePaperProjectSupervisor,
} from '../middleware/paperGuards.js';
import * as fileAssetService from '../services/fileAsset.service.js';
import * as metadataService from '../services/metadata/metadata.service.js';
import * as paperService from '../services/paper.service.js';
import * as sidebarService from '../services/sidebar.service.js';
import * as annotationService from '../services/annotation.service.js';
import * as commentService from '../services/comment.service.js';
import * as citationPurposeService from '../services/citationPurpose.service.js';
import * as exportService from '../services/export.service.js';
import {
  CreatePaperDto,
  UpdatePaperDto,
  PaperSearchParams,
  UpdateSidebarFieldsDto,
  CreateAnnotationDto,
  UpdateAnnotationDto,
  AddPaperCommentDto,
  CreateCitationPurposeDto,
} from '@researchos/shared-types';

const router: Router = Router();

/**
 * POST /metadata/resolve
 * Resolves metadata from an uploaded PDF in Supabase Storage.
 * Attempts DOI extraction, queries CrossRef/OpenAlex, and returns candidates or manual status.
 */
router.post(
  '/metadata/resolve',
  authenticate,
  requireStatus('Active'),
  async (req: Request, res: Response) => {
    try {
      const { storagePath, fileName } = req.body;
      if (!storagePath || typeof storagePath !== 'string') {
        return res.status(400).json({ error: 'storagePath is required' });
      }
      if (!fileName || typeof fileName !== 'string') {
        return res.status(400).json({ error: 'fileName is required' });
      }

      const result = await metadataService.resolveMetadata(
        storagePath,
        fileName,
        req.userId!
      );
      return res.json(result);
    } catch (err: any) {
      if (err instanceof fileAssetService.FileAssetError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error resolving metadata:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * POST /papers
 * Creates a new Paper record with associated FileAsset.
 * User confirms metadata before calling this endpoint.
 */
router.post(
  '/papers',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{}, {}, CreatePaperDto>, res: Response) => {
    try {
      const paper = await paperService.createPaper(req.body, req.userId!);
      return res.status(201).json(paper);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      if (err instanceof fileAssetService.FileAssetError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error creating paper:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * GET /papers
 * Lists papers accessible to the requester (personal + shared project papers).
 * Supports search query, readingStatus, isRequiredReading, and pagination.
 */
router.get(
  '/papers',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{}, {}, {}, PaperSearchParams>, res: Response) => {
    try {
      const result = await paperService.listPapers(req.query, req.userId!);
      return res.json(result);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error listing papers:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * GET /papers/export
 * Exports accessible papers in BibTeX or RIS format.
 * Placed before /papers/:paperId to avoid route collision.
 */
router.get(
  '/papers/export',
  authenticate,
  requireStatus('Active'),
  async (
    req: Request<{}, {}, {}, { format?: 'bibtex' | 'ris'; paperIds?: string | string[]; projectId?: string; collectionId?: string }>,
    res: Response
  ) => {
    try {
      const format = req.query.format || 'bibtex';
      let paperIds: string[] | undefined;
      if (typeof req.query.paperIds === 'string') {
        paperIds = req.query.paperIds.split(',').map((id) => id.trim()).filter(Boolean);
      } else if (Array.isArray(req.query.paperIds)) {
        paperIds = req.query.paperIds;
      }

      const result = await exportService.exportPapers(
        {
          format,
          paperIds,
          projectId: req.query.projectId,
          collectionId: req.query.collectionId,
        },
        req.userId!
      );

      res.setHeader('Content-Type', `${result.contentType}; charset=utf-8`);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      return res.send(result.content);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error exporting papers:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * GET /papers/:paperId
 * Retrieves a single paper by ID with joined uploader, fileAsset, and collections.
 */
router.get(
  '/papers/:paperId',
  authenticate,
  requireStatus('Active'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }>, res: Response) => {
    try {
      const paper = await paperService.getPaperById(req.params.paperId);
      if (!paper) {
        return res.status(404).json({ error: 'Paper not found' });
      }
      return res.json(paper);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error retrieving paper:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * GET /papers/:paperId/download-url
 * Returns a 1-hour time-limited signed URL for viewing/downloading the paper PDF.
 * Authorized viewer only: Uploader or Project Member/Owner (if paper is shared).
 * Admin role is strictly denied (403).
 */
router.get(
  '/papers/:paperId/download-url',
  authenticate,
  requireStatus('Active'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }>, res: Response) => {
    try {
      const fileAssetId = req.paper!.file_asset_id;
      const result = await fileAssetService.getSignedUrl(
        fileAssetId,
        req.userId!,
        req.user?.role
      );
      return res.json(result);
    } catch (err: any) {
      if (err instanceof fileAssetService.FileAssetError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error generating paper signed URL:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * PATCH /papers/:paperId
 * Updates readingStatus (any authorized viewer) or metadata (uploader only).
 */
router.patch(
  '/papers/:paperId',
  authenticate,
  requireStatus('Active'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }, {}, UpdatePaperDto>, res: Response) => {
    try {
      const updated = await paperService.updatePaper(
        req.params.paperId,
        req.body,
        req.userId!
      );
      return res.json(updated);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error updating paper:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * POST /papers/:paperId/share
 * Shares a personal paper with a collaborative project.
 * Uploader only; uploader must belong to destination project.
 */
router.post(
  '/papers/:paperId/share',
  authenticate,
  requireStatus('Active'),
  requirePaperUploader('paperId'),
  async (req: Request<{ paperId: string }, {}, { projectId: string }>, res: Response) => {
    try {
      const { projectId } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      const updated = await paperService.sharePaperWithProject(
        req.params.paperId,
        projectId,
        req.userId!
      );
      return res.json(updated);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error sharing paper:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * POST /papers/:paperId/required-reading
 * Marks a shared paper as Required Reading for project members.
 * Requires Supervisor or CoSupervisor role in the linked project.
 */
router.post(
  '/papers/:paperId/required-reading',
  authenticate,
  requireStatus('Active'),
  requirePaperProjectSupervisor('paperId'),
  async (req: Request<{ paperId: string }, {}, { linkedTaskId?: string | null }>, res: Response) => {
    try {
      const updated = await paperService.setRequiredReading(
        req.params.paperId,
        true,
        req.body.linkedTaskId,
        req.userId!
      );
      return res.json(updated);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error setting required reading:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * DELETE /papers/:paperId/required-reading
 * Clears Required Reading status on a paper.
 * Requires Supervisor or CoSupervisor role in the linked project.
 */
router.delete(
  '/papers/:paperId/required-reading',
  authenticate,
  requireStatus('Active'),
  requirePaperProjectSupervisor('paperId'),
  async (req: Request<{ paperId: string }>, res: Response) => {
    try {
      const updated = await paperService.setRequiredReading(
        req.params.paperId,
        false,
        null,
        req.userId!
      );
      return res.json(updated);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error clearing required reading:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * DELETE /papers/:paperId
 * Permanently deletes a paper, its database records (cascading),
 * and its underlying Supabase Storage PDF asset.
 * Uploader only.
 */
router.delete(
  '/papers/:paperId',
  authenticate,
  requireStatus('Active'),
  requirePaperUploader('paperId'),
  async (req: Request<{ paperId: string }>, res: Response) => {
    try {
      await paperService.deletePaper(req.params.paperId, req.userId!);
      return res.json({ message: 'Paper deleted successfully' });
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error deleting paper:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * GET /papers/:paperId/sidebar
 * Retrieves Smart Research Sidebar fields with Option A dynamic privacy masking.
 */
router.get(
  '/papers/:paperId/sidebar',
  authenticate,
  requireStatus('Active'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }>, res: Response) => {
    try {
      const sidebar = await sidebarService.getSidebar(req.params.paperId, req.userId!);
      return res.json(sidebar);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error fetching sidebar:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * PATCH /papers/:paperId/sidebar
 * Updates Smart Research Sidebar fields.
 * Structured fields can be updated by authorized viewers; personal notes uploader-only.
 */
router.patch(
  '/papers/:paperId/sidebar',
  authenticate,
  requireStatus('Active'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }, {}, UpdateSidebarFieldsDto>, res: Response) => {
    try {
      const sidebar = await sidebarService.updateSidebar(
        req.params.paperId,
        req.body,
        req.userId!
      );
      return res.json(sidebar);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error updating sidebar:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * GET /papers/:paperId/annotations
 * Lists annotations on the paper.
 * Collaborative: project members see all annotations on shared papers.
 */
router.get(
  '/papers/:paperId/annotations',
  authenticate,
  requireStatus('Active'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }>, res: Response) => {
    try {
      const annotations = await annotationService.listAnnotations(
        req.params.paperId,
        req.userId!
      );
      return res.json(annotations);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error listing annotations:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * POST /papers/:paperId/annotations
 * Creates a new annotation with zoom-invariant coordinates.
 */
router.post(
  '/papers/:paperId/annotations',
  authenticate,
  requireStatus('Active'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }, {}, CreateAnnotationDto>, res: Response) => {
    try {
      const annotation = await annotationService.createAnnotation(
        req.params.paperId,
        req.userId!,
        req.body
      );
      return res.status(201).json(annotation);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error creating annotation:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * PATCH /annotations/:annotationId
 * Updates sticky note or linked sidebar field on an annotation (author-only).
 */
router.patch(
  '/annotations/:annotationId',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{ annotationId: string }, {}, UpdateAnnotationDto>, res: Response) => {
    try {
      const updated = await annotationService.updateAnnotation(
        req.params.annotationId,
        req.userId!,
        req.body
      );
      return res.json(updated);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error updating annotation:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * DELETE /annotations/:annotationId
 * Deletes an annotation (author-only).
 */
router.delete(
  '/annotations/:annotationId',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{ annotationId: string }>, res: Response) => {
    try {
      await annotationService.deleteAnnotation(req.params.annotationId, req.userId!);
      return res.json({ message: 'Annotation deleted successfully' });
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error deleting annotation:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * GET /papers/:paperId/comments
 * Lists comments on a paper shared in a collaborative project.
 */
router.get(
  '/papers/:paperId/comments',
  authenticate,
  requireStatus('Active'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }>, res: Response) => {
    try {
      const comments = await commentService.listComments(req.params.paperId);
      return res.json(comments);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error listing comments:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * POST /papers/:paperId/comments
 * Adds a collaborative comment to a paper discussion thread.
 */
router.post(
  '/papers/:paperId/comments',
  authenticate,
  requireStatus('Active'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }, {}, AddPaperCommentDto>, res: Response) => {
    try {
      const comment = await commentService.addComment(
        req.params.paperId,
        req.userId!,
        req.body
      );
      return res.status(201).json(comment);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error adding comment:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * GET /papers/:paperId/citations
 * Lists citation purposes for a paper.
 */
router.get(
  '/papers/:paperId/citations',
  authenticate,
  requireStatus('Active'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }>, res: Response) => {
    try {
      const citations = await citationPurposeService.listCitationPurposes(req.params.paperId);
      return res.json(citations);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error listing citations:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * POST /papers/:paperId/citations
 * Adds a citation purpose to a paper.
 */
router.post(
  '/papers/:paperId/citations',
  authenticate,
  requireStatus('Active'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }, {}, CreateCitationPurposeDto>, res: Response) => {
    try {
      const citation = await citationPurposeService.addCitationPurpose(
        req.params.paperId,
        req.userId!,
        req.body
      );
      return res.status(201).json(citation);
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error adding citation purpose:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * DELETE /citations/:citationId
 * Deletes a citation purpose.
 */
router.delete(
  '/citations/:citationId',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{ citationId: string }>, res: Response) => {
    try {
      await citationPurposeService.deleteCitationPurpose(req.params.citationId, req.userId!);
      return res.json({ message: 'Citation purpose deleted successfully' });
    } catch (err: any) {
      if (err instanceof paperService.PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error deleting citation purpose:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

export default router;
