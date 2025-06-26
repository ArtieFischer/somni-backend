/**
 * Theme-based Knowledge Retrieval Service
 * Uses fragment_themes junction table for efficient knowledge retrieval
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { bgeEmbeddingsService } from './embeddings-bge.service';
import { logger } from '../utils/logger';

interface ThemeKnowledgeResult {
  id: string;
  text: string;
  source: string;
  chapter: number;
  interpreter: string;
  matchedThemes: string[];
  themeSimScore: number;
  dreamSimScore?: number;
  hybridScore: number;
}

interface ThemeKnowledgeOptions {
  interpreter: string;
  themes: string[];
  dreamText?: string;
  minThemeSimilarity?: number;
  maxResults?: number;
  useHybridScoring?: boolean;
}

export class ThemeBasedKnowledgeService {
  private static instance: ThemeBasedKnowledgeService;
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

  private constructor() {}

  static getInstance(): ThemeBasedKnowledgeService {
    if (!ThemeBasedKnowledgeService.instance) {
      ThemeBasedKnowledgeService.instance = new ThemeBasedKnowledgeService();
    }
    return ThemeBasedKnowledgeService.instance;
  }

  /**
   * Retrieve knowledge fragments based on themes
   */
  async retrieveByThemes(options: ThemeKnowledgeOptions): Promise<ThemeKnowledgeResult[]> {
    const {
      interpreter,
      themes,
      dreamText,
      minThemeSimilarity = 0.5,
      maxResults = 20,
      useHybridScoring = true
    } = options;

    logger.info('Theme-based knowledge retrieval starting', {
      interpreter,
      themeCount: themes.length,
      themes: themes.slice(0, 5),
      useHybrid: useHybridScoring
    });

    try {
      // Step 1: Get fragment IDs from fragment_themes
      const { data: fragmentThemes, error: ftError } = await this.supabase
        .from('fragment_themes')
        .select('fragment_id, theme_code, similarity')
        .in('theme_code', themes)
        .gte('similarity', minThemeSimilarity)
        .order('similarity', { ascending: false });

      if (ftError) {
        logger.error('Fragment themes query failed', { error: ftError });
        throw ftError;
      }

      if (!fragmentThemes || fragmentThemes.length === 0) {
        logger.info('No matching fragments found for themes');
        return [];
      }

      // Step 2: Aggregate by fragment_id
      const fragmentAggregates = new Map<string, {
        themes: string[],
        maxSim: number,
        avgSim: number
      }>();

      fragmentThemes.forEach(ft => {
        const existing = fragmentAggregates.get(ft.fragment_id) || {
          themes: [],
          maxSim: 0,
          avgSim: 0
        };
        
        existing.themes.push(ft.theme_code);
        existing.maxSim = Math.max(existing.maxSim, ft.similarity);
        fragmentAggregates.set(ft.fragment_id, existing);
      });

      // Calculate average similarities
      fragmentAggregates.forEach((value, key) => {
        const sims = fragmentThemes
          .filter(ft => ft.fragment_id === key)
          .map(ft => ft.similarity);
        value.avgSim = sims.reduce((a, b) => a + b, 0) / sims.length;
      });

      logger.info('Fragment aggregation complete', {
        uniqueFragments: fragmentAggregates.size,
        totalConnections: fragmentThemes.length
      });

      // Step 3: Get knowledge fragments
      const fragmentIds = Array.from(fragmentAggregates.keys());
      
      let query = this.supabase
        .from('knowledge_fragments')
        .select('id, text, source, chapter, interpreter, embedding')
        .in('id', fragmentIds)
        .eq('interpreter', interpreter);

      const { data: fragments, error: fragError } = await query;

      if (fragError) {
        logger.error('Knowledge fragments query failed', { error: fragError });
        throw fragError;
      }

      if (!fragments || fragments.length === 0) {
        logger.info('No fragments found for interpreter', { interpreter });
        return [];
      }

      // Step 4: Calculate scores and prepare results
      let results: ThemeKnowledgeResult[] = [];

      if (useHybridScoring && dreamText) {
        // Generate dream embedding for hybrid scoring
        const dreamEmbedding = await bgeEmbeddingsService.generateEmbedding(dreamText);
        
        results = fragments.map(frag => {
          const aggregate = fragmentAggregates.get(frag.id)!;
          
          // Calculate dream similarity if embedding exists
          let dreamSim = 0;
          if (frag.embedding) {
            // This would require proper vector similarity calculation
            // For now, using a placeholder
            dreamSim = 0.7; // Placeholder - implement actual cosine similarity
          }
          
          // Hybrid score: 70% theme similarity, 30% dream similarity
          const hybridScore = 0.7 * aggregate.maxSim + 0.3 * dreamSim;
          
          return {
            id: frag.id,
            text: frag.text,
            source: frag.source,
            chapter: frag.chapter,
            interpreter: frag.interpreter,
            matchedThemes: aggregate.themes,
            themeSimScore: aggregate.maxSim,
            dreamSimScore: dreamSim,
            hybridScore
          };
        });
      } else {
        // Theme-only scoring
        results = fragments.map(frag => {
          const aggregate = fragmentAggregates.get(frag.id)!;
          
          return {
            id: frag.id,
            text: frag.text,
            source: frag.source,
            chapter: frag.chapter,
            interpreter: frag.interpreter,
            matchedThemes: aggregate.themes,
            themeSimScore: aggregate.maxSim,
            hybridScore: aggregate.maxSim
          };
        });
      }

      // Sort by hybrid score and limit results
      results.sort((a, b) => b.hybridScore - a.hybridScore);
      results = results.slice(0, maxResults);

      logger.info('Knowledge retrieval complete', {
        totalResults: results.length,
        topScore: results[0]?.hybridScore,
        topThemes: results[0]?.matchedThemes
      });

      return results;

    } catch (error) {
      logger.error('Theme-based knowledge retrieval failed', { error });
      throw error;
    }
  }

  /**
   * Get theme statistics for debugging
   */
  async getThemeStats(interpreter: string): Promise<{
    totalFragments: number;
    themedFragments: number;
    avgThemesPerFragment: number;
    topThemes: Array<{ theme: string; count: number }>;
  }> {
    try {
      // Count total fragments
      const { count: totalFragments } = await this.supabase
        .from('knowledge_fragments')
        .select('*', { count: 'exact', head: true })
        .eq('interpreter', interpreter);

      // First get fragment IDs for this interpreter
      const { data: fragmentIds } = await this.supabase
        .from('knowledge_fragments')
        .select('id')
        .eq('interpreter', interpreter);
      
      // Count fragments with themes
      const { data: themedFragmentIds } = await this.supabase
        .from('fragment_themes')
        .select('fragment_id')
        .in('fragment_id', fragmentIds?.map(f => f.id) || []);

      const uniqueThemedFragments = new Set(themedFragmentIds?.map(f => f.fragment_id) || []);

      // Get theme distribution
      const { data: themeDistribution } = await this.supabase
        .rpc('get_theme_distribution', { interpreter_filter: interpreter });

      return {
        totalFragments: totalFragments || 0,
        themedFragments: uniqueThemedFragments.size,
        avgThemesPerFragment: themedFragmentIds ? themedFragmentIds.length / uniqueThemedFragments.size : 0,
        topThemes: themeDistribution || []
      };

    } catch (error) {
      logger.error('Failed to get theme stats', { error });
      throw error;
    }
  }
}

// Export singleton
export const themeKnowledgeService = ThemeBasedKnowledgeService.getInstance();