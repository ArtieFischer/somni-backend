import { logger } from '../utils/logger';
import { supabaseService } from './supabase';
import { BGEEmbeddingsService } from './embeddings-bge.service';

// Get BGE embedding service instance
const bgeEmbeddingService = BGEEmbeddingsService.getInstance();

// Type definitions - using 'any' for now since we don't have generated types
type Dream = any;
type DreamEmbedding = any;
type EmbeddingJob = any;

interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  startChar: number;
  endChar: number;
  overlapWithPrevious: number;
  overlapWithNext: number;
}

interface ProcessingResult {
  success: boolean;
  dreamId: string;
  chunksProcessed: number;
  themesExtracted: number;
  processingTimeMs: number;
  error?: string;
}

interface ThemeMatch {
  code: string;
  similarity: number;
  chunkIndex?: number;
}

export class DreamEmbeddingService {
  private readonly MIN_TOKENS_FOR_EMBEDDING = 10; // ~40 characters
  private readonly MAX_TOKENS_PER_CHUNK = 1000; // Safe limit for BGE-M3
  private readonly CHUNK_SIZE_TOKENS = 750; // Target chunk size
  private readonly OVERLAP_TOKENS = 100; // Overlap between chunks
  private readonly CHARS_PER_TOKEN = 4; // Approximate for English
  private readonly THEME_SIMILARITY_THRESHOLD = 0.6; // Minimum similarity for theme extraction
  private readonly MAX_THEMES_PER_DREAM = 5; // Limit themes per dream
  private readonly PROCESSING_TIMEOUT_MS = 30000; // 30 seconds timeout
  private readonly BATCH_SIZE = 5; // Process 5 chunks at a time

  /**
   * Process a single dream for embedding generation
   */
  async processDream(dreamId: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting dream embedding processing', { dreamId });

      // 1. Fetch dream and validate
      const dream = await this.fetchAndValidateDream(dreamId);
      if (!dream) {
        return {
          success: false,
          dreamId,
          chunksProcessed: 0,
          themesExtracted: 0,
          processingTimeMs: Date.now() - startTime,
          error: 'Dream not found or invalid'
        };
      }

      // 2. Update status to processing
      const lockAcquired = await this.acquireProcessingLock(dreamId);
      if (!lockAcquired) {
        return {
          success: false,
          dreamId,
          chunksProcessed: 0,
          themesExtracted: 0,
          processingTimeMs: Date.now() - startTime,
          error: 'Failed to acquire processing lock - may be processing already'
        };
      }

      // 3. Create chunks based on transcript length
      const chunks = this.createAdaptiveChunks(dream.raw_transcript!);
      logger.info('Created chunks for dream', { 
        dreamId, 
        totalChunks: chunks.length,
        transcriptLength: dream.raw_transcript!.length 
      });

      // 4. Generate embeddings for all chunks
      const embeddings = await this.generateChunkEmbeddings(dreamId, chunks);
      if (embeddings.length === 0) {
        throw new Error('Failed to generate any embeddings');
      }

      // 5. Store embeddings in database
      await this.storeEmbeddings(dreamId, embeddings);

      // 6. Extract and store themes
      const themesExtracted = await this.extractAndStoreThemes(dreamId, embeddings);

      // 7. Update dream status to completed
      await this.updateDreamStatus(dreamId, 'completed', null);

      const processingTimeMs = Date.now() - startTime;
      logger.info('Dream embedding processing completed', {
        dreamId,
        chunksProcessed: embeddings.length,
        themesExtracted,
        processingTimeMs
      });

      return {
        success: true,
        dreamId,
        chunksProcessed: embeddings.length,
        themesExtracted,
        processingTimeMs
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Dream embedding processing failed', { dreamId, error: errorMessage });

      // Update dream status to failed
      await this.updateDreamStatus(dreamId, 'failed', errorMessage);

      return {
        success: false,
        dreamId,
        chunksProcessed: 0,
        themesExtracted: 0,
        processingTimeMs: Date.now() - startTime,
        error: errorMessage
      };
    }
  }

  /**
   * Process next pending job from the queue
   */
  async processNextJob(): Promise<ProcessingResult | null> {
    try {
      // Get next pending job
      const job = await this.getNextPendingJob();
      if (!job) {
        return null; // No pending jobs
      }

      logger.info('Processing embedding job', { 
        jobId: job.id, 
        dreamId: job.dream_id,
        attempts: job.attempts 
      });

      // Update job status to processing
      await this.updateJobStatus(job.id, 'processing');

      // Process the dream
      const result = await this.processDream(job.dream_id);

      // Update job based on result
      if (result.success) {
        await this.updateJobStatus(job.id, 'completed');
      } else {
        await this.handleJobFailure(job, result.error || 'Processing failed');
      }

      return result;

    } catch (error) {
      logger.error('Failed to process job', { error });
      return null;
    }
  }

  /**
   * Fetch and validate dream for processing
   */
  private async fetchAndValidateDream(dreamId: string): Promise<Dream | null> {
    const { data: dream, error } = await supabaseService.getClient()
      .from('dreams')
      .select('*')
      .eq('id', dreamId)
      .single();

    if (error || !dream) {
      logger.error('Failed to fetch dream', { dreamId, error });
      return null;
    }

    // Validate dream has transcript
    if (!dream.raw_transcript || dream.raw_transcript.length < this.MIN_TOKENS_FOR_EMBEDDING * this.CHARS_PER_TOKEN) {
      logger.warn('Dream transcript too short for embedding', { 
        dreamId, 
        transcriptLength: dream.raw_transcript?.length || 0 
      });
      
      // Mark as skipped
      await this.updateDreamStatus(dreamId, 'skipped', 'Transcript too short');
      return null;
    }

    // Skip non-English dreams for now
    const languageCode = (dream.transcription_metadata as any)?.language;
    if (languageCode && !languageCode.startsWith('en') && languageCode !== 'eng') {
      logger.info('Skipping non-English dream', { dreamId, languageCode });
      await this.updateDreamStatus(dreamId, 'skipped', `Non-English language: ${languageCode}`);
      return null;
    }

    return dream;
  }

  /**
   * Create adaptive chunks based on transcript length
   */
  private createAdaptiveChunks(transcript: string): Array<{ text: string; metadata: ChunkMetadata }> {
    const estimatedTokens = Math.ceil(transcript.length / this.CHARS_PER_TOKEN);
    
    // Single chunk for short dreams
    if (estimatedTokens <= this.MAX_TOKENS_PER_CHUNK) {
      return [{
        text: transcript,
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startChar: 0,
          endChar: transcript.length,
          overlapWithPrevious: 0,
          overlapWithNext: 0
        }
      }];
    }

    // Multiple chunks with overlap for longer dreams
    const chunks: Array<{ text: string; metadata: ChunkMetadata }> = [];
    const chunkSizeChars = this.CHUNK_SIZE_TOKENS * this.CHARS_PER_TOKEN;
    const overlapChars = this.OVERLAP_TOKENS * this.CHARS_PER_TOKEN;
    
    // Split by paragraphs first
    const paragraphs = transcript.split(/\n\n+/);
    let currentChunk = '';
    let currentStartChar = 0;
    let chunkIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      
      // If adding this paragraph would exceed chunk size, save current chunk
      if (currentChunk.length > 0 && currentChunk.length + paragraph.length > chunkSizeChars) {
        // Add overlap from next paragraph if available
        let overlapText = '';
        if (i < paragraphs.length) {
          overlapText = paragraph.substring(0, Math.min(overlapChars, paragraph.length));
        }

        chunks.push({
          text: currentChunk + (overlapText ? '\n\n' + overlapText : ''),
          metadata: {
            chunkIndex,
            totalChunks: -1, // Will be set later
            startChar: currentStartChar,
            endChar: currentStartChar + currentChunk.length,
            overlapWithPrevious: chunkIndex > 0 ? overlapChars : 0,
            overlapWithNext: overlapText.length
          }
        });

        // Start new chunk with overlap from previous
        currentChunk = currentChunk.substring(Math.max(0, currentChunk.length - overlapChars));
        currentStartChar += currentChunk.length - overlapChars;
        chunkIndex++;
      }

      currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk,
        metadata: {
          chunkIndex,
          totalChunks: -1,
          startChar: currentStartChar,
          endChar: transcript.length,
          overlapWithPrevious: chunkIndex > 0 ? overlapChars : 0,
          overlapWithNext: 0
        }
      });
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Generate embeddings for all chunks
   */
  private async generateChunkEmbeddings(
    dreamId: string, 
    chunks: Array<{ text: string; metadata: ChunkMetadata }>
  ): Promise<Array<{ embedding: number[]; chunk: typeof chunks[0]; processingTimeMs: number }>> {
    const embeddings: Array<{ embedding: number[]; chunk: typeof chunks[0]; processingTimeMs: number }> = [];

    // Process in batches
    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      const batchStartTime = Date.now();

      try {
        // Generate embeddings for batch
        const batchTexts = batch.map(chunk => chunk.text);
        const batchEmbeddings = await bgeEmbeddingService.generateEmbeddings(batchTexts);

        // Validate embeddings
        if (batchEmbeddings.length !== batch.length) {
          throw new Error(`Embedding count mismatch: expected ${batch.length}, got ${batchEmbeddings.length}`);
        }

        // Add to results
        for (let j = 0; j < batch.length; j++) {
          embeddings.push({
            embedding: batchEmbeddings[j],
            chunk: batch[j],
            processingTimeMs: Date.now() - batchStartTime
          });
        }

        logger.info('Generated embeddings for batch', {
          dreamId,
          batchIndex: Math.floor(i / this.BATCH_SIZE),
          batchSize: batch.length,
          processingTimeMs: Date.now() - batchStartTime
        });

        // Small delay between batches to avoid overload
        if (i + this.BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        logger.error('Failed to generate embeddings for batch', {
          dreamId,
          batchIndex: Math.floor(i / this.BATCH_SIZE),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Continue with other batches but log the failure
        // In production, you might want to retry or handle differently
      }
    }

    return embeddings;
  }

  /**
   * Store embeddings in database
   */
  private async storeEmbeddings(
    dreamId: string, 
    embeddings: Array<{ embedding: number[]; chunk: { text: string; metadata: ChunkMetadata }; processingTimeMs: number }>
  ): Promise<void> {
    const embeddingRecords: DreamEmbedding[] = embeddings.map(({ embedding, chunk, processingTimeMs }) => ({
      dream_id: dreamId,
      embedding: JSON.stringify(embedding) as any, // Supabase expects string for vector
      chunk_index: chunk.metadata.chunkIndex,
      chunk_text: chunk.text,
      token_count: Math.ceil(chunk.text.length / this.CHARS_PER_TOKEN),
      embedding_version: 'bge-m3-v1',
      processing_time_ms: processingTimeMs,
      metadata: chunk.metadata
    }));

    const { error } = await supabaseService.getClient()
      .from('dream_embeddings')
      .insert(embeddingRecords);

    if (error) {
      throw new Error(`Failed to store embeddings: ${error.message}`);
    }
  }

  /**
   * Extract themes from embeddings and store them
   */
  private async extractAndStoreThemes(
    dreamId: string,
    embeddings: Array<{ embedding: number[]; chunk: { text: string; metadata: ChunkMetadata }; processingTimeMs: number }>
  ): Promise<number> {
    try {
      // Get all theme embeddings
      const { data: themes, error: themesError } = await supabaseService.getClient()
        .from('themes')
        .select('code, embedding')
        .not('embedding', 'is', null);

      if (themesError || !themes) {
        logger.error('Failed to fetch themes', { error: themesError });
        return 0;
      }

      // Calculate similarities for each chunk
      const allMatches: ThemeMatch[] = [];

      for (const { embedding, chunk } of embeddings) {
        for (const theme of themes) {
          const themeEmbedding = JSON.parse(theme.embedding as any) as number[];
          const similarity = this.cosineSimilarity(embedding, themeEmbedding);

          if (similarity >= this.THEME_SIMILARITY_THRESHOLD) {
            allMatches.push({
              code: theme.code,
              similarity,
              chunkIndex: chunk.metadata.chunkIndex
            });
          }
        }
      }

      // Aggregate by theme code and take highest similarity
      const themeMap = new Map<string, ThemeMatch>();
      for (const match of allMatches) {
        const existing = themeMap.get(match.code);
        if (!existing || match.similarity > existing.similarity) {
          themeMap.set(match.code, match);
        }
      }

      // Sort by similarity and take top N
      const topThemes = Array.from(themeMap.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, this.MAX_THEMES_PER_DREAM);

      // Store in database
      if (topThemes.length > 0) {
        const themeRecords = topThemes.map(theme => ({
          dream_id: dreamId,
          theme_code: theme.code,
          similarity: theme.similarity,
          chunk_index: theme.chunkIndex
        }));

        const { error: insertError } = await supabaseService.getClient()
          .from('dream_themes')
          .insert(themeRecords);

        if (insertError) {
          logger.error('Failed to store dream themes', { dreamId, error: insertError });
          return 0;
        }
      }

      logger.info('Extracted themes for dream', {
        dreamId,
        themesFound: topThemes.length,
        topTheme: topThemes[0]?.code
      });

      return topThemes.length;

    } catch (error) {
      logger.error('Failed to extract themes', { dreamId, error });
      return 0;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Acquire processing lock for a dream
   */
  private async acquireProcessingLock(dreamId: string): Promise<boolean> {
    const { data, error } = await supabaseService.getClient()
      .from('dreams')
      .update({
        embedding_status: 'processing',
        embedding_started_at: new Date().toISOString(),
        embedding_attempts: await this.getCurrentAttempts(dreamId) + 1
      })
      .eq('id', dreamId)
      .in('embedding_status', ['pending', 'failed'])
      .select()
      .single();

    return !error && data !== null;
  }

  /**
   * Get current embedding attempts for a dream
   */
  private async getCurrentAttempts(dreamId: string): Promise<number> {
    const { data } = await supabaseService.getClient()
      .from('dreams')
      .select('embedding_attempts')
      .eq('id', dreamId)
      .single();
    
    return data?.embedding_attempts || 0;
  }

  /**
   * Update dream embedding status
   */
  private async updateDreamStatus(dreamId: string, status: string, error: string | null): Promise<void> {
    const updates: any = {
      embedding_status: status
    };

    if (status === 'completed') {
      updates.embedding_processed_at = new Date().toISOString();
      updates.embedding_error = null;
    } else if (status === 'failed') {
      updates.embedding_error = error;
      // We'll increment attempts in the acquireProcessingLock method
    } else if (status === 'skipped') {
      updates.embedding_error = error;
      updates.embedding_processed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseService.getClient()
      .from('dreams')
      .update(updates)
      .eq('id', dreamId);

    if (updateError) {
      logger.error('Failed to update dream status', { dreamId, status, error: updateError });
    }
  }

  /**
   * Get next pending job from queue
   */
  private async getNextPendingJob(): Promise<EmbeddingJob | null> {
    const { data, error } = await supabaseService.getClient()
      .from('embedding_jobs')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('attempts', 3)
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: number, status: string): Promise<void> {
    const updates: any = {
      status
    };

    if (status === 'processing') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabaseService.getClient()
      .from('embedding_jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      logger.error('Failed to update job status', { jobId, status, error });
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(job: EmbeddingJob, errorMessage: string): Promise<void> {
    const attempts = job.attempts + 1;
    
    if (attempts >= job.max_attempts) {
      // Mark as permanently failed
      await supabaseService.getClient()
        .from('embedding_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          attempts,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
    } else {
      // Schedule retry with exponential backoff
      const delayMinutes = Math.pow(2, attempts); // 2, 4, 8 minutes
      const scheduledAt = new Date();
      scheduledAt.setMinutes(scheduledAt.getMinutes() + delayMinutes);

      await supabaseService.getClient()
        .from('embedding_jobs')
        .update({
          status: 'pending',
          error_message: errorMessage,
          attempts,
          scheduled_at: scheduledAt.toISOString()
        })
        .eq('id', job.id);
    }
  }
}

// Export singleton instance
export const dreamEmbeddingService = new DreamEmbeddingService();