import { supabaseAdmin } from '../supabase.js';
import { ExperimentComment, AddExperimentCommentDto } from '@researchos/shared-types';

export class ExperimentCommentService {
  /**
   * Post a discussion comment on an experiment
   */
  static async addComment(
    experimentId: string,
    dto: AddExperimentCommentDto,
    authorId: string
  ): Promise<ExperimentComment> {
    if (!dto.body || dto.body.trim().length === 0) {
      throw new Error('Comment body is required');
    }

    const { data, error } = await supabaseAdmin
      .from('experiment_comments')
      .insert({
        experiment_id: experimentId,
        author_id: authorId,
        body: dto.body.trim(),
      })
      .select('*, profiles:author_id(full_name, photo_url)')
      .single();

    if (error || !data) {
      console.error('Error adding experiment comment:', error);
      throw new Error(`Failed to add experiment comment: ${error?.message}`);
    }

    return {
      id: data.id,
      experimentId: data.experiment_id,
      authorId: data.author_id,
      body: data.body,
      createdAt: data.created_at,
      authorName: data.profiles?.full_name,
      authorAvatarUrl: data.profiles?.photo_url,
    };
  }

  /**
   * Get discussion comments for an experiment
   */
  static async getComments(experimentId: string): Promise<ExperimentComment[]> {
    const { data, error } = await supabaseAdmin
      .from('experiment_comments')
      .select('*, profiles:author_id(full_name, photo_url)')
      .eq('experiment_id', experimentId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch experiment comments: ${error.message}`);
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      experimentId: c.experiment_id,
      authorId: c.author_id,
      body: c.body,
      createdAt: c.created_at,
      authorName: c.profiles?.full_name,
      authorAvatarUrl: c.profiles?.photo_url,
    }));
  }

  /**
   * Delete a comment (author only)
   */
  static async deleteComment(commentId: string, authorId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('experiment_comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', authorId);

    if (error) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }
}
