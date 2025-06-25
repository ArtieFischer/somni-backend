import { logger } from '../utils/logger';
import { dreamEmbeddingService } from '../services/dreamEmbedding';
import { supabaseService } from '../services/supabase';

export class EmbeddingWorker {
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly PROCESSING_INTERVAL_MS = 5000; // Check for new jobs every 5 seconds
  private readonly CLEANUP_INTERVAL_MS = 300000; // Clean up stale jobs every 5 minutes
  private readonly MAX_CONCURRENT_JOBS = 2; // Process up to 2 jobs concurrently
  private activeJobs: Set<string> = new Set();

  /**
   * Start the embedding worker
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Embedding worker is already running');
      return;
    }

    logger.info('Starting embedding worker');
    this.isRunning = true;

    // Start processing loop
    this.processingInterval = setInterval(() => {
      this.processJobs().catch(error => {
        logger.error('Error in embedding worker processing loop', { error });
      });
    }, this.PROCESSING_INTERVAL_MS);

    // Start cleanup loop
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleJobs().catch(error => {
        logger.error('Error in cleanup loop', { error });
      });
    }, this.CLEANUP_INTERVAL_MS);

    // Process immediately on start
    this.processJobs().catch(error => {
      logger.error('Error in initial job processing', { error });
    });
  }

  /**
   * Stop the embedding worker
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping embedding worker');
    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Wait for active jobs to complete
    if (this.activeJobs.size > 0) {
      logger.info('Waiting for active jobs to complete', { 
        activeJobs: Array.from(this.activeJobs) 
      });
    }
  }

  /**
   * Process pending embedding jobs
   */
  private async processJobs(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Check if we can process more jobs
    if (this.activeJobs.size >= this.MAX_CONCURRENT_JOBS) {
      logger.debug('Max concurrent jobs reached', { 
        activeJobs: this.activeJobs.size,
        maxJobs: this.MAX_CONCURRENT_JOBS 
      });
      return;
    }

    const availableSlots = this.MAX_CONCURRENT_JOBS - this.activeJobs.size;
    logger.info('Checking for pending jobs', { availableSlots, activeJobs: this.activeJobs.size });

    // Get multiple pending jobs up to available slots
    const { data: jobs, error } = await supabaseService.getServiceClient()
      .from('embedding_jobs')
      .select('dream_id')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(availableSlots);

    if (error) {
      logger.error('Failed to fetch pending jobs', { error: error.message, code: error.code, details: error.details });
      return;
    }
    
    if (!jobs || jobs.length === 0) {
      logger.info('No pending jobs found');
      return; // No pending jobs
    }

    logger.info('Found pending embedding jobs', { count: jobs.length });

    // Process jobs concurrently
    const promises = jobs.map((job: any) => this.processJob(job.dream_id));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single job
   */
  private async processJob(dreamId: string): Promise<void> {
    if (this.activeJobs.has(dreamId)) {
      logger.warn('Job already being processed', { dreamId });
      return;
    }

    this.activeJobs.add(dreamId);

    try {
      logger.info('Processing embedding job', { dreamId });
      
      // First, update the job status to processing
      const { error: updateError } = await supabaseService.getServiceClient()
        .from('embedding_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('dream_id', dreamId)
        .eq('status', 'pending'); // Only update if still pending
      
      if (updateError) {
        logger.error('Failed to update job status to processing', { dreamId, error: updateError });
        return;
      }
      
      const result = await dreamEmbeddingService.processDream(dreamId);
      
      if (result.success) {
        logger.info('Embedding job completed successfully', {
          dreamId,
          chunksProcessed: result.chunksProcessed,
          themesExtracted: result.themesExtracted,
          processingTimeMs: result.processingTimeMs
        });

        // Update job status to completed
        await supabaseService.getServiceClient()
          .from('embedding_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('dream_id', dreamId);

        // Log metrics for monitoring
        this.logMetrics({
          event: 'embedding_job_success',
          dreamId,
          chunksProcessed: result.chunksProcessed,
          themesExtracted: result.themesExtracted,
          processingTimeMs: result.processingTimeMs
        });
      } else {
        logger.error('Embedding job failed', {
          dreamId,
          error: result.error,
          processingTimeMs: result.processingTimeMs
        });

        // Get current attempts and update job as failed
        const { data: currentJob } = await supabaseService.getServiceClient()
          .from('embedding_jobs')
          .select('attempts')
          .eq('dream_id', dreamId)
          .single();
        
        const newAttempts = (currentJob?.attempts || 0) + 1;
        
        await supabaseService.getServiceClient()
          .from('embedding_jobs')
          .update({
            status: newAttempts >= 3 ? 'failed' : 'pending', // Retry if under limit
            error_message: result.error,
            attempts: newAttempts,
            completed_at: newAttempts >= 3 ? new Date().toISOString() : null,
            scheduled_at: newAttempts < 3 ? new Date(Date.now() + Math.pow(2, newAttempts) * 60000).toISOString() : undefined
          })
          .eq('dream_id', dreamId);

        // Log failure metrics
        this.logMetrics({
          event: 'embedding_job_failure',
          dreamId,
          error: result.error,
          processingTimeMs: result.processingTimeMs
        });
      }
    } catch (error) {
      logger.error('Unexpected error processing job', {
        dreamId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Get current attempts and update job as failed
      const { data: currentJob } = await supabaseService.getServiceClient()
        .from('embedding_jobs')
        .select('attempts')
        .eq('dream_id', dreamId)
        .single();
      
      const newAttempts = (currentJob?.attempts || 0) + 1;
      
      await supabaseService.getServiceClient()
        .from('embedding_jobs')
        .update({
          status: newAttempts >= 3 ? 'failed' : 'pending',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          attempts: newAttempts,
          completed_at: newAttempts >= 3 ? new Date().toISOString() : null,
          scheduled_at: newAttempts < 3 ? new Date(Date.now() + Math.pow(2, newAttempts) * 60000).toISOString() : undefined
        })
        .eq('dream_id', dreamId);
    } finally {
      this.activeJobs.delete(dreamId);
    }
  }

  /**
   * Clean up stale jobs
   */
  private async cleanupStaleJobs(): Promise<void> {
    try {
      // Call the cleanup function in the database
      const { data, error } = await supabaseService.getServiceClient()
        .rpc('cleanup_stale_embedding_jobs');

      if (error) {
        logger.error('Failed to cleanup stale jobs', { error });
        return;
      }

      if (data && data > 0) {
        logger.info('Cleaned up stale embedding jobs', { count: data });
      }
    } catch (error) {
      logger.error('Error in cleanup process', { error });
    }
  }

  /**
   * Log metrics for monitoring
   */
  private logMetrics(metrics: Record<string, any>): void {
    // In production, this would send to a metrics service
    // For now, just log as structured data
    logger.info('METRICS', metrics);
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isRunning: boolean;
    activeJobs: number;
    maxConcurrentJobs: number;
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs.size,
      maxConcurrentJobs: this.MAX_CONCURRENT_JOBS
    };
  }
}

// Export singleton instance
export const embeddingWorker = new EmbeddingWorker();