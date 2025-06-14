import { ElevenLabsClient } from 'elevenlabs';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { ElevenLabsTranscriptionResult } from '../types';

class ElevenLabsService {
  private client: ElevenLabsClient;

  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: config.elevenLabs.apiKey,
    });
  }

  /**
   * Transcribe audio buffer using ElevenLabs Speech-to-Text
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    options: {
      languageCode?: string | null;
      tagAudioEvents?: boolean;
      diarize?: boolean;
    } = {}
  ): Promise<ElevenLabsTranscriptionResult> {
    try {
      logger.info('Starting transcription', { 
        bufferSize: audioBuffer.length,
        options 
      });

      // Create Blob from Buffer for ElevenLabs API
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

      const result = await this.client.speechToText.convert({
        file: audioBlob,
        model_id: 'scribe_v1',
        ...(options.languageCode && { language_code: options.languageCode }),
        tag_audio_events: options.tagAudioEvents ?? true,
        diarize: options.diarize ?? false,
      });

      logger.info('Transcription completed', {
        languageCode: result.language_code,
        textLength: result.text.length,
        languageProbability: result.language_probability,
      });

      return {
        text: result.text,
        languageCode: result.language_code,
        languageProbability: result.language_probability,
        words: result.words?.map(word => ({
          text: word.text,
          start_time: (word as any).start_time,
          end_time: (word as any).end_time,
          confidence: (word as any).confidence,
        })),
      };
    } catch (error: any) {
      logger.error('Transcription failed', { 
        error: error.message,
        status: error.status,
        bufferSize: audioBuffer.length 
      });
      throw this.handleError(error);
    }
  }

  /**
   * Handle and map ElevenLabs API errors to user-friendly messages
   */
  private handleError(error: any): Error {
    const errorMessage = error.message || 'Unknown error';
    const status = error.status || error.statusCode;

    switch (status) {
      case 401:
        return new Error('Invalid ElevenLabs API key');
      
      case 429:
        return new Error('Rate limit exceeded. Please try again later.');
      
      case 413:
        return new Error('Audio file too large (max 1GB)');
      
      case 422:
        if (errorMessage.toLowerCase().includes('unsupported') || 
            errorMessage.toLowerCase().includes('format')) {
          return new Error('Unsupported audio format. Please use WAV, MP3, or M4A.');
        }
        return new Error('Invalid audio data provided');
      
      case 400:
        if (errorMessage.toLowerCase().includes('duration')) {
          return new Error('Audio file is too short or too long for transcription');
        }
        return new Error('Invalid request parameters');
      
      case 500:
      case 502:
      case 503:
      case 504:
        return new Error('Transcription service temporarily unavailable');
      
      default:
        logger.warn('Unmapped ElevenLabs error', { status, errorMessage });
        return new Error('Transcription service temporarily unavailable');
    }
  }

  /**
   * Check if the ElevenLabs service is available
   */
  async checkHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      // Use the API to check basic connectivity
      // Note: ElevenLabs doesn't have a dedicated health endpoint, 
      // so we'll make a minimal request to test connectivity
      await this.client.voices.getAll();
      
      return { status: 'healthy' };
    } catch (error: any) {
      logger.warn('ElevenLabs health check failed', { error: error.message });
      return { 
        status: 'unhealthy', 
        details: error.message || 'Service unavailable' 
      };
    }
  }

  /**
   * Validate audio buffer before sending to API
   */
  validateAudioBuffer(audioBuffer: Buffer): { valid: boolean; error?: string } {
    // Check file size (1GB limit)
    const maxSize = 1024 * 1024 * 1024; // 1GB in bytes
    if (audioBuffer.length > maxSize) {
      return { 
        valid: false, 
        error: 'Audio file too large. Maximum size is 1GB.' 
      };
    }

    // Check minimum size (avoid sending empty files)
    const minSize = 100; // 100 bytes minimum
    if (audioBuffer.length < minSize) {
      return { 
        valid: false, 
        error: 'Audio file too small. Minimum size is 100 bytes.' 
      };
    }

    // Basic audio format validation by checking headers
    const header = audioBuffer.subarray(0, 12);
    const headerStr = header.toString('ascii', 0, 4);
    const headerHex = header.toString('hex');

    // Check for common audio format signatures
    const isWAV = headerStr === 'RIFF' && header.toString('ascii', 8, 12) === 'WAVE';
    const isMP3 = headerHex.startsWith('494433') || // ID3
                  headerHex.startsWith('fffb') ||    // MP3 frame
                  headerHex.startsWith('fff3') ||    // MP3 frame
                  headerHex.startsWith('fff2');      // MP3 frame
    const isM4A = headerHex.includes('667479706d34') || // ftypm4
                  headerHex.includes('6674797069736f'); // ftypmiso

    if (!isWAV && !isMP3 && !isM4A) {
      logger.warn('Possibly unsupported audio format detected', { 
        headerHex: headerHex.substring(0, 24) 
      });
      // Don't reject here as ElevenLabs might support more formats
      // Just log a warning for monitoring
    }

    return { valid: true };
  }

  // Future: Add conversational AI methods here
  /**
   * Start a conversational AI session (placeholder for future implementation)
   */
  async startConversation(_agentId: string): Promise<void> {
    // Placeholder for future conversational AI implementation
    throw new Error('Conversational AI not yet implemented');
  }
}

export const elevenLabsService = new ElevenLabsService(); 