/**
 * Asynchronous Dream Interpretation Controller
 * Handles interpretation requests via job queue
 */

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { InterpreterType } from '../types';
import Bull from 'bull';
import { modularThreeStageInterpreter } from '../services/modular-three-stage-interpreter';

// Initialize job queue
const interpretationQueue = new Bull('dream-interpretations', {
  redis: {
    host: config.redis?.host || 'localhost',
    port: config.redis?.port || 6379,
  }
});

// Job status tracking
interface InterpretationJob {
  dreamId: string;
  userId: string;
  interpreterType: InterpreterType;
  requestedAt: Date;
  priority?: number;
}

export class DreamInterpretationQueueController {
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  /**
   * POST /api/v1/dreams/interpret-async
   * Queue a dream for interpretation
   */
  async queueInterpretation(req: Request, res: Response): Promise<void> {
    try {
      const { dreamId, userId, interpreterType, priority = 0 } = req.body;
      
      // For now, just redirect to the synchronous interpretation endpoint
      // since we don't have Redis configured
      logger.info('Redirecting to synchronous interpretation (Redis not configured)', {
        dreamId,
        userId,
        interpreterType
      });
      
      // Call the synchronous interpretation controller directly
      const { dreamInterpretationController } = await import('./dream-interpretation.controller');
      return dreamInterpretationController.interpretDreamById(req, res);
      
      // Validate request
      if (!dreamId || !userId || !interpreterType) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: dreamId, userId, interpreterType'
        });
        return;
      }
      
      // Quick validation - check if dream exists and has transcription
      const { data: dream, error: dreamError } = await this.supabase
        .from('dreams')
        .select('id, transcription_status')
        .eq('id', dreamId)
        .eq('user_id', userId)
        .single();
        
      if (dreamError || !dream) {
        res.status(404).json({
          success: false,
          error: 'Dream not found or access denied'
        });
        return;
      }
      
      if (dream.transcription_status !== 'completed') {
        res.status(422).json({
          success: false,
          error: 'Dream transcription not available'
        });
        return;
      }
      
      // Check if interpretation already exists
      const { data: existing } = await this.supabase
        .from('interpretations')
        .select('id')
        .eq('dream_id', dreamId)
        .eq('interpreter_type', interpreterType)
        .single();
        
      if (existing) {
        res.status(200).json({
          success: true,
          status: 'completed',
          interpretationId: existing.id,
          message: 'Interpretation already exists'
        });
        return;
      }
      
      // Add to queue
      const job = await interpretationQueue.add('interpret', {
        dreamId,
        userId,
        interpreterType,
        requestedAt: new Date()
      }, {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      });
      
      // Create pending record in database
      const { data: pendingRecord } = await this.supabase
        .from('interpretation_jobs')
        .insert({
          job_id: job.id.toString(),
          dream_id: dreamId,
          user_id: userId,
          interpreter_type: interpreterType,
          status: 'queued',
          priority,
          created_at: new Date()
        })
        .select()
        .single();
      
      logger.info('Interpretation queued', {
        jobId: job.id,
        dreamId,
        interpreterType,
        position: await interpretationQueue.getWaitingCount()
      });
      
      // Return queue information
      res.status(202).json({
        success: true,
        status: 'queued',
        jobId: job.id.toString(),
        estimatedWaitTime: await this.estimateWaitTime(job),
        position: await interpretationQueue.getWaitingCount() + 1,
        message: 'Interpretation queued successfully'
      });
      
    } catch (error) {
      logger.error('Queue interpretation error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to queue interpretation'
      });
    }
  }
  
  /**
   * GET /api/v1/dreams/interpretation-status/:jobId
   * Check status of queued interpretation
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      
      // Get job from queue
      const job = await interpretationQueue.getJob(jobId);
      
      if (!job) {
        // Check if completed in database
        const { data: dbJob } = await this.supabase
          .from('interpretation_jobs')
          .select('*')
          .eq('job_id', jobId)
          .single();
          
        if (dbJob) {
          res.json({
            success: true,
            status: dbJob.status,
            interpretationId: dbJob.interpretation_id,
            completedAt: dbJob.completed_at,
            error: dbJob.error
          });
          return;
        }
        
        res.status(404).json({
          success: false,
          error: 'Job not found'
        });
        return;
      }
      
      const state = await job.getState();
      const progress = job.progress();
      
      res.json({
        success: true,
        status: state,
        progress: progress,
        position: state === 'waiting' ? await interpretationQueue.getWaitingCount() + 1 : null,
        estimatedWaitTime: state === 'waiting' ? await this.estimateWaitTime(job) : null,
        data: job.returnvalue
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get job status'
      });
    }
  }
  
  /**
   * POST /api/v1/dreams/cancel-interpretation/:jobId
   * Cancel a queued interpretation
   */
  async cancelInterpretation(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const { userId } = req.body;
      
      const job = await interpretationQueue.getJob(jobId);
      
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found'
        });
        return;
      }
      
      // Verify ownership
      const jobData = job.data as InterpretationJob;
      if (jobData.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }
      
      await job.remove();
      
      // Update database
      await this.supabase
        .from('interpretation_jobs')
        .update({ 
          status: 'cancelled',
          completed_at: new Date()
        })
        .eq('job_id', jobId);
      
      res.json({
        success: true,
        message: 'Interpretation cancelled'
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to cancel interpretation'
      });
    }
  }
  
  /**
   * Estimate wait time based on queue position
   */
  private async estimateWaitTime(job: Bull.Job): Promise<number> {
    const position = await interpretationQueue.getWaitingCount();
    const activeCount = await interpretationQueue.getActiveCount();
    
    // Estimate 5-10 seconds per interpretation
    const averageProcessingTime = 7500;
    const estimatedMs = (position + activeCount) * averageProcessingTime;
    
    return Math.min(estimatedMs, 300000); // Cap at 5 minutes
  }
}

// Job processor (separate worker process)
interpretationQueue.process('interpret', async (job) => {
  const { dreamId, userId, interpreterType } = job.data;
  
  try {
    // Update job progress
    job.progress(10);
    
    // Initialize services
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
    
    // Fetch dream data
    job.progress(20);
    const { data: dream } = await supabase
      .from('dreams')
      .select('*')
      .eq('id', dreamId)
      .single();
      
    // Fetch themes
    job.progress(30);
    const { data: dreamThemes } = await supabase
      .from('dream_themes')
      .select('theme_code, similarity')
      .eq('dream_id', dreamId)
      .order('similarity', { ascending: false });
      
    // Get theme details
    const themes = [];
    if (dreamThemes && dreamThemes.length > 0) {
      const themeCodes = dreamThemes.map(dt => dt.theme_code);
      const { data: themeDetails } = await supabase
        .from('themes')
        .select('code, name')
        .in('code', themeCodes);
        
      themes.push(...dreamThemes.map(dt => ({
        code: dt.theme_code,
        name: themeDetails?.find(td => td.code === dt.theme_code)?.name || dt.theme_code,
        relevanceScore: dt.similarity
      })));
    }
    
    // Get user context
    job.progress(40);
    const { data: profile } = await supabase
      .from('profiles')
      .select('birth_date, bio')
      .eq('user_id', userId)
      .single();
      
    const userContext = profile ? {
      age: profile.birth_date ? 
        Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
        undefined,
      emotionalState: dream.mood ? `Mood level: ${dream.mood}/5` : undefined
    } : {};
    
    // Generate interpretation
    job.progress(50);
    const result = await modularThreeStageInterpreter.interpretDream({
      dreamId,
      userId,
      dreamTranscription: dream.raw_transcript,
      interpreterType,
      themes,
      userContext
    });
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Interpretation failed');
    }
    
    // Save to database
    job.progress(90);
    const interpretationData = {
      dream_id: dreamId,
      user_id: userId,
      interpreter_type: interpreterType,
      interpretation_summary: result.data.interpretation,
      full_response: result.data,
      dream_topic: result.data.dreamTopic,
      quick_take: result.data.quickTake,
      symbols: result.data.symbols || [],
      emotional_tone: result.data.emotionalTone || null,
      primary_insight: result.data.interpretationCore?.primaryInsight || null,
      key_pattern: result.data.interpretationCore?.keyPattern || null,
      knowledge_fragments_used: result.data.generationMetadata?.knowledgeFragmentsUsed || 0,
      total_fragments_retrieved: result.data.generationMetadata?.totalFragmentsRetrieved || 0,
      fragment_ids_used: result.data.generationMetadata?.fragmentIdsUsed || [],
      processing_time_ms: result.data.processingTime || null,
      model_used: result.data.generationMetadata?.model || 'gpt-4o'
    };
    
    const { data: savedInterpretation, error: saveError } = await supabase
      .from('interpretations')
      .insert(interpretationData)
      .select()
      .single();
      
    if (saveError) {
      throw new Error(`Failed to save: ${saveError.message}`);
    }
    
    // Update job record
    await supabase
      .from('interpretation_jobs')
      .update({
        status: 'completed',
        interpretation_id: savedInterpretation.id,
        completed_at: new Date()
      })
      .eq('job_id', job.id.toString());
    
    // Send push notification
    await sendPushNotification(userId, {
      title: 'Dream Interpretation Ready',
      body: `Your ${interpreterType} interpretation is ready to view`,
      data: {
        type: 'interpretation_complete',
        dreamId,
        interpretationId: savedInterpretation.id
      }
    });
    
    job.progress(100);
    return { 
      success: true, 
      interpretationId: savedInterpretation.id 
    };
    
  } catch (error) {
    logger.error('Interpretation job failed', {
      jobId: job.id,
      dreamId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Update job record with error
    const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    await supabase
      .from('interpretation_jobs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date()
      })
      .eq('job_id', job.id.toString());
    
    throw error;
  }
});

// Placeholder for push notification function
async function sendPushNotification(userId: string, notification: any) {
  // Implement based on your notification service (FCM, OneSignal, etc.)
  logger.info('Push notification would be sent', { userId, notification });
}

export const dreamInterpretationQueueController = new DreamInterpretationQueueController();