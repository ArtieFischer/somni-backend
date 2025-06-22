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
}

export class KnowledgeClassifierBGEFixed {
  private contentClassifier: ContentClassifier;
  private themesData: ThemesData | null = null;
  private themeEmbeddings: Map<string, number[]> = new Map();
  private supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );
  
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  
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
        
        // Load theme embeddings from database or generate them
        await this.loadThemeEmbeddings();
      } else {
        logger.warn('themes.json not found, theme classification will be limited');
      }
    } catch (error) {
      logger.error('Failed to load themes data:', error);
    }
  }

  async loadThemeEmbeddings(): Promise<void> {
    if (!this.themesData) return;

    try {
      // Try to load existing BGE embeddings for themes
      const { data: themesWithEmbeddings } = await this.supabase
        .from('themes')
        .select('code, embedding_bge')
        .not('embedding_bge', 'is', null);

      if (themesWithEmbeddings && themesWithEmbeddings.length > 0) {
        themesWithEmbeddings.forEach(theme => {
          if (theme.embedding_bge) {
            this.themeEmbeddings.set(theme.code, theme.embedding_bge);
          }
        });
        logger.info(`Loaded ${this.themeEmbeddings.size} BGE theme embeddings from database`);
      }

      // Generate embeddings for themes that don't have them
      for (const theme of this.themesData.themes) {
        if (!this.themeEmbeddings.has(theme.code)) {
          // Generate BGE embedding for theme
          const themeText = `${theme.label}. ${theme.description}`;
          const embedding = await bgeEmbeddingsService.generateFullEmbedding(themeText);
          this.themeEmbeddings.set(theme.code, embedding.dense);
          
          // Store in database for future use
          await this.supabase
            .from('themes')
            .update({ embedding_bge: embedding.dense })
            .eq('code', theme.code);
        }
      }
    } catch (error) {
      logger.error('Failed to load theme embeddings:', error);
    }
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'the', 'this', 'these', 'those',
      'about', 'after', 'between', 'during', 'through', 'before',
      'may', 'can', 'could', 'would', 'should', 'might', 'must'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  async classifyContent(
    text: string, 
    interpreterType: string = 'jung'
  ): Promise<EnhancedClassificationResult> {
    // Ensure initialized
    await this.initialize();
    // Get basic classification
    const basicResult = this.contentClassifier.classifyContent(text);
    
    // Extract themes using semantic similarity
    const themeResults = await this.extractThemesWithEmbeddings(text);
    
    // Map to Jungian concepts
    const { concepts, interpretiveHints } = jungianThemeMapper.mapDreamToJungianConcepts(
      themeResults.themes
    );
    
    // Detect symbols
    const symbols = this.detectSymbols(text);
    
    // Calculate complexity
    const complexity = this.calculateComplexity(text);
    
    // Build enhanced result
    const result: EnhancedClassificationResult = {
      primary_type: basicResult.primaryType,
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
      keywords: this.extractKeywords(text),
      
      // Theme enhancements - using theme codes, not random words
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
      complexity_score: complexity
    };
    
    // Adjust content type based on themes and content
    if (interpreterType === 'jung') {
      result.primary_type = this.adjustTypeForJung(result, text);
    }
    
    return result;
  }

  private async extractThemesWithEmbeddings(text: string): Promise<{ themes: string[]; confidence: number }> {
    if (!this.themesData || this.themeEmbeddings.size === 0) {
      return { themes: [], confidence: 0 };
    }

    try {
      // Generate embedding for the text
      const textEmbedding = await bgeEmbeddingsService.generateFullEmbedding(text);
      
      // Calculate cosine similarity with each theme
      const themeScores: Array<{ code: string; score: number }> = [];
      
      for (const [themeCode, themeEmbedding] of this.themeEmbeddings) {
        const similarity = this.cosineSimilarity(textEmbedding.dense, themeEmbedding);
        if (similarity > 0.3) { // Threshold for relevance
          themeScores.push({ code: themeCode, score: similarity });
        }
      }
      
      // Sort by score and take top 5
      themeScores.sort((a, b) => b.score - a.score);
      const topThemes = themeScores.slice(0, 5);
      
      // Calculate confidence based on top scores
      const confidence = topThemes.length > 0 
        ? Math.min(0.9, topThemes[0].score)
        : 0;
      
      return { 
        themes: topThemes.map(t => t.code), // Return theme codes, not random words
        confidence 
      };
    } catch (error) {
      logger.error('Error in semantic theme extraction:', error);
      // Fallback to basic keyword matching
      return this.extractThemesFallback(text);
    }
  }

  private extractThemesFallback(text: string): { themes: string[]; confidence: number } {
    if (!this.themesData) {
      return { themes: [], confidence: 0 };
    }

    const textLower = text.toLowerCase();
    const foundThemes: Map<string, number> = new Map();
    
    // Simple keyword matching as fallback
    for (const theme of this.themesData.themes) {
      let score = 0;
      
      // Check if theme label appears in text
      if (textLower.includes(theme.label.toLowerCase())) {
        score += 3;
      }
      
      // Check key words from description
      const descWords = theme.description.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4 && !this.isStopWord(word));
      
      for (const word of descWords) {
        if (textLower.includes(word)) {
          score += 1;
        }
      }
      
      if (score > 0) {
        foundThemes.set(theme.code, score);
      }
    }
    
    // Sort and select top themes
    const sortedThemes = Array.from(foundThemes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, _]) => code);
    
    const confidence = foundThemes.size > 0 ? 0.5 : 0;
    
    return { themes: sortedThemes, confidence };
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
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private detectSymbols(text: string): string[] {
    const symbolPatterns = [
      // Jungian symbols
      /\b(shadow|anima|animus|self|wise old man|great mother|trickster|hero|child)\b/gi,
      // Nature symbols
      /\b(water|fire|earth|air|tree|mountain|ocean|river|sun|moon|star)\b/gi,
      // Animal symbols
      /\b(snake|serpent|dragon|lion|wolf|bear|eagle|dove|spider|butterfly)\b/gi,
      // Object symbols
      /\b(mirror|door|key|bridge|sword|crown|ring|book|mask|vessel)\b/gi,
      // Color symbols
      /\b(red|black|white|gold|silver|blue|green|purple)\s+(object|figure|light|dress|room)/gi
    ];
    
    const symbols = new Set<string>();
    
    for (const pattern of symbolPatterns) {
      const matches = text.match(pattern) || [];
      matches.forEach(match => symbols.add(match.toLowerCase()));
    }
    
    return Array.from(symbols);
  }

  private extractKeywords(text: string): string[] {
    // Extract meaningful keywords from text
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4 && !this.isStopWord(word));
    
    // Count word frequency
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Sort by frequency and return top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, _]) => word);
  }

  private calculateComplexity(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/);
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    
    // Complex word count (words > 7 characters)
    const complexWords = words.filter(w => w.length > 7).length;
    const complexWordRatio = complexWords / words.length;
    
    // Calculate complexity score (0-1)
    let score = 0;
    
    // Sentence length factor
    if (avgSentenceLength > 25) score += 0.3;
    else if (avgSentenceLength > 20) score += 0.2;
    else if (avgSentenceLength > 15) score += 0.1;
    
    // Complex word factor
    score += complexWordRatio * 0.4;
    
    // Technical terms factor
    const technicalTerms = text.match(/\b(unconscious|archetype|individuation|projection|transference|complex|neurosis|psyche)\b/gi) || [];
    score += Math.min(0.3, technicalTerms.length * 0.05);
    
    return Math.min(1, score);
  }

  private calculateOverallConfidence(
    contentConfidence: number,
    themeConfidence: number,
    symbolCount: number
  ): number {
    // Weighted average
    let confidence = contentConfidence * 0.5 + themeConfidence * 0.3;
    
    // Boost for symbols
    confidence += Math.min(0.2, symbolCount * 0.04);
    
    return Math.min(0.95, confidence);
  }

  private adjustTypeForJung(result: EnhancedClassificationResult, text: string): ContentType {
    const textLower = text.toLowerCase();
    
    // Better content type detection based on actual content patterns
    
    // Check for dream narratives
    if ((textLower.includes('dream') || textLower.includes('dreamt') || textLower.includes('dreamed')) &&
        (textLower.includes('i was') || textLower.includes('i found myself') || textLower.includes('i saw'))) {
      return 'dream_example';
    }
    
    // Check for case studies
    if ((textLower.includes('patient') || textLower.includes('case') || textLower.includes('analysis of')) &&
        result.has_examples) {
      return 'case_study';
    }
    
    // Check for symbol analysis
    if (result.symbols_present && result.symbols_present.length > 3 &&
        (textLower.includes('symbol') || textLower.includes('represents') || textLower.includes('signifies'))) {
      return 'symbol';
    }
    
    // Check for methodology
    if (textLower.includes('method') || textLower.includes('approach') || textLower.includes('technique') ||
        textLower.includes('process') || textLower.includes('procedure')) {
      return 'methodology';
    }
    
    // Check for theoretical content
    if (textLower.includes('theory') || textLower.includes('hypothesis') || textLower.includes('principle') ||
        textLower.includes('concept') || textLower.includes('framework')) {
      return 'theory';
    }
    
    // Default to original classification
    return result.primary_type;
  }
}

// Export singleton instance
export const knowledgeClassifierFixed = new KnowledgeClassifierBGEFixed();