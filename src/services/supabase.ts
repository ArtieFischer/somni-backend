import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { DreamRecord } from '../types';

class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Verify JWT token and get user information
   */
  async verifyUserToken(token: string) {
    try {
      const { data: { user }, error } = await this.client.auth.getUser(token);
      
      if (error) {
        logger.warn('Token verification failed', { error: error.message });
        return null;
      }
      
      if (!user) {
        logger.warn('No user found for token');
        return null;
      }
      
      logger.debug('Token verified successfully', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('Token verification error', { error });
      return null;
    }
  }

  /**
   * Get dream record by ID and verify ownership
   */
  async getDream(dreamId: string, userId: string): Promise<DreamRecord | null> {
    try {
      const { data: dream, error } = await this.client
        .from('dreams')
        .select('*')
        .eq('id', dreamId)
        .eq('user_id', userId)
        .single();

      if (error) {
        logger.warn('Dream not found or unauthorized', { 
          dreamId, 
          userId, 
          error: error.message 
        });
        return null;
      }

      return dream as DreamRecord;
    } catch (error) {
      logger.error('Error fetching dream', { dreamId, userId, error });
      return null;
    }
  }

  /**
   * Update dream transcription status
   */
  async updateDreamStatus(
    dreamId: string, 
    status: 'processing' | 'completed' | 'failed',
    userId?: string
  ): Promise<boolean> {
    try {
      const updateData: Partial<DreamRecord> = {
        transcription_status: status,
        updated_at: new Date().toISOString(),
      };

      const query = this.client
        .from('dreams')
        .update(updateData)
        .eq('id', dreamId);

      // Add user filter if provided for extra security
      if (userId) {
        query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        logger.error('Failed to update dream status', { 
          dreamId, 
          status, 
          userId,
          error: error.message 
        });
        return false;
      }

      logger.info('Dream status updated', { dreamId, status, userId });
      return true;
    } catch (error) {
      logger.error('Error updating dream status', { dreamId, status, userId, error });
      return false;
    }
  }

  /**
   * Update dream with transcription results
   */
  async updateDreamTranscription(
    dreamId: string,
    transcription: {
      text: string;
      title?: string;
      languageCode?: string | undefined;
      languageProbability?: number | undefined;
      metadata?: Record<string, any>;
    },
    userId?: string
  ): Promise<boolean> {
    try {
      const updateData: Partial<DreamRecord> = {
        raw_transcript: transcription.text,
        ...(transcription.title && { title: transcription.title }),
        transcription_status: 'completed',
        transcription_metadata: {
          language_code: transcription.languageCode,
          language_probability: transcription.languageProbability,
          processed_at: new Date().toISOString(),
          model_id: 'scribe_v1',
          character_count: transcription.text.length,
          word_count: transcription.text.split(' ').length,
          ...transcription.metadata,
        },
        updated_at: new Date().toISOString(),
      };

      const query = this.client
        .from('dreams')
        .update(updateData)
        .eq('id', dreamId);

      // Add user filter if provided for extra security
      if (userId) {
        query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        logger.error('Failed to update dream transcription', { 
          dreamId, 
          userId,
          error: error.message 
        });
        return false;
      }

      logger.info('Dream transcription updated', { 
        dreamId, 
        userId, 
        textLength: transcription.text.length,
        languageCode: transcription.languageCode 
      });
      
      return true;
    } catch (error) {
      logger.error('Error updating dream transcription', { dreamId, userId, error });
      return false;
    }
  }

  /**
   * Update dream with error information
   */
  async updateDreamError(
    dreamId: string,
    errorMessage: string,
    errorDetails?: Record<string, any>,
    userId?: string
  ): Promise<boolean> {
    try {
      const updateData: Partial<DreamRecord> = {
        transcription_status: 'failed',
        transcription_metadata: {
          error: errorMessage,
          error_details: errorDetails,
          failed_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      };

      const query = this.client
        .from('dreams')
        .update(updateData)
        .eq('id', dreamId);

      // Add user filter if provided for extra security  
      if (userId) {
        query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        logger.error('Failed to update dream error', { 
          dreamId, 
          userId,
          error: error.message 
        });
        return false;
      }

      logger.info('Dream error updated', { dreamId, userId, errorMessage });
      return true;
    } catch (error) {
      logger.error('Error updating dream error', { dreamId, userId, error });
      return false;
    }
  }

  /**
   * Record transcription usage for tracking/billing
   */
  async recordTranscriptionUsage(
    userId: string,
    dreamId: string,
    characterCount: number,
    duration: number,
    languageCode?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('transcription_usage')
        .insert({
          user_id: userId,
          dream_id: dreamId,
          duration_seconds: duration,
          character_count: characterCount,
          language_code: languageCode,
          provider: 'elevenlabs',
          created_at: new Date().toISOString(),
        });

      if (error) {
        logger.warn('Failed to record transcription usage', { 
          userId, 
          dreamId, 
          error: error.message 
        });
        return false;
      }

      logger.debug('Transcription usage recorded', { 
        userId, 
        dreamId,
        duration,
        characterCount,
        languageCode
      });
      
      return true;
    } catch (error) {
      logger.error('Error recording transcription usage', { 
        userId, 
        dreamId, 
        error 
      });
      return false;
    }
  }

  /**
   * Create storage bucket for dream images if it doesn't exist
   */
  async ensureDreamImagesBucket(): Promise<boolean> {
    const bucketName = 'dream-images';
    
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await this.client
        .storage
        .listBuckets();

      if (listError) {
        logger.error('Failed to list storage buckets', { error: listError.message });
        return false;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

      if (!bucketExists) {
        // Create the bucket
        const { error: createError } = await this.client
          .storage
          .createBucket(bucketName, {
            public: true, // Make images publicly accessible
            fileSizeLimit: 5242880, // 5MB limit
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
          });

        if (createError) {
          logger.error('Failed to create dream-images bucket', { error: createError.message });
          return false;
        }

        logger.info('Created dream-images storage bucket');
      }

      return true;
    } catch (error) {
      logger.error('Error ensuring dream-images bucket', { error });
      return false;
    }
  }

  /**
   * Upload dream image to Supabase storage
   */
  async uploadDreamImage(
    dreamId: string,
    imageBuffer: Buffer,
    contentType: string = 'image/png'
  ): Promise<string | null> {
    try {
      // Ensure bucket exists
      await this.ensureDreamImagesBucket();

      const fileName = `${dreamId}.png`;
      const filePath = fileName; // Could add subfolders like `${userId}/${dreamId}.png` if needed

      // Upload the image
      const { error: uploadError } = await this.client
        .storage
        .from('dream-images')
        .upload(filePath, imageBuffer, {
          contentType,
          upsert: true, // Replace if already exists
        });

      if (uploadError) {
        logger.error('Failed to upload dream image', { 
          dreamId, 
          error: uploadError.message 
        });
        return null;
      }

      // Get the public URL
      const { data: { publicUrl } } = this.client
        .storage
        .from('dream-images')
        .getPublicUrl(filePath);

      logger.info('Dream image uploaded successfully', { 
        dreamId, 
        publicUrl 
      });

      return publicUrl;
    } catch (error) {
      logger.error('Error uploading dream image', { dreamId, error });
      return null;
    }
  }

  /**
   * Update dream with image URL and prompt
   * Note: In new schema, this should insert into dream_images table
   */
  async updateDreamImage(
    dreamId: string,
    imageUrl: string,
    imagePrompt: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // First update the dream with the image prompt
      const updateData = {
        image_prompt: imagePrompt,
        updated_at: new Date().toISOString(),
      };

      const dreamQuery = this.client
        .from('dreams')
        .update(updateData)
        .eq('id', dreamId);

      // Add user filter if provided for extra security
      if (userId) {
        dreamQuery.eq('user_id', userId);
      }

      const { error: dreamError } = await dreamQuery;

      if (dreamError) {
        logger.error('Failed to update dream', { 
          dreamId, 
          userId,
          error: dreamError.message 
        });
        return false;
      }

      // Then insert the image into dream_images table
      const { error: imageError } = await this.client
        .from('dream_images')
        .insert({
          dream_id: dreamId,
          storage_path: imageUrl,
          is_primary: true, // First image is primary by default
        });

      if (imageError) {
        logger.error('Failed to insert dream image', { 
          dreamId, 
          userId,
          error: imageError.message 
        });
        return false;
      }

      logger.info('Dream image updated', { 
        dreamId, 
        userId, 
        imageUrl 
      });
      
      return true;
    } catch (error) {
      logger.error('Error updating dream image', { dreamId, userId, error });
      return false;
    }
  }
}

export const supabaseService = new SupabaseService(); 