import { logger } from '../../../utils/logger';
import type { NeuroscientistInsights } from '../../../types';

/**
 * Neuroscientist-specific interpretation parsing
 * Handles all neuroscience-related response parsing and fallback logic
 */
export class NeuroscientistInterpreter {

  /**
   * Parse Neuroscientist interpretation response
   */
  static parseResponse(aiResponse: string): NeuroscientistInsights {
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
      if (!parsed.interpretation || !Array.isArray(parsed.symbols) || !Array.isArray(parsed.brainActivity)) {
        throw new Error('Missing required fields in Neuroscientist response');
      }

      logger.info('Successfully parsed Neuroscientist response', {
        symbolsCount: parsed.symbols.length,
        brainRegionsCount: parsed.brainActivity.length,
        hasContinuityElements: !!parsed.continuityElements,
        hasOptionalAnalyses: !!(parsed.memoryConsolidation || parsed.threatSimulation || parsed.emotionalRegulation)
      });

      return {
        type: 'neuroscientist',
        interpretation: parsed.interpretation,
        coreMessage: parsed.coreInsight || 'Your sleeping brain was actively processing and consolidating experiences.',
        symbols: parsed.symbols || [], // Consistent with Jung/Freud
        brainActivity: parsed.brainActivity || [],
        sleepStageIndicators: parsed.sleepStageIndicators || 'Your dream suggests active REM sleep.',
        continuityElements: parsed.continuityElements ? [parsed.continuityElements] : [],
        neuroscienceEducation: parsed.neuroscienceEducation || 'During REM sleep, your brain is as active as when you\'re awake!',
        reflectiveQuestions: parsed.reflectiveQuestion ? [parsed.reflectiveQuestion] : [],
        // Optional specialized analyses - only included when LLM detects relevant patterns
        ...(parsed.memoryConsolidation && { memoryConsolidation: parsed.memoryConsolidation }),
        ...(parsed.threatSimulation && { threatSimulation: parsed.threatSimulation }),
        ...(parsed.emotionalRegulation && { emotionalRegulation: parsed.emotionalRegulation }),
        ...(parsed.problemSolving && { problemSolving: parsed.problemSolving }),
        ...(parsed.circadianFactors && { circadianFactors: parsed.circadianFactors })
      };

    } catch (error) {
      logger.error('Failed to parse Neuroscientist response', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        responsePreview: aiResponse.substring(0, 300)
      });

      // Fallback response
      return this.getFallbackResponse();
    }
  }

  /**
   * Get fallback Neuroscientist response when parsing fails
   */
  private static getFallbackResponse(): NeuroscientistInsights {
    return {
      type: 'neuroscientist',
      interpretation: 'After decades of studying dreams in my lab, I can tell you that even when we can\'t capture every detail, your dream reveals fascinating brain activity. The vivid nature of your experience suggests robust REM sleep engagement, with your visual and emotional processing centers clearly active. What strikes me most is how your brain wove together these particular elements - this kind of creative synthesis typically happens when your prefrontal cortex relaxes its usual control, allowing for more fluid associations.',
      coreMessage: 'Your dream demonstrates the remarkable creativity of the sleeping brain.',
      symbols: [],
      brainActivity: ['visual cortex (vivid imagery)', 'limbic system (emotional processing)', 'hippocampus (memory integration)'],
      sleepStageIndicators: 'The narrative complexity suggests REM sleep, likely from the later sleep cycles',
      continuityElements: ['Your brain appears to be processing recent experiences in creative ways'],
      neuroscienceEducation: 'In my research, I\'ve found that dreams like yours often occur during the longest REM periods, typically 3-5 hours after sleep onset.',
      reflectiveQuestions: ['What time did you wake up, and how might that relate to the intensity of this dream?']
    };
  }
} 