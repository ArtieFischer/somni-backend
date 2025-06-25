import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabase';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/debug-embedding-jobs/check-jobs
 * Debug endpoint to check embedding jobs status
 */
router.get('/check-jobs', async (_req: Request, res: Response) => {
  try {
    // Get all jobs
    const { data: allJobs, error: allError } = await supabaseService.getClient()
      .from('embedding_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      logger.error('Failed to fetch all jobs', { error: allError });
    }

    // Get pending jobs
    const { data: pendingJobs, error: pendingError } = await supabaseService.getClient()
      .from('embedding_jobs')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true });

    if (pendingError) {
      logger.error('Failed to fetch pending jobs', { error: pendingError });
    }

    // Get dreams with pending embedding status
    const { data: pendingDreams, error: dreamsError } = await supabaseService.getClient()
      .from('dreams')
      .select('id, embedding_status, embedding_attempts, raw_transcript')
      .eq('embedding_status', 'pending')
      .not('raw_transcript', 'is', null);

    if (dreamsError) {
      logger.error('Failed to fetch pending dreams', { error: dreamsError });
    }

    return res.json({
      success: true,
      debug: {
        totalJobs: allJobs?.length || 0,
        pendingJobs: pendingJobs?.length || 0,
        pendingDreams: pendingDreams?.length || 0,
        jobs: {
          all: allJobs,
          pending: pendingJobs
        },
        dreams: pendingDreams,
        errors: {
          allJobsError: allError,
          pendingJobsError: pendingError,
          dreamsError: dreamsError
        }
      }
    });

  } catch (error) {
    logger.error('Debug check failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return res.status(500).json({
      success: false,
      error: 'Debug check failed'
    });
  }
});

export { router as debugEmbeddingRouter };