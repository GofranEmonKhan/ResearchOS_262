import { Router, Request, Response } from 'express';
import { authenticate, requireStatus } from '../middleware/auth.js';
import {
  requireManuscriptAccess,
  requireManuscriptAuthorOrSupervisor,
  requireManuscriptSupervisor,
  requireManuscriptReviewerOrAuthorOrSupervisor,
} from '../middleware/manuscriptGuards.js';
import { ManuscriptService } from '../services/manuscript.service.js';
import { ManuscriptSectionService } from '../services/manuscriptSection.service.js';
import { CitationService } from '../services/citation.service.js';
import { PeerReviewService } from '../services/peerReview.service.js';
import { supabaseAdmin } from '../supabase.js';

export const manuscriptRouter: Router = Router();

// All routes require authentication and Active status
manuscriptRouter.use(authenticate);
manuscriptRouter.use(requireStatus('Active'));

// ==========================================
// 1. Manuscript Creation & Listing
// ==========================================

/**
 * POST /projects/:projectId/manuscripts
 * Create a new manuscript in a project
 */
manuscriptRouter.post(
  '/projects/:projectId/manuscripts',
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.userId!;

      if (req.user?.role === 'Admin') {
        return res.status(403).json({ error: 'Admins cannot create manuscripts' });
      }

      const manuscript = await ManuscriptService.createManuscript(userId, {
        ...req.body,
        projectId,
      });

      return res.status(201).json(manuscript);
    } catch (err: any) {
      console.error('Error in createManuscript route:', err);
      return res.status(400).json({ error: err.message || 'Failed to create manuscript' });
    }
  }
);

/**
 * GET /projects/:projectId/manuscripts
 * List manuscripts for a project
 */
manuscriptRouter.get(
  '/projects/:projectId/manuscripts',
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.userId!;

      if (req.user?.role === 'Admin') {
        return res.status(403).json({ error: 'Admins cannot access manuscript content' });
      }

      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single();

      if (!project) return res.status(404).json({ error: 'Project not found' });

      if (project.owner_id !== userId) {
        const { data: member } = await supabaseAdmin
          .from('project_members')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!member) {
          return res.status(403).json({ error: 'Access denied: You are not a member of this project' });
        }
      }

      const response = await ManuscriptService.listManuscripts(userId, {
        ...req.query,
        projectId,
      });

      return res.json(response);
    } catch (err: any) {
      console.error('Error in listProjectManuscripts route:', err);
      return res.status(500).json({ error: err.message || 'Failed to list manuscripts' });
    }
  }
);

/**
 * GET /manuscripts
 * List accessible manuscripts for the user across projects
 */
manuscriptRouter.get(
  '/manuscripts',
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;

      if (req.user?.role === 'Admin') {
        return res.status(403).json({ error: 'Admins cannot access manuscript content' });
      }

      const response = await ManuscriptService.listManuscripts(userId, req.query);
      return res.json(response);
    } catch (err: any) {
      console.error('Error in listManuscripts route:', err);
      return res.status(500).json({ error: err.message || 'Failed to list manuscripts' });
    }
  }
);

/**
 * GET /manuscripts/:id
 * Get single manuscript with all sections, authors, citations, and reviews
 */
manuscriptRouter.get(
  '/manuscripts/:id',
  requireManuscriptAccess('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const userId = req.userId!;

      const manuscript = await ManuscriptService.getManuscriptById(manuscriptId, userId);
      return res.json({
        ...manuscript,
        userAccess: req.manuscriptAccess,
      });
    } catch (err: any) {
      console.error('Error in getManuscriptById route:', err);
      return res.status(404).json({ error: err.message || 'Manuscript not found' });
    }
  }
);

/**
 * PATCH /manuscripts/:id
 * Update manuscript metadata (title, abstract, targetVenue)
 */
manuscriptRouter.patch(
  '/manuscripts/:id',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const userId = req.userId!;

      const updated = await ManuscriptService.updateManuscript(manuscriptId, userId, req.body);
      return res.json(updated);
    } catch (err: any) {
      console.error('Error in updateManuscript route:', err);
      return res.status(400).json({ error: err.message || 'Failed to update manuscript' });
    }
  }
);

/**
 * POST /manuscripts/:id/status
 * Transition manuscript status
 */
manuscriptRouter.post(
  '/manuscripts/:id/status',
  requireManuscriptAccess('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const userId = req.userId!;

      const updated = await ManuscriptService.transitionManuscriptStatus(
        manuscriptId,
        userId,
        req.body
      );
      return res.json(updated);
    } catch (err: any) {
      console.error('Error in transitionManuscriptStatus route:', err);
      return res.status(400).json({ error: err.message || 'Failed to transition status' });
    }
  }
);

// ==========================================
// 2. Authors Management
// ==========================================

/**
 * POST /manuscripts/:id/authors
 * Add co-author to manuscript
 */
manuscriptRouter.post(
  '/manuscripts/:id/authors',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const userId = req.userId!;

      const authors = await ManuscriptService.addAuthor(manuscriptId, userId, req.body);
      return res.status(201).json(authors);
    } catch (err: any) {
      console.error('Error in addAuthor route:', err);
      return res.status(400).json({ error: err.message || 'Failed to add author' });
    }
  }
);

/**
 * DELETE /manuscripts/:id/authors/:authorUserId
 * Remove co-author
 */
manuscriptRouter.delete(
  '/manuscripts/:id/authors/:authorUserId',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const authorUserId = req.params.authorUserId as string;
      const userId = req.userId!;

      await ManuscriptService.removeAuthor(manuscriptId, userId, authorUserId);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('Error in removeAuthor route:', err);
      return res.status(400).json({ error: err.message || 'Failed to remove author' });
    }
  }
);

// ==========================================
// 3. Manuscript Sections & Autosave
// ==========================================

/**
 * POST /manuscripts/:id/sections
 * Create section
 */
manuscriptRouter.post(
  '/manuscripts/:id/sections',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const userId = req.userId!;

      const section = await ManuscriptSectionService.createSection(manuscriptId, userId, req.body);
      return res.status(201).json(section);
    } catch (err: any) {
      console.error('Error in createSection route:', err);
      return res.status(400).json({ error: err.message || 'Failed to create section' });
    }
  }
);

/**
 * PATCH /manuscripts/:id/sections/:sectionId
 * Update/Autosave section
 */
manuscriptRouter.patch(
  '/manuscripts/:id/sections/:sectionId',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const sectionId = req.params.sectionId as string;
      const userId = req.userId!;

      const updated = await ManuscriptSectionService.updateSection(
        sectionId,
        manuscriptId,
        userId,
        req.body
      );
      return res.json(updated);
    } catch (err: any) {
      console.error('Error in updateSection route:', err);
      return res.status(400).json({ error: err.message || 'Failed to update section' });
    }
  }
);

/**
 * PUT /manuscripts/:id/sections/reorder
 * Reorder sections
 */
manuscriptRouter.put(
  '/manuscripts/:id/sections/reorder',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const userId = req.userId!;

      const sections = await ManuscriptSectionService.reorderSections(
        manuscriptId,
        userId,
        req.body
      );
      return res.json(sections);
    } catch (err: any) {
      console.error('Error in reorderSections route:', err);
      return res.status(400).json({ error: err.message || 'Failed to reorder sections' });
    }
  }
);

/**
 * DELETE /manuscripts/:id/sections/:sectionId
 * Delete section
 */
manuscriptRouter.delete(
  '/manuscripts/:id/sections/:sectionId',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const sectionId = req.params.sectionId as string;
      const userId = req.userId!;

      await ManuscriptSectionService.deleteSection(sectionId, manuscriptId, userId);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('Error in deleteSection route:', err);
      return res.status(400).json({ error: err.message || 'Failed to delete section' });
    }
  }
);

// ==========================================
// 4. In-Text Citations & "Why Did I Cite This?"
// ==========================================

/**
 * POST /manuscripts/:id/citations
 * Insert citation
 */
manuscriptRouter.post(
  '/manuscripts/:id/citations',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const userId = req.userId!;

      const citation = await CitationService.insertCitation(manuscriptId, userId, req.body);
      return res.status(201).json(citation);
    } catch (err: any) {
      console.error('Error in insertCitation route:', err);
      return res.status(400).json({ error: err.message || 'Failed to insert citation' });
    }
  }
);

/**
 * DELETE /manuscripts/:id/citations/:citationId
 * Remove citation
 */
manuscriptRouter.delete(
  '/manuscripts/:id/citations/:citationId',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const citationId = req.params.citationId as string;
      const userId = req.userId!;

      await CitationService.removeCitation(citationId, manuscriptId, userId);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('Error in removeCitation route:', err);
      return res.status(400).json({ error: err.message || 'Failed to remove citation' });
    }
  }
);

/**
 * GET /manuscripts/:id/citations/:citationKey/why
 * Why Did I Cite This? contextual summary with privacy masking
 */
manuscriptRouter.get(
  '/manuscripts/:id/citations/:citationKey/why',
  requireManuscriptAccess('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const citationKey = req.params.citationKey as string;
      const userId = req.userId!;

      const context = await CitationService.getWhyDidICiteThisContext(
        manuscriptId,
        citationKey,
        userId
      );
      return res.json(context);
    } catch (err: any) {
      console.error('Error in getWhyDidICiteThisContext route:', err);
      return res.status(404).json({ error: err.message || 'Citation not found' });
    }
  }
);

/**
 * GET /projects/:projectId/citations/search
 * Search literature papers for citation modal picker
 */
manuscriptRouter.get(
  '/projects/:projectId/citations/search',
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId as string;
      const query = (req.query.q as string) || '';

      const papers = await CitationService.searchLiteratureForCitation(projectId, query);
      return res.json(papers);
    } catch (err: any) {
      console.error('Error in searchLiteratureForCitation route:', err);
      return res.status(500).json({ error: err.message || 'Failed to search literature' });
    }
  }
);

// ==========================================
// 5. Internal Peer Review & Comments
// ==========================================

/**
 * POST /manuscripts/:id/reviewers
 * Assign reviewer (Supervisor only)
 */
manuscriptRouter.post(
  '/manuscripts/:id/reviewers',
  requireManuscriptSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const supervisorId = req.userId!;

      const assignment = await PeerReviewService.assignReviewer(
        manuscriptId,
        supervisorId,
        req.body
      );
      return res.status(201).json(assignment);
    } catch (err: any) {
      console.error('Error in assignReviewer route:', err);
      return res.status(400).json({ error: err.message || 'Failed to assign reviewer' });
    }
  }
);

/**
 * DELETE /manuscripts/:id/reviewers/:reviewerId
 * Remove reviewer assignment (Supervisor only)
 */
manuscriptRouter.delete(
  '/manuscripts/:id/reviewers/:reviewerId',
  requireManuscriptSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const reviewerId = req.params.reviewerId as string;
      const supervisorId = req.userId!;

      await PeerReviewService.removeReviewAssignment(manuscriptId, reviewerId, supervisorId);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('Error in removeReviewAssignment route:', err);
      return res.status(400).json({ error: err.message || 'Failed to remove reviewer' });
    }
  }
);

/**
 * POST /manuscripts/:id/comments
 * Create review comment
 */
manuscriptRouter.post(
  '/manuscripts/:id/comments',
  requireManuscriptReviewerOrAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const userId = req.userId!;

      const comment = await PeerReviewService.createReviewComment(manuscriptId, userId, req.body);
      return res.status(201).json(comment);
    } catch (err: any) {
      console.error('Error in createReviewComment route:', err);
      return res.status(400).json({ error: err.message || 'Failed to create comment' });
    }
  }
);

/**
 * POST /manuscripts/:id/comments/:commentId/fix
 * Researcher marks review comment as FixedByResearcher with mandatory fixNote (AC-06)
 */
manuscriptRouter.post(
  '/manuscripts/:id/comments/:commentId/fix',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const commentId = req.params.commentId as string;
      const userId = req.userId!;

      const updated = await PeerReviewService.fixReviewComment(
        commentId,
        manuscriptId,
        userId,
        req.body
      );
      return res.json(updated);
    } catch (err: any) {
      console.error('Error in fixReviewComment route:', err);
      return res.status(400).json({ error: err.message || 'Failed to fix comment' });
    }
  }
);

/**
 * POST /manuscripts/:id/comments/:commentId/resolve
 * Supervisor resolves review comment
 */
manuscriptRouter.post(
  '/manuscripts/:id/comments/:commentId/resolve',
  requireManuscriptSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const commentId = req.params.commentId as string;
      const supervisorId = req.userId!;

      const resolved = await PeerReviewService.resolveReviewComment(
        commentId,
        manuscriptId,
        supervisorId,
        req.body
      );
      return res.json(resolved);
    } catch (err: any) {
      console.error('Error in resolveReviewComment route:', err);
      return res.status(400).json({ error: err.message || 'Failed to resolve comment' });
    }
  }
);

/**
 * POST /manuscripts/:id/comments/:commentId/reopen
 * Reopen review comment
 */
manuscriptRouter.post(
  '/manuscripts/:id/comments/:commentId/reopen',
  requireManuscriptReviewerOrAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const commentId = req.params.commentId as string;
      const userId = req.userId!;

      const reopened = await PeerReviewService.reopenReviewComment(
        commentId,
        manuscriptId,
        userId,
        req.body
      );
      return res.json(reopened);
    } catch (err: any) {
      console.error('Error in reopenReviewComment route:', err);
      return res.status(400).json({ error: err.message || 'Failed to reopen comment' });
    }
  }
);

// ==========================================
// 6. Submission Checklist
// ==========================================

/**
 * POST /manuscripts/:id/checklist
 * Add custom checklist item (Supervisor only)
 */
manuscriptRouter.post(
  '/manuscripts/:id/checklist',
  requireManuscriptSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const item = await PeerReviewService.createChecklistItem(manuscriptId, true, req.body);
      return res.status(201).json(item);
    } catch (err: any) {
      console.error('Error in createChecklistItem route:', err);
      return res.status(400).json({ error: err.message || 'Failed to create checklist item' });
    }
  }
);

/**
 * PATCH /manuscripts/:id/checklist/:itemId
 * Update/toggle checklist item
 */
manuscriptRouter.patch(
  '/manuscripts/:id/checklist/:itemId',
  requireManuscriptAccess('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const itemId = req.params.itemId as string;
      const userId = req.userId!;
      const isSupervisor = Boolean(req.manuscriptAccess?.isSupervisor);

      const updated = await PeerReviewService.updateChecklistItem(
        itemId,
        manuscriptId,
        userId,
        isSupervisor,
        req.body
      );
      return res.json(updated);
    } catch (err: any) {
      console.error('Error in updateChecklistItem route:', err);
      return res.status(400).json({ error: err.message || 'Failed to update checklist item' });
    }
  }
);

// ==========================================
// 7. Version Snapshots & Revision History
// ==========================================

/**
 * POST /manuscripts/:id/versions
 * Create snapshot version
 */
manuscriptRouter.post(
  '/manuscripts/:id/versions',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const userId = req.userId!;
      const versionName = req.body.versionName;

      const version = await ManuscriptService.createSnapshotVersion(
        manuscriptId,
        userId,
        versionName
      );
      return res.status(201).json(version);
    } catch (err: any) {
      console.error('Error in createSnapshotVersion route:', err);
      return res.status(400).json({ error: err.message || 'Failed to create version' });
    }
  }
);

/**
 * GET /manuscripts/:id/versions
 * Get version history
 */
manuscriptRouter.get(
  '/manuscripts/:id/versions',
  requireManuscriptAccess('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const versions = await ManuscriptService.getVersions(manuscriptId);
      return res.json(versions);
    } catch (err: any) {
      console.error('Error in getVersions route:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch versions' });
    }
  }
);

/**
 * POST /manuscripts/:id/versions/:versionId/restore
 * Restore version snapshot
 */
manuscriptRouter.post(
  '/manuscripts/:id/versions/:versionId/restore',
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const versionId = req.params.versionId as string;
      const userId = req.userId!;

      const manuscript = await ManuscriptService.restoreVersion(manuscriptId, userId, versionId);
      return res.json(manuscript);
    } catch (err: any) {
      console.error('Error in restoreVersion route:', err);
      return res.status(400).json({ error: err.message || 'Failed to restore version' });
    }
  }
);

/**
 * GET /manuscripts/:id/logs
 * Get revision logs
 */
manuscriptRouter.get(
  '/manuscripts/:id/logs',
  requireManuscriptAccess('id'),
  async (req: Request, res: Response) => {
    try {
      const manuscriptId = req.params.id as string;
      const logs = await ManuscriptService.getRevisionLogs(manuscriptId);
      return res.json(logs);
    } catch (err: any) {
      console.error('Error in getRevisionLogs route:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch revision logs' });
    }
  }
);
