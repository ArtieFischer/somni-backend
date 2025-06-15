import { logger } from '../utils/logger';
import type { 
  JungianInsights, 
  FreudianInsights, 
  NeuroscientistInsights, 
  AstrologistInsights,
  InterpreterType,
  CostSummary
} from '../types';

/**
 * Core interpretation response parsing utilities
 * Used by the main interpretation service to structure AI responses
 */
export class InterpretationParser {
  
  /**
   * Parse AI response based on interpreter type
   */
  static async parseInterpretationResponse(
    aiResponse: string,
    interpreterType: InterpreterType
  ): Promise<JungianInsights | FreudianInsights | NeuroscientistInsights | AstrologistInsights> {
    try {
      switch (interpreterType) {
        case 'jung':
          return this.parseJungianResponse(aiResponse);
        case 'freud':
          return this.parseFreudianResponse(aiResponse);
        case 'neuroscientist':
          return this.parseNeuroscientistResponse(aiResponse);
        case 'astrologist':
          return this.parseAstrologistResponse(aiResponse);
        default:
          throw new Error(`Unknown interpreter type: ${interpreterType}`);
      }
    } catch (error) {
      logger.error('Failed to parse interpretation response', {
        interpreterType,
        error: error instanceof Error ? error.message : 'Unknown error',
        aiResponseLength: aiResponse.length
      });
      throw error;
    }
  }

  /**
   * Parse Jungian interpretation response with enhanced JSON and text handling
   */
  private static parseJungianResponse(aiResponse: string): JungianInsights {
    try {
      // First try to parse as clean JSON
      let parsed: any;
      
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e) {
          // If JSON parsing fails, clean it up and try again
          const cleanedJson = jsonMatch[0]
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/,\s*}/, '}') // Remove trailing commas
            .replace(/,\s*]/, ']'); // Remove trailing commas in arrays
          
          parsed = JSON.parse(cleanedJson);
        }
      }
      
      // If we have valid parsed JSON with the expected structure
      if (parsed && parsed.interpretation && Array.isArray(parsed.symbols)) {
        return {
          type: 'jungian',
          // Use the coreInsight as the main message
          coreMessage: parsed.coreInsight || this.extractFirstProfoundStatement(parsed.interpretation),
          phenomenologicalOpening: this.extractOpeningParagraph(parsed.interpretation),
          // Convert simple symbol array to old format for compatibility
          symbols: parsed.symbols.slice(0, 8).map((symbol: string) => ({
            symbol: symbol,
            personalMeaning: `Your personal connection to ${symbol}`,
            culturalMeaning: `Collective meaning of ${symbol}`,
            archetypalMeaning: `Archetypal significance of ${symbol}`
          })),
          shadowAspects: parsed.shadowAspect ? [parsed.shadowAspect] : [],
          compensatoryFunction: this.extractCompensatoryInsight(parsed.interpretation),
          individuationGuidance: parsed.guidanceForDreamer || 'Continue reflecting on this dream',
          reflectiveQuestions: parsed.reflectiveQuestion ? [parsed.reflectiveQuestion] : [],
          isBigDream: parsed.interpretation.toLowerCase().includes('remarkable') || 
                     parsed.interpretation.toLowerCase().includes('threshold') ||
                     parsed.interpretation.toLowerCase().includes('profound')
        };
      }
      
      // Fallback: treat as plain text
      logger.warn('Failed to parse JSON response, using text extraction', {
        responsePreview: aiResponse.substring(0, 200)
      });
      
      return this.extractFromPlainText(aiResponse);
      
    } catch (error) {
      logger.error('Failed to parse Jungian response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseLength: aiResponse.length,
        responsePreview: aiResponse.substring(0, 200)
      });
      
      // Last resort fallback
      return this.extractFromPlainText(aiResponse);
    }
  }

  private static extractFromPlainText(text: string): JungianInsights {
    return {
      type: 'jungian',
      coreMessage: this.extractFirstProfoundStatement(text),
      phenomenologicalOpening: this.extractOpeningParagraph(text),
      symbols: this.extractSimpleSymbols(text).map(symbol => ({
        symbol,
        personalMeaning: `Personal significance of ${symbol}`,
        culturalMeaning: `Cultural meaning of ${symbol}`,
        archetypalMeaning: `Archetypal dimension of ${symbol}`
      })),
      shadowAspects: [],
      compensatoryFunction: this.extractCompensatoryInsight(text),
      individuationGuidance: 'Reflect deeply on what this dream is showing you',
      reflectiveQuestions: this.extractQuestions(text).slice(0, 3),
      isBigDream: false
    };
  }

  /**
   * Parse Freudian interpretation response
   */
     private static parseFreudianResponse(aiResponse: string): FreudianInsights {
     return {
       type: 'freudian',
       coreMessage: this.extractFirstProfoundStatement(aiResponse),
       unconsciousDesires: [this.extractSection(aiResponse, 'desires', 'Unconscious desires present')],
       symbolicAnalysis: this.extractSymbolicAnalysis(aiResponse),
       childhoodConnections: [this.extractSection(aiResponse, 'childhood', 'Childhood connections identified')],
       repressionIndicators: [this.extractSection(aiResponse, 'repressed', 'Repressed content present')],
       reflectiveQuestions: this.extractQuestions(aiResponse)
     };
   }

  /**
   * Parse Neuroscientist interpretation response
   */
     private static parseNeuroscientistResponse(aiResponse: string): NeuroscientistInsights {
     return {
       type: 'neuroscientist',
       coreMessage: this.extractFirstProfoundStatement(aiResponse),
       sleepStageAnalysis: this.extractSection(aiResponse, 'sleep', 'REM sleep processing'),
       memoryConsolidation: [this.extractSection(aiResponse, 'memory', 'Memory consolidation active')],
       brainRegionsInvolved: ['prefrontal cortex', 'hippocampus', 'amygdala'], // Would extract from text
       neurobiologicalProcesses: this.extractListItems(aiResponse, 'process'),
       cognitiveFunction: this.extractSection(aiResponse, 'cognitive', 'Cognitive processing active'),
       reflectiveQuestions: this.extractQuestions(aiResponse)
     };
   }

  /**
   * Parse Astrologist interpretation response
   */
     private static parseAstrologistResponse(aiResponse: string): AstrologistInsights {
     return {
       type: 'astrologist',
       coreMessage: this.extractFirstProfoundStatement(aiResponse),
       planetaryInfluences: this.extractPlanetaryInfluences(aiResponse),
       zodiacConnections: this.extractListItems(aiResponse, 'zodiac'),
       cosmicTiming: this.extractSection(aiResponse, 'timing', 'Cosmic timing influences'),
       spiritualInsights: [this.extractSection(aiResponse, 'spiritual', 'Spiritual guidance present')],
       reflectiveQuestions: this.extractQuestions(aiResponse)
     };
   }

  // Helper methods for text extraction
  private static extractSection(text: string, sectionType: string, defaultValue: string): string {
    const patterns = {
      shadow: /(shadow|dark|hidden|repressed)[\s\S]{0,200}/i,
      guidance: /(guidance|advice|recommendation|suggest)[\s\S]{0,200}/i,
      desires: /(desire|want|need|crave)[\s\S]{0,200}/i,
      childhood: /(childhood|early|parent|family)[\s\S]{0,200}/i,
      repressed: /(repressed|suppressed|hidden|unconscious)[\s\S]{0,200}/i,
      wish: /(wish|want|hope|dream)[\s\S]{0,200}/i,
      sleep: /(REM|sleep|stage|cycle)[\s\S]{0,200}/i,
      memory: /(memory|consolidation|processing)[\s\S]{0,200}/i,
      significance: /(significant|important|key|crucial)[\s\S]{0,200}/i,
      timing: /(timing|time|moment|phase)[\s\S]{0,200}/i,
      spiritual: /(spiritual|divine|sacred|cosmic)[\s\S]{0,200}/i,
      lunar: /(lunar|moon|phase|cycle)[\s\S]{0,200}/i
    };

    const pattern = patterns[sectionType as keyof typeof patterns];
    if (!pattern) return defaultValue;

    const match = text.match(pattern);
    return match ? match[0].trim() : defaultValue;
  }

  private static extractListItems(text: string, keyword: string): string[] {
    const pattern = new RegExp(`${this.escapeRegex(keyword)}[^\\n]*\\n([^\\n]*\\n)*`, 'gi');
    const matches = text.match(pattern);
    if (!matches) return [];

    return matches
      .flatMap(match => match.split('\n'))
      .filter(line => line.trim().length > 0)
      .slice(0, 5); // Limit to 5 items
  }

  private static extractQuestions(text: string): string[] {
    const questionPattern = /[A-Z][^?]*\?/g;
    const matches = text.match(questionPattern);
    
    if (!matches || matches.length === 0) {
      return ['What does this dream reveal about your current life situation?'];
    }
    
    return matches
      .slice(0, 3) // Limit to 3 questions
      .map(q => q.trim());
  }

  private static extractSymbolicAnalysis(_text: string): Array<{
    symbol: string;
    symbolicMeaning: string;
    psychoanalyticInterpretation: string;
  }> {
    // Simplified - would need more sophisticated NLP for full extraction
    return [
      {
        symbol: 'key_symbol',
        symbolicMeaning: 'Symbolic meaning identified',
        psychoanalyticInterpretation: 'Psychoanalytic interpretation provided'
      }
    ];
  }

  private static extractPlanetaryInfluences(text: string): Array<{
    planet: string;
    influence: string;
    symbolism: string;
  }> {
    const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    const influences: Array<{planet: string; influence: string; symbolism: string}> = [];
    
    planets.forEach(planet => {
      if (text.toLowerCase().includes(planet)) {
        influences.push({
          planet: planet.charAt(0).toUpperCase() + planet.slice(1),
          influence: `${planet} influence detected`,
          symbolism: `${planet} symbolism present`
        });
      }
    });
    
    return influences.length > 0 ? influences : [
      { planet: 'Moon', influence: 'Intuitive influence', symbolism: 'Unconscious symbolism' }
    ];
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static extractSimpleSymbols(text: string): string[] {
    const commonSymbols = [
      'water', 'fire', 'light', 'darkness', 'door', 'key', 'mirror', 'bridge', 
      'tree', 'animal', 'house', 'car', 'flying', 'falling', 'running', 'ocean'
    ];
    
    const foundSymbols = commonSymbols.filter(symbol => 
      text.toLowerCase().includes(symbol)
    );
    
    return foundSymbols.length > 0 ? foundSymbols : ['symbolic_content'];
  }

  private static extractOpeningParagraph(text: string): string {
    const sentences = text.split(/[.!?]+/);
    return sentences.slice(0, 2).join('. ').trim() + '.';
  }

  private static extractFirstProfoundStatement(text: string): string {
    // Look for sentences that sound insightful or profound
    const sentences = text.split(/[.!?]+/);
    const profoundKeywords = ['psyche', 'unconscious', 'soul', 'journey', 'transformation', 'wisdom'];
    
    for (const sentence of sentences) {
      if (profoundKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        return sentence.trim() + '.';
      }
    }
    
    // Fallback to first substantial sentence
    return sentences.find(s => s.trim().length > 20)?.trim() + '.' || 'A significant dream insight is present.';
  }

  private static extractCompensatoryInsight(text: string): string {
    const compensatoryKeywords = ['balance', 'compensate', 'opposite', 'complement', 'counteract'];
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (compensatoryKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        return sentence.trim() + '.';
      }
    }
    
    return 'The dream provides compensatory balance to your conscious attitude.';
  }



  /**
   * Transform cost summary from OpenRouter format to our format
   */
     static transformCostSummary(openRouterCostSummary: any): CostSummary {
     return {
       totalCost: openRouterCostSummary?.totalCost || 0,
       totalRequests: openRouterCostSummary?.totalRequests || 1,
       recentEntries: openRouterCostSummary?.recentEntries || []
     };
   }
} 