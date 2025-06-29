/**
 * Fallback service to poll for transcripts when WebSocket events aren't working
 */

import axios from 'axios';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

export class TranscriptPollerService extends EventEmitter {
  private apiKey: string;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastTranscriptIndex = 0;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  /**
   * Start polling for transcripts
   */
  startPolling(conversationId: string, elevenLabsConversationId: string): void {
    if (this.pollingInterval) {
      this.stopPolling();
    }

    logger.info('Starting transcript polling fallback', {
      conversationId,
      elevenLabsConversationId
    });

    // Poll every 2 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        const transcripts = await this.fetchTranscripts(elevenLabsConversationId);
        
        // Check for new transcripts
        if (transcripts.length > this.lastTranscriptIndex) {
          const newTranscripts = transcripts.slice(this.lastTranscriptIndex);
          
          for (const transcript of newTranscripts) {
            if (transcript.role === 'user' && transcript.message) {
              logger.info('Transcript fetched via polling', {
                text: transcript.message,
                index: transcript.index
              });
              
              this.emit('transcription', {
                text: transcript.message,
                speaker: 'user',
                timestamp: Date.now(),
                isFinal: true
              });
            }
          }
          
          this.lastTranscriptIndex = transcripts.length;
        }
      } catch (error) {
        logger.error('Error polling for transcripts:', error);
      }
    }, 2000);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.lastTranscriptIndex = 0;
  }

  /**
   * Fetch transcripts from ElevenLabs API
   */
  private async fetchTranscripts(conversationId: string): Promise<any[]> {
    const url = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/transcript`;
    
    const response = await axios.get(url, {
      headers: {
        'xi-api-key': this.apiKey
      }
    });
    
    return response.data.transcript || [];
  }
}

export function createTranscriptPoller(apiKey: string): TranscriptPollerService {
  return new TranscriptPollerService(apiKey);
}