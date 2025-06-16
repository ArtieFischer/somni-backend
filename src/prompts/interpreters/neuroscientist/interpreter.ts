import { logger } from '../../../utils/logger';
import type { DreamAnalysis, DebateProcess, DreamAnalysisWithDebate } from '../../../types';

/**
 * Neuroscientist-specific interpretation parsing
 * Handles all neuroscience-related response parsing and fallback logic
 */
export class NeuroscientistInterpreter {

  /**
   * Parse Neuroscientist interpretation response
   */
  static parseResponse(aiResponse: string): DreamAnalysis {
    const fullResponse = this.parseResponseWithDebate(aiResponse);
    return fullResponse.dreamAnalysis;
  }

  /**
   * Parse Neuroscientist interpretation response with debate process
   */
  static parseResponseWithDebate(aiResponse: string): DreamAnalysisWithDebate {
    try {
      let debateProcess: DebateProcess | undefined;
      let finalInterpretation: DreamAnalysis;

      // Parse the JSON response
      let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      let jsonString = jsonMatch[0];
      jsonString = jsonString
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (parseError) {
        jsonString = jsonString
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\s+/g, ' ');
        parsed = JSON.parse(jsonString);
      }

      // Validate required fields
      if (!parsed.dreamTopic || !Array.isArray(parsed.symbols) || !parsed.quickTake || !parsed.dreamWork || !parsed.interpretation || !parsed.selfReflection) {
        throw new Error('Missing required fields in Neuroscientist response');
      }

      // Extract main interpretation
      finalInterpretation = {
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

      logger.info('Successfully parsed Neuroscientist response', {
        symbolsCount: finalInterpretation.symbols.length,
        hasDreamTopic: !!finalInterpretation.dreamTopic,
        hasDebateProcess: !!debateProcess,
        hasInterpretation: !!finalInterpretation.interpretation,
        hasSelfReflection: !!finalInterpretation.selfReflection
      });

      return {
        dreamAnalysis: finalInterpretation,
        debateProcess
      };

    } catch (error) {
      logger.error('Failed to parse Neuroscientist response', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        responsePreview: aiResponse.substring(0, 300)
      });

      return {
        dreamAnalysis: this.getFallbackResponse()
      };
    }
  }

  /**
   * Get fallback Neuroscientist response when parsing fails
   */
  private static getFallbackResponse(): DreamAnalysis {
    return {
      dreamTopic: 'Creative brain synthesis during REM sleep',
      symbols: [],
      quickTake: 'Your dream demonstrates the remarkable creativity of the sleeping brain during REM processing.',
      dreamWork: 'Visual cortex, limbic system, and hippocampus collaborated in creative memory integration.',
      interpretation: 'After decades of studying dreams in my lab, I can tell you that even when we can\'t capture every detail, your dream reveals fascinating brain activity. The vivid nature of your experience suggests robust REM sleep engagement, with your visual and emotional processing centers clearly active. What strikes me most is how your brain wove together these particular elements - this kind of creative synthesis typically happens when your prefrontal cortex relaxes its usual control, allowing for more fluid associations.',
      selfReflection: 'What time did you wake up, and how might that relate to the intensity of this dream?'
    };
  }
} 