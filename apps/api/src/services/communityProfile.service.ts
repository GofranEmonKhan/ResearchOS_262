import { supabaseAdmin } from '../supabase.js';
import { CommunityProfile, UserRole, UserStatus, UserBadge } from '@researchos/shared-types';

export class CommunityError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'CommunityError';
    this.statusCode = statusCode;
  }
}

/**
 * Checks and awards merit badges based on community achievements.
 */
export async function checkAndAwardBadges(userId: string): Promise<void> {
  try {
    // 1. Fetch user's stats
    const [{ count: postsCount }, { count: answersCount }, { count: acceptedCount }, { count: verifiedCount }, { data: profile }] = await Promise.all([
      supabaseAdmin.from('forum_posts').select('*', { count: 'exact', head: true }).eq('author_id', userId),
      supabaseAdmin.from('forum_answers').select('*', { count: 'exact', head: true }).eq('author_id', userId),
      supabaseAdmin.from('forum_answers').select('*', { count: 'exact', head: true }).eq('author_id', userId).eq('is_accepted', true),
      supabaseAdmin.from('forum_answers').select('*', { count: 'exact', head: true }).eq('author_id', userId).not('expert_verified_by', 'is', null),
      supabaseAdmin.from('profiles').select('reputation_points').eq('id', userId).single(),
    ]);

    const { count: tagsCount } = await supabaseAdmin
      .from('tag_follows')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: allBadges } = await supabaseAdmin.from('badges').select('*');
    if (!allBadges || allBadges.length === 0) return;

    const { data: existingUserBadges } = await supabaseAdmin
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    const ownedBadgeIds = new Set((existingUserBadges || []).map((b) => b.badge_id));
    const badgesToAward: string[] = [];

    for (const badge of allBadges) {
      if (ownedBadgeIds.has(badge.id)) continue;

      let qualified = false;
      switch (badge.criteria) {
        case 'first_question':
          qualified = (postsCount ?? 0) >= 1;
          break;
        case 'five_questions':
          qualified = (postsCount ?? 0) >= 5;
          break;
        case 'first_answer':
          qualified = (answersCount ?? 0) >= 1;
          break;
        case 'accepted_answer':
          qualified = (acceptedCount ?? 0) >= 1;
          break;
        case 'expert_verified':
          qualified = (verifiedCount ?? 0) >= 1;
          break;
        case 'reputation_100':
          qualified = (profile?.reputation_points ?? 0) >= 100;
          break;
        case 'follow_five_tags':
          qualified = (tagsCount ?? 0) >= 5;
          break;
      }

      if (qualified) {
        badgesToAward.push(badge.id);
      }
    }

    if (badgesToAward.length > 0) {
      const rows = badgesToAward.map((badgeId) => ({
        user_id: userId,
        badge_id: badgeId,
        awarded_at: new Date().toISOString(),
      }));

      await supabaseAdmin.from('user_badges').insert(rows);
    }
  } catch (err) {
    console.error('checkAndAwardBadges error:', err);
  }
}

/**
 * Retrieves public community profile, reputation rank, badges, and recent activity.
 */
export async function getCommunityProfile(targetUserId: string): Promise<CommunityProfile> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single();

  if (error || !profile) {
    throw new CommunityError('User profile not found', 404);
  }

  // Trigger badge check on profile view
  await checkAndAwardBadges(targetUserId);

  const [
    { count: postsCount },
    { count: answersCount },
    { count: acceptedAnswersCount },
    { count: expertVerifiedCount },
    { data: userBadgesData },
    { data: recentPostsData },
    { data: recentAnswersData },
  ] = await Promise.all([
    supabaseAdmin.from('forum_posts').select('*', { count: 'exact', head: true }).eq('author_id', targetUserId),
    supabaseAdmin.from('forum_answers').select('*', { count: 'exact', head: true }).eq('author_id', targetUserId),
    supabaseAdmin.from('forum_answers').select('*', { count: 'exact', head: true }).eq('author_id', targetUserId).eq('is_accepted', true),
    supabaseAdmin.from('forum_answers').select('*', { count: 'exact', head: true }).eq('author_id', targetUserId).not('expert_verified_by', 'is', null),
    supabaseAdmin.from('user_badges').select('user_id, badge_id, awarded_at, badge:badges(*)').eq('user_id', targetUserId),
    supabaseAdmin.from('forum_posts').select('*').eq('author_id', targetUserId).order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('forum_answers').select('*').eq('author_id', targetUserId).order('created_at', { ascending: false }).limit(5),
  ]);

  const badges: UserBadge[] = (userBadgesData || []).map((ub: any) => ({
    userId: ub.user_id,
    badgeId: ub.badge_id,
    awardedAt: ub.awarded_at,
    badge: ub.badge,
  }));

  const isFacultyVerified = profile.role === 'Supervisor' && profile.status === 'Active';

  return {
    userId: profile.id,
    fullName: profile.full_name || 'Scholar',
    photoUrl: profile.photo_url || null,
    bio: profile.bio || null,
    institution: profile.institution || '',
    department: profile.department || '',
    role: profile.role as UserRole,
    status: profile.status as UserStatus,
    isFacultyVerified,
    reputationPoints: profile.reputation_points ?? 0,
    researchFieldTags: profile.research_field_tags || [],
    badges,
    stats: {
      postsCount: postsCount ?? 0,
      answersCount: answersCount ?? 0,
      acceptedAnswersCount: acceptedAnswersCount ?? 0,
      expertVerifiedCount: expertVerifiedCount ?? 0,
      upvotesReceived: 0,
    },
    recentPosts: (recentPostsData || []).map((p: any) => ({
      id: p.id,
      authorId: p.author_id,
      projectId: p.project_id,
      title: p.title,
      body: p.body,
      tags: p.tags || [],
      attachmentIds: p.attachment_ids || [],
      isPinned: p.is_pinned,
      isLocked: p.is_locked,
      viewsCount: p.views_count || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    recentAnswers: (recentAnswersData || []).map((a: any) => ({
      id: a.id,
      postId: a.post_id,
      authorId: a.author_id,
      body: a.body,
      isAccepted: a.is_accepted,
      expertVerifiedBy: a.expert_verified_by,
      expertVerifiedAt: a.expert_verified_at,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    })),
  };
}

export class CommunityProfileService {
  static checkAndAwardBadges = checkAndAwardBadges;
  static getCommunityProfile = getCommunityProfile;
}

