import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabase';
import { verifyApiSecret } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

/**
 * Insert themes without embeddings (embeddings can be generated later)
 */
router.post('/seed-themes', verifyApiSecret, async (req: Request, res: Response): Promise<Response> => {
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
        // Insert theme without embedding for now
        const { error } = await supabaseService.getClient()
          .from('themes')
          .upsert({
            code: theme.code,
            label: theme.label,
            description: theme.description || null
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
    logger.error('Theme seeding error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;