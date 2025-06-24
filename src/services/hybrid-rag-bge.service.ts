/**
 * Enhanced Hybrid RAG Service with BGE-M3
 * 
 * Improvements based on quality test findings:
 * 1. BGE-M3 embeddings (1024D) for better semantic understanding
 * 2. Theme-aware retrieval using themes.json mappings
 * 3. Enhanced BM25 with theme boosting
 * 4. Sparse embeddings for keyword matching
 * 5. Adaptive scoring based on query type
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { bgeEmbeddingsService } from './embeddings-bge.service';
import { logger } from '../utils/logger';
import { jungianThemeMapper } from '../scripts/rag/core/jungian-theme-mapper';
import * as fs from 'fs';
import * as path from 'path';

interface BGEHybridResult {
  id: number;
  content: string;
  source: string;
  chapter: string;
  metadata: any;
  scores: {
    semantic?: number;
    sparse?: number;
    bm25?: number;
    themeBoost?: number;
    hybrid: number;
  };
  matchedThemes?: string[];
  matchedConcepts?: string[];
  interpretiveHints?: string[];
}

interface BGESearchOptions {
  maxResults?: number;
  interpreterType?: string;
  weights?: {
    semantic?: number;
    sparse?: number;
    bm25?: number;
  };
  thresholds?: {
    semantic?: number;
    bm25?: number;
  };
  useThemes?: boolean;
  adaptiveScoring?: boolean;
}

export class BGEHybridRAGService {
  private static instance: BGEHybridRAGService;
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
  
  // Enhanced stopwords for philosophical texts
  private philosophicalStopwords = new Set([
    // Standard stopwords
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'we', 'i', 'you', 'me', 'my', 'our',
    // Common philosophical connectors
    'thus', 'therefore', 'hence', 'moreover', 'furthermore', 'however',
    'nevertheless', 'nonetheless', 'whereas', 'whereby', 'wherein'
  ]);
  
  // Theme vocabulary loaded from themes.json
  private themeVocabulary: Map<string, string[]> = new Map();
  
  private constructor() {
    this.loadThemeVocabulary();
  }

  static getInstance(): BGEHybridRAGService {
    if (!BGEHybridRAGService.instance) {
      BGEHybridRAGService.instance = new BGEHybridRAGService();
    }
    return BGEHybridRAGService.instance;
  }

  /**
   * Load theme vocabulary from themes.json
   */
  private loadThemeVocabulary(): void {
    try {
      const themesPath = path.join(process.cwd(), 'supabase', 'scripts', 'themes.json');
      if (fs.existsSync(themesPath)) {
        const themes = JSON.parse(fs.readFileSync(themesPath, 'utf-8'));
        
        // Build vocabulary map
        for (const theme of themes.themes) {
          const keywords: string[] = [];
          
          // Add name and description words (skip if missing)
          if (theme.name) {
            keywords.push(...theme.name.toLowerCase().split(' '));
          }
          if (theme.description) {
            keywords.push(...theme.description.toLowerCase().split(' ')
              .filter((w: string) => !this.philosophicalStopwords.has(w)));
          }
          
          // Add symbol interpretations
          if (theme.symbolInterpretations) {
            for (const [symbol, interpretation] of Object.entries(theme.symbolInterpretations)) {
              keywords.push(symbol.toLowerCase());
            }
          }
          
          this.themeVocabulary.set(theme.code, keywords);
        }
        
        logger.info(`Loaded ${this.themeVocabulary.size} themes into vocabulary`);
      }
    } catch (error) {
      logger.error('Failed to load theme vocabulary:', error);
    }
  }

  /**
   * Enhanced theme extraction using themes.json
   */
  private extractThemesFromQuery(query: string): {
    themes: string[];
    concepts: string[];
    keywords: string[];
  } {
    const queryLower = query.toLowerCase();
    const detectedThemes = new Set<string>();
    const detectedKeywords = new Set<string>();
    
    // Check against theme vocabulary
    for (const [themeCode, keywords] of this.themeVocabulary) {
      for (const keyword of keywords) {
        if (queryLower.includes(keyword) && keyword.length > 3) {
          detectedThemes.add(themeCode);
          detectedKeywords.add(keyword);
        }
      }
    }
    
    // Also use the existing theme detection
    const themes = Array.from(detectedThemes);
    const { concepts, interpretiveHints } = jungianThemeMapper.mapDreamToJungianConcepts(themes);
    
    // Extract important philosophical terms
    const philosophicalTerms = [
      'unconscious', 'conscious', 'psyche', 'ego', 'self', 'shadow',
      'anima', 'animus', 'archetype', 'symbol', 'dream', 'collective',
      'individuation', 'projection', 'complex', 'neurosis', 'libido'
    ];
    
    for (const term of philosophicalTerms) {
      if (queryLower.includes(term)) {
        detectedKeywords.add(term);
      }
    }
    
    return {
      themes,
      concepts: Array.from(concepts),
      keywords: Array.from(detectedKeywords)
    };
  }

  /**
   * Perform BGE-M3 semantic search with sparse embedding support
   */
  private async performBGESemanticSearch(
    query: string,
    interpreterType: string,
    maxResults: number = 20,
    similarityThreshold: number = 0.35
  ): Promise<BGEHybridResult[]> {
    try {
      // Generate BGE-M3 embeddings
      const fullEmbedding = await bgeEmbeddingsService.generateFullEmbedding(query);
      
      // Extract themes and concepts
      const { themes, concepts } = this.extractThemesFromQuery(query);
      
      // Prepare sparse embedding for SQL
      const sparseJson = fullEmbedding.sparse 
        ? JSON.stringify(Object.fromEntries(fullEmbedding.sparse))
        : null;
      
      // Call enhanced search function
      const { data, error } = await this.supabase.rpc('search_knowledge_bge', {
        query_embedding: fullEmbedding.dense,
        query_sparse: sparseJson,
        query_themes: themes,
        query_concepts: concepts,
        target_interpreter: interpreterType,
        similarity_threshold: similarityThreshold,
        max_results: maxResults,
        use_hybrid: true
      });

      if (error) {
        logger.error('BGE semantic search error:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        content: item.content,
        source: item.source,
        chapter: item.chapter,
        metadata: item.metadata,
        scores: {
          semantic: item.similarity,
          themeBoost: item.theme_boost,
          hybrid: item.hybrid_score
        },
        matchedThemes: themes,
        matchedConcepts: concepts
      }));
    } catch (error) {
      logger.error('BGE semantic search failed:', error);
      return [];
    }
  }

  /**
   * Enhanced BM25 search with theme awareness
   */
  private async performEnhancedBM25Search(
    query: string,
    interpreterType: string,
    maxResults: number = 20
  ): Promise<BGEHybridResult[]> {
    try {
      const { themes } = this.extractThemesFromQuery(query);
      
      const { data, error } = await this.supabase.rpc('search_knowledge_bm25_enhanced', {
        query_text: query,
        query_themes: themes,
        target_interpreter: interpreterType,
        max_results: maxResults
      });

      if (error) {
        logger.error('Enhanced BM25 search error:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        content: item.content,
        source: item.source,
        chapter: item.chapter,
        metadata: item.metadata,
        scores: {
          bm25: item.bm25_score,
          themeBoost: item.theme_relevance,
          hybrid: item.bm25_score
        },
        matchedThemes: themes
      }));
    } catch (error) {
      logger.error('Enhanced BM25 search failed:', error);
      return [];
    }
  }

  /**
   * Adaptive weight calculation based on query characteristics
   */
  private calculateAdaptiveWeights(query: string, options: BGESearchOptions): {
    semantic: number;
    sparse: number;
    bm25: number;
  } {
    if (!options.adaptiveScoring) {
      return {
        semantic: options.weights?.semantic ?? 0.5,
        sparse: options.weights?.sparse ?? 0.2,
        bm25: options.weights?.bm25 ?? 0.3
      };
    }
    
    // Analyze query characteristics
    const queryLength = query.split(' ').length;
    const hasPhilosophicalTerms = /\b(archetype|unconscious|shadow|anima|ego|self)\b/i.test(query);
    const hasSpecificSymbols = /\b(snake|water|mother|father|death|flying)\b/i.test(query);
    const isAbstract = /\b(meaning|significance|represents|symbolizes)\b/i.test(query);
    
    let weights = { semantic: 0.5, sparse: 0.2, bm25: 0.3 };
    
    // Adjust weights based on query type
    if (queryLength < 5 && hasSpecificSymbols) {
      // Short, specific queries benefit from BM25
      weights = { semantic: 0.3, sparse: 0.2, bm25: 0.5 };
    } else if (isAbstract || hasPhilosophicalTerms) {
      // Abstract queries need more semantic understanding
      weights = { semantic: 0.6, sparse: 0.2, bm25: 0.2 };
    } else if (queryLength > 15) {
      // Long queries benefit from sparse matching
      weights = { semantic: 0.4, sparse: 0.3, bm25: 0.3 };
    }
    
    logger.info('Adaptive weights calculated:', weights);
    return weights;
  }

  /**
   * Main search function with all enhancements
   */
  async searchKnowledge(
    query: string,
    options: BGESearchOptions = {}
  ): Promise<BGEHybridResult[]> {
    const {
      maxResults = 10,
      interpreterType = 'jung',
      useThemes = true,
      adaptiveScoring = true,
      thresholds = { semantic: 0.35, bm25: 0.1 }
    } = options;
    
    logger.info('BGE Hybrid RAG search starting', {
      query: query.substring(0, 50),
      interpreterType,
      useThemes,
      adaptiveScoring
    });
    
    try {
      // Calculate adaptive weights
      const weights = this.calculateAdaptiveWeights(query, options);
      
      // Extract themes and concepts
      const { themes, concepts, keywords } = this.extractThemesFromQuery(query);
      const { interpretiveHints } = jungianThemeMapper.mapDreamToJungianConcepts(themes);
      
      logger.info('Query analysis', {
        themes,
        concepts,
        keywords: keywords.slice(0, 5),
        hasInterpretiveHints: interpretiveHints.length > 0
      });
      
      // Perform parallel searches
      const [semanticResults, bm25Results] = await Promise.all([
        this.performBGESemanticSearch(
          query, 
          interpreterType, 
          maxResults * 2,
          thresholds.semantic
        ),
        weights.bm25 > 0 ? this.performEnhancedBM25Search(
          query,
          interpreterType,
          maxResults * 2
        ) : Promise.resolve([])
      ]);
      
      logger.info('Search results', {
        semantic: semanticResults.length,
        bm25: bm25Results.length
      });
      
      // Combine results with enhanced scoring
      const combinedResults = this.combineResultsWithEnhancedScoring(
        semanticResults,
        bm25Results,
        weights,
        { themes, concepts, interpretiveHints }
      );
      
      // Apply quality filtering
      const qualityResults = this.applyQualityFiltering(combinedResults, query);
      
      // Return top results
      const finalResults = qualityResults.slice(0, maxResults);
      
      logger.info('BGE Hybrid search completed', {
        totalCandidates: combinedResults.length,
        afterQualityFilter: qualityResults.length,
        finalResults: finalResults.length,
        avgScore: finalResults.reduce((s, r) => s + r.scores.hybrid, 0) / finalResults.length
      });
      
      return finalResults;
    } catch (error) {
      logger.error('BGE Hybrid search failed:', error);
      throw new Error('Failed to perform hybrid search');
    }
  }

  /**
   * Enhanced result combination with theme-aware scoring
   */
  private combineResultsWithEnhancedScoring(
    semanticResults: BGEHybridResult[],
    bm25Results: BGEHybridResult[],
    weights: { semantic: number; sparse: number; bm25: number },
    queryAnalysis: { themes: string[]; concepts: string[]; interpretiveHints: string[] }
  ): BGEHybridResult[] {
    const resultMap = new Map<number, BGEHybridResult>();
    
    // Process semantic results
    for (const result of semanticResults) {
      const enhancedResult = { ...result };
      
      // Apply interpretive hints boost
      if (queryAnalysis.interpretiveHints.length > 0 && result.content) {
        const contentLower = result.content.toLowerCase();
        const hintBoost = queryAnalysis.interpretiveHints
          .filter(hint => {
            const hintWords = hint.toLowerCase().split(' ')
              .filter(w => w.length > 4);
            return hintWords.some(word => contentLower.includes(word));
          }).length * 0.05;
        
        enhancedResult.scores.themeBoost = (enhancedResult.scores.themeBoost || 0) + hintBoost;
      }
      
      resultMap.set(result.id, enhancedResult);
    }
    
    // Merge BM25 results
    for (const result of bm25Results) {
      if (resultMap.has(result.id)) {
        const existing = resultMap.get(result.id)!;
        existing.scores.bm25 = result.scores.bm25;
      } else {
        resultMap.set(result.id, result);
      }
    }
    
    // Calculate final hybrid scores
    const results = Array.from(resultMap.values()).map(result => {
      const scores = result.scores;
      
      // Base hybrid score
      let hybridScore = 0;
      if (scores.semantic) hybridScore += weights.semantic * scores.semantic;
      if (scores.sparse) hybridScore += weights.sparse * scores.sparse;
      if (scores.bm25) hybridScore += weights.bm25 * Math.min(scores.bm25, 1);
      
      // Apply theme boost
      if (scores.themeBoost) {
        hybridScore *= (1 + scores.themeBoost);
      }
      
      // Content type boost
      if (result.metadata?.classification?.primary_type === 'dream_example') {
        hybridScore *= 1.1;
      } else if (result.metadata?.classification?.primary_type === 'symbol') {
        hybridScore *= 1.05;
      }
      
      return {
        ...result,
        scores: {
          ...scores,
          hybrid: hybridScore
        }
      };
    });
    
    // Sort by hybrid score
    return results.sort((a, b) => b.scores.hybrid - a.scores.hybrid);
  }

  /**
   * Apply quality filtering based on our test findings
   */
  private applyQualityFiltering(
    results: BGEHybridResult[],
    query: string
  ): BGEHybridResult[] {
    const queryWords = new Set(
      query.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3 && !this.philosophicalStopwords.has(w))
    );
    
    return results.filter(result => {
      // Filter out results with very low scores
      if (result.scores.hybrid < 0.2) return false;
      
      // Check for minimum content relevance
      const contentWords = new Set(
        result.content.toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 3 && !this.philosophicalStopwords.has(w))
      );
      
      // Calculate word overlap
      const overlap = Array.from(queryWords)
        .filter(word => contentWords.has(word)).length;
      
      const overlapRatio = overlap / queryWords.size;
      
      // Require at least 20% word overlap for non-semantic matches
      if (!result.scores.semantic && overlapRatio < 0.2) return false;
      
      return true;
    });
  }

  /**
   * Get detailed search diagnostics
   */
  async diagnoseSearch(query: string, interpreterType: string = 'jung'): Promise<void> {
    console.log('\n🔍 BGE Hybrid Search Diagnostics');
    console.log('='.repeat(60));
    console.log(`Query: "${query}"`);
    
    // Analyze query
    const { themes, concepts, keywords } = this.extractThemesFromQuery(query);
    console.log('\nQuery Analysis:');
    console.log(`  Themes: ${themes.join(', ') || 'None'}`);
    console.log(`  Concepts: ${concepts.join(', ') || 'None'}`);
    console.log(`  Keywords: ${keywords.join(', ') || 'None'}`);
    
    // Test different weight configurations
    const configurations = [
      { name: 'Semantic Heavy', weights: { semantic: 0.7, sparse: 0.1, bm25: 0.2 } },
      { name: 'Balanced', weights: { semantic: 0.5, sparse: 0.2, bm25: 0.3 } },
      { name: 'BM25 Heavy', weights: { semantic: 0.3, sparse: 0.1, bm25: 0.6 } }
    ];
    
    for (const config of configurations) {
      console.log(`\n${config.name} Configuration:`);
      const results = await this.searchKnowledge(query, {
        interpreterType,
        maxResults: 3,
        weights: config.weights,
        adaptiveScoring: false
      });
      
      results.forEach((result, i) => {
        console.log(`  ${i + 1}. Score: ${result.scores.hybrid.toFixed(3)}`);
        console.log(`     ${result.content.substring(0, 100)}...`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Export singleton instance
export const bgeHybridRAGService = BGEHybridRAGService.getInstance();