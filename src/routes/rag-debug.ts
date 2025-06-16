import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { RAGService } from '../services/rag.service';
import { verifyApiSecret } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply API secret verification to all debug routes
router.use(verifyApiSecret);

/**
 * POST /api/v1/rag-debug/context
 * Get RAG context for a dream without full interpretation
 */
router.post('/context', async (req: Request, res: Response) => {
  try {
    const { dreamTranscription, interpreterType = 'jung' } = req.body;
    
    if (!dreamTranscription) {
      return res.status(400).json({
        error: 'dreamTranscription is required'
      });
    }

    logger.info('RAG Debug: Retrieving context', {
      interpreterType,
      dreamLength: dreamTranscription.length
    });

    const supabase = createClient(config.supabase.url, config.supabase.anonKey);
    const ragService = new RAGService(supabase);
    
    const context = await ragService.getRelevantContext(
      dreamTranscription,
      interpreterType,
      {
        maxResults: 10,
        similarityThreshold: 0.5,
        includeSymbols: true
      }
    );

    // Get detailed info about each passage
    const detailedPassages = context.relevantPassages.map((p, i) => ({
      rank: i + 1,
      source: p.source,
      chapter: p.chapter,
      contentType: p.contentType,
      similarity: `${(p.similarity * 100).toFixed(1)}%`,
      fullContent: p.content,
      contentLength: p.content.length,
      preview: p.content.substring(0, 200) + '...'
    }));

    return res.json({
      success: true,
      summary: {
        passagesFound: context.relevantPassages.length,
        symbolsExtracted: context.symbols.length,
        themesIdentified: context.themes.length
      },
      passages: detailedPassages,
      symbols: context.symbols,
      themes: context.themes,
      debug: {
        interpreterType,
        dreamLength: dreamTranscription.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('RAG Debug error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/rag-debug/stats
 * Get statistics about the knowledge base
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const supabase = createClient(config.supabase.url, config.supabase.anonKey);
    
    // Get counts by interpreter type
    const { data: stats, error } = await supabase
      .from('knowledge_base')
      .select('interpreter_type, content_type, source')
      .order('interpreter_type');

    if (error) throw error;

    // Process stats
    const summary = stats?.reduce((acc: any, item) => {
      const key = item.interpreter_type;
      if (!acc[key]) {
        acc[key] = {
          total: 0,
          sources: new Set(),
          contentTypes: {}
        };
      }
      
      acc[key].total++;
      acc[key].sources.add(item.source);
      acc[key].contentTypes[item.content_type] = (acc[key].contentTypes[item.content_type] || 0) + 1;
      
      return acc;
    }, {});

    // Convert sets to arrays
    Object.keys(summary || {}).forEach(key => {
      summary[key].sources = Array.from(summary[key].sources);
    });

    return res.json({
      success: true,
      knowledgeBase: summary,
      totalEntries: stats?.length || 0
    });

  } catch (error) {
    logger.error('RAG Stats error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;