/**
 * AI Assistant Routes (Spec 08)
 *
 * Endpoints:
 *  - POST /ai/search — Semantic search over accessible research assets
 *  - GET  /ai/usage  — Current user's monthly AI usage summary
 *  - POST /ai/papers/:paperId/embed — Manual re-trigger for paper embedding
 *  - POST /ai/papers/:paperId/summarize — Paper summarization (short, detailed, method-focused)
 *  - POST /ai/papers/:paperId/sidebar-suggestions — AI suggestions for structured sidebar fields
 *  - GET  /ai/suggestions — List user's suggestions (filter by targetType, targetId, status)
 *  - POST /ai/suggestions/:id/accept — Apply suggestion to target field
 *  - POST /ai/suggestions/:id/reject — Reject suggestion
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireRole, requireStatus } from '../middleware/auth.js';
import { requirePaperUploader, requirePaperViewer } from '../middleware/paperGuards.js';
import { requireManuscriptAuthorOrSupervisor } from '../middleware/manuscriptGuards.js';
import { requireExperimentViewer } from '../middleware/experimentGuards.js';
import { requireProjectOwnerSupervisor } from '../middleware/workspaceGuards.js';
import {
  performSemanticSearch,
  retriggerPaperEmbedding,
  getUserUsageSummary,
  summarizePaper,
  generateSidebarSuggestions,
  listUserSuggestions,
  acceptSuggestion,
  rejectSuggestion,
  assistWriting,
  generateExperimentInsight,
  generateStudentProgressReport,
  PromptBlockedError,
  QuotaExceededError,
  ProviderNotConfiguredError,
  EmbeddingError,
  SuggestionNotFoundError,
  SuggestionConflictError,
  SuggestionForbiddenError,
  discoverLiterature,
  importDiscoveredPaper,
  LiteratureDiscoveryError,
} from '../services/ai/index.js';
import type {
  SemanticSearchRequest,
  SummarizeRequest,
  SummarizeMode,
  AiSuggestionListParams,
  LiteratureDiscoveryRequest,
  ImportDiscoveredPaperDto,
  WritingAssistRequest,
  GenerateProgressReportRequest,
} from '@researchos/shared-types';

const router: Router = Router();

// All AI routes require authentication and an active account
router.use(authenticate, requireStatus('Active'));

/**
 * POST /ai/search
 * Semantic similarity search over accessible research materials.
 * Allowed roles: Researcher, Supervisor (Admin quota is 0 / restricted from research content).
 */
router.post(
  '/search',
  requireRole('Researcher', 'Supervisor'),
  async (req: Request<{}, {}, SemanticSearchRequest>, res: Response) => {
    const { query, topK, scope } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query is required and must be a non-empty string.' });
    }

    if (topK !== undefined && (typeof topK !== 'number' || topK <= 0)) {
      return res.status(400).json({ error: 'topK must be a positive integer.' });
    }

    if (scope?.projects && !Array.isArray(scope.projects)) {
      return res.status(400).json({ error: 'scope.projects must be an array of project IDs.' });
    }

    try {
      const response = await performSemanticSearch({
        userId: req.userId!,
        userRole: req.user!.role,
        query: query.trim(),
        topK: topK ? Math.min(topK, 50) : undefined,
        requestedProjects: scope?.projects,
      });

      return res.status(200).json(response);
    } catch (err: any) {
      if (err instanceof PromptBlockedError) {
        return res.status(400).json({
          error: 'PROMPT_BLOCKED',
          message: err.message,
        });
      }

      if (err instanceof QuotaExceededError) {
        return res.status(429).json({
          error: 'QUOTA_EXCEEDED',
          message: err.message,
        });
      }

      if (err instanceof ProviderNotConfiguredError) {
        return res.status(503).json({
          error: 'PROVIDER_NOT_CONFIGURED',
          message: err.message,
        });
      }

      console.error('[AI] Semantic search error:', err);
      return res.status(500).json({ error: 'Semantic search failed.' });
    }
  }
);

/**
 * POST /ai/discover
 * Autonomous literature discovery and Perplexity-style scholarly review synthesis.
 * Queries OpenAlex 250M+ works, enforces quota and moderation, and returns structured synthesis.
 */
router.post(
  '/discover',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{}, {}, LiteratureDiscoveryRequest>, res: Response) => {
    const { topic, limit, yearRange } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Research topic is required.' });
    }

    try {
      const response = await discoverLiterature({
        userId: req.userId!,
        userRole: req.user!.role,
        request: {
          topic: topic.trim(),
          limit: limit ? Number(limit) : 10,
          yearRange,
        },
      });

      return res.status(200).json(response);
    } catch (err: any) {
      if (err instanceof PromptBlockedError) {
        return res.status(400).json({
          error: 'PROMPT_BLOCKED',
          message: err.message,
        });
      }

      if (err instanceof QuotaExceededError) {
        return res.status(429).json({
          error: 'QUOTA_EXCEEDED',
          message: err.message,
        });
      }

      if (err instanceof ProviderNotConfiguredError) {
        return res.status(503).json({
          error: 'PROVIDER_NOT_CONFIGURED',
          message: err.message,
        });
      }

      if (err instanceof LiteratureDiscoveryError) {
        return res.status(err.statusCode).json({ error: err.message });
      }

      console.error('[AI] Literature discovery error:', err);
      return res.status(500).json({ error: err.message || 'Literature discovery failed.' });
    }
  }
);

/**
 * POST /ai/discover/import
 * 1-click import of a discovered paper into a project library with automatic pgvector embedding.
 */
router.post(
  '/discover/import',
  authenticate,
  requireStatus('Active'),
  async (req: Request<{}, {}, ImportDiscoveredPaperDto>, res: Response) => {
    try {
      const response = await importDiscoveredPaper({
        userId: req.userId!,
        userRole: req.user!.role,
        dto: req.body,
      });

      return res.status(201).json(response);
    } catch (err: any) {
      if (err instanceof LiteratureDiscoveryError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('[AI] Import discovered paper error:', err);
      return res.status(500).json({ error: err.message || 'Failed to import paper.' });
    }
  }
);


/**
 * GET /ai/usage
 * Return the current user's monthly token quota, usage, and recent activity logs.
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const summary = await getUserUsageSummary(req.userId!, req.user!.role);
    return res.status(200).json(summary);
  } catch (err: any) {
    console.error('[AI] Usage summary error:', err);
    return res.status(500).json({ error: 'Failed to retrieve AI usage summary.' });
  }
});

/**
 * POST /ai/papers/:paperId/embed
 * Manual re-trigger for embedding a paper (requires paper ownership).
 */
router.post(
  '/papers/:paperId/embed',
  requirePaperUploader,
  async (req: Request, res: Response) => {
    const paperId = req.params.paperId as string;
    const userId = req.userId!;

    try {
      const result = await retriggerPaperEmbedding({ paperId, ownerId: userId });
      return res.status(200).json({
        message: 'Embedding complete.',
        chunksEmbedded: result.chunksEmbedded,
      });
    } catch (err: any) {
      if (err instanceof EmbeddingError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      if (err instanceof ProviderNotConfiguredError) {
        return res.status(503).json({ error: err.message });
      }
      console.error(`[AI] Re-embedding failed for paper ${paperId}:`, err);
      return res.status(500).json({ error: 'Re-embedding failed.' });
    }
  }
);

/**
 * POST /ai/papers/:paperId/summarize
 * Generate paper summary in short, detailed, or method-focused mode.
 * Access: User must have paper viewer permission.
 */
router.post(
  '/papers/:paperId/summarize',
  requireRole('Researcher', 'Supervisor'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }, {}, SummarizeRequest>, res: Response) => {
    const paperId = req.params.paperId as string;
    const { mode } = req.body;

    const validModes: SummarizeMode[] = ['short', 'detailed', 'method-focused'];
    if (!mode || !validModes.includes(mode)) {
      return res.status(400).json({
        error: `Mode is required and must be one of: ${validModes.join(', ')}`,
      });
    }

    try {
      const result = await summarizePaper({
        userId: req.userId!,
        userRole: req.user!.role,
        paperId,
        mode,
      });

      return res.status(200).json(result);
    } catch (err: any) {
      if (err instanceof PromptBlockedError) {
        return res.status(400).json({ error: 'PROMPT_BLOCKED', message: err.message });
      }
      if (err instanceof QuotaExceededError) {
        return res.status(429).json({ error: 'QUOTA_EXCEEDED', message: err.message });
      }
      if (err instanceof ProviderNotConfiguredError) {
        return res.status(503).json({ error: 'PROVIDER_NOT_CONFIGURED', message: err.message });
      }
      console.error(`[AI] Summarization error for paper ${paperId}:`, err);
      return res.status(500).json({ error: err.message || 'Summarization failed.' });
    }
  }
);

/**
 * POST /ai/papers/:paperId/sidebar-suggestions
 * Generate structured sidebar suggestions (research gap, limitation, future work, methodology).
 * Access: User must have paper viewer permission.
 */
router.post(
  '/papers/:paperId/sidebar-suggestions',
  requireRole('Researcher', 'Supervisor'),
  requirePaperViewer('paperId'),
  async (req: Request<{ paperId: string }>, res: Response) => {
    const paperId = req.params.paperId as string;

    try {
      const result = await generateSidebarSuggestions({
        userId: req.userId!,
        userRole: req.user!.role,
        paperId,
      });

      return res.status(200).json(result);
    } catch (err: any) {
      if (err instanceof PromptBlockedError) {
        return res.status(400).json({ error: 'PROMPT_BLOCKED', message: err.message });
      }
      if (err instanceof QuotaExceededError) {
        return res.status(429).json({ error: 'QUOTA_EXCEEDED', message: err.message });
      }
      if (err instanceof ProviderNotConfiguredError) {
        return res.status(503).json({ error: 'PROVIDER_NOT_CONFIGURED', message: err.message });
      }
      console.error(`[AI] Sidebar suggestions error for paper ${paperId}:`, err);
      return res.status(500).json({ error: err.message || 'Sidebar suggestions failed.' });
    }
  }
);

/**
 * GET /ai/suggestions
 * List suggestions owned by the current user.
 * Optional query filters: targetType, targetId, status, page, limit.
 */
router.get('/suggestions', async (req: Request, res: Response) => {
  const query = req.query as AiSuggestionListParams;

  try {
    const response = await listUserSuggestions(req.userId!, query);
    return res.status(200).json(response);
  } catch (err: any) {
    console.error('[AI] List suggestions error:', err);
    return res.status(500).json({ error: 'Failed to list suggestions.' });
  }
});

/**
 * POST /ai/suggestions/:id/accept
 * Apply an AI suggestion to the target field and mark status as Accepted.
 */
router.post('/suggestions/:id/accept', async (req: Request<{ id: string }>, res: Response) => {
  const suggestionId = req.params.id as string;

  try {
    const response = await acceptSuggestion(req.userId!, suggestionId);
    return res.status(200).json(response);
  } catch (err: any) {
    if (err instanceof SuggestionNotFoundError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err instanceof SuggestionForbiddenError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err instanceof SuggestionConflictError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(`[AI] Accept suggestion error for ${suggestionId}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to accept suggestion.' });
  }
});

/**
 * POST /ai/suggestions/:id/reject
 * Reject an AI suggestion without modifying the target entity.
 */
router.post('/suggestions/:id/reject', async (req: Request<{ id: string }>, res: Response) => {
  const suggestionId = req.params.id as string;

  try {
    const response = await rejectSuggestion(req.userId!, suggestionId);
    return res.status(200).json(response);
  } catch (err: any) {
    if (err instanceof SuggestionNotFoundError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err instanceof SuggestionForbiddenError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err instanceof SuggestionConflictError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(`[AI] Reject suggestion error for ${suggestionId}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to reject suggestion.' });
  }
});

/**
 * POST /ai/manuscripts/:id/writing-assist
 * Writing assistance for manuscripts: paraphrase, grammar check, or section outline.
 * Access: Manuscript author or supervisor.
 */
router.post(
  '/manuscripts/:id/writing-assist',
  requireRole('Researcher', 'Supervisor'),
  requireManuscriptAuthorOrSupervisor('id'),
  async (req: Request<{ id: string }, {}, WritingAssistRequest>, res: Response) => {
    const manuscriptId = req.params.id as string;
    const { action, selectedText, sectionType, sectionId } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required (paraphrase, grammar, outline).' });
    }

    try {
      const response = await assistWriting({
        userId: req.userId!,
        userRole: req.user!.role,
        manuscriptId,
        action,
        selectedText,
        sectionType,
        sectionId,
      });

      return res.status(200).json(response);
    } catch (err: any) {
      if (err instanceof PromptBlockedError) {
        return res.status(400).json({ error: 'PROMPT_BLOCKED', message: err.message });
      }
      if (err instanceof QuotaExceededError) {
        return res.status(429).json({ error: 'QUOTA_EXCEEDED', message: err.message });
      }
      if (err instanceof ProviderNotConfiguredError) {
        return res.status(503).json({ error: 'PROVIDER_NOT_CONFIGURED', message: err.message });
      }
      console.error(`[AI] Writing assist error for manuscript ${manuscriptId}:`, err);
      return res.status(500).json({ error: err.message || 'Writing assistance failed.' });
    }
  }
);

/**
 * POST /ai/experiments/:id/insight
 * Natural-language interpretation and actionable analysis of experiment results.
 * Access: Experiment owner, project supervisor, or project member (requireExperimentViewer).
 */
router.post(
  '/experiments/:id/insight',
  requireRole('Researcher', 'Supervisor'),
  requireExperimentViewer('id'),
  async (req: Request<{ id: string }>, res: Response) => {
    const experimentId = req.params.id as string;

    try {
      const response = await generateExperimentInsight({
        userId: req.userId!,
        userRole: req.user!.role,
        experimentId,
      });

      return res.status(200).json(response);
    } catch (err: any) {
      if (err instanceof PromptBlockedError) {
        return res.status(400).json({ error: 'PROMPT_BLOCKED', message: err.message });
      }
      if (err instanceof QuotaExceededError) {
        return res.status(429).json({ error: 'QUOTA_EXCEEDED', message: err.message });
      }
      if (err instanceof ProviderNotConfiguredError) {
        return res.status(503).json({ error: 'PROVIDER_NOT_CONFIGURED', message: err.message });
      }
      console.error(`[AI] Experiment insight error for experiment ${experimentId}:`, err);
      return res.status(500).json({ error: err.message || 'Experiment insight failed.' });
    }
  }
);

/**
 * POST /ai/projects/:projectId/progress-report
 * Generate or retrieve cached supervisor progress report for a student.
 * Access: Project Owner Supervisor only (requireProjectOwnerSupervisor).
 */
router.post(
  '/projects/:projectId/progress-report',
  requireRole('Supervisor'),
  requireProjectOwnerSupervisor('projectId'),
  async (req: Request<{ projectId: string }, {}, GenerateProgressReportRequest>, res: Response) => {
    const projectId = req.params.projectId as string;
    const body = req.body;

    try {
      const response = await generateStudentProgressReport({
        userId: req.userId!,
        userRole: req.user!.role,
        projectId,
        body,
      });

      return res.status(200).json(response);
    } catch (err: any) {
      if (err instanceof PromptBlockedError) {
        return res.status(400).json({ error: 'PROMPT_BLOCKED', message: err.message });
      }
      if (err instanceof QuotaExceededError) {
        return res.status(429).json({ error: 'QUOTA_EXCEEDED', message: err.message });
      }
      if (err instanceof ProviderNotConfiguredError) {
        return res.status(503).json({ error: 'PROVIDER_NOT_CONFIGURED', message: err.message });
      }
      console.error(`[AI] Progress report error for project ${projectId}:`, err);
      return res.status(500).json({ error: err.message || 'Progress report generation failed.' });
    }
  }
);

export { router as aiRouter };
export default router;
