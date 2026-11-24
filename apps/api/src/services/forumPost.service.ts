import { supabaseAdmin } from '../supabase.js';
import { ForumPost, ForumVoteValue } from '@researchos/shared-types';
import { ForumVoteService } from './forumVote.service.js';
import { CommunityProfileService } from './communityProfile.service.js';

export interface ListPostsOptions {
  tag?: string;
  search?: string;
  tab?: 'all' | 'following' | 'unanswered' | 'my-posts' | 'project' | 'blogs';
  projectId?: string;
  authorId?: string;
  sort?: 'newest' | 'top-voted' | 'most-active';
  page?: number;
  limit?: number;
  currentUserId?: string;
}

export class ForumPostService {
  /**
   * List forum posts with rich filtering, searching, tab views, and reactions
   */
  static async listPosts(options: ListPostsOptions): Promise<{ posts: ForumPost[]; total: number }> {
    const {
      tag,
      search,
      tab = 'all',
      projectId,
      authorId,
      sort = 'newest',
      page = 1,
      limit = 20,
      currentUserId,
    } = options;

    let query = supabaseAdmin
      .from('forum_posts')
      .select(`
        id,
        author_id,
        project_id,
        title,
        body,
        tags,
        attachment_ids,
        is_pinned,
        is_locked,
        views_count,
        created_at,
        updated_at,
        profiles!forum_posts_author_id_fkey(
          id,
          full_name,
          photo_url,
          role,
          reputation_points,
          institution,
          status
        ),
        projects(
          id,
          title
        )
      `, { count: 'exact' });

    // Project filter
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    // Tag filter
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // Search filter (title or body)
    if (search && search.trim().length > 0) {
      const term = search.trim();
      query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
    }

    // Tab-based filtering
    if (tab === 'my-posts' && (authorId || currentUserId)) {
      query = query.eq('author_id', authorId || currentUserId);
    } else if (tab === 'blogs') {
      query = query.overlaps('tags', ['scientific-blog', 'blog']);
    } else if (tab === 'following' && currentUserId) {
      // Find tags followed by user
      const { data: followedTags } = await supabaseAdmin
        .from('tag_follows')
        .select('tag')
        .eq('user_id', currentUserId);

      const tags = (followedTags || []).map(t => t.tag);
      if (tags.length > 0) {
        query = query.overlaps('tags', tags);
      } else {
        // Not following any tags - return empty
        return { posts: [], total: 0 };
      }
    }

    // Default order by pinned first, then requested sort
    query = query.order('is_pinned', { ascending: false });

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'top-voted') {
      // Handled in memory if needed or by views_count as proxy
      query = query.order('views_count', { ascending: false });
    } else if (sort === 'most-active') {
      query = query.order('updated_at', { ascending: false });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: rawPosts, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list forum posts: ${error.message}`);
    }

    if (!rawPosts || rawPosts.length === 0) {
      return { posts: [], total: count || 0 };
    }

    const postIds = rawPosts.map(p => p.id);

    // Fetch answer counts and accepted answers
    const { data: answersData } = await supabaseAdmin
      .from('forum_answers')
      .select('id, post_id, is_accepted')
      .in('post_id', postIds);

    const answerCountMap = new Map<string, number>();
    const hasAcceptedMap = new Map<string, boolean>();

    (answersData || []).forEach(ans => {
      answerCountMap.set(ans.post_id, (answerCountMap.get(ans.post_id) || 0) + 1);
      if (ans.is_accepted) {
        hasAcceptedMap.set(ans.post_id, true);
      }
    });

    // Fetch user votes/reactions for these posts if currentUserId provided
    const userVoteMap = new Map<string, ForumVoteValue>();
    if (currentUserId) {
      const { data: votesData } = await supabaseAdmin
        .from('forum_votes')
        .select('target_id, vote_value')
        .eq('target_type', 'Post')
        .eq('voter_id', currentUserId)
        .in('target_id', postIds);

      (votesData || []).forEach(v => {
        userVoteMap.set(v.target_id, v.vote_value as ForumVoteValue);
      });
    }

    // Fetch aggregated reactions for all posts in a single fast batch query
    const batchReactionsMap = await ForumVoteService.getBatchReactionCounts('Post', postIds);

    const defaultReactions = {
      like: 0,
      love: 0,
      insightful: 0,
      celebrate: 0,
      curious: 0,
      support: 0,
      up: 0,
      down: 0,
      totalReactions: 0,
    };

    const postsWithReactions = rawPosts.map(p => {
      const reactions = batchReactionsMap.get(p.id) || defaultReactions;
        const authorProfile: any = p.profiles;
        const projectInfo: any = p.projects;

        const isFacultyVerified =
          authorProfile?.role === 'Supervisor' && authorProfile?.status === 'Active';

        const postAnswerCount = answerCountMap.get(p.id) || 0;
        const hasAccepted = hasAcceptedMap.get(p.id) || false;

        const score = reactions.up - reactions.down;

        const currentUserReaction = userVoteMap.get(p.id) || null;
        const currentUserVote =
          currentUserReaction === 'Up' || currentUserReaction === 'Down'
            ? currentUserReaction
            : null;

        const post: ForumPost = {
          id: p.id,
          authorId: p.author_id,
          projectId: p.project_id,
          title: p.title,
          body: p.body,
          tags: p.tags || [],
          attachmentIds: p.attachment_ids || [],
          isPinned: p.is_pinned,
          isLocked: p.is_locked,
          viewsCount: p.views_count,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          author: authorProfile ? {
            id: authorProfile.id,
            fullName: authorProfile.full_name,
            photoUrl: authorProfile.photo_url,
            role: authorProfile.role,
            reputationPoints: authorProfile.reputation_points || 0,
            institution: authorProfile.institution,
            isFacultyVerified,
          } : undefined,
          projectName: projectInfo?.title || null,
          score,
          upvotesCount: reactions.up,
          downvotesCount: reactions.down,
          reactions,
          currentUserReaction,
          currentUserVote,
          answersCount: postAnswerCount,
          hasAcceptedAnswer: hasAccepted,
        };

        return post;
      });

    // If tab is 'unanswered', filter out posts that have accepted answers or answerCount > 0
    let filteredPosts = postsWithReactions;
    if (tab === 'unanswered') {
      filteredPosts = postsWithReactions.filter(p => !p.hasAcceptedAnswer && (p.answersCount || 0) === 0);
    }

    // If sort is 'top-voted', sort by score
    if (sort === 'top-voted') {
      filteredPosts.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    return {
      posts: filteredPosts,
      total: count || filteredPosts.length,
    };
  }

  /**
   * Get single post by ID with full answers, comments, and attachments
   */
  static async getPostById(id: string, currentUserId?: string): Promise<ForumPost | null> {
    // Increment view count safely
    try {
      const { data: current } = await supabaseAdmin
        .from('forum_posts')
        .select('views_count')
        .eq('id', id)
        .single();
      if (current) {
        await supabaseAdmin
          .from('forum_posts')
          .update({ views_count: (current.views_count || 0) + 1 })
          .eq('id', id);
      }
    } catch {
      // Non-blocking view increment error
    }

    const { data: p, error } = await supabaseAdmin
      .from('forum_posts')
      .select(`
        id,
        author_id,
        project_id,
        title,
        body,
        tags,
        attachment_ids,
        is_pinned,
        is_locked,
        views_count,
        created_at,
        updated_at,
        profiles!forum_posts_author_id_fkey(
          id,
          full_name,
          photo_url,
          role,
          reputation_points,
          institution,
          status
        ),
        projects(
          id,
          title
        )
      `)
      .eq('id', id)
      .single();

    if (error || !p) {
      return null;
    }

    const authorProfile: any = p.profiles;
    const projectInfo: any = p.projects;
    const isFacultyVerified =
      authorProfile?.role === 'Supervisor' && authorProfile?.status === 'Active';

    // Reactions for post
    const reactions = await ForumVoteService.getReactionCounts('Post', p.id);

    // Current user vote/reaction on post
    let currentUserReaction: ForumVoteValue | null = null;
    if (currentUserId) {
      const { data: vote } = await supabaseAdmin
        .from('forum_votes')
        .select('vote_value')
        .eq('target_type', 'Post')
        .eq('target_id', p.id)
        .eq('voter_id', currentUserId)
        .maybeSingle();

      if (vote) {
        currentUserReaction = vote.vote_value as ForumVoteValue;
      }
    }

    const currentUserVote =
      currentUserReaction === 'Up' || currentUserReaction === 'Down'
        ? currentUserReaction
        : null;

    // Fetch attachments if any
    let attachments: any[] = [];
    if (p.attachment_ids && p.attachment_ids.length > 0) {
      const { data: files } = await supabaseAdmin
        .from('file_assets')
        .select('*')
        .in('id', p.attachment_ids);
      attachments = (files || []).map(f => ({
        id: f.id,
        fileName: f.file_name,
        fileType: f.file_type,
        fileSize: f.file_size,
        storagePath: f.storage_path,
        createdAt: f.created_at,
      }));
    }

    return {
      id: p.id,
      authorId: p.author_id,
      projectId: p.project_id,
      title: p.title,
      body: p.body,
      tags: p.tags || [],
      attachmentIds: p.attachment_ids || [],
      isPinned: p.is_pinned,
      isLocked: p.is_locked,
      viewsCount: p.views_count,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      author: authorProfile ? {
        id: authorProfile.id,
        fullName: authorProfile.full_name,
        photoUrl: authorProfile.photo_url,
        role: authorProfile.role,
        reputationPoints: authorProfile.reputation_points || 0,
        institution: authorProfile.institution,
        isFacultyVerified,
      } : undefined,
      projectName: projectInfo?.title || null,
      score: reactions.up - reactions.down,
      upvotesCount: reactions.up,
      downvotesCount: reactions.down,
      reactions,
      currentUserReaction,
      currentUserVote,
      attachments,
    };
  }

  /**
   * Create a new forum post
   */
  static async createPost(
    authorId: string,
    params: {
      title: string;
      body: string;
      tags?: string[];
      attachmentIds?: string[];
      projectId?: string;
    }
  ): Promise<ForumPost> {
    const { title, body, tags = [], attachmentIds = [], projectId } = params;

    const cleanTags = tags
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0)
      .slice(0, 10);

    const { data: post, error } = await supabaseAdmin
      .from('forum_posts')
      .insert({
        author_id: authorId,
        project_id: projectId || null,
        title: title.trim(),
        body: body.trim(),
        tags: cleanTags,
        attachment_ids: attachmentIds,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }

    // Check badges for author
    await CommunityProfileService.checkAndAwardBadges(authorId);

    const fullPost = await this.getPostById(post.id, authorId);
    return fullPost!;
  }

  /**
   * Update an existing forum post
   */
  static async updatePost(
    postId: string,
    params: {
      title?: string;
      body?: string;
      tags?: string[];
      attachmentIds?: string[];
      isPinned?: boolean;
      isLocked?: boolean;
    }
  ): Promise<ForumPost> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (params.title !== undefined) updateData.title = params.title.trim();
    if (params.body !== undefined) updateData.body = params.body.trim();
    if (params.tags !== undefined) {
      updateData.tags = params.tags
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0)
        .slice(0, 10);
    }
    if (params.attachmentIds !== undefined) updateData.attachment_ids = params.attachmentIds;
    if (params.isPinned !== undefined) updateData.is_pinned = params.isPinned;
    if (params.isLocked !== undefined) updateData.is_locked = params.isLocked;

    const { error } = await supabaseAdmin
      .from('forum_posts')
      .update(updateData)
      .eq('id', postId);

    if (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }

    const updated = await this.getPostById(postId);
    return updated!;
  }

  /**
   * Delete a forum post
   */
  static async deletePost(postId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('forum_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }
  }
}
