import { Router, Request, Response } from 'express';
import { authenticateRequest } from '../middleware/auth';
import { dreamEmbeddingService } from '../services/dreamEmbedding';
import { supabaseService } from '../services/supabase';
import { BGEEmbeddingsService } from '../services/embeddings-bge.service';
import { logger } from '../utils/logger';
import { embeddingWorker } from '../workers/embeddingWorker';

// Get BGE embedding service instance
const bgeEmbeddingService = BGEEmbeddingsService.getInstance();

const router = Router();

/**
 * POST /api/v1/dream-embeddings/process
 * Manually trigger embedding generation for a specific dream
 * Useful for debugging or manual processing
 */
router.post('/process', authenticateRequest, async (req: Request, res: Response) => {
  const { dreamId } = req.body;
  const userId = req.user!.id;

  if (!dreamId) {
    return res.status(400).json({
      success: false,
      error: 'dreamId is required'
    });
  }

  try {
    // Verify dream ownership
    const { data: dream, error: dreamError } = await supabaseService.getSupabase()
      .from('dreams')
      .select('id, user_id, embedding_status')
      .eq('id', dreamId)
      .single();

    if (dreamError || !dream) {
      return res.status(404).json({
        success: false,
        error: 'Dream not found'
      });
    }

    if (dream.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Check if already processed
    if (dream.embedding_status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Dream embeddings already generated'
      });
    }

    // Create or update embedding job
    const { error: jobError } = await supabaseService.getSupabase()
      .from('embedding_jobs')
      .upsert({
        dream_id: dreamId,
        status: 'pending',
        priority: 1, // Higher priority for manual requests
        attempts: 0,
        scheduled_at: new Date().toISOString()
      }, {
        onConflict: 'dream_id'
      });

    if (jobError) {
      logger.error('Failed to create embedding job', { dreamId, error: jobError });
      return res.status(500).json({
        success: false,
        error: 'Failed to create processing job'
      });
    }

    // Update dream status
    await supabaseService.getSupabase()
      .from('dreams')
      .update({ embedding_status: 'pending' })
      .eq('id', dreamId);

    logger.info('Embedding job created for manual processing', { dreamId, userId });

    return res.json({
      success: true,
      message: 'Embedding generation queued',
      dreamId
    });

  } catch (error) {
    logger.error('Failed to process dream embedding request', { 
      dreamId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/dream-embeddings/search
 * Search for similar dreams using vector similarity
 */
router.get('/search', authenticateRequest, async (req: Request, res: Response) => {
  const { dreamId, query, limit = 10, threshold = 0.7 } = req.query;
  const userId = req.user!.id;

  try {
    let queryEmbedding: number[];

    // Generate embedding from query text or use existing dream embedding
    if (query && typeof query === 'string') {
      // Generate embedding for query text
      const embeddings = await bgeEmbeddingService.generateEmbeddings([query]);
      if (!embeddings || embeddings.length === 0) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate query embedding'
        });
      }
      queryEmbedding = embeddings[0];
    } else if (dreamId && typeof dreamId === 'string') {
      // Use existing dream embedding
      const { data: dreamEmbedding, error } = await supabaseService.getSupabase()
        .from('dream_embeddings')
        .select('embedding')
        .eq('dream_id', dreamId)
        .eq('chunk_index', 0) // Use first chunk for dream similarity
        .single();

      if (error || !dreamEmbedding) {
        return res.status(404).json({
          success: false,
          error: 'Dream embedding not found'
        });
      }

      queryEmbedding = JSON.parse(dreamEmbedding.embedding as any);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either query or dreamId is required'
      });
    }

    // Search for similar dreams
    const { data: results, error: searchError } = await supabaseService.getSupabase()
      .rpc('search_similar_dreams', {
        query_embedding: JSON.stringify(queryEmbedding),
        user_id_filter: userId,
        similarity_threshold: Number(threshold),
        max_results: Number(limit)
      });

    if (searchError) {
      logger.error('Dream search failed', { error: searchError });
      return res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }

    return res.json({
      success: true,
      results: results || [],
      query: query || `Similar to dream ${dreamId}`,
      threshold: Number(threshold)
    });

  } catch (error) {
    logger.error('Dream search error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/dream-embeddings/themes/:dreamId
 * Get extracted themes for a specific dream
 */
router.get('/themes/:dreamId', authenticateRequest, async (req: Request, res: Response) => {
  const { dreamId } = req.params;
  const { minSimilarity = 0.5 } = req.query;
  const userId = req.user!.id;

  try {
    // Verify dream ownership
    const { data: dream, error: dreamError } = await supabaseService.getSupabase()
      .from('dreams')
      .select('id, user_id')
      .eq('id', dreamId)
      .single();

    if (dreamError || !dream) {
      return res.status(404).json({
        success: false,
        error: 'Dream not found'
      });
    }

    if (dream.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get themes
    const { data: themes, error: themesError } = await supabaseService.getSupabase()
      .rpc('get_dream_themes', {
        p_dream_id: dreamId,
        p_min_similarity: Number(minSimilarity)
      });

    if (themesError) {
      logger.error('Failed to get dream themes', { dreamId, error: themesError });
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve themes'
      });
    }

    return res.json({
      success: true,
      dreamId,
      themes: themes || [],
      minSimilarity: Number(minSimilarity)
    });

  } catch (error) {
    logger.error('Failed to get dream themes', { 
      dreamId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/dream-embeddings/status/:dreamId
 * Get embedding status for a specific dream
 */
router.get('/status/:dreamId', authenticateRequest, async (req: Request, res: Response) => {
  const { dreamId } = req.params;
  const userId = req.user!.id;

  try {
    // Get dream with embedding status
    const { data: dream, error } = await supabaseService.getSupabase()
      .from('dreams')
      .select('id, user_id, embedding_status, embedding_error, embedding_attempts, embedding_processed_at')
      .eq('id', dreamId)
      .single();

    if (error || !dream) {
      return res.status(404).json({
        success: false,
        error: 'Dream not found'
      });
    }

    if (dream.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get embedding count if processed
    let embeddingCount = 0;
    let themeCount = 0;

    if (dream.embedding_status === 'completed') {
      const { count: embedCount } = await supabaseService.getSupabase()
        .from('dream_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('dream_id', dreamId);

      const { count: themeCnt } = await supabaseService.getSupabase()
        .from('dream_themes')
        .select('*', { count: 'exact', head: true })
        .eq('dream_id', dreamId);

      embeddingCount = embedCount || 0;
      themeCount = themeCnt || 0;
    }

    return res.json({
      success: true,
      dreamId,
      status: dream.embedding_status,
      error: dream.embedding_error,
      attempts: dream.embedding_attempts,
      processedAt: dream.embedding_processed_at,
      embeddingCount,
      themeCount
    });

  } catch (error) {
    logger.error('Failed to get embedding status', { 
      dreamId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/dream-embeddings/worker/status
 * Get embedding worker status (admin only)
 */
router.get('/worker/status', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const status = embeddingWorker.getStatus();
    
    // Get pending jobs count
    const { count: pendingCount } = await supabaseService.getSupabase()
      .from('embedding_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: processingCount } = await supabaseService.getSupabase()
      .from('embedding_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing');

    return res.json({
      success: true,
      worker: status,
      queue: {
        pending: pendingCount || 0,
        processing: processingCount || 0
      }
    });

  } catch (error) {
    logger.error('Failed to get worker status', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as dreamEmbeddingRouter };