import { logger } from '../../../utils/logger';
import type { DreamAnalysis, DebateProcess, DreamAnalysisWithDebate, FreudianInsights } from '../../../types';

/**
 * Freudian-specific interpretation parsing
 * Handles all Freud-related response parsing and fallback logic
 */
export class FreudianInterpreter {
  
  /**
   * Parse Freudian interpretation response with enhanced JSON and text handling
   */
  static parseResponse(aiResponse: string): DreamAnalysis | FreudianInsights {
    const fullResponse = this.parseResponseWithDebate(aiResponse);
    return fullResponse.dreamAnalysis;
  }

  /**
   * Parse Freudian interpretation response with debate process
   */
  static parseResponseWithDebate(aiResponse: string): DreamAnalysisWithDebate | { dreamAnalysis: FreudianInsights; debateProcess?: DebateProcess } {
    try {
      let debateProcess: DebateProcess | undefined;
      let finalInterpretation: DreamAnalysis | FreudianInsights;

      // Extract JSON from response (handle both ```json blocks and raw JSON)
      let jsonString = aiResponse;
      
      // Remove ```json wrapper if present
      const jsonBlockMatch = aiResponse.match(/```json\s*\n?([\s\S]*?)\n?```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        jsonString = jsonBlockMatch[1];
      } else {
        // Try to find raw JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        } else {
          throw new Error('No JSON found in response');
        }
      }
      
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
      
      // Check if it's the new FreudianInsights format
      if (this.isFreudianInsightsFormat(parsed)) {
        finalInterpretation = this.parseFreudianInsights(parsed, aiResponse);
      } 
      // Check if it's nested under 'interpretation' key
      else if (parsed.interpretation && typeof parsed.interpretation === 'object') {
        if (this.isFreudianInsightsFormat(parsed.interpretation)) {
          finalInterpretation = this.parseFreudianInsights(parsed.interpretation, aiResponse);
        } else {
          // Fall back to old format
          finalInterpretation = this.parseOldFormat(parsed);
        }
      }
      // Otherwise try old format
      else {
        finalInterpretation = this.parseOldFormat(parsed);
      }

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

      const symbolsCount = 'symbols' in finalInterpretation ? finalInterpretation.symbols.length : 0;
      
      logger.info('Successfully parsed Freudian response', {
        format: 'type' in finalInterpretation && finalInterpretation.type === 'freudian' ? 'FreudianInsights' : 'DreamAnalysis',
        symbolsCount,
        hasDebateProcess: !!debateProcess
      });

      // Check if it's FreudianInsights format
      if ('type' in finalInterpretation && finalInterpretation.type === 'freudian') {
        if (debateProcess) {
          return {
            dreamAnalysis: finalInterpretation,
            debateProcess
          } as { dreamAnalysis: FreudianInsights; debateProcess?: DebateProcess };
        } else {
          return {
            dreamAnalysis: finalInterpretation
          } as { dreamAnalysis: FreudianInsights; debateProcess?: DebateProcess };
        }
      } else {
        // It's DreamAnalysis format
        if (debateProcess) {
          return {
            dreamAnalysis: finalInterpretation as DreamAnalysis,
            debateProcess
          } as DreamAnalysisWithDebate;
        } else {
          return {
            dreamAnalysis: finalInterpretation as DreamAnalysis
          } as DreamAnalysisWithDebate;
        }
      }

    } catch (error) {
      logger.error('Failed to parse Freudian response', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        responsePreview: aiResponse.substring(0, 300),
        responseLength: aiResponse.length
      });

      // Fallback response
      return {
        dreamAnalysis: this.getFallbackResponse()
      };
    }
  }

  /**
   * Check if the parsed object matches FreudianInsights format
   */
  private static isFreudianInsightsFormat(obj: any): boolean {
    // Check for key FreudianInsights fields
    return !!(
      obj.unconsciousDesires || 
      obj.childhoodConnections || 
      obj.repressionIndicators ||
      obj.oedipalDynamics ||
      obj.professionalAnalysis ||
      obj.sexualAnalysis
    );
  }

  /**
   * Parse new FreudianInsights format
   */
  private static parseFreudianInsights(parsed: any, fullResponse: string): FreudianInsights {
    // First, check if the parsed object contains nested interpretation JSON
    let interpretationData = parsed;
    
    // If interpretation field contains JSON string, parse it
    if (parsed.interpretation && typeof parsed.interpretation === 'string') {
      try {
        const nestedParsed = JSON.parse(parsed.interpretation);
        // Merge nested data with top-level data, preferring nested data
        interpretationData = { ...parsed, ...nestedParsed };
      } catch {
        // Not valid JSON, continue with original parsed data
      }
    }
    
    // Extract symbols from the response
    const symbols = this.extractSymbols(interpretationData, fullResponse);
    
    // Extract core message from various possible fields
    const coreMessage = interpretationData.coreMessage || 
                       interpretationData.coreInsight || 
                       'Your dream reveals hidden desires and unconscious conflicts.';
    
    // Extract reflective questions
    let reflectiveQuestions = interpretationData.reflectiveQuestions || [];
    if (!Array.isArray(reflectiveQuestions) || reflectiveQuestions.length === 0) {
      reflectiveQuestions = [interpretationData.selfReflection || 'What forbidden wishes might this dream be expressing?'];
    }
    
    return {
      type: 'freudian',
      interpretation: fullResponse,
      coreMessage,
      symbols,
      unconsciousDesires: interpretationData.unconsciousDesires || ['Hidden desires seeking expression'],
      childhoodConnections: interpretationData.childhoodConnections || [],
      repressionIndicators: interpretationData.repressionIndicators || [],
      oedipalDynamics: interpretationData.oedipalDynamics,
      transferenceElements: interpretationData.transferenceElements,
      reflectiveQuestions,
      professionalAnalysis: interpretationData.professionalAnalysis,
      socialDynamicsAnalysis: interpretationData.socialDynamicsAnalysis,
      anxietyAnalysis: interpretationData.anxietyAnalysis,
      sexualAnalysis: interpretationData.sexualAnalysis,
      transferenceAnalysis: interpretationData.transferenceAnalysis
    };
  }

  /**
   * Parse old DreamAnalysis format
   */
  private static parseOldFormat(parsed: any): DreamAnalysis {
    // Validate required fields for old format
    if (!parsed.dreamTopic || !Array.isArray(parsed.symbols) || !parsed.quickTake || !parsed.dreamWork || !parsed.interpretation || !parsed.selfReflection) {
      throw new Error(`Missing required fields. Found: dreamTopic=${!!parsed.dreamTopic}, symbols=${Array.isArray(parsed.symbols)}, quickTake=${!!parsed.quickTake}, dreamWork=${!!parsed.dreamWork}, interpretation=${!!parsed.interpretation}, selfReflection=${!!parsed.selfReflection}`);
    }

    return {
      dreamTopic: parsed.dreamTopic,
      symbols: parsed.symbols,
      quickTake: parsed.quickTake,
      dreamWork: parsed.dreamWork,
      interpretation: parsed.interpretation,
      selfReflection: parsed.selfReflection
    };
  }

  /**
   * Extract symbols from various response formats
   */
  private static extractSymbols(parsed: any, fullResponse: string): string[] {
    // First priority: If symbols array exists at root level, use it
    if (Array.isArray(parsed.symbols) && parsed.symbols.length > 0) {
      return parsed.symbols;
    }

    // Second priority: Check if symbols exist in nested interpretation object
    if (parsed.interpretation && typeof parsed.interpretation === 'string') {
      try {
        const nestedParsed = JSON.parse(parsed.interpretation);
        if (Array.isArray(nestedParsed.symbols) && nestedParsed.symbols.length > 0) {
          return nestedParsed.symbols;
        }
      } catch {
        // Not JSON, continue with other extraction methods
      }
    }

    // Third priority: Look for symbols in unconscious analysis
    const symbolWords: Set<string> = new Set();
    
    // Common Freudian symbols to look for
    const freudianSymbols = [
      'mother', 'father', 'child', 'sexuality', 'repression', 'guilt',
      'desire', 'forbidden', 'authority', 'power', 'control', 'anxiety',
      'pleasure', 'pain', 'fear', 'aggression', 'libido', 'death',
      'birth', 'breast', 'phallus', 'castration', 'regression', 'fixation'
    ];

    // Search in various fields
    const fieldsToSearch = [
      parsed.unconsciousDesires ? JSON.stringify(parsed.unconsciousDesires) : null,
      parsed.interpretation,
      parsed.professionalAnalysis,
      parsed.sexualAnalysis,
      fullResponse
    ];

    for (const field of fieldsToSearch) {
      if (field && typeof field === 'string') {
        const fieldLower = field.toLowerCase();
        for (const symbol of freudianSymbols) {
          if (fieldLower.includes(symbol)) {
            symbolWords.add(symbol);
          }
        }
      }
    }

    // If still no symbols, create generic ones based on content
    if (symbolWords.size === 0) {
      logger.warn('No symbols found, generating generic symbols');
      return ['unconscious', 'desire', 'conflict'];
    }

    // Return up to 8 symbols
    return Array.from(symbolWords).slice(0, 8);
  }

  /**
   * Get fallback Freudian response when parsing fails
   */
  private static getFallbackResponse(): DreamAnalysis {
    return {
      dreamTopic: 'Unconscious desires and repressed conflicts',
      symbols: [],
      quickTake: 'Your dream reveals hidden desires and unconscious conflicts seeking expression.',
      dreamWork: 'The dream work disguises forbidden wishes through symbolic transformation.',
      interpretation: 'This dream appears to contain significant unconscious material. While I cannot fully parse the specific symbolic content at this moment, your unconscious is clearly expressing repressed desires and unresolved conflicts that merit deeper psychoanalytic exploration.',
      selfReflection: 'What forbidden wishes might this dream be attempting to fulfill?'
    };
  }
}