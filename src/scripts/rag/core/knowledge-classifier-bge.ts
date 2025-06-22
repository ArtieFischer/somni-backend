import { ContentClassifier, ContentType } from './classifier';
import { jungianThemeMapper } from './jungian-theme-mapper';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../../utils/logger';

interface Theme {
  code: string;
  name: string;
  description: string;
  symbolInterpretations?: Record<string, string>;
  psychologicalAspects?: string[];
  culturalVariations?: string[];
}

interface ThemesData {
  themes: Theme[];
  categories: string[];
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

export class KnowledgeClassifierBGE {
  private contentClassifier: ContentClassifier;
  private themesData: ThemesData | null = null;
  private themeKeywords: Map<string, Set<string>> = new Map();
  
  constructor() {
    this.contentClassifier = new ContentClassifier();
    this.loadThemesData();
  }

  private loadThemesData(): void {
    try {
      const themesPath = path.join(process.cwd(), 'supabase', 'scripts', 'themes.json');
      if (fs.existsSync(themesPath)) {
        this.themesData = JSON.parse(fs.readFileSync(themesPath, 'utf-8'));
        this.buildThemeKeywords();
        logger.info(`Loaded ${this.themesData.themes.length} themes for classification`);
      } else {
        logger.warn('themes.json not found, theme classification will be limited');
      }
    } catch (error) {
      logger.error('Failed to load themes data:', error);
    }
  }

  private buildThemeKeywords(): void {
    if (!this.themesData) return;

    for (const theme of this.themesData.themes) {
      const keywords = new Set<string>();
      
      // Add theme name words
      if (theme.name) {
        theme.name.toLowerCase().split(/\s+/).forEach(word => {
          if (word.length > 3) keywords.add(word);
        });
      }
      
      // Add description words
      if (theme.description) {
        const descWords = theme.description.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 4 && !this.isStopWord(word));
        descWords.forEach(word => keywords.add(word));
      }
      
      // Add symbol interpretations
      if (theme.symbolInterpretations) {
        Object.entries(theme.symbolInterpretations).forEach(([symbol, interpretation]) => {
          keywords.add(symbol.toLowerCase());
          // Add key words from interpretation
          const interpWords = interpretation.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 5 && !this.isStopWord(word))
            .slice(0, 3); // Top 3 words
          interpWords.forEach(word => keywords.add(word));
        });
      }
      
      // Add psychological aspects
      if (theme.psychologicalAspects) {
        theme.psychologicalAspects.forEach(aspect => {
          const aspectWords = aspect.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 4);
          aspectWords.forEach(word => keywords.add(word));
        });
      }
      
      this.themeKeywords.set(theme.code, keywords);
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
    // Get basic classification
    const basicResult = this.contentClassifier.classifyContent(text);
    
    // Extract themes
    const themeResults = this.extractThemes(text);
    
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
      keywords: this.enhanceKeywords(basicResult.keywords, themeResults.themes),
      
      // Theme enhancements
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
    
    // Adjust content type based on themes
    if (interpreterType === 'jung') {
      result.primary_type = this.adjustTypeForJung(result);
    }
    
    return result;
  }

  private extractThemes(text: string): { themes: string[]; confidence: number } {
    if (!this.themesData) {
      return { themes: [], confidence: 0 };
    }

    const textLower = text.toLowerCase();
    const foundThemes: Map<string, number> = new Map();
    
    // Check each theme
    for (const [themeCode, keywords] of this.themeKeywords) {
      let score = 0;
      let matches = 0;
      
      for (const keyword of keywords) {
        if (textLower.includes(keyword)) {
          score += keyword.length > 6 ? 2 : 1; // Longer keywords get more weight
          matches++;
        }
      }
      
      // Normalize by keyword count
      const normalizedScore = keywords.size > 0 ? score / Math.sqrt(keywords.size) : 0;
      
      if (normalizedScore > 0.5 || matches >= 2) {
        foundThemes.set(themeCode, normalizedScore);
      }
    }
    
    // Sort and select top themes
    const sortedThemes = Array.from(foundThemes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, _]) => code);
    
    // Calculate confidence
    const confidence = foundThemes.size > 0 
      ? Math.min(0.9, Array.from(foundThemes.values())[0] / 2)
      : 0;
    
    return { themes: sortedThemes, confidence };
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

  private enhanceKeywords(
    basicKeywords: string[],
    themes: string[]
  ): string[] {
    const enhanced = new Set(basicKeywords);
    
    // Add theme names if they appear in text
    if (this.themesData) {
      themes.forEach(themeCode => {
        const theme = this.themesData!.themes.find(t => t.code === themeCode);
        if (theme && theme.name) {
          enhanced.add(theme.name.toLowerCase());
        }
      });
    }
    
    return Array.from(enhanced).slice(0, 25);
  }

  private adjustTypeForJung(result: EnhancedClassificationResult): ContentType {
    // If we have strong dream themes and it's currently theory, check if it's actually a dream example
    if (result.primary_type === 'theory' && 
        result.applicable_themes?.some(t => t.includes('dream')) &&
        result.has_examples) {
      return 'dream_example';
    }
    
    // If we have many symbols and it's theory, might be symbol analysis
    if (result.primary_type === 'theory' && 
        result.symbols_present && 
        result.symbols_present.length > 3) {
      return 'symbol';
    }
    
    return result.primary_type;
  }
}

// Export singleton instance
export const knowledgeClassifier = new KnowledgeClassifierBGE();