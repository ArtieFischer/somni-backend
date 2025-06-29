import { supabaseService } from './supabase';
import { 
  ShareDreamRequest, 
  ShareDreamResponse, 
  GetSharedDreamsParams, 
  GetSharedDreamsResponse,
  PublicSharedDream 
} from '../types';

export class DreamSharingService {
  /**
   * Share a dream publicly
   */
  async shareDream(
    dreamId: string, 
    userId: string, 
    options: ShareDreamRequest
  ): Promise<ShareDreamResponse> {
    try {
      const client = supabaseService.getServiceClient();
      
      // First verify the user owns the dream
      const { data: dream, error: dreamError } = await client
        .from('dreams')
        .select('id')
        .eq('id', dreamId)
        .eq('user_id', userId)
        .single();

      if (dreamError || !dream) {
        console.error('Dream not found or access denied:', dreamError);
        return {
          success: false,
          shareId: '',
          error: 'Dream not found or access denied'
        };
      }

      // Insert or update the share
      const { data, error } = await client
        .from('shared_dreams')
        .upsert({
          dream_id: dreamId,
          user_id: userId,
          is_anonymous: options.isAnonymous,
          display_name: options.displayName || null,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'dream_id,user_id'
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error sharing dream:', error);
        return {
          success: false,
          shareId: '',
          error: error.message
        };
      }

      return {
        success: true,
        shareId: data.id,
        message: 'Dream shared successfully'
      };
    } catch (error) {
      console.error('Unexpected error sharing dream:', error);
      return {
        success: false,
        shareId: '',
        error: 'Failed to share dream'
      };
    }
  }

  /**
   * Stop sharing a dream
   */
  async unshareDream(dreamId: string, userId: string): Promise<ShareDreamResponse> {
    try {
      const client = supabaseService.getServiceClient();
      
      // Update the share to inactive
      const { data, error } = await client
        .from('shared_dreams')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('dream_id', dreamId)
        .eq('user_id', userId)
        .select('id');

      if (error) {
        console.error('Error unsharing dream:', error);
        return {
          success: false,
          shareId: '',
          error: error.message
        };
      }

      const wasShared = data && data.length > 0;
      return {
        success: true,
        shareId: dreamId,
        message: wasShared ? 'Dream unshared successfully' : 'Dream was not shared'
      };
    } catch (error) {
      console.error('Unexpected error unsharing dream:', error);
      return {
        success: false,
        shareId: '',
        error: 'Failed to unshare dream'
      };
    }
  }

  /**
   * Get sharing status for a specific dream
   */
  async getDreamSharingStatus(dreamId: string, userId: string): Promise<{
    isShared: boolean;
    shareDetails?: {
      isAnonymous: boolean;
      displayName: string | null;
      sharedAt: string;
    };
  }> {
    try {
      const client = supabaseService.getServiceClient();
      
      const { data, error } = await client
        .from('shared_dreams')
        .select('is_anonymous, display_name, shared_at, is_active')
        .eq('dream_id', dreamId)
        .eq('user_id', userId)
        .single();

      if (error || !data || !data.is_active) {
        return { isShared: false };
      }

      return {
        isShared: true,
        shareDetails: {
          isAnonymous: data.is_anonymous,
          displayName: data.display_name,
          sharedAt: data.shared_at
        }
      };
    } catch (error) {
      console.error('Error getting dream sharing status:', error);
      return { isShared: false };
    }
  }

  /**
   * Get all publicly shared dreams
   */
  async getPublicSharedDreams(params: GetSharedDreamsParams): Promise<GetSharedDreamsResponse> {
    try {
      const limit = params.limit || 50;
      const offset = params.offset || 0;

      // Call the database function to get shared dreams with all details
      const { data, error } = await supabaseService.getServiceClient()
        .rpc('get_public_shared_dreams', {
          limit_count: limit,
          offset_count: offset
        });

      if (error) {
        console.error('Error fetching shared dreams:', error);
        return {
          success: false,
          dreams: [],
          error: error.message
        };
      }

      // Transform the data to match our TypeScript interface
      const dreams: PublicSharedDream[] = (data || []).map((dream: any) => ({
        share_id: dream.share_id,
        dream_id: dream.dream_id,
        dream_title: dream.dream_title,
        dream_transcript: dream.dream_transcript,
        dream_created_at: dream.dream_created_at,
        mood: dream.mood,
        clarity: dream.clarity,
        is_anonymous: dream.is_anonymous,
        display_name: dream.display_name,
        shared_at: dream.shared_at,
        themes: dream.themes || []
      }));

      return {
        success: true,
        dreams,
        total: dreams.length
      };
    } catch (error) {
      console.error('Unexpected error fetching shared dreams:', error);
      return {
        success: false,
        dreams: [],
        error: 'Failed to fetch shared dreams'
      };
    }
  }

  /**
   * Update sharing settings for a dream
   */
  async updateDreamSharing(
    dreamId: string, 
    userId: string, 
    options: ShareDreamRequest
  ): Promise<ShareDreamResponse> {
    try {
      // First check if the dream is already shared
      const { data: existingShare, error: checkError } = await supabaseService.getServiceClient()
        .from('shared_dreams')
        .select('id')
        .eq('dream_id', dreamId)
        .eq('user_id', userId)
        .single();

      if (checkError || !existingShare) {
        // If not shared, share it
        return this.shareDream(dreamId, userId, options);
      }

      // Update existing share
      const { error } = await supabaseService.getServiceClient()
        .from('shared_dreams')
        .update({
          is_anonymous: options.isAnonymous,
          display_name: options.displayName || null,
          updated_at: new Date().toISOString()
        })
        .eq('dream_id', dreamId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating dream sharing:', error);
        return {
          success: false,
          shareId: '',
          error: error.message
        };
      }

      return {
        success: true,
        shareId: existingShare.id,
        message: 'Sharing settings updated successfully'
      };
    } catch (error) {
      console.error('Unexpected error updating dream sharing:', error);
      return {
        success: false,
        shareId: '',
        error: 'Failed to update sharing settings'
      };
    }
  }
}

// Export singleton instance
export const dreamSharingService = new DreamSharingService();