import { ContentClassifier, ContentType } from './classifier';
import { jungianThemeMapper } from './jungian-theme-mapper';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../../utils/logger';
import { bgeEmbeddingsService } from '../../../services/embeddings-bge.service';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../../config';

interface Theme {
  code: string;
  label: string;
  description: string;
}

interface ThemesData {
  themes: Theme[];
}

interface EnhancedClassificationResult {
  primary_type: ContentType;
  confidence: {
    primary: number;
    overall: number;
  };
  secondary_types?: ContentType[];
  topics?: string[];
  keywords?: string[];
  
  // Theme-based enhancements
  applicable_themes?: string[];
  jungian_concepts?: string[];
  symbols_present?: string[];
  interpretive_hints?: string[];
  theme_confidence?: number;
  
  // Metadata
  has_symbols?: boolean;
  has_examples?: boolean;
  has_case_study?: boolean;
  has_quotes?: boolean;
  word_count?: number;
  complexity_score?: number;
  has_sparse?: boolean;
}

export class ImprovedKnowledgeClassifierBGE {
  private contentClassifier: ContentClassifier;
  private themesData: ThemesData | null = null;
  private themeEmbeddings: Map<string, number[]> = new Map();
  private validThemeCodes: Set<string> = new Set();
  private themeKeywordMap: Map<string, string[]> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );
  
  constructor() {
    this.contentClassifier = new ContentClassifier();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this.loadThemesData();
    await this.initPromise;
    this.initialized = true;
  }

  private async loadThemesData(): Promise<void> {
    try {
      const themesPath = path.join(process.cwd(), 'supabase', 'scripts', 'themes.json');
      if (fs.existsSync(themesPath)) {
        this.themesData = JSON.parse(fs.readFileSync(themesPath, 'utf-8'));
        logger.info(`Loaded ${this.themesData.themes.length} themes for classification`);
        
        // Build valid theme codes set and keyword map
        this.buildThemeKeywordMap();
        
        // Load theme embeddings from database
        await this.loadThemeEmbeddings();
      } else {
        logger.warn('themes.json not found');
      }
    } catch (error) {
      logger.error('Failed to load themes data:', error);
    }
  }

  private buildThemeKeywordMap(): void {
    if (!this.themesData) return;

    for (const theme of this.themesData.themes) {
      // Store valid theme code
      this.validThemeCodes.add(theme.code);
      
      // Extract keywords from label and description - be more selective
      const keywords: string[] = [];
      
      // Add the code itself as primary keyword
      keywords.push(theme.code.toLowerCase());
      
      // Add label words (but filter short/common words)
      const labelWords = theme.label.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !this.isCommonWord(w));
      keywords.push(...labelWords);
      
      // Extract key descriptive words from description - be more selective
      const descWords = theme.description.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !this.isCommonWord(w) && !this.isGenericDreamWord(w))
        .slice(0, 3); // Only top 3 most relevant words
      
      keywords.push(...descWords);
      
      // Remove duplicates and store
      this.themeKeywordMap.set(theme.code, [...new Set(keywords)]);
    }
    
    logger.info(`Built selective keyword map for ${this.themeKeywordMap.size} themes`);
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'about', 'or', 'but', 'not', 'have',
      'this', 'these', 'those', 'they', 'them', 'their', 'there', 'then',
      'when', 'where', 'who', 'what', 'how', 'why', 'can', 'could', 'would',
      'should', 'may', 'might', 'must', 'shall', 'being', 'having', 'doing'
    ]);
    return commonWords.has(word.toLowerCase());
  }

  private isGenericDreamWord(word: string): boolean {
    const genericWords = new Set([
      'dreams', 'dream', 'dreaming', 'dreamed', 'dreamt', 'about', 'featuring',
      'involving', 'related', 'associated', 'connected', 'symbolic', 'represents'
    ]);
    return genericWords.has(word.toLowerCase());
  }

  private async loadThemeEmbeddings(): Promise<void> {
    if (!this.themesData) return;

    try {
      // Try to load existing BGE embeddings first
      const { data: themesWithBGE } = await this.supabase
        .from('themes')
        .select('code, embedding_bge')
        .not('embedding_bge', 'is', null);

      if (themesWithBGE && themesWithBGE.length > 0) {
        for (const theme of themesWithBGE) {
          if (this.validThemeCodes.has(theme.code)) {
            this.themeEmbeddings.set(theme.code, theme.embedding_bge);
          }
        }
        logger.info(`Loaded ${this.themeEmbeddings.size} BGE theme embeddings from database`);
      }

      // Generate BGE embeddings for themes that don't have them
      const missingThemes = this.themesData.themes.filter(t => !this.themeEmbeddings.has(t.code));
      
      if (missingThemes.length > 0) {
        logger.info(`Generating BGE embeddings for ${missingThemes.length} themes...`);
        
        for (const theme of missingThemes) {
          try {
            const themeText = `${theme.label}. ${theme.description}`;
            const embedding = await bgeEmbeddingsService.generateFullEmbedding(themeText);
            this.themeEmbeddings.set(theme.code, embedding.dense);
            
            // Store in database for future use
            await this.supabase
              .from('themes')
              .update({ embedding_bge: embedding.dense })
              .eq('code', theme.code);
              
            // Small delay to avoid overwhelming the service
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            logger.error(`Failed to generate embedding for theme ${theme.code}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load theme embeddings:', error);
    }
  }

  async classifyContent(
    text: string, 
    interpreterType: string = 'jung'
  ): Promise<EnhancedClassificationResult> {
    // Ensure initialized
    await this.initialize();
    
    // Get basic classification
    const basicResult = this.contentClassifier.classifyContent(text);
    
    // Extract themes using improved method
    const themeResults = await this.extractValidThemes(text);
    
    // Map to Jungian concepts
    const { concepts, interpretiveHints } = jungianThemeMapper.mapDreamToJungianConcepts(
      themeResults.themes
    );
    
    // Detect symbols
    const symbols = this.detectSymbols(text);
    
    // Calculate complexity
    const complexity = this.calculateComplexity(text);
    
    // Extract proper keywords (not theme codes)
    const keywords = this.extractKeywords(text);
    
    // Improve content type based on content analysis
    const improvedType = this.improveContentType(basicResult.primaryType, text, themeResults.themes);
    
    // Build enhanced result
    const result: EnhancedClassificationResult = {
      primary_type: improvedType,
      confidence: {
        primary: basicResult.confidence,
        overall: this.calculateOverallConfidence(
          basicResult.confidence,
          themeResults.confidence,
          symbols.length
        )
      },
      secondary_types: basicResult.secondaryTypes,
      topics: basicResult.topics,
      keywords: keywords,
      
      // Theme enhancements - now with validated theme codes
      applicable_themes: themeResults.themes,
      jungian_concepts: Array.from(concepts),
      symbols_present: symbols,
      interpretive_hints: interpretiveHints,
      theme_confidence: themeResults.confidence,
      
      // Metadata
      has_symbols: basicResult.hasSymbols || symbols.length > 0,
      has_examples: basicResult.hasExamples,
      has_case_study: basicResult.hasCaseStudy,
      has_quotes: /"[^"]+"/g.test(text),
      word_count: text.split(/\s+/).length,
      complexity_score: complexity,
      has_sparse: true
    };
    
    return result;
  }

  /**
   * IMPROVED: Extract only valid theme codes using both keyword and semantic matching
   */
  private async extractValidThemes(text: string): Promise<{ 
    themes: string[]; 
    confidence: number 
  }> {
    const textLower = text.toLowerCase();
    const detectedThemes: Map<string, number> = new Map();
    
    // Determine if this is theoretical/methodological content
    const isTheoreticalContent = this.isTheoreticalContent(text);
    
    // For theoretical content, be much more restrictive
    const semanticThreshold = isTheoreticalContent ? 0.6 : 0.4;
    const keywordThreshold = isTheoreticalContent ? 3 : 1;
    
    // Method 1: Direct keyword matching with stricter rules
    for (const [themeCode, keywords] of this.themeKeywordMap) {
      let score = 0;
      let exactMatches = 0;
      
      for (const keyword of keywords) {
        // Look for whole word matches
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = textLower.match(regex);
        if (matches) {
          const matchCount = matches.length;
          if (keyword === themeCode) {
            // Exact theme code match gets highest score
            score += matchCount * 5;
            exactMatches += matchCount;
          } else {
            // Other keywords get lower score
            score += matchCount * 1;
          }
        }
      }
      
      // Only consider themes with sufficient score
      if (score >= keywordThreshold) {
        detectedThemes.set(themeCode, score);
      }
    }
    
    // Method 2: Semantic similarity (if embeddings available)
    if (this.themeEmbeddings.size > 0) {
      try {
        const textEmbedding = await bgeEmbeddingsService.generateFullEmbedding(text);
        
        for (const [themeCode, themeEmbedding] of this.themeEmbeddings) {
          const similarity = this.cosineSimilarity(textEmbedding.dense, themeEmbedding);
          
          // Only consider themes with high semantic similarity
          if (similarity > semanticThreshold) {
            const currentScore = detectedThemes.get(themeCode) || 0;
            detectedThemes.set(themeCode, currentScore + similarity * 10);
          }
        }
      } catch (error) {
        logger.warn('Semantic similarity failed, using keyword matching only:', error);
      }
    }
    
    // Sort by score and take top themes
    const sortedThemes = Array.from(detectedThemes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Filter themes with significant scores
    const minScore = isTheoreticalContent ? 5 : 2;
    const significantThemes = sortedThemes
      .filter(([_, score]) => score >= minScore)
      .map(([code, _]) => code);
    
    // Calculate confidence based on scores and content type
    let confidence = 0;
    if (significantThemes.length > 0) {
      const topScore = sortedThemes[0]?.[1] || 0;
      confidence = Math.min(0.9, topScore / (isTheoreticalContent ? 30 : 15));
    }
    
    // For theoretical content with dream themes, reduce confidence
    if (isTheoreticalContent && significantThemes.length > 0) {
      confidence *= 0.5;
    }
    
    logger.debug('Theme extraction result:', {
      text: text.substring(0, 100),
      isTheoretical: isTheoreticalContent,
      detectedThemes: significantThemes,
      confidence,
      topScores: sortedThemes.slice(0, 3)
    });
    
    return { 
      themes: significantThemes,
      confidence 
    };
  }

  /**
   * Detect if content is theoretical/methodological vs actual dream content
   */
  private isTheoreticalContent(text: string): boolean {
    const textLower = text.toLowerCase();
    
    // Strong indicators of theoretical content
    const theoreticalIndicators = [
      'theory', 'hypothesis', 'concept', 'principle', 'framework',
      'methodology', 'approach', 'technique', 'method', 'process',
      'freud', 'jung', 'analysis', 'psychoanalysis', 'psychological',
      'according to', 'suggests that', 'we can see', 'it is clear',
      'this indicates', 'the patient', 'case study', 'research'
    ];
    
    // Strong indicators of dream content
    const dreamIndicators = [
      'i dreamed', 'i was', 'i found myself', 'i saw', 'i felt',
      'in the dream', 'then i', 'suddenly i', 'i realized',
      'i woke up', 'the dream', 'my dream'
    ];
    
    let theoreticalScore = 0;
    let dreamScore = 0;
    
    for (const indicator of theoreticalIndicators) {
      if (textLower.includes(indicator)) {
        theoreticalScore++;
      }
    }
    
    for (const indicator of dreamIndicators) {
      if (textLower.includes(indicator)) {
        dreamScore++;
      }
    }
    
    // If it has more theoretical indicators than dream indicators
    return theoreticalScore > dreamScore && theoreticalScore > 0;
  }

  /**
   * Improve content type based on text analysis
   */
  private improveContentType(basicType: ContentType, text: string, themes: string[]): ContentType {
    const textLower = text.toLowerCase();
    
    // Check for dream narratives
    if ((textLower.includes('dream') || textLower.includes('dreamt') || textLower.includes('dreamed')) &&
        (textLower.includes('i was') || textLower.includes('i found myself') || textLower.includes('i saw'))) {
      return 'dream_example';
    }
    
    // Check for theoretical content
    if (this.isTheoreticalContent(text)) {
      if (textLower.includes('method') || textLower.includes('technique') || textLower.includes('approach')) {
        return 'methodology';
      }
      return 'theory';
    }
    
    // Check for case studies
    if ((textLower.includes('patient') || textLower.includes('case') || textLower.includes('analysis of')) &&
        textLower.includes('session')) {
      return 'case_study';
    }
    
    // Check for symbol analysis
    if (textLower.includes('symbol') && (textLower.includes('represents') || textLower.includes('signifies'))) {
      return 'symbol';
    }
    
    return basicType;
  }

  /**
   * Extract meaningful keywords from text (not theme codes)
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => {
        return word.length > 4 && 
               !this.isCommonWord(word) &&
               !this.validThemeCodes.has(word); // Don't include theme codes as keywords
      });
    
    // Count word frequency
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Return top keywords by frequency
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, _]) => word);
  }

  private detectSymbols(text: string): string[] {
    const symbolPatterns = [
      /\b(shadow|anima|animus|self|wise old man|great mother|trickster|hero|child)\b/gi,
      /\b(water|fire|earth|air|tree|mountain|ocean|river|sun|moon|star)\b/gi,
      /\b(snake|serpent|dragon|lion|wolf|bear|eagle|dove|spider|butterfly)\b/gi,
      /\b(mirror|door|key|bridge|sword|crown|ring|book|mask|vessel)\b/gi
    ];
    
    const symbols = new Set<string>();
    
    for (const pattern of symbolPatterns) {
      const matches = text.match(pattern) || [];
      matches.forEach(match => symbols.add(match.toLowerCase()));
    }
    
    return Array.from(symbols);
  }

  private calculateComplexity(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/);
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    
    const complexWords = words.filter(w => w.length > 7).length;
    const complexWordRatio = complexWords / Math.max(words.length, 1);
    
    let score = 0;
    
    if (avgSentenceLength > 25) score += 0.3;
    else if (avgSentenceLength > 20) score += 0.2;
    else if (avgSentenceLength > 15) score += 0.1;
    
    score += complexWordRatio * 0.4;
    
    const technicalTerms = text.match(/\b(unconscious|archetype|individuation|projection|transference|complex|neurosis|psyche)\b/gi) || [];
    score += Math.min(0.3, technicalTerms.length * 0.05);
    
    return Math.min(1, score);
  }

  private calculateOverallConfidence(
    contentConfidence: number,
    themeConfidence: number,
    symbolCount: number
  ): number {
    let confidence = contentConfidence * 0.5 + themeConfidence * 0.3;
    confidence += Math.min(0.2, symbolCount * 0.04);
    return Math.min(0.95, confidence);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }
}

// Export singleton instance
export const improvedKnowledgeClassifier = new ImprovedKnowledgeClassifierBGE();