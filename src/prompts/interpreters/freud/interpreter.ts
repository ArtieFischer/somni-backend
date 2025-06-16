import { logger } from '../../../utils/logger';
import type { DreamAnalysis, DebateProcess, DreamAnalysisWithDebate } from '../../../types';

/**
 * Freudian-specific interpretation parsing
 * Handles all Freud-related response parsing and fallback logic
 */
export class FreudianInterpreter {

  /**
   * Parse Freudian interpretation response
   */
  static parseResponse(aiResponse: string): DreamAnalysis {
    const fullResponse = this.parseResponseWithDebate(aiResponse);
    return fullResponse.dreamAnalysis;
  }

  /**
   * Parse Freudian interpretation response with debate process
   */
  static parseResponseWithDebate(aiResponse: string): DreamAnalysisWithDebate {
    try {
      let debateProcess: DebateProcess | undefined;

      // Parse the JSON response
      let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch || !jsonMatch[0]) {
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
      
      // Validate required fields for new format
      if (!parsed.dreamTopic || !Array.isArray(parsed.symbols) || !parsed.quickTake || !parsed.dreamWork || !parsed.interpretation || !parsed.selfReflection) {
        throw new Error('Missing required fields in Freudian response');
      }

      // Extract main interpretation
      const finalInterpretation: DreamAnalysis = {
        dreamTopic: parsed.dreamTopic,
        symbols: parsed.symbols,
        quickTake: parsed.quickTake,
        dreamWork: parsed.dreamWork,
        interpretation: parsed.interpretation,
        selfReflection: parsed.selfReflection
      };

      // Extract debug/debate information if present
      if (parsed._debug_hypothesis_a && parsed._debug_hypothesis_b && parsed._debug_hypothesis_c) {
        debateProcess = {
          hypothesis_a: parsed._debug_hypothesis_a,
          hypothesis_b: parsed._debug_hypothesis_b,
          hypothesis_c: parsed._debug_hypothesis_c,
          evaluation: parsed._debug_evaluation || 'No evaluation provided',
          selected_hypothesis: parsed._debug_selected || 'Unknown'
        };
      }

      logger.info('Successfully parsed Freudian response', {
        symbolsCount: finalInterpretation.symbols.length,
        hasDebateProcess: !!debateProcess,
        hasUnconscious: !!parsed.unconsciousDesires,
        hasChildhood: !!parsed.childhoodConnections
      });

      return {
        dreamAnalysis: finalInterpretation,
        debateProcess
      };

    } catch (error) {
      logger.error('Failed to parse Freudian response', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        responsePreview: aiResponse.substring(0, 300)
      });

      // Fallback response
      return {
        dreamAnalysis: this.getFallbackResponse()
      };
    }
  }

  /**
   * Get fallback Freudian response when parsing fails
   */
  private static getFallbackResponse(): DreamAnalysis {
    return {
      dreamTopic: 'Disguised unconscious wish fulfillment',
      symbols: [],
      quickTake: 'This dream reveals significant repressed content that warrants careful psychoanalytic exploration.',
      dreamWork: 'The unconscious employs displacement and condensation to disguise forbidden desires.',
      interpretation: 'Your dream presents rich material for psychoanalytic investigation. The unconscious mechanisms at work here reveal significant repressed content that warrants careful exploration. This dream fulfills a disguised unconscious wish through sophisticated defense mechanisms.',
      selfReflection: 'What forbidden wish might this dream be fulfilling?'
    };
  }
} 