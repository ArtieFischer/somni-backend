import { logger } from '../../../utils/logger';
import type { FreudianInsights } from '../../../types';

/**
 * Freudian-specific interpretation parsing
 * Handles all Freud-related response parsing and fallback logic
 */
export class FreudianInterpreter {

  /**
   * Parse Freudian interpretation response
   */
  static parseResponse(aiResponse: string): FreudianInsights {
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

      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (parseError) {
        // If parsing fails, try to fix common escape issues
        jsonString = jsonString
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\s+/g, ' ');
        
        parsed = JSON.parse(jsonString);
      }
      
      // Validate required fields
      if (!parsed.interpretation || !Array.isArray(parsed.symbols)) {
        throw new Error('Missing required fields in Freudian response');
      }

      logger.info('Successfully parsed Freudian response', {
        symbolsCount: parsed.symbols.length,
        hasUnconscious: !!parsed.unconsciousDesires,
        hasChildhood: !!parsed.childhoodConnections
      });

      return {
        type: 'freudian',
        interpretation: parsed.interpretation,
        coreMessage: parsed.coreInsight || 'Your dream reveals profound unconscious dynamics.',
        symbols: parsed.symbols || [], // Simple string array like Jung
        unconsciousDesires: parsed.unconsciousDesires ? [parsed.unconsciousDesires] : [],
        childhoodConnections: parsed.childhoodConnections ? [parsed.childhoodConnections] : [],
        repressionIndicators: parsed.repressionIndicators ? [parsed.repressionIndicators] : [],
        reflectiveQuestions: parsed.reflectiveQuestion ? [parsed.reflectiveQuestion] : [],
        // Optional specialized analyses - only included when LLM detects relevant themes
        ...(parsed.professionalAnalysis && { professionalAnalysis: parsed.professionalAnalysis }),
        ...(parsed.socialDynamicsAnalysis && { socialDynamicsAnalysis: parsed.socialDynamicsAnalysis }),
        ...(parsed.anxietyAnalysis && { anxietyAnalysis: parsed.anxietyAnalysis }),
        ...(parsed.sexualAnalysis && { sexualAnalysis: parsed.sexualAnalysis }),
        ...(parsed.transferenceAnalysis && { transferenceAnalysis: parsed.transferenceAnalysis })
      };

    } catch (error) {
      logger.error('Failed to parse Freudian response', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        responsePreview: aiResponse.substring(0, 300)
      });

      // Fallback response
      return this.getFallbackResponse();
    }
  }

  /**
   * Get fallback Freudian response when parsing fails
   */
  private static getFallbackResponse(): FreudianInsights {
    return {
      type: 'freudian',
      interpretation: 'Your dream presents rich material for psychoanalytic investigation. The unconscious mechanisms at work here reveal significant repressed content that warrants careful exploration.',
      coreMessage: 'This dream fulfills a disguised unconscious wish.',
      symbols: [], // Simple string array like Jung
      unconsciousDesires: ['The dream reveals hidden desires requiring analysis'],
      childhoodConnections: ['Early experiences influence this dream content'],
      repressionIndicators: ['The dream shows active repression at work'],
      reflectiveQuestions: ['What forbidden wish might this dream be fulfilling?']
    };
  }
} 