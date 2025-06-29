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
  async startPolling(conversationId: string, elevenLabsConversationId: string): Promise<void> {
    if (this.pollingInterval) {
      this.stopPolling();
    }

    logger.info('Starting transcript polling fallback', {
      conversationId,
      elevenLabsConversationId
    });

    // Get initial transcript count
    try {
      const initialTranscripts = await this.fetchTranscripts(elevenLabsConversationId);
      this.lastTranscriptIndex = initialTranscripts.length;
      logger.info('Initial transcript count', {
        count: this.lastTranscriptIndex,
        elevenLabsConversationId
      });
    } catch (error) {
      logger.error('Error fetching initial transcripts:', error);
    }

    // Poll every 2 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        const transcripts = await this.fetchTranscripts(elevenLabsConversationId);
        
        // Log polling results
        logger.debug('Transcript polling result', {
          elevenLabsConversationId,
          transcriptCount: transcripts.length,
          lastIndex: this.lastTranscriptIndex,
          hasNewTranscripts: transcripts.length > this.lastTranscriptIndex
        });
        
        // Check for new transcripts
        if (transcripts.length > this.lastTranscriptIndex) {
          const newTranscripts = transcripts.slice(this.lastTranscriptIndex);
          
          logger.info('New transcripts found via polling', {
            count: newTranscripts.length,
            transcripts: newTranscripts.map(t => ({
              role: t.role,
              hasMessage: !!t.message,
              messageLength: t.message?.length || 0
            }))
          });
          
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
    
    // Also run an immediate poll after a delay to catch early transcripts
    setTimeout(async () => {
      try {
        const transcripts = await this.fetchTranscripts(elevenLabsConversationId);
        if (transcripts.length > this.lastTranscriptIndex) {
          logger.info('Immediate poll found new transcripts', {
            count: transcripts.length - this.lastTranscriptIndex
          });
          // Process will be handled by the next interval
        }
      } catch (error) {
        logger.error('Error in immediate poll:', error);
      }
    }, 3000); // 3 second delay for first poll
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
    
    // Log the response structure for debugging
    logger.debug('ElevenLabs transcript API response', {
      hasData: !!response.data,
      hasTranscript: !!response.data?.transcript,
      transcriptType: typeof response.data?.transcript,
      dataKeys: response.data ? Object.keys(response.data) : []
    });
    
    // Handle different possible response structures
    const transcripts = response.data?.transcript || response.data?.transcripts || response.data || [];
    
    return Array.isArray(transcripts) ? transcripts : [];
  }
}

export function createTranscriptPoller(apiKey: string): TranscriptPollerService {
  return new TranscriptPollerService(apiKey);
}