import { Router, Request, Response } from 'express';
import { authenticateRequest } from '../middleware/auth';
import { transcriptionRateLimit } from '../middleware/rateLimit';
import { validateTranscribeRequest, validateRequestSize, validateContentType } from '../middleware/validation';
import { elevenLabsService } from '../services/elevenlabs';
import { supabaseService } from '../services/supabase';
import { logger, logTranscription } from '../utils/logger';
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

      // Update dream with transcription results
      const transcriptionUpdated = await supabaseService.updateDreamTranscription(
        dreamId,
        {
          text: transcription.text,
          languageCode: transcription.languageCode || undefined,
          languageProbability: transcription.languageProbability || undefined,
          metadata: {
            words: transcription.words,
            buffer_size: audioBuffer.length,
          },
        },
        userId
      );

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