import { logger } from '../utils/logger';
import type { JungianInsights, InterpreterType, CostSummary } from '../types';

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
  ): Promise<JungianInsights> {
    if (interpreterType !== 'jung') {
      throw new Error(`${interpreterType} parser not yet implemented`);
    }

    return this.parseJungianResponse(aiResponse);
  }

  /**
   * Parse Jungian interpretation response with enhanced JSON and text handling
   */
  private static parseJungianResponse(aiResponse: string): JungianInsights {
    try {
      // First try to find JSON in the response
      let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      let jsonString = jsonMatch[0];
      
      // Clean up common JSON issues
      jsonString = jsonString
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
        .replace(/,\s*]/g, ']'); // Remove trailing commas before closing brackets

      // Try to parse the cleaned JSON
      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (parseError) {
        // If parsing fails, try to fix common escape issues
        jsonString = jsonString
          .replace(/\\n/g, ' ') // Replace literal \n with spaces
          .replace(/\\r/g, ' ') // Replace literal \r with spaces
          .replace(/\\t/g, ' ') // Replace literal \t with spaces
          .replace(/\s+/g, ' '); // Replace multiple spaces with single space
        
        parsed = JSON.parse(jsonString);
      }
      
      // Validate required fields
      if (!parsed.interpretation || !Array.isArray(parsed.symbols)) {
        throw new Error(`Missing required fields. Found: interpretation=${!!parsed.interpretation}, symbols=${Array.isArray(parsed.symbols)}`);
      }

      logger.info('Successfully parsed Jungian response', {
        symbolsCount: parsed.symbols.length,
        hasCompensatoryFunction: !!parsed.compensatoryFunction,
        hasShadowAspect: !!parsed.shadowAspect
      });

      return {
        type: 'jungian',
        interpretation: parsed.interpretation,
        coreMessage: parsed.coreInsight || 'Your dream reveals profound inner wisdom.',
        phenomenologicalOpening: parsed.interpretation.split('.')[0] + '.',
        symbols: parsed.symbols,
        shadowAspects: parsed.shadowAspect ? [parsed.shadowAspect] : [],
        compensatoryFunction: parsed.compensatoryFunction || 'This dream brings balance to your conscious perspective.',
        individuationGuidance: parsed.guidanceForDreamer || 'Work with this dream through reflection.',
        reflectiveQuestions: parsed.reflectiveQuestion ? [parsed.reflectiveQuestion] : [],
        isBigDream: parsed.interpretation.toLowerCase().includes('profound') || 
                   parsed.interpretation.toLowerCase().includes('remarkable')
      };

    } catch (error) {
      logger.error('Failed to parse Jungian response', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        responsePreview: aiResponse.substring(0, 300),
        responseLength: aiResponse.length
      });

      // Fallback response
      return {
        type: 'jungian',
        interpretation: 'I sense this dream carries significant meaning for you. While I cannot fully parse the symbolic content at this moment, your unconscious is clearly communicating something important about your current life situation.',
        coreMessage: 'Your dream speaks to deep psychological processes.',
        phenomenologicalOpening: 'This dream presents rich symbolic material.',
        symbols: [],
        shadowAspects: [],
        compensatoryFunction: 'The dream offers balance to consciousness.',
        individuationGuidance: 'Reflect on what this dream might be showing you.',
        reflectiveQuestions: ['What does this dream awaken in you?'],
        isBigDream: false
      };
    }
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