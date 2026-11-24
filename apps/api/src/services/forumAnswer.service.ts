import { supabaseAdmin } from '../supabase.js';
import { ForumAnswer, ForumVoteValue } from '@researchos/shared-types';
import { ForumVoteService } from './forumVote.service.js';
import { CommunityProfileService } from './communityProfile.service.js';
import { ForumCommentService } from './forumComment.service.js';
import { NotificationService } from './notification.service.js';

export class ForumAnswerService {
  /**
   * List all answers for a given post, ordered by accepted/verified first, then highest score, then newest
   */
  static async listAnswersForPost(postId: string, currentUserId?: string): Promise<ForumAnswer[]> {
    const { data: rawAnswers, error } = await supabaseAdmin
      .from('forum_answers')
      .select(`
        id,
        post_id,
        author_id,
        body,
        is_accepted,
        expert_verified_by,
        expert_verified_at,
        created_at,
        updated_at,
        author:profiles!forum_answers_author_id_fkey(
          id,
          full_name,
          photo_url,
          role,
          reputation_points,
          institution,
          status
        ),
        expert_verifier:profiles!forum_answers_expert_verified_by_fkey(
          id,
          full_name,
          photo_url,
          role,
          reputation_points,
          institution,
          status
        )
      `)
      .eq('post_id', postId);

    if (error) {
      throw new Error(`Failed to list answers: ${error.message}`);
    }

    if (!rawAnswers || rawAnswers.length === 0) {
      return [];
    }

    const answerIds = rawAnswers.map(a => a.id);

    // Fetch user votes for these answers if currentUserId supplied
    const userVoteMap = new Map<string, ForumVoteValue>();
    if (currentUserId) {
      const { data: votesData } = await supabaseAdmin
        .from('forum_votes')
        .select('target_id, vote_value')
        .eq('target_type', 'Answer')
        .eq('voter_id', currentUserId)
        .in('target_id', answerIds);

      (votesData || []).forEach(v => {
        userVoteMap.set(v.target_id, v.vote_value as ForumVoteValue);
      });
    }

    const enrichedAnswers = await Promise.all(
      rawAnswers.map(async a => {
        const reactions = await ForumVoteService.getReactionCounts('Answer', a.id);
        const comments = await ForumCommentService.listComments('Answer', a.id);

        const authorProfile: any = a.author;
        const verifierProfile: any = a.expert_verifier;

        const isFacultyVerified =
          authorProfile?.role === 'Supervisor' && authorProfile?.status === 'Active';

        const currentUserReaction = userVoteMap.get(a.id) || null;
        const currentUserVote =
          currentUserReaction === 'Up' || currentUserReaction === 'Down'
            ? currentUserReaction
            : null;

        const answer: ForumAnswer = {
          id: a.id,
          postId: a.post_id,
          authorId: a.author_id,
          body: a.body,
          isAccepted: a.is_accepted,
          expertVerifiedBy: a.expert_verified_by,
          expertVerifiedAt: a.expert_verified_at,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
          author: authorProfile ? {
            id: authorProfile.id,
            fullName: authorProfile.full_name,
            photoUrl: authorProfile.photo_url,
            role: authorProfile.role,
            reputationPoints: authorProfile.reputation_points || 0,
            institution: authorProfile.institution,
            isFacultyVerified,
          } : undefined,
          expertVerifier: verifierProfile ? {
            id: verifierProfile.id,
            fullName: verifierProfile.full_name,
            photoUrl: verifierProfile.photo_url,
            role: verifierProfile.role,
            reputationPoints: verifierProfile.reputation_points || 0,
            institution: verifierProfile.institution,
            isFacultyVerified: verifierProfile.role === 'Supervisor' && verifierProfile.status === 'Active',
          } : undefined,
          score: reactions.up - reactions.down,
          upvotesCount: reactions.up,
          downvotesCount: reactions.down,
          reactions,
          currentUserReaction,
          currentUserVote,
          comments,
        };

        return answer;
      })
    );

    // Sort: Accepted answers first, then Expert Verified, then highest score, then newest
    enrichedAnswers.sort((a, b) => {
      if (a.isAccepted !== b.isAccepted) {
        return a.isAccepted ? -1 : 1;
      }
      const aVerified = !!a.expertVerifiedBy;
      const bVerified = !!b.expertVerifiedBy;
      if (aVerified !== bVerified) {
        return aVerified ? -1 : 1;
      }
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return enrichedAnswers;
  }

  /**
   * Create an answer for a post
   */
  static async createAnswer(postId: string, authorId: string, body: string): Promise<ForumAnswer> {
    // Check if post is locked
    const { data: post, error: postErr } = await supabaseAdmin
      .from('forum_posts')
      .select('id, author_id, title, is_locked')
      .eq('id', postId)
      .single();

    if (postErr || !post) {
      throw new Error('Post not found');
    }

    if (post.is_locked) {
      throw new Error('This discussion is locked and cannot receive new answers');
    }

    const { data: answer, error } = await supabaseAdmin
      .from('forum_answers')
      .insert({
        post_id: postId,
        author_id: authorId,
        body: body.trim(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create answer: ${error.message}`);
    }

    // Touch post updated_at
    await supabaseAdmin
      .from('forum_posts')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', postId);

    // Award badge check for author
    await CommunityProfileService.checkAndAwardBadges(authorId);

    // Send notification to post author if not the same person
    if (post.author_id !== authorId) {
      try {
        await NotificationService.createNotification({
          userId: post.author_id,
          type: 'AnswerAccepted',
          payload: {
            actorId: authorId,
            title: 'New answer to your question',
            message: `Someone provided an answer to "${post.title.substring(0, 40)}..."`,
            postId,
          },
        });
      } catch (err) {
        // Notification failure shouldn't block answer creation
        console.warn('Failed to dispatch notification:', err);
      }
    }


    const answers = await this.listAnswersForPost(postId, authorId);
    return answers.find(a => a.id === answer.id)!;
  }

  /**
   * Update an existing answer
   */
  static async updateAnswer(answerId: string, body: string): Promise<ForumAnswer> {
    const { data: updated, error } = await supabaseAdmin
      .from('forum_answers')
      .update({
        body: body.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', answerId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update answer: ${error.message}`);
    }

    const answers = await this.listAnswersForPost(updated.post_id);
    return answers.find(a => a.id === answerId)!;
  }

  /**
   * Delete an answer
   */
  static async deleteAnswer(answerId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('forum_answers')
      .delete()
      .eq('id', answerId);

    if (error) {
      throw new Error(`Failed to delete answer: ${error.message}`);
    }
  }

  /**
   * Accept an answer (Only the post author can perform this)
   */
  static async acceptAnswer(answerId: string, actingUserId: string): Promise<ForumAnswer> {
    // 1. Fetch answer and its post
    const { data: answer, error: ansErr } = await supabaseAdmin
      .from('forum_answers')
      .select('id, post_id, author_id, is_accepted, forum_posts!forum_answers_post_id_fkey(id, author_id, title)')
      .eq('id', answerId)
      .single();

    if (ansErr || !answer) {
      throw new Error('Answer not found');
    }

    const post: any = answer.forum_posts;
    if (!post) {
      throw new Error('Associated question not found');
    }

    if (post.author_id !== actingUserId) {
      throw new Error('Only the question author can accept an answer');
    }

    if (answer.is_accepted) {
      // Already accepted, nothing to do
      const answers = await this.listAnswersForPost(answer.post_id, actingUserId);
      return answers.find(a => a.id === answerId)!;
    }

    // 2. Unaccept any previous accepted answer on this post & adjust reputation
    const { data: previousAccepted } = await supabaseAdmin
      .from('forum_answers')
      .select('id, author_id')
      .eq('post_id', answer.post_id)
      .eq('is_accepted', true);

    if (previousAccepted && previousAccepted.length > 0) {
      for (const prev of previousAccepted) {
        await supabaseAdmin
          .from('forum_answers')
          .update({ is_accepted: false })
          .eq('id', prev.id);

        // Revert reputation delta for previously accepted answer
        await ForumVoteService.adjustReputation(prev.author_id, -15);
        await ForumVoteService.adjustReputation(post.author_id, -2);
      }
    }

    // 3. Mark current answer as accepted
    const { error: updateErr } = await supabaseAdmin
      .from('forum_answers')
      .update({ is_accepted: true, updated_at: new Date().toISOString() })
      .eq('id', answerId);

    if (updateErr) {
      throw new Error(`Failed to accept answer: ${updateErr.message}`);
    }

    // 4. Award reputation: +15 to answerer, +2 to asker
    await ForumVoteService.adjustReputation(answer.author_id, 15);
    await ForumVoteService.adjustReputation(post.author_id, 2);

    // 5. Check badges
    await CommunityProfileService.checkAndAwardBadges(answer.author_id);
    await CommunityProfileService.checkAndAwardBadges(post.author_id);

    // 6. Notify answer author
    if (answer.author_id !== actingUserId) {
      try {
        await NotificationService.createNotification({
          userId: answer.author_id,
          type: 'AnswerAccepted',
          payload: {
            actorId: actingUserId,
            title: 'Your answer was accepted!',
            message: `Your answer on "${post.title.substring(0, 40)}..." was marked as the accepted solution (+15 Rep).`,
            postId: answer.post_id,
          },
        });
      } catch (err) {
        console.warn('Failed to notify accepted answer author:', err);
      }
    }

    const answers = await this.listAnswersForPost(answer.post_id, actingUserId);
    return answers.find(a => a.id === answerId)!;
  }

  /**
   * Unaccept an answer
   */
  static async unacceptAnswer(answerId: string, actingUserId: string): Promise<ForumAnswer> {
    const { data: answer, error: ansErr } = await supabaseAdmin
      .from('forum_answers')
      .select('id, post_id, author_id, is_accepted, forum_posts!forum_answers_post_id_fkey(id, author_id)')
      .eq('id', answerId)
      .single();

    if (ansErr || !answer) {
      throw new Error('Answer not found');
    }

    const post: any = answer.forum_posts;
    if (!post || post.author_id !== actingUserId) {
      throw new Error('Only the question author can unaccept an answer');
    }

    if (!answer.is_accepted) {
      const answers = await this.listAnswersForPost(answer.post_id, actingUserId);
      return answers.find(a => a.id === answerId)!;
    }

    await supabaseAdmin
      .from('forum_answers')
      .update({ is_accepted: false, updated_at: new Date().toISOString() })
      .eq('id', answerId);

    // Revert reputation
    await ForumVoteService.adjustReputation(answer.author_id, -15);
    await ForumVoteService.adjustReputation(post.author_id, -2);

    const answers = await this.listAnswersForPost(answer.post_id, actingUserId);
    return answers.find(a => a.id === answerId)!;
  }

  /**
   * Expert verify an answer (Only active Supervisor in field or Admin)
   */
  static async expertVerifyAnswer(answerId: string, supervisorId: string): Promise<ForumAnswer> {
    const { data: supervisor } = await supabaseAdmin
      .from('profiles')
      .select('id, role, status, full_name')
      .eq('id', supervisorId)
      .single();

    if (!supervisor || supervisor.status !== 'Active' || (supervisor.role !== 'Supervisor' && supervisor.role !== 'Admin')) {
      throw new Error('Only active Supervisors or Admins can grant Expert Verification');
    }

    const { data: answer, error: ansErr } = await supabaseAdmin
      .from('forum_answers')
      .select('id, post_id, author_id, expert_verified_by, forum_posts!forum_answers_post_id_fkey(id, title)')
      .eq('id', answerId)
      .single();

    if (ansErr || !answer) {
      throw new Error('Answer not found');
    }

    if (answer.expert_verified_by) {
      // Already verified
      const answers = await this.listAnswersForPost(answer.post_id, supervisorId);
      return answers.find(a => a.id === answerId)!;
    }

    const now = new Date().toISOString();
    await supabaseAdmin
      .from('forum_answers')
      .update({
        expert_verified_by: supervisorId,
        expert_verified_at: now,
        updated_at: now,
      })
      .eq('id', answerId);

    // Award +20 reputation to answer author
    await ForumVoteService.adjustReputation(answer.author_id, 20);
    await CommunityProfileService.checkAndAwardBadges(answer.author_id);

    const post: any = answer.forum_posts;

    // Send notification
    try {
      await NotificationService.createNotification({
        userId: answer.author_id,
        type: 'ExpertVerified',
        payload: {
          actorId: supervisorId,
          title: 'Answer Expert Verified!',
          message: `${supervisor.full_name} verified your answer on "${(post?.title || '').substring(0, 40)}..." (+20 Rep).`,
          postId: answer.post_id,
        },
      });
    } catch (err) {
      console.warn('Failed to notify expert verified answer:', err);
    }


    const answers = await this.listAnswersForPost(answer.post_id, supervisorId);
    return answers.find(a => a.id === answerId)!;
  }

  /**
   * Revoke expert verification
   */
  static async revokeExpertVerification(answerId: string, supervisorId: string): Promise<ForumAnswer> {
    const { data: answer, error: ansErr } = await supabaseAdmin
      .from('forum_answers')
      .select('id, post_id, author_id, expert_verified_by')
      .eq('id', answerId)
      .single();

    if (ansErr || !answer) {
      throw new Error('Answer not found');
    }

    if (!answer.expert_verified_by) {
      const answers = await this.listAnswersForPost(answer.post_id, supervisorId);
      return answers.find(a => a.id === answerId)!;
    }

    await supabaseAdmin
      .from('forum_answers')
      .update({
        expert_verified_by: null,
        expert_verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', answerId);

    // Revert +20 reputation
    await ForumVoteService.adjustReputation(answer.author_id, -20);

    const answers = await this.listAnswersForPost(answer.post_id, supervisorId);
    return answers.find(a => a.id === answerId)!;
  }
}
