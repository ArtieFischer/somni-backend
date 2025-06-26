/**
 * Theme-based Knowledge Retriever
 * Replaces broken BGE hybrid search with direct theme-based retrieval
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { KnowledgeFragment, DreamContext, InterpreterType } from '../types';
import { bgeEmbeddingsService } from '../../services/embeddings-bge.service';

interface RetrievalResult {
  fragments: KnowledgeFragment[];
  metadata: {
    totalFound: number;
    themesUsed: string[];
    retrievalMethod: string;
  };
}

export class ThemeKnowledgeRetriever {
  private static instance: ThemeKnowledgeRetriever;
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

  static getInstance(): ThemeKnowledgeRetriever {
    if (!ThemeKnowledgeRetriever.instance) {
      ThemeKnowledgeRetriever.instance = new ThemeKnowledgeRetriever();
    }
    return ThemeKnowledgeRetriever.instance;
  }

  /**
   * Retrieve knowledge by theme codes directly
   */
  async getKnowledgeByThemes(
    themeCodes: string[],
    interpreterType: InterpreterType
  ): Promise<KnowledgeFragment[]> {
    const result = await this.retrieveKnowledgeByThemes(themeCodes, interpreterType);
    return result.fragments;
  }

  /**
   * Retrieve knowledge using theme-based approach (bypassing broken BGE search)
   */
  async retrieveKnowledge(
    dreamContext: DreamContext,
    interpreterType: InterpreterType
  ): Promise<RetrievalResult> {
    logger.info('Theme-based knowledge retrieval starting', {
      interpreter: interpreterType,
      themeCount: dreamContext.themes.length
    });

    try {
      // Extract theme codes
      const themeCodes = dreamContext.themes.map(t => t.code);
      
      // Method 1: Direct theme-based retrieval via fragment_themes, filtered by interpreter
      const { data: fragmentThemes, error: ftError } = await this.supabase
        .from('fragment_themes')
        .select(`
          fragment_id, 
          theme_code, 
          similarity,
          knowledge_fragments!inner(interpreter)
        `)
        .in('theme_code', themeCodes)
        .eq('knowledge_fragments.interpreter', interpreterType)
        .gte('similarity', 0.3) // Lowered threshold from 0.5 to 0.3
        .order('similarity', { ascending: false })
        .limit(200); // Get more candidates initially

      if (ftError || !fragmentThemes || fragmentThemes.length === 0) {
        logger.warn('No fragment-theme connections found', { 
          error: ftError,
          themes: themeCodes 
        });
        
        // Fallback: Try semantic search without sparse embeddings
        return this.semanticFallback(dreamContext, interpreterType);
      }

      // Group by fragment and calculate scores
      const fragmentScores = new Map<string, {
        themes: string[];
        maxSim: number;
        avgSim: number;
      }>();

      fragmentThemes.forEach(ft => {
        const existing = fragmentScores.get(ft.fragment_id) || {
          themes: [],
          maxSim: 0,
          avgSim: 0
        };
        existing.themes.push(ft.theme_code);
        existing.maxSim = Math.max(existing.maxSim, ft.similarity);
        fragmentScores.set(ft.fragment_id, existing);
      });

      // Get top 10 fragments with highest similarity scores
      const topFragmentIds = Array.from(fragmentScores.entries())
        .sort((a, b) => b[1].maxSim - a[1].maxSim)
        .slice(0, 10) // Limit to top 10 fragments before quality control
        .map(([id]) => id);

      // Retrieve actual fragments
      const { data: fragments, error: fragError } = await this.supabase
        .from('knowledge_fragments')
        .select('id, text, source, chapter, metadata')
        .in('id', topFragmentIds)
        .eq('interpreter', interpreterType);

      if (fragError || !fragments) {
        logger.error('Failed to retrieve fragments', { error: fragError });
        return {
          fragments: [],
          metadata: {
            totalFound: 0,
            themesUsed: themeCodes,
            retrievalMethod: 'theme-based-failed'
          }
        };
      }

      // Convert to KnowledgeFragment format
      const knowledgeFragments: KnowledgeFragment[] = fragments.map(f => {
        const scoreInfo = fragmentScores.get(f.id);
        return {
          id: f.id,
          content: f.text,
          source: f.source,
          interpreter: interpreterType,
          themes: scoreInfo?.themes || [],
          relevanceScore: scoreInfo?.maxSim || 0.5,
          metadata: {
            ...f.metadata,
            chapter: f.chapter,
            matchedThemes: scoreInfo?.themes || []
          }
        };
      });

      logger.info('Theme-based retrieval complete', {
        fragmentsFound: knowledgeFragments.length,
        themesUsed: themeCodes.length
      });

      return {
        fragments: knowledgeFragments,
        metadata: {
          totalFound: knowledgeFragments.length,
          themesUsed: themeCodes,
          retrievalMethod: 'theme-based'
        }
      };

    } catch (error) {
      logger.error('Theme retrieval error', { error });
      return {
        fragments: [],
        metadata: {
          totalFound: 0,
          themesUsed: [],
          retrievalMethod: 'error'
        }
      };
    }
  }

  /**
   * Direct theme-based retrieval by theme codes
   */
  private async retrieveKnowledgeByThemes(
    themeCodes: string[],
    interpreterType: InterpreterType
  ): Promise<RetrievalResult> {
    try {
      // Get fragments associated with these themes, filtered by interpreter using a join
      const { data: fragmentThemes, error: ftError } = await this.supabase
        .from('fragment_themes')
        .select(`
          fragment_id, 
          theme_code, 
          similarity,
          knowledge_fragments!inner(interpreter)
        `)
        .in('theme_code', themeCodes)
        .eq('knowledge_fragments.interpreter', interpreterType)
        .gte('similarity', 0.3) // Lowered threshold from 0.5 to 0.3
        .order('similarity', { ascending: false })
        .limit(200);

      if (ftError || !fragmentThemes || fragmentThemes.length === 0) {
        logger.warn('No fragment-theme associations found', { themeCodes });
        return {
          fragments: [],
          metadata: {
            totalFound: 0,
            themesUsed: themeCodes,
            retrievalMethod: 'theme-based-empty'
          }
        };
      }

      // Group by fragment and track max similarity
      const fragmentScores = new Map<string, { maxSim: number; themes: string[] }>();
      
      for (const ft of fragmentThemes) {
        const existing = fragmentScores.get(ft.fragment_id);
        if (!existing || ft.similarity > existing.maxSim) {
          fragmentScores.set(ft.fragment_id, {
            maxSim: ft.similarity,
            themes: existing ? [...existing.themes, ft.theme_code] : [ft.theme_code]
          });
        }
      }

      // Get top 10 fragments by similarity before quality control
      const topFragmentIds = Array.from(fragmentScores.entries())
        .sort(([, a], [, b]) => b.maxSim - a.maxSim)
        .slice(0, 10) // Limit to top 10 fragments before quality control
        .map(([id]) => id);

      // Retrieve actual fragments
      const { data: fragments, error: fragError } = await this.supabase
        .from('knowledge_fragments')
        .select('id, text, source, chapter, metadata')
        .in('id', topFragmentIds)
        .eq('interpreter', interpreterType);

      if (fragError || !fragments) {
        logger.error('Failed to retrieve fragments', { error: fragError });
        return {
          fragments: [],
          metadata: {
            totalFound: 0,
            themesUsed: themeCodes,
            retrievalMethod: 'theme-based-failed'
          }
        };
      }

      // Convert to KnowledgeFragment format
      const knowledgeFragments: KnowledgeFragment[] = fragments.map(f => {
        const scoreInfo = fragmentScores.get(f.id);
        return {
          id: f.id,
          content: f.text,
          source: f.source,
          interpreter: interpreterType,
          themes: scoreInfo?.themes || [],
          relevanceScore: scoreInfo?.maxSim || 0.5,
          metadata: {
            ...f.metadata,
            chapter: f.chapter,
            matchedThemes: scoreInfo?.themes || []
          }
        };
      });

      return {
        fragments: knowledgeFragments,
        metadata: {
          totalFound: knowledgeFragments.length,
          themesUsed: themeCodes,
          retrievalMethod: 'theme-based-direct'
        }
      };

    } catch (error) {
      logger.error('Theme retrieval by codes error', { error });
      return {
        fragments: [],
        metadata: {
          totalFound: 0,
          themesUsed: themeCodes,
          retrievalMethod: 'error'
        }
      };
    }
  }

  /**
   * Semantic fallback using simple vector search
   */
  private async semanticFallback(
    dreamContext: DreamContext,
    interpreterType: InterpreterType
  ): Promise<RetrievalResult> {
    logger.info('Using semantic fallback retrieval');

    try {
      // Generate embedding for dream
      const dreamEmbedding = await bgeEmbeddingsService.generateEmbedding(
        dreamContext.dreamTranscription
      );

      // Direct semantic search (no sparse embeddings)
      const { data: fragments, error } = await this.supabase.rpc(
        'search_knowledge_semantic',
        {
          query_embedding: dreamEmbedding,
          interpreter_filter: interpreterType,
          match_threshold: 0.5,
          match_count: 15
        }
      );

      if (error) {
        // If function doesn't exist, try direct query
        logger.warn('Semantic search function not available', { error });
        
        // Last resort: text search
        const { data: textResults, error: textError } = await this.supabase
          .from('knowledge_fragments')
          .select('id, text, source, chapter, metadata')
          .eq('interpreter', interpreterType)
          .textSearch('text', dreamContext.themes.map(t => t.name).join(' '))
          .limit(10);

        if (!textError && textResults) {
          const knowledgeFragments: KnowledgeFragment[] = textResults.map(f => ({
            id: f.id,
            content: f.text,
            source: f.source,
            interpreter: interpreterType,
            themes: [],
            relevanceScore: 0.5,
            metadata: {
              ...f.metadata,
              chapter: f.chapter
            }
          }));

          return {
            fragments: knowledgeFragments,
            metadata: {
              totalFound: knowledgeFragments.length,
              themesUsed: dreamContext.themes.map(t => t.code),
              retrievalMethod: 'text-search-fallback'
            }
          };
        }
      }

      if (fragments) {
        const knowledgeFragments: KnowledgeFragment[] = fragments.map((f: any) => ({
          id: f.id,
          content: f.text,
          source: f.source,
          interpreter: interpreterType,
          themes: [],
          relevanceScore: f.similarity || 0.5,
          metadata: {
            ...f.metadata,
            chapter: f.chapter
          }
        }));

        return {
          fragments: knowledgeFragments,
          metadata: {
            totalFound: knowledgeFragments.length,
            themesUsed: dreamContext.themes.map(t => t.code),
            retrievalMethod: 'semantic-fallback'
          }
        };
      }

      return {
        fragments: [],
        metadata: {
          totalFound: 0,
          themesUsed: [],
          retrievalMethod: 'all-methods-failed'
        }
      };

    } catch (error) {
      logger.error('Semantic fallback error', { error });
      return {
        fragments: [],
        metadata: {
          totalFound: 0,
          themesUsed: [],
          retrievalMethod: 'error'
        }
      };
    }
  }
}

export const themeKnowledgeRetriever = ThemeKnowledgeRetriever.getInstance();