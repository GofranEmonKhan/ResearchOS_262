import { supabaseAdmin } from '../supabase.js';
import { TagFollow } from '@researchos/shared-types';
import { CommunityError } from './communityProfile.service.js';

/**
 * Returns list of tags followed by a user.
 */
export async function getFollowedTags(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('tag_follows')
    .select('tag')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((r) => r.tag);
}

/**
 * Follows a research tag.
 */
export async function followTag(userId: string, tag: string): Promise<TagFollow> {
  const cleanTag = tag.trim().toLowerCase().replace(/^#/, '');
  if (!cleanTag) {
    throw new CommunityError('Tag cannot be empty', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('tag_follows')
    .upsert({ user_id: userId, tag: cleanTag }, { onConflict: 'user_id,tag' })
    .select('*')
    .single();

  if (error || !data) {
    throw new CommunityError(error?.message || 'Failed to follow tag', 500);
  }

  return {
    userId: data.user_id,
    tag: data.tag,
    createdAt: data.created_at,
  };
}

/**
 * Unfollows a research tag.
 */
export async function unfollowTag(userId: string, tag: string): Promise<void> {
  const cleanTag = tag.trim().toLowerCase().replace(/^#/, '');
  await supabaseAdmin
    .from('tag_follows')
    .delete()
    .eq('user_id', userId)
    .eq('tag', cleanTag);
}

/**
 * Aggregates popular research tags from forum posts.
 */
export async function getPopularTags(limit: number = 20): Promise<{ tag: string; count: number }[]> {
  const { data: posts, error } = await supabaseAdmin
    .from('forum_posts')
    .select('tags');

  if (error || !posts) return [];

  const counts: Record<string, number> = {};
  for (const p of posts) {
    if (Array.isArray(p.tags)) {
      for (const t of p.tags) {
        const normalized = t.trim().toLowerCase().replace(/^#/, '');
        if (normalized) {
          counts[normalized] = (counts[normalized] || 0) + 1;
        }
      }
    }
  }

  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export class TagFollowService {
  static getFollowedTags = getFollowedTags;
  static followTag = followTag;
  static unfollowTag = unfollowTag;
  static getPopularTags = getPopularTags;
}

