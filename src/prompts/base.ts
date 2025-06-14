import type { 
  UserContext, 
  DreamHistory, 
  InterpreterType
} from '../types';
import { logger } from '../utils/logger';
import { UNIVERSAL_THEMES, type UniversalTheme } from './themes';

/**
 * Dream analysis request structure
 */
export interface DreamAnalysisRequest {
  dreamTranscription: string;
  interpreterType: InterpreterType;
  userContext?: UserContext;
  previousDreams?: DreamHistory[];
  analysisDepth: 'initial' | 'deep' | 'transformative';
  specialPrompts?: {
    synchronicity?: string;
    isNightmare?: boolean;
    customContext?: string;
  };
}

/**
 * Universal dream elements extracted regardless of interpreter
 */
export interface UniversalDreamElements {
  detectedThemes: Array<{
    theme: UniversalTheme;
    relevance: number; // 0-1 score
    textMatches: string[];
  }>;
  emotionalTone: 'positive' | 'negative' | 'neutral' | 'mixed';
  dreamType: 'lucid' | 'nightmare' | 'recurring' | 'big_dream' | 'ordinary';
  keySymbols: string[];
  setting: string[];
  characters: string[];
  actions: string[];
}

/**
 * XML prompt template structure
 */
export interface PromptTemplate {
  systemPrompt: string;
  analysisStructure: string;
  outputFormat: string;
  variables: Record<string, any>;
}

/**
 * Abstract base class for all interpreter prompt builders
 * Provides common functionality and enforces consistent structure
 */
export abstract class BasePromptBuilder {
  protected universalElements: UniversalDreamElements | null = null;

  /**
   * Main entry point - builds complete prompt for interpretation
   */
  public async buildPrompt(request: DreamAnalysisRequest): Promise<PromptTemplate> {
    try {
      // 1. Extract universal elements first (interpreter-agnostic)
      this.universalElements = this.extractUniversalElements(request.dreamTranscription);
      
      // 2. Build context-aware prompt (gracefully handles minimal info)
      const contextualPrompt = this.buildContextualPrompt(request);
      
      // 3. Create interpreter-specific analysis structure
      const analysisStructure = this.buildAnalysisStructure(request);
      
      // 4. Define output format
      const outputFormat = this.buildOutputFormat(request);
      
      // 5. Prepare template variables
      const variables = this.prepareTemplateVariables(request);

      logger.info('Prompt built successfully', {
        interpreterType: request.interpreterType,
        analysisDepth: request.analysisDepth,
        hasUserContext: !!request.userContext,
        detectedThemes: this.universalElements.detectedThemes.length,
        dreamType: this.universalElements.dreamType
      });

      return {
        systemPrompt: contextualPrompt,
        analysisStructure,
        outputFormat,
        variables
      };

    } catch (error) {
      logger.error('Prompt building failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        interpreterType: request.interpreterType
      });
      throw error;
    }
  }

  /**
   * Extract universal themes and elements from dream
   * This happens for ALL interpreters to build user's dream map
   */
  public extractUniversalElements(dreamText: string): UniversalDreamElements {
    const lowercaseText = dreamText.toLowerCase();
    const detectedThemes: UniversalDreamElements['detectedThemes'] = [];

    // Detect universal themes
    for (const theme of UNIVERSAL_THEMES) {
      const matches: string[] = [];
      let relevanceScore = 0;

      for (const keyword of theme.keywords) {
        if (lowercaseText.includes(keyword.toLowerCase())) {
          matches.push(keyword);
          relevanceScore += 1;
        }
      }

      if (matches.length > 0) {
        detectedThemes.push({
          theme,
          relevance: Math.min(relevanceScore / theme.keywords.length, 1),
          textMatches: matches
        });
      }
    }

    // Sort by relevance
    detectedThemes.sort((a, b) => b.relevance - a.relevance);

    return {
      detectedThemes,
      emotionalTone: this.analyzeEmotionalTone(dreamText),
      dreamType: this.detectDreamType(dreamText, detectedThemes),
      keySymbols: this.extractKeySymbols(dreamText, detectedThemes),
      setting: this.extractSetting(dreamText),
      characters: this.extractCharacters(dreamText),
      actions: this.extractActions(dreamText)
    };
  }

  /**
   * Build contextual prompt based on available information
   */
  protected buildContextualPrompt(request: DreamAnalysisRequest): string {
    const hasRichContext = request.userContext && (
      request.userContext.currentLifeSituation ||
      request.userContext.emotionalState ||
      request.userContext.recurringSymbols?.length
    );

    if (hasRichContext) {
      return this.buildRichContextPrompt(request);
    } else {
      return this.buildMinimalContextPrompt(request);
    }
  }

  /**
   * Build prompt for minimal context scenarios
   */
  protected buildMinimalContextPrompt(request: DreamAnalysisRequest): string {
    const basePrompt = this.buildInterpreterSpecificSystemPrompt(request);
    
    return `${basePrompt}

DREAM CONTEXT:
- Analysis depth: ${request.analysisDepth}
- Interpreter type: ${request.interpreterType}
- Universal elements detected: ${this.universalElements?.detectedThemes.length || 0} themes
- Dream type: ${this.universalElements?.dreamType || 'unknown'}

Work with what you have. Focus on the most evident symbols and themes.`;
  }

  /**
   * Build prompt for rich context scenarios
   */
  protected buildRichContextPrompt(request: DreamAnalysisRequest): string {
    const basePrompt = this.buildInterpreterSpecificSystemPrompt(request);
    const context = request.userContext!;
    
    return `${basePrompt}

DREAMER CONTEXT:
- Age: ${context.age || 'unknown'}
- Current life situation: ${context.currentLifeSituation || 'not specified'}
- Emotional state: ${context.emotionalState || 'not specified'}
- Recurring symbols: ${context.recurringSymbols?.join(', ') || 'none noted'}
- Recent major events: ${context.recentMajorEvents?.join(', ') || 'none noted'}

DREAM CONTEXT:
- Analysis depth: ${request.analysisDepth}
- Universal elements detected: ${this.universalElements?.detectedThemes.length || 0} themes
- Dream type: ${this.universalElements?.dreamType || 'unknown'}
- Emotional tone: ${this.universalElements?.emotionalTone || 'neutral'}

Use this rich context to provide deeply personalized insights.`;
  }

  // Abstract methods that must be implemented by specific interpreters
  protected abstract buildInterpreterSpecificSystemPrompt(request: DreamAnalysisRequest): string;
  protected abstract buildAnalysisStructure(request: DreamAnalysisRequest): string;
  protected abstract buildOutputFormat(request: DreamAnalysisRequest): string;
  protected abstract prepareTemplateVariables(request: DreamAnalysisRequest): Record<string, any>;

  // Analysis helper methods
  protected analyzeEmotionalTone(dreamText: string): UniversalDreamElements['emotionalTone'] {
    const lowercaseText = dreamText.toLowerCase();
    const positiveWords = ['happy', 'joy', 'love', 'peace', 'beautiful', 'wonderful', 'amazing', 'free', 'light'];
    const negativeWords = ['fear', 'scared', 'dark', 'death', 'angry', 'sad', 'terrified', 'nightmare', 'evil'];
    
    const positiveCount = positiveWords.filter(word => lowercaseText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowercaseText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    if (positiveCount > 0 && negativeCount > 0) return 'mixed';
    return 'neutral';
  }

  protected detectDreamType(dreamText: string, themes: UniversalDreamElements['detectedThemes']): UniversalDreamElements['dreamType'] {
    const lowercaseText = dreamText.toLowerCase();
    
    if (lowercaseText.includes('lucid') || lowercaseText.includes('realized i was dreaming')) {
      return 'lucid';
    }
    if (lowercaseText.includes('nightmare') || lowercaseText.includes('terrifying') || lowercaseText.includes('horror')) {
      return 'nightmare';
    }
    if (lowercaseText.includes('recurring') || lowercaseText.includes('again') || lowercaseText.includes('same dream')) {
      return 'recurring';
    }
    if (themes.length >= 3 && themes.some(t => t.relevance > 0.7)) {
      return 'big_dream';
    }
    return 'ordinary';
  }

  protected extractKeySymbols(dreamText: string, themes: UniversalDreamElements['detectedThemes']): string[] {
    const symbols = new Set<string>();
    
    // Add symbols from detected themes
    themes.forEach(theme => {
      theme.textMatches.forEach(match => symbols.add(match));
    });
    
    // Add common symbolic elements
    const commonSymbols = ['water', 'fire', 'light', 'darkness', 'door', 'key', 'mirror', 'bridge', 'tree', 'animal'];
    const lowercaseText = dreamText.toLowerCase();
    
    commonSymbols.forEach(symbol => {
      if (lowercaseText.includes(symbol)) {
        symbols.add(symbol);
      }
    });
    
    return Array.from(symbols).slice(0, 10); // Limit to 10 most relevant
  }

  protected extractSetting(dreamText: string): string[] {
    const settings = new Set<string>();
    const settingKeywords = ['house', 'forest', 'ocean', 'city', 'school', 'work', 'hospital', 'church', 'mountain', 'beach'];
    const lowercaseText = dreamText.toLowerCase();
    
    settingKeywords.forEach(setting => {
      if (lowercaseText.includes(setting)) {
        settings.add(setting);
      }
    });
    
    return Array.from(settings);
  }

  protected extractCharacters(dreamText: string): string[] {
    const characters = new Set<string>();
    const characterKeywords = ['mother', 'father', 'friend', 'stranger', 'child', 'old man', 'woman', 'teacher', 'doctor', 'animal'];
    const lowercaseText = dreamText.toLowerCase();
    
    characterKeywords.forEach(character => {
      if (lowercaseText.includes(character)) {
        characters.add(character);
      }
    });
    
    return Array.from(characters);
  }

  protected extractActions(dreamText: string): string[] {
    const actions = new Set<string>();
    const actionKeywords = ['flying', 'running', 'chasing', 'falling', 'swimming', 'driving', 'walking', 'climbing', 'fighting', 'dancing'];
    const lowercaseText = dreamText.toLowerCase();
    
    actionKeywords.forEach(action => {
      if (lowercaseText.includes(action)) {
        actions.add(action);
      }
    });
    
    return Array.from(actions);
  }
} 