import { Router, Request, Response } from 'express';
import { authenticateRequest } from '../middleware/auth';
import { transcriptionRateLimit } from '../middleware/rateLimit';
import { validateTranscribeRequest, validateRequestSize, validateContentType } from '../middleware/validation';
import { elevenLabsService } from '../services/elevenlabs';
import { supabaseService } from '../services/supabase';
import { openRouterService } from '../services/openrouter';
import { imageRouterService } from '../services/imageRouter';
import { logger, logTranscription } from '../utils/logger';
import { features } from '../config/features';
import type { TranscribeRequest, TranscribeResponse } from '../types';

const router = Router();

/**
 * POST /api/v1/transcription/transcribe
 * 
 * Main transcription endpoint called by Supabase Edge Functions
 * This replaces the mock setTimeout logic in dreams-transcribe-init
 */
router.post(
  '/transcribe',
  validateContentType('application/json'),
  validateRequestSize(50 * 1024 * 1024), // 50MB max request size
  authenticateRequest, // Verify API secret + Supabase JWT
  transcriptionRateLimit,
  validateTranscribeRequest,
  async (req: Request, res: Response) => {
    const { dreamId, audioBase64, duration, options } = req.body as TranscribeRequest;
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    try {
      logTranscription('started', dreamId, userId, { duration, options });
      
      // Log language parameter for debugging
      logger.info('Transcription language parameter', {
        dreamId,
        userId,
        languageCode: options?.languageCode,
        hasLanguageCode: !!options?.languageCode,
        allOptions: options
      });

      // Convert base64 to buffer
      let audioBuffer: Buffer;
      try {
        audioBuffer = Buffer.from(audioBase64, 'base64');
      } catch (error) {
        logger.error('Failed to decode base64 audio', { dreamId, userId, error });
        return res.status(400).json({
          success: false,
          dreamId,
          error: 'Invalid base64 audio data',
        } as TranscribeResponse);
      }

      // Validate audio buffer
      const validation = elevenLabsService.validateAudioBuffer(audioBuffer);
      if (!validation.valid) {
        logger.warn('Audio validation failed', { 
          dreamId, 
          userId, 
          error: validation.error,
          bufferSize: audioBuffer.length 
        });
        
        return res.status(400).json({
          success: false,
          dreamId,
          error: validation.error,
        } as TranscribeResponse);
      }

      // Update dream status to processing (double-check ownership)
      const statusUpdated = await supabaseService.updateDreamStatus(
        dreamId, 
        'processing', 
        userId
      );
      
      if (!statusUpdated) {
        logger.error('Failed to update dream status to processing', { dreamId, userId });
        return res.status(404).json({
          success: false,
          dreamId,
          error: 'Dream not found or unauthorized',
        } as TranscribeResponse);
      }

      // Perform transcription
      let transcription;
      try {
        logger.info('Calling ElevenLabs with language options', {
          dreamId,
          languageCode: options?.languageCode || 'not specified (will default to eng)',
          tagAudioEvents: options?.tagAudioEvents ?? true,
          diarize: options?.diarize ?? false
        });
        
        transcription = await elevenLabsService.transcribeAudio(audioBuffer, options);
      } catch (error: any) {
        logger.error('ElevenLabs transcription failed', { 
          dreamId, 
          userId, 
          error: error.message 
        });

        // Update dream with error
        await supabaseService.updateDreamError(
          dreamId,
          error.message,
          { 
            service: 'elevenlabs',
            bufferSize: audioBuffer.length,
            duration 
          },
          userId
        );

        logTranscription('failed', dreamId, userId, { error: error.message });

        return res.status(500).json({
          success: false,
          dreamId,
          error: error.message,
        } as TranscribeResponse);
      }

      // Generate title if feature is enabled
      let title: string | undefined;
      if (features.titleGeneration.enabled) {
        try {
          logger.info('Generating dream title', { dreamId, userId });
          title = await openRouterService.generateDreamTitle(transcription.text, {
            model: features.titleGeneration.model,
            maxTokens: features.titleGeneration.maxTokens,
            temperature: features.titleGeneration.temperature,
          });
          logger.info('Dream title generated', { dreamId, title });
        } catch (error) {
          // Log error but don't fail the transcription
          logger.error('Failed to generate dream title', { 
            dreamId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // Generate image if feature is enabled
      let imageUrl: string | undefined;
      let imagePrompt: string | undefined;
      if (features.imageGeneration.enabled) {
        try {
          logger.info('Generating dream scene description', { dreamId, userId });
          
          // First, generate scene description
          const sceneDescription = await openRouterService.generateDreamSceneDescription(transcription.text, {
            model: features.titleGeneration.model, // Using same model as title generation
            maxTokens: features.imageGeneration.sceneDescriptionMaxTokens,
            temperature: features.imageGeneration.sceneDescriptionTemperature,
          });
          
          logger.info('Dream scene description generated', { dreamId, sceneDescription });
          
          // Generate the image
          const generatedImageUrl = await imageRouterService.generateDreamImage(sceneDescription);
          
          // Download the image
          const imageBuffer = await imageRouterService.downloadImage(generatedImageUrl);
          
          // Upload to Supabase storage
          const uploadedUrl = await supabaseService.uploadDreamImage(dreamId, imageBuffer);
          
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
            imagePrompt = sceneDescription;
            logger.info('Dream image generated and uploaded', { dreamId, imageUrl });
          }
        } catch (error) {
          // Log error but don't fail the transcription
          logger.error('Failed to generate dream image', { 
            dreamId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // Update dream with transcription results
      const transcriptionUpdated = await supabaseService.updateDreamTranscription(
        dreamId,
        {
          text: transcription.text,
          ...(title && { title }),
          languageCode: transcription.languageCode || undefined,
          languageProbability: transcription.languageProbability || undefined,
          metadata: {
            words: transcription.words,
            buffer_size: audioBuffer.length,
          },
        },
        userId
      );

      // Update dream with image if generated
      if (imageUrl && imagePrompt) {
        await supabaseService.updateDreamImage(
          dreamId,
          imageUrl,
          imagePrompt,
          userId
        );
      }

      if (!transcriptionUpdated) {
        logger.error('Failed to update dream with transcription', { dreamId, userId });
        
        // This is a critical error - we have the transcription but can't save it
        await supabaseService.updateDreamError(
          dreamId,
          'Database update failed after successful transcription',
          { transcriptionText: transcription.text },
          userId
        );

        return res.status(500).json({
          success: false,
          dreamId,
          error: 'Failed to save transcription results',
        } as TranscribeResponse);
      }

      // Record usage for tracking/billing
      await supabaseService.recordTranscriptionUsage(
        userId,
        dreamId,
        transcription.text.length,
        duration,
        transcription.languageCode
      );

      logTranscription('completed', dreamId, userId, {
        textLength: transcription.text.length,
        languageCode: transcription.languageCode,
        duration,
      });
      
      // Log language detection result
      logger.info('Transcription language result', {
        dreamId,
        requestedLanguage: options?.languageCode || 'not specified (defaulting to eng)',
        detectedLanguage: transcription.languageCode,
        languageProbability: transcription.languageProbability,
        wasLanguageSpecified: !!options?.languageCode
      });

      // Return success response
      const response: TranscribeResponse = {
        success: true,
        dreamId,
        transcription: {
          text: transcription.text,
          languageCode: transcription.languageCode,
          languageProbability: transcription.languageProbability,
          wordCount: transcription.text.split(' ').length,
          characterCount: transcription.text.length,
        },
        metadata: {
          duration,
          processedAt: new Date().toISOString(),
          modelId: 'scribe_v1',
        },
      };

      logger.info('Transcription completed successfully', {
        dreamId,
        userId,
        userEmail,
        characterCount: transcription.text.length,
        processingTime: Date.now() - Date.parse(req.get('X-Request-Start') || '0'),
      });

      return res.json(response);

    } catch (error) {
      logger.error('Unexpected transcription error', { 
        dreamId, 
        userId, 
        error: error instanceof Error ? error.message : error 
      });

      // Update dream with generic error
      await supabaseService.updateDreamError(
        dreamId,
        'Internal server error during transcription',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        userId
      );

      logTranscription('failed', dreamId, userId, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return res.status(500).json({
        success: false,
        dreamId,
        error: 'Internal server error during transcription',
      } as TranscribeResponse);
    }
  }
);

/**
 * GET /api/v1/transcription/status
 * 
 * Health check endpoint specifically for transcription service
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const elevenLabsHealth = await elevenLabsService.checkHealth();
    
    const response = {
      status: elevenLabsHealth.status === 'healthy' ? 'operational' : 'degraded',
      service: 'transcription',
      timestamp: new Date().toISOString(),
      elevenlabs: elevenLabsHealth,
    };

    logger.debug('Transcription status check', response);

    return res.json(response);
  } catch (error) {
    logger.error('Transcription status check failed', { error });
    
    return res.status(503).json({
      status: 'down',
      service: 'transcription',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

export { router as transcriptionRouter }; 