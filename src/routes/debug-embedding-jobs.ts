import { Router } from 'express';
import { supabaseService } from '../services/supabase';
import { logger } from '../utils/logger';

const router = Router();

// Debug endpoint to check embedding jobs
router.get('/check-jobs', async (req, res) => {
  try {
    // Check if we can query the embedding_jobs table
    const { data: jobs, error: jobsError, count } = await supabaseService.getClient()
      .from('embedding_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      logger.error('Failed to query embedding_jobs', { error: jobsError });
      return res.status(500).json({ 
        error: 'Failed to query embedding_jobs',
        details: jobsError 
      });
    }

    // Check pending jobs specifically
    const { data: pendingJobs, error: pendingError, count: pendingCount } = await supabaseService.getClient()
      .from('embedding_jobs')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .lt('attempts', 3)
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (pendingError) {
      logger.error('Failed to query pending jobs', { error: pendingError });
    }

    // Check dreams with pending embedding status
    const { data: pendingDreams, error: dreamsError, count: dreamsCount } = await supabaseService.getClient()
      .from('dreams')
      .select('id, embedding_status, embedding_attempts, created_at', { count: 'exact' })
      .eq('embedding_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (dreamsError) {
      logger.error('Failed to query pending dreams', { error: dreamsError });
    }

    return res.json({
      totalJobs: count,
      pendingJobsCount: pendingCount,
      pendingDreamsCount: dreamsCount,
      recentJobs: jobs,
      pendingJobs: pendingJobs || [],
      pendingDreams: pendingDreams || [],
      queryErrors: {
        jobs: jobsError,
        pending: pendingError,
        dreams: dreamsError
      }
    });
  } catch (error) {
    logger.error('Debug endpoint error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Test job creation
router.post('/create-test-job', async (req, res) => {
  try {
    const { dreamId } = req.body;
    
    if (!dreamId) {
      return res.status(400).json({ error: 'dreamId required' });
    }

    const { data, error } = await supabaseService.getClient()
      .from('embedding_jobs')
      .insert({
        dream_id: dreamId,
        status: 'pending',
        priority: 1,
        attempts: 0,
        scheduled_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, job: data });
  } catch (error) {
    logger.error('Test job creation error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as debugEmbeddingJobsRouter };