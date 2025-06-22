import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { embeddingsService } from './embeddings.service';
import { logger } from '../utils/logger';
import { jungianThemeMapper } from '../scripts/rag/core/jungian-theme-mapper';

interface BM25Hit {
  id: number;
  score: number;
  content: string;
  source: string;
  chapter: string;
  metadata: any;
}

interface SemanticHit {
  id: number;
  similarity: number;
  content: string;
  source: string;
  chapter: string;
  metadata: any;
}

interface HybridResult {
  id: number;
  content: string;
  source: string;
  chapter: string;
  metadata: any;
  scores: {
    bm25?: number;
    semantic?: number;
    crossEncoder?: number;
    hybrid: number;
  };
  rank: number;
}

interface HybridSearchOptions {
  maxResults?: number;
  interpreterType?: string;
  bm25Weight?: number;
  semanticWeight?: number;
  useCrossEncoder?: boolean;
  minBM25Results?: number;
  minSemanticResults?: number;
}

export class HybridRAGService {
  private static instance: HybridRAGService;
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
  
  // BM25 preprocessing helpers
  private stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'we', 'i', 'you', 'me', 'my', 'our',
    'this', 'they', 'their', 'them', 'have', 'had', 'can', 'could',
    'would', 'should', 'may', 'might', 'must', 'shall', 'do', 'does',
    'did', 'get', 'got', 'make', 'made', 'go', 'went', 'come', 'came'
  ]);

  private constructor() {}

  static getInstance(): HybridRAGService {
    if (!HybridRAGService.instance) {
      HybridRAGService.instance = new HybridRAGService();
    }
    return HybridRAGService.instance;
  }

  /**
   * Preprocess text for BM25 search - tokenize and remove stop words
   */
  private preprocessForBM25(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(token => token.length > 2 && !this.stopWords.has(token));
  }

  /**
   * Perform BM25-style lexical search using PostgreSQL full-text search
   */
  private async performBM25Search(
    query: string, 
    interpreterType: string,
    maxResults: number = 20
  ): Promise<BM25Hit[]> {
    try {
      // Preprocess query for better matching
      const queryTokens = this.preprocessForBM25(query);
      const searchQuery = queryTokens.join(' | '); // OR query for PostgreSQL

      const { data, error } = await this.supabase
        .from('knowledge_base')
        .select('id, content, source, chapter, metadata')
        .eq('interpreter_type', interpreterType)
        .textSearch('content', searchQuery)
        .limit(maxResults);

      if (error) {
        logger.error('BM25 search error:', error);
        return [];
      }

      // Calculate simple BM25-like scores based on term frequency
      const results: BM25Hit[] = data.map(item => ({
        ...item,
        score: this.calculateBM25Score(item.content, queryTokens)
      }));

      return results.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('BM25 search failed:', error);
      return [];
    }
  }

  /**
   * Simple BM25-like scoring based on term frequency
   */
  private calculateBM25Score(content: string, queryTokens: string[]): number {
    const contentTokens = this.preprocessForBM25(content);
    const contentLength = contentTokens.length;
    const avgDocLength = 200; // Estimated average document length
    
    let score = 0;
    for (const term of queryTokens) {
      const termFreq = contentTokens.filter(token => token === term).length;
      if (termFreq > 0) {
        // Simplified BM25 formula
        const k1 = 1.2;
        const b = 0.75;
        const tf = (termFreq * (k1 + 1)) / (termFreq + k1 * (1 - b + b * (contentLength / avgDocLength)));
        score += tf;
      }
    }
    
    return score;
  }

  /**
   * Perform semantic search using vector similarity
   */
  private async performSemanticSearch(
    query: string,
    interpreterType: string,
    maxResults: number = 20,
    similarityThreshold: number = 0.3
  ): Promise<SemanticHit[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await embeddingsService.generateEmbedding(query);

      const { data, error } = await this.supabase.rpc('search_knowledge', {
        query_embedding: queryEmbedding,
        target_interpreter: interpreterType,
        similarity_threshold: similarityThreshold,
        max_results: maxResults
      });

      if (error) {
        logger.error('Semantic search error:', error);
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        content: item.content,
        source: item.source,
        chapter: item.chapter,
        metadata: item.metadata,
        similarity: item.similarity
      }));
    } catch (error) {
      logger.error('Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Combine BM25 and semantic search results using hybrid scoring
   */
  private combineResults(
    bm25Results: BM25Hit[],
    semanticResults: SemanticHit[],
    bm25Weight: number = 0.3,
    semanticWeight: number = 0.7
  ): HybridResult[] {
    const resultMap = new Map<number, HybridResult>();

    // Normalize BM25 scores (0-1 range)
    const maxBM25Score = Math.max(...bm25Results.map(r => r.score), 1);
    
    // Add BM25 results
    bm25Results.forEach((result, index) => {
      const normalizedBM25 = result.score / maxBM25Score;
      resultMap.set(result.id, {
        id: result.id,
        content: result.content,
        source: result.source,
        chapter: result.chapter,
        metadata: result.metadata,
        scores: {
          bm25: normalizedBM25,
          hybrid: normalizedBM25 * bm25Weight
        },
        rank: 0 // Will be set later
      });
    });

    // Add/merge semantic results
    semanticResults.forEach((result, index) => {
      if (resultMap.has(result.id)) {
        // Merge with existing BM25 result
        const existing = resultMap.get(result.id)!;
        existing.scores.semantic = result.similarity;
        existing.scores.hybrid = (existing.scores.bm25 || 0) * bm25Weight + result.similarity * semanticWeight;
      } else {
        // Add new semantic-only result
        resultMap.set(result.id, {
          id: result.id,
          content: result.content,
          source: result.source,
          chapter: result.chapter,
          metadata: result.metadata,
          scores: {
            semantic: result.similarity,
            hybrid: result.similarity * semanticWeight
          },
          rank: 0
        });
      }
    });

    // Sort by hybrid score and assign ranks
    const sortedResults = Array.from(resultMap.values())
      .sort((a, b) => b.scores.hybrid - a.scores.hybrid);

    sortedResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    return sortedResults;
  }

  /**
   * Main hybrid search function
   */
  async searchKnowledge(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<HybridResult[]> {
    const {
      maxResults = 10,
      interpreterType = 'jung',
      bm25Weight = 0.3,
      semanticWeight = 0.7,
      useCrossEncoder = false, // TODO: Implement cross-encoder
      minBM25Results = 20,
      minSemanticResults = 20
    } = options;

    logger.info('Starting hybrid RAG search', { 
      query: query.substring(0, 50), 
      interpreterType,
      weights: { bm25Weight, semanticWeight }
    });

    try {
      // Extract themes from query and map to Jungian concepts
      const queryThemes = this.extractThemesFromQuery(query);
      const { concepts, interpretiveHints } = jungianThemeMapper.mapDreamToJungianConcepts(queryThemes);
      
      logger.info('Query theme analysis', {
        detectedThemes: queryThemes,
        jungianConcepts: Array.from(concepts),
        hasThemeMapping: queryThemes.length > 0
      });

      // Perform both searches in parallel
      const [bm25Results, semanticResults] = await Promise.all([
        this.performBM25Search(query, interpreterType, minBM25Results),
        this.performSemanticSearch(query, interpreterType, minSemanticResults)
      ]);

      logger.info('Search results counts', {
        bm25: bm25Results.length,
        semantic: semanticResults.length
      });

      // Combine results using hybrid scoring with theme boost
      const hybridResults = this.combineResults(
        bm25Results,
        semanticResults,
        bm25Weight,
        semanticWeight
      );
      
      // Apply theme-based boosting if concepts were found
      const boostedResults = concepts.size > 0 
        ? this.applyThemeBoost(hybridResults, Array.from(concepts), queryThemes)
        : hybridResults;

      // Apply cross-encoder re-ranking if enabled
      // TODO: Implement cross-encoder re-ranking here

      const finalResults = boostedResults.slice(0, maxResults);

      logger.info('Hybrid search completed', {
        totalResults: finalResults.length,
        avgHybridScore: finalResults.reduce((sum, r) => sum + r.scores.hybrid, 0) / finalResults.length
      });

      return finalResults;
    } catch (error) {
      logger.error('Hybrid search failed:', error);
      throw new Error('Failed to perform hybrid search');
    }
  }

  /**
   * Debug method to show how different approaches perform
   */
  async debugSearch(query: string, interpreterType: string = 'jung') {
    console.log(`\n🔍 Debug Search: "${query}"\n`);

    // BM25 only
    const bm25Results = await this.performBM25Search(query, interpreterType, 5);
    console.log('📝 BM25 (Lexical) Results:');
    bm25Results.slice(0, 3).forEach((result, i) => {
      console.log(`  ${i + 1}. Score: ${result.score.toFixed(3)} | ${result.content.substring(0, 100)}...`);
    });

    // Semantic only
    const semanticResults = await this.performSemanticSearch(query, interpreterType, 5);
    console.log('\n🧠 Semantic Results:');
    semanticResults.slice(0, 3).forEach((result, i) => {
      console.log(`  ${i + 1}. Similarity: ${result.similarity.toFixed(3)} | ${result.content.substring(0, 100)}...`);
    });

    // Hybrid
    const hybridResults = await this.searchKnowledge(query, { interpreterType, maxResults: 5 });
    console.log('\n⚡ Hybrid Results:');
    hybridResults.slice(0, 3).forEach((result, i) => {
      const bm25 = result.scores.bm25 ? result.scores.bm25.toFixed(3) : 'N/A';
      const semantic = result.scores.semantic ? result.scores.semantic.toFixed(3) : 'N/A';
      console.log(`  ${i + 1}. Hybrid: ${result.scores.hybrid.toFixed(3)} (BM25: ${bm25}, Semantic: ${semantic})`);
      console.log(`     ${result.content.substring(0, 100)}...`);
    });

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Extract potential dream themes from query text
   */
  private extractThemesFromQuery(query: string): string[] {
    const themes: string[] = [];
    const queryLower = query.toLowerCase();
    
    // Common dream theme keywords to theme codes mapping
    const themeKeywords: Record<string, string> = {
      'snake': 'snake',
      'serpent': 'snake',
      'flying': 'flying',
      'fly': 'flying',
      'falling': 'falling',
      'fall': 'falling',
      'chase': 'being_chased',
      'chasing': 'being_chased',
      'pursued': 'being_chased',
      'death': 'death',
      'dying': 'death',
      'die': 'death',
      'ai': 'ai',
      'artificial intelligence': 'ai',
      'robot': 'ai',
      'virtual reality': 'virtual_reality',
      'vr': 'virtual_reality',
      'social media': 'social_media',
      'facebook': 'social_media',
      'instagram': 'social_media',
      'phone': 'social_media',
      'shadow': 'shadow',
      'dark version': 'shadow',
      'evil twin': 'shadow',
      'betrayal': 'betrayal',
      'betrayed': 'betrayal',
      'ex': 'ex_partner',
      'ex-partner': 'ex_partner',
      'former partner': 'ex_partner',
      'climate': 'climate_change',
      'climate change': 'climate_change',
      'global warming': 'climate_change',
      'world ending': 'climate_change'
    };
    
    // Extract themes based on keywords
    for (const [keyword, themeCode] of Object.entries(themeKeywords)) {
      if (queryLower.includes(keyword)) {
        if (!themes.includes(themeCode)) {
          themes.push(themeCode);
        }
      }
    }
    
    return themes;
  }

  /**
   * Apply theme-based boosting to results
   */
  private applyThemeBoost(
    results: HybridResult[],
    jungianConcepts: string[],
    queryThemes: string[]
  ): HybridResult[] {
    return results.map(result => {
      let themeBoost = 0;
      
      // Check if result metadata contains matching Jungian concepts
      if (result.metadata?.jungian_mapping) {
        const mapping = result.metadata.jungian_mapping;
        
        // Boost for matching Jungian concepts
        const matchingConcepts = jungianConcepts.filter(concept => 
          mapping.concepts?.includes(concept)
        );
        themeBoost += matchingConcepts.length * 0.1; // 10% boost per matching concept
        
        // Boost for applicable themes
        const matchingThemes = queryThemes.filter(theme => 
          mapping.applicable_themes?.includes(theme)
        );
        themeBoost += matchingThemes.length * 0.05; // 5% boost per matching theme
      }
      
      // Apply boost to hybrid score
      return {
        ...result,
        scores: {
          ...result.scores,
          hybrid: result.scores.hybrid * (1 + themeBoost),
          themeBoost
        }
      };
    }).sort((a, b) => b.scores.hybrid - a.scores.hybrid);
  }
}

// Export singleton instance
export const hybridRAGService = HybridRAGService.getInstance();