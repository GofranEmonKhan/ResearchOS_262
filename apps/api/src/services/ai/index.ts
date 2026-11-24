/**
 * AI Services — Barrel Index
 *
 * Exports the public surface of the AI service layer.
 * Routes import from this file; never import provider internals directly.
 */

export type { AIProvider, EmbedRequest, EmbedResult, GenerateRequest, GenerateResult, CostEstimator } from './types.js';
export { getActiveProvider, invalidateProviderCache, ProviderNotConfiguredError } from './provider.factory.js';
export { checkQuota, logUsage, getUserUsageSummary, QuotaExceededError } from './quota.service.js';
export { checkPrompt, invalidateRuleCache, listBlockedRules, createBlockedRule, deleteBlockedRule, PromptBlockedError } from './blockedPrompt.service.js';
export { schedulePaperEmbedding, retriggerPaperEmbedding, EmbeddingError } from './embedding.service.js';
export { performSemanticSearch, type SemanticSearchParams } from './semanticSearch.service.js';
export { summarizePaper, generateSidebarSuggestions } from './summarize.service.js';
export {
  listUserSuggestions,
  acceptSuggestion,
  rejectSuggestion,
  SuggestionNotFoundError,
  SuggestionConflictError,
  SuggestionForbiddenError,
} from './suggestion.service.js';
export { assistWriting } from './writingAssist.service.js';
export { generateExperimentInsight } from './experimentInsight.service.js';
export { generateStudentProgressReport } from './progressReport.service.js';
export {
  getAiProviderConfig,
  updateAiProviderConfig,
  listAiQuotas,
  updateAiQuota,
  getAdminAiUsageAnalytics,
} from './adminAi.service.js';
export {
  discoverLiterature,
  importDiscoveredPaper,
  LiteratureDiscoveryError,
} from './literatureDiscovery.service.js';

