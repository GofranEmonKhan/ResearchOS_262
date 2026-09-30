import { Router, Request, Response } from 'express';
import { authenticate, requireStatus } from '../middleware/auth.js';
import * as collectionService from '../services/collection.service.js';
import { CreateCollectionDto, UpdateCollectionDto } from '@researchos/shared-types';
import { PaperError } from '../services/paper.service.js';

const router: Router = Router();

/**
 * GET /collections
 * Lists all collections owned by the authenticated user with paper counts.
 */
router.get(
  '/',
  authenticate,
  requireStatus('Active'),
  async (req: Request, res: Response) => {
    try {
      const collections = await collectionService.listCollections(req.userId!);
      return res.json(collections);
    } catch (err: any) {
      if (err instanceof PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error listing collections:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * POST /collections
 * Creates a new personal paper collection.
 */
router.post(
  '/',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{}, {}, CreateCollectionDto>, res: Response) => {
    try {
      const collection = await collectionService.createCollection(req.userId!, req.body);
      return res.status(201).json(collection);
    } catch (err: any) {
      if (err instanceof PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error creating collection:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * PATCH /collections/:id
 * Updates collection name and/or color.
 */
router.patch(
  '/:id',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{ id: string }, {}, UpdateCollectionDto>, res: Response) => {
    try {
      const collection = await collectionService.updateCollection(
        req.params.id,
        req.userId!,
        req.body
      );
      return res.json(collection);
    } catch (err: any) {
      if (err instanceof PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error updating collection:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * DELETE /collections/:id
 * Deletes a collection and removes paper links without deleting papers.
 */
router.delete(
  '/:id',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      await collectionService.deleteCollection(req.params.id, req.userId!);
      return res.json({ message: 'Collection deleted successfully' });
    } catch (err: any) {
      if (err instanceof PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error deleting collection:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * POST /collections/:id/papers
 * Adds a paper to a collection.
 */
router.post(
  '/:id/papers',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{ id: string }, {}, { paperId: string }>, res: Response) => {
    try {
      const { paperId } = req.body;
      if (!paperId) {
        return res.status(400).json({ error: 'paperId is required' });
      }
      await collectionService.addPaperToCollection(req.params.id, paperId, req.userId!);
      return res.status(201).json({ message: 'Paper added to collection' });
    } catch (err: any) {
      if (err instanceof PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error adding paper to collection:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

/**
 * DELETE /collections/:id/papers/:paperId
 * Removes a paper from a collection.
 */
router.delete(
  '/:id/papers/:paperId',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{ id: string; paperId: string }>, res: Response) => {
    try {
      await collectionService.removePaperFromCollection(
        req.params.id,
        req.params.paperId,
        req.userId!
      );
      return res.json({ message: 'Paper removed from collection' });
    } catch (err: any) {
      if (err instanceof PaperError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Error removing paper from collection:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
);

export default router;
