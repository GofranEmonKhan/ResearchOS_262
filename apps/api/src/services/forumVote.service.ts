import { supabaseAdmin } from '../supabase.js';
import { ForumTargetType, ForumVoteValue, ReactionCounts, ReactionUser, UserRole } from '@researchos/shared-types';
import { CommunityError, checkAndAwardBadges } from './communityProfile.service.js';

const POSITIVE_VOTES: Set<ForumVoteValue> = new Set(['Up', 'Like', 'Love', 'Insightful', 'Celebrate', 'Support']);
const NEGATIVE_VOTES: Set<ForumVoteValue> = new Set(['Down']);

/**
 * Calculates reputation points delta for a target author.
 */
function getReputationDelta(oldVal: ForumVoteValue | null, newVal: ForumVoteValue | null): number {
  let delta = 0;

  // Revert previous value
  if (oldVal) {
    if (POSITIVE_VOTES.has(oldVal)) delta -= 10;
    else if (NEGATIVE_VOTES.has(oldVal)) delta += 2;
  }

  // Apply new value
  if (newVal) {
    if (POSITIVE_VOTES.has(newVal)) delta += 10;
    else if (NEGATIVE_VOTES.has(newVal)) delta -= 2;
  }

  return delta;
}

/**
 * Casts or switches a reaction/vote on a post or answer.
 */
export async function castVote(
  targetType: ForumTargetType,
  targetId: string,
  voterId: string,
  value: ForumVoteValue
): Promise<{
  success: boolean;
  reactions: ReactionCounts;
  userReaction: ForumVoteValue;
  currentUserReaction: ForumVoteValue;
  currentUserVote: 'Up' | 'Down' | null;
  score: number;
  upvotesCount: number;
  downvotesCount: number;
}> {
  // 1. Fetch target item to verify existence and check self-voting
  let targetAuthorId: string | null = null;

  if (targetType === 'Post') {
    const { data: post, error } = await supabaseAdmin
      .from('forum_posts')
      .select('author_id')
      .eq('id', targetId)
      .single();
    if (error || !post) throw new CommunityError('Post not found', 404);
    targetAuthorId = post.author_id;
  } else {
    const { data: answer, error } = await supabaseAdmin
      .from('forum_answers')
      .select('author_id')
      .eq('id', targetId)
      .single();
    if (error || !answer) throw new CommunityError('Answer not found', 404);
    targetAuthorId = answer.author_id;
  }

  if (targetAuthorId === voterId) {
    throw new CommunityError('You cannot react or vote on your own content', 400);
  }

  // 2. Check existing vote
  const { data: existingVote } = await supabaseAdmin
    .from('forum_votes')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('voter_id', voterId)
    .maybeSingle();

  const oldVal = existingVote ? (existingVote.value as ForumVoteValue) : null;
  const delta = getReputationDelta(oldVal, value);

  // 3. Upsert vote record
  const { error: upsertError } = await supabaseAdmin
    .from('forum_votes')
    .upsert(
      {
        target_type: targetType,
        target_id: targetId,
        voter_id: voterId,
        value,
      },
      { onConflict: 'target_type,target_id,voter_id' }
    );

  if (upsertError) {
    throw new CommunityError(upsertError.message, 500);
  }

  // 4. Update author reputation if delta != 0
  if (delta !== 0 && targetAuthorId) {
    const { data: authorProf } = await supabaseAdmin
      .from('profiles')
      .select('reputation_points')
      .eq('id', targetAuthorId)
      .single();

    const currentPoints = authorProf?.reputation_points ?? 0;
    const newPoints = Math.max(0, currentPoints + delta);

    await supabaseAdmin
      .from('profiles')
      .update({ reputation_points: newPoints, updated_at: new Date().toISOString() })
      .eq('id', targetAuthorId);

    // Check badges for author
    await checkAndAwardBadges(targetAuthorId);
  }

  const reactions = await getReactionCounts(targetType, targetId);
  const upvotesCount = reactions.up;
  const downvotesCount = reactions.down;
  const score = upvotesCount - downvotesCount;

  return {
    success: true,
    reactions,
    userReaction: value,
    currentUserReaction: value,
    currentUserVote: value === 'Up' || value === 'Down' ? (value as 'Up' | 'Down') : null,
    score,
    upvotesCount,
    downvotesCount,
  };
}

/**
 * Retracts an existing vote/reaction.
 */
export async function retractVote(
  targetType: ForumTargetType,
  targetId: string,
  voterId: string
): Promise<{
  success: boolean;
  reactions: ReactionCounts;
  userReaction: null;
  currentUserReaction: null;
  currentUserVote: null;
  score: number;
  upvotesCount: number;
  downvotesCount: number;
}> {
  // 1. Fetch target item
  let targetAuthorId: string | null = null;
  if (targetType === 'Post') {
    const { data: post } = await supabaseAdmin.from('forum_posts').select('author_id').eq('id', targetId).single();
    targetAuthorId = post?.author_id ?? null;
  } else {
    const { data: answer } = await supabaseAdmin.from('forum_answers').select('author_id').eq('id', targetId).single();
    targetAuthorId = answer?.author_id ?? null;
  }

  // 2. Fetch existing vote
  const { data: existingVote } = await supabaseAdmin
    .from('forum_votes')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('voter_id', voterId)
    .maybeSingle();

  if (!existingVote) {
    const reactions = await getReactionCounts(targetType, targetId);
    return {
      success: true,
      reactions,
      userReaction: null,
      currentUserReaction: null,
      currentUserVote: null,
      score: reactions.up - reactions.down,
      upvotesCount: reactions.up,
      downvotesCount: reactions.down,
    };
  }

  const oldVal = existingVote.value as ForumVoteValue;
  const delta = getReputationDelta(oldVal, null);

  // 3. Delete vote record
  await supabaseAdmin
    .from('forum_votes')
    .delete()
    .eq('id', existingVote.id);

  // 4. Update author reputation if delta != 0
  if (delta !== 0 && targetAuthorId) {
    const { data: authorProf } = await supabaseAdmin
      .from('profiles')
      .select('reputation_points')
      .eq('id', targetAuthorId)
      .single();

    const currentPoints = authorProf?.reputation_points ?? 0;
    const newPoints = Math.max(0, currentPoints + delta);

    await supabaseAdmin
      .from('profiles')
      .update({ reputation_points: newPoints, updated_at: new Date().toISOString() })
      .eq('id', targetAuthorId);
  }

  const reactions = await getReactionCounts(targetType, targetId);
  const upvotesCount = reactions.up;
  const downvotesCount = reactions.down;
  const score = upvotesCount - downvotesCount;

  return {
    success: true,
    reactions,
    userReaction: null,
    currentUserReaction: null,
    currentUserVote: null,
    score,
    upvotesCount,
    downvotesCount,
  };
}

/**
 * Computes aggregated reaction breakdown for a target.
 */
export async function getReactionCounts(targetType: ForumTargetType, targetId: string): Promise<ReactionCounts> {
  const { data: votes } = await supabaseAdmin
    .from('forum_votes')
    .select('value')
    .eq('target_type', targetType)
    .eq('target_id', targetId);

  const counts: ReactionCounts = {
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

  if (!votes) return counts;

  counts.totalReactions = votes.length;
  for (const v of votes) {
    switch (v.value) {
      case 'Like':
        counts.like++;
        break;
      case 'Love':
        counts.love++;
        break;
      case 'Insightful':
        counts.insightful++;
        break;
      case 'Celebrate':
        counts.celebrate++;
        break;
      case 'Curious':
        counts.curious++;
        break;
      case 'Support':
        counts.support++;
        break;
      case 'Up':
        counts.up++;
        break;
      case 'Down':
        counts.down++;
        break;
    }
  }

  return counts;
}

/**
 * Returns detailed list of reactors with user profiles.
 */
export async function getReactorsList(targetType: ForumTargetType, targetId: string): Promise<ReactionUser[]> {
  const { data: votes, error } = await supabaseAdmin
    .from('forum_votes')
    .select('voter_id, value, created_at, profile:profiles(id, full_name, photo_url, role)')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false });

  if (error || !votes) return [];

  return votes.map((v: any) => ({
    userId: v.voter_id,
    fullName: v.profile?.full_name || 'Scholar',
    photoUrl: v.profile?.photo_url || null,
    role: v.profile?.role as UserRole,
    value: v.value as ForumVoteValue,
    createdAt: v.created_at,
  }));
}

/**
 * Adjusts user reputation points directly with zero floor clamp
 */
export async function adjustReputation(userId: string, delta: number): Promise<number> {
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('reputation_points')
    .eq('id', userId)
    .single();

  const current = prof?.reputation_points ?? 0;
  const newPoints = Math.max(0, current + delta);

  await supabaseAdmin
    .from('profiles')
    .update({ reputation_points: newPoints, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return newPoints;
}

export class ForumVoteService {
  static castVote = castVote;
  static retractVote = retractVote;
  static getReactionCounts = getReactionCounts;
  static getReactorsList = getReactorsList;
  static adjustReputation = adjustReputation;
}

