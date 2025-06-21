import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabase';
import { authenticateRequest, verifyApiSecret } from '../middleware/auth';
import { embeddingsService } from '../services/embeddings.service';
import logger from '../utils/logger';

const router = Router();

/**
 * Generate embedding for a dream
 */
router.post('/embed-dream', authenticateRequest, async (req: Request, res: Response): Promise<Response> => {
  try {
    const { dream_id, transcript } = req.body;

    if (!dream_id || !transcript) {
      return res.status(400).json({ 
        error: 'dream_id and transcript are required' 
      });
    }

    // Generate embedding using existing service
    const embedding = await embeddingsService.generateEmbedding(transcript);

    // Update dream with embedding
    const { error: dreamError } = await supabaseService.getClient()
      .from('dreams')
      .update({ embedding })
      .eq('id', dream_id)
      .select()
      .single();

    if (dreamError) {
      throw new Error(`Failed to update dream: ${dreamError.message}`);
    }

    // Extract themes
    const { data: themes, error: themeError } = await supabaseService.getClient()
      .rpc('search_themes', {
        query_embedding: embedding,
        similarity_threshold: 0.15,
        max_results: 10
      });

    if (!themeError && themes && themes.length > 0) {
      // Insert dream-theme associations
      const dreamThemes = themes.map((theme: any, index: number) => ({
        dream_id,
        theme_code: theme.code,
        rank: index + 1,
        score: theme.score
      }));

      await supabaseService.getClient()
        .from('dream_themes')
        .upsert(dreamThemes, { onConflict: 'dream_id,theme_code' });
    }

    return res.json({
      success: true,
      dream_id,
      embedding_size: embedding.length,
      themes_found: themes?.length || 0,
      themes
    });

  } catch (error: any) {
    logger.error('Embedding generation error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Generate embeddings for themes
 * This endpoint only requires API secret authentication
 */
router.post('/embed-themes', verifyApiSecret, async (req: Request, res: Response): Promise<Response> => {
  try {
    const { themes } = req.body;

    if (!themes || !Array.isArray(themes)) {
      return res.status(400).json({ 
        error: 'themes array is required' 
      });
    }

    const results = [];

    for (const theme of themes) {
      if (!theme.code || !theme.label) {
        results.push({ code: theme.code, success: false, error: 'Missing code or label' });
        continue;
      }

      try {
        // Generate embedding
        const textToEmbed = theme.description 
          ? `${theme.label}. ${theme.description}`
          : theme.label;
        
        const embedding = await embeddingsService.generateEmbedding(textToEmbed);

        // Upsert theme
        const { error } = await supabaseService.getClient()
          .from('themes')
          .upsert({
            code: theme.code,
            label: theme.label,
            description: theme.description || null,
            embedding
          }, { onConflict: 'code' });

        if (error) {
          results.push({ code: theme.code, success: false, error: error.message });
        } else {
          results.push({ code: theme.code, success: true });
        }
      } catch (err: any) {
        results.push({ code: theme.code, success: false, error: err.message });
      }
    }

    return res.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error: any) {
    logger.error('Theme embedding error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;