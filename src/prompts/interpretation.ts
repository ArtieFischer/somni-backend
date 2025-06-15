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
      // Clean the response - remove any non-JSON content
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      // Parse the JSON
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.interpretation || !Array.isArray(parsed.symbols)) {
        throw new Error('Missing required fields in JSON response');
      }

      return {
        type: 'jungian',
        coreMessage: parsed.coreInsight || 'Your dream reveals profound inner wisdom.',
        phenomenologicalOpening: parsed.interpretation.split('.')[0] + '.',
        symbols: parsed.symbols,
        shadowAspects: parsed.shadowAspect ? [parsed.shadowAspect] : [],
        compensatoryFunction: 'This dream brings balance to your conscious perspective.',
        individuationGuidance: parsed.guidanceForDreamer || 'Work with this dream through reflection.',
        reflectiveQuestions: parsed.reflectiveQuestion ? [parsed.reflectiveQuestion] : [],
        isBigDream: parsed.interpretation.toLowerCase().includes('profound') || 
                   parsed.interpretation.toLowerCase().includes('remarkable')
      };

    } catch (error) {
      logger.error('Failed to parse Jungian response', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        responsePreview: aiResponse.substring(0, 200)
      });

      // Fallback response
      return {
        type: 'jungian',
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