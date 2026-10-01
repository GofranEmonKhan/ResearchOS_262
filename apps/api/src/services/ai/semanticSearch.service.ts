/**
 * Semantic Search Service (Phase 8.4)
 *
 * Implements vector similarity search over user-authorized research materials:
 *  - Paper PDF embedding chunks
 *  - PaperSidebarFields
 *  - ManuscriptSections
 *
 * Security & Access Rules:
 *  - owner_id_filter is ALWAYS set to req.userId when invoking match_embeddings().
 *  - AI never accesses or aggregates across users outside their authorized scope.
 *  - If project scope is requested, it is verified against user-authorized projects
 *    (owned or member projects) server-side; client input is never trusted directly.
 *  - Blocked prompt rules are checked before embedding.
 *  - Token quota is verified before provider call and logged after.
 */

import { supabaseAdmin } from '../../supabase.js';
import type {
  UserRole,
  SemanticSearchResult,
  SemanticSearchResponse,
  EmbeddingSourceType,
} from '@researchos/shared-types';
import { getActiveProvider } from './provider.factory.js';
import { checkQuota, logUsage } from './quota.service.js';
import { checkPrompt } from './blockedPrompt.service.js';

export interface SemanticSearchParams {
  userId: string;
  userRole: UserRole;
  query: string;
  topK?: number;
  requestedProjects?: string[];
}

export async function performSemanticSearch(params: SemanticSearchParams): Promise<SemanticSearchResponse> {
  const { userId, userRole, query, requestedProjects } = params;
  const topK = Math.min(Math.max(1, params.topK ?? 8), 50);

  // 1. Content moderation / Blocked Prompt check
  await checkPrompt(query);

  // 2. Token quota check (estimate tokens: ~1 token per 4 chars, min 1)
  const estimatedTokens = Math.max(1, Math.ceil(query.length / 4));
  await checkQuota(userId, userRole, estimatedTokens);

  // 3. Resolve user's authorized projects if project scope was requested
  const authorizedProjectFilter = await resolveAuthorizedProjects(userId, requestedProjects);

  // 4. Generate query embedding with active provider
  const provider = await getActiveProvider();
  const embedResult = await provider.embed({ texts: [query] });
  const queryVector = embedResult.embeddings[0];

  if (!queryVector || queryVector.length === 0) {
    throw new Error('Provider failed to generate valid query embedding vector');
  }

  // 5. Call pgvector match_embeddings RPC
  // SECURITY: owner_id_filter is ALWAYS set to req.userId
  const rpcTopK = Math.min(topK * 4, 100);
  const { data: rawMatches, error: rpcErr } = await supabaseAdmin.rpc('match_embeddings', {
    query_embedding: JSON.stringify(queryVector),
    owner_id_filter: userId,
    top_k: rpcTopK,
  });

  if (rpcErr) {
    console.error('[SemanticSearch] RPC match_embeddings error:', rpcErr);
    throw new Error(`Semantic search RPC failed: ${rpcErr.message}`);
  }

  const matches = (rawMatches ?? []) as Array<{
    id: string;
    source_type: EmbeddingSourceType;
    source_id: string;
    chunk_index: number;
    similarity: number;
  }>;

  // 6. Deduplicate by (source_type, source_id), retaining the highest similarity
  const dedupedMap = new Map<string, (typeof matches)[0]>();
  for (const match of matches) {
    const key = `${match.source_type}:${match.source_id}`;
    const existing = dedupedMap.get(key);
    if (!existing || match.similarity > existing.similarity) {
      dedupedMap.set(key, match);
    }
  }

  const uniqueMatches = Array.from(dedupedMap.values()).sort((a, b) => b.similarity - a.similarity);

  // 7. Resolve metadata and filter by authorized project scope
  const results: SemanticSearchResult[] = [];

  const paperIds = uniqueMatches.filter((m) => m.source_type === 'Paper').map((m) => m.source_id);
  const sidebarIds = uniqueMatches.filter((m) => m.source_type === 'PaperSidebarFields').map((m) => m.source_id);
  const sectionIds = uniqueMatches.filter((m) => m.source_type === 'ManuscriptSection').map((m) => m.source_id);

  // Batch query papers
  const papersMap = new Map<string, any>();
  if (paperIds.length > 0) {
    const { data: papers } = await supabaseAdmin
      .from('papers')
      .select('id, title, project_id, authors, year, venue, paper_sidebar_fields(methodology, research_gap, results)')
      .in('id', paperIds);

    for (const p of papers ?? []) {
      papersMap.set(p.id, p);
    }
  }

  // Batch query sidebar fields
  const sidebarsMap = new Map<string, any>();
  if (sidebarIds.length > 0) {
    const { data: sidebars } = await supabaseAdmin
      .from('paper_sidebar_fields')
      .select('id, paper_id, research_gap, methodology, results, limitation, papers:paper_id(title, project_id)')
      .in('id', sidebarIds);

    for (const s of sidebars ?? []) {
      sidebarsMap.set(s.id, s);
    }
  }

  // Batch query manuscript sections
  const sectionsMap = new Map<string, any>();
  if (sectionIds.length > 0) {
    const { data: sections } = await supabaseAdmin
      .from('manuscript_sections')
      .select('id, title, content_markdown, manuscripts:manuscript_id(title, project_id)')
      .in('id', sectionIds);

    for (const sec of sections ?? []) {
      sectionsMap.set(sec.id, sec);
    }
  }

  for (const match of uniqueMatches) {
    if (results.length >= topK) break;

    if (match.source_type === 'Paper') {
      const paper = papersMap.get(match.source_id);
      if (!paper) continue;

      // Project scope filter check
      if (authorizedProjectFilter && (!paper.project_id || !authorizedProjectFilter.has(paper.project_id))) {
        continue;
      }

      // Format snippet from sidebar fields or metadata
      const sidebar = Array.isArray(paper.paper_sidebar_fields)
        ? paper.paper_sidebar_fields[0]
        : paper.paper_sidebar_fields;

      let snippet: string | undefined;
      if (sidebar?.methodology) {
        snippet = `[Methodology]: ${sidebar.methodology.slice(0, 250)}`;
      } else if (sidebar?.research_gap) {
        snippet = `[Research Gap]: ${sidebar.research_gap.slice(0, 250)}`;
      } else if (sidebar?.results) {
        snippet = `[Results]: ${sidebar.results.slice(0, 250)}`;
      } else {
        const metaParts = [];
        if (paper.authors?.length) metaParts.push(`Authors: ${paper.authors.join(', ')}`);
        if (paper.year) metaParts.push(`Year: ${paper.year}`);
        if (paper.venue) metaParts.push(`Venue: ${paper.venue}`);
        snippet = metaParts.join(' • ') || 'Paper document';
      }

      results.push({
        sourceType: 'Paper',
        sourceId: match.source_id,
        similarity: Number(match.similarity.toFixed(4)),
        title: paper.title,
        snippet,
      });
    } else if (match.source_type === 'PaperSidebarFields') {
      const sidebar = sidebarsMap.get(match.source_id);
      if (!sidebar) continue;

      const paperInfo = Array.isArray(sidebar.papers) ? sidebar.papers[0] : sidebar.papers;
      if (authorizedProjectFilter && (!paperInfo?.project_id || !authorizedProjectFilter.has(paperInfo.project_id))) {
        continue;
      }

      const snippetParts = [];
      if (sidebar.research_gap) snippetParts.push(`Research Gap: ${sidebar.research_gap}`);
      if (sidebar.methodology) snippetParts.push(`Methodology: ${sidebar.methodology}`);
      if (sidebar.results) snippetParts.push(`Results: ${sidebar.results}`);
      if (sidebar.limitation) snippetParts.push(`Limitation: ${sidebar.limitation}`);

      results.push({
        sourceType: 'PaperSidebarFields',
        sourceId: match.source_id,
        similarity: Number(match.similarity.toFixed(4)),
        title: paperInfo?.title ? `Sidebar: ${paperInfo.title}` : 'Paper Sidebar Fields',
        snippet: snippetParts.join(' | ').slice(0, 250),
      });
    } else if (match.source_type === 'ManuscriptSection') {
      const sec = sectionsMap.get(match.source_id);
      if (!sec) continue;

      const manuscriptInfo = Array.isArray(sec.manuscripts) ? sec.manuscripts[0] : sec.manuscripts;
      if (authorizedProjectFilter && (!manuscriptInfo?.project_id || !authorizedProjectFilter.has(manuscriptInfo.project_id))) {
        continue;
      }

      results.push({
        sourceType: 'ManuscriptSection',
        sourceId: match.source_id,
        similarity: Number(match.similarity.toFixed(4)),
        title: manuscriptInfo?.title ? `${manuscriptInfo.title} — ${sec.title}` : sec.title,
        snippet: sec.content_markdown ? sec.content_markdown.slice(0, 250) : undefined,
      });
    }
  }

  // 8. Log usage
  await logUsage({
    userId,
    feature: 'semantic_search',
    tokensUsed: embedResult.tokensUsed,
  });

  return {
    data: results,
    query,
    total: results.length,
  };
}

/**
 * Resolves project filter:
 * If requestedProjects is specified, returns a Set of authorized project IDs that intersect.
 * If requestedProjects is not specified, returns null (meaning no project restriction).
 */
async function resolveAuthorizedProjects(userId: string, requestedProjects?: string[]): Promise<Set<string> | null> {
  if (!requestedProjects || requestedProjects.length === 0) {
    return null;
  }

  // Fetch owned projects
  const { data: owned } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('owner_id', userId);

  // Fetch member projects
  const { data: member } = await supabaseAdmin
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  const authorized = new Set<string>();
  for (const p of owned ?? []) authorized.add(p.id);
  for (const m of member ?? []) authorized.add(m.project_id);

  // Intersect with requested
  const filtered = new Set<string>();
  for (const pid of requestedProjects) {
    if (authorized.has(pid)) {
      filtered.add(pid);
    }
  }

  return filtered;
}
