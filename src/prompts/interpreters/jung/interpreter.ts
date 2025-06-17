import { logger } from '../../../utils/logger';
import type { DreamAnalysis, DebateProcess, DreamAnalysisWithDebate, JungianInsights } from '../../../types';

/**
 * Jungian-specific interpretation parsing
 * Handles all Jung-related response parsing and fallback logic
 */
export class JungianInterpreter {
  
  /**
   * Parse Jungian interpretation response with enhanced JSON and text handling
   */
  static parseResponse(aiResponse: string): DreamAnalysis | JungianInsights {
    const fullResponse = this.parseResponseWithDebate(aiResponse);
    return fullResponse.dreamAnalysis;
  }

  /**
   * Parse Jungian interpretation response with debate process
   */
  static parseResponseWithDebate(aiResponse: string): DreamAnalysisWithDebate | { dreamAnalysis: JungianInsights; debateProcess?: DebateProcess } {
    try {
      let debateProcess: DebateProcess | undefined;
      let finalInterpretation: DreamAnalysis | JungianInsights;

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
      
      // Check if it's the new JungianInsights format
      if (this.isJungianInsightsFormat(parsed)) {
        finalInterpretation = this.parseJungianInsights(parsed, aiResponse);
      } 
      // Check if it's nested under 'interpretation' key
      else if (parsed.interpretation && typeof parsed.interpretation === 'object') {
        if (this.isJungianInsightsFormat(parsed.interpretation)) {
          finalInterpretation = this.parseJungianInsights(parsed.interpretation, aiResponse);
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
      
      logger.info('Successfully parsed Jungian response', {
        format: 'type' in finalInterpretation && finalInterpretation.type === 'jungian' ? 'JungianInsights' : 'DreamAnalysis',
        symbolsCount,
        hasDebateProcess: !!debateProcess
      });

      // Check if it's JungianInsights format
      if ('type' in finalInterpretation && finalInterpretation.type === 'jungian') {
        if (debateProcess) {
          return {
            dreamAnalysis: finalInterpretation,
            debateProcess
          } as { dreamAnalysis: JungianInsights; debateProcess?: DebateProcess };
        } else {
          return {
            dreamAnalysis: finalInterpretation
          } as { dreamAnalysis: JungianInsights; debateProcess?: DebateProcess };
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
      logger.error('Failed to parse Jungian response', { 
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
   * Check if the parsed object matches JungianInsights format
   */
  private static isJungianInsightsFormat(obj: any): boolean {
    // Check for key JungianInsights fields
    return !!(
      obj.individuationMessage || 
      obj.compensatoryMessage || 
      obj.complexExploration ||
      obj.phenomenologicalOpening ||
      obj.coreMessage ||
      obj.compensatoryFunction ||
      obj.individuationGuidance
    );
  }

  /**
   * Parse new JungianInsights format
   */
  private static parseJungianInsights(parsed: any, fullResponse: string): JungianInsights {
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
                       interpretationData.individuationMessage || 
                       interpretationData.individuationInsight ||
                       'Your dream reveals profound insights about your individuation journey.';
    
    // Extract reflective questions
    let reflectiveQuestions = interpretationData.reflectiveQuestions || [];
    if (!Array.isArray(reflectiveQuestions) || reflectiveQuestions.length === 0) {
      reflectiveQuestions = [interpretationData.selfReflection || 'What aspect of your Self is seeking recognition?'];
    }
    
    return {
      type: 'jungian',
      interpretation: fullResponse,
      coreMessage,
      phenomenologicalOpening: interpretationData.phenomenologicalOpening || 
                              interpretationData.opening || 
                              interpretationData.personalInsight || 
                              'I notice immediate resonance with this dream\'s symbolic landscape.',
      symbols,
      shadowAspects: interpretationData.shadowAspects || this.extractShadowAspects(interpretationData),
      compensatoryFunction: interpretationData.compensatoryFunction || 
                           interpretationData.compensatoryMessage || 
                           interpretationData.compensatory_message || 
                           'This dream compensates for conscious attitudes.',
      individuationGuidance: interpretationData.individuationGuidance || 
                            interpretationData.guidance || 
                            interpretationData.individuationPath || 
                            interpretationData.individuationInsight ||
                            'Continue exploring these symbols in your inner work.',
      activeImaginationExercise: interpretationData.activeImaginationExercise,
      reflectiveQuestions,
      isBigDream: interpretationData.isBigDream || false,
      lifePhaseGuidance: interpretationData.lifePhaseGuidance,
      animaAnimusContent: interpretationData.animaAnimusContent,
      synchronicityConnection: interpretationData.synchronicityConnection
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

    // Third priority: Look for symbols in archetypalConnections
    const archetypalSymbols: Set<string> = new Set();
    if (parsed.archetypalConnections && Array.isArray(parsed.archetypalConnections)) {
      for (const connection of parsed.archetypalConnections) {
        if (connection.symbol && typeof connection.symbol === 'string') {
          // Extract simple words from complex descriptions
          const words = connection.symbol.toLowerCase().split(/\s+/);
          for (const word of words) {
            // Clean up the word and add if it's a valid symbol
            const cleaned = word.replace(/[^a-z]/g, '');
            if (cleaned.length > 2 && cleaned.length < 15) {
              archetypalSymbols.add(cleaned);
            }
          }
        }
      }
    }

    // If we found symbols from archetypalConnections, use those
    if (archetypalSymbols.size > 0) {
      return Array.from(archetypalSymbols).slice(0, 8);
    }

    // Last resort: Extract from text using predefined symbols
    const symbolWords: Set<string> = new Set();
    
    // Common Jungian symbols to look for
    const jungianSymbols = [
      'shadow', 'anima', 'animus', 'self', 'mandala', 'serpent', 'water', 
      'fire', 'tree', 'house', 'animal', 'child', 'mother', 'father',
      'library', 'books', 'light', 'darkness', 'transformation', 'journey',
      'labyrinth', 'guide', 'symbols', 'door', 'key', 'mirror', 'ocean',
      'party', 'bedroom', 'boyfriend', 'friend', 'guilt', 'thrill', 'desire'
    ];

    // Search in various fields
    const fieldsToSearch = [
      parsed.complexExploration,
      parsed.archetypalConnection, 
      parsed.interpretation,
      parsed.phenomenologicalOpening,
      parsed.individuationMessage,
      parsed.personalAssociations ? JSON.stringify(parsed.personalAssociations) : null,
      fullResponse
    ];

    for (const field of fieldsToSearch) {
      if (field && typeof field === 'string') {
        const fieldLower = field.toLowerCase();
        for (const symbol of jungianSymbols) {
          if (fieldLower.includes(symbol)) {
            symbolWords.add(symbol);
          }
        }
      }
    }

    // If still no symbols, create generic ones based on content
    if (symbolWords.size === 0) {
      logger.warn('No symbols found, generating generic symbols');
      return ['unconscious', 'dream', 'symbol'];
    }

    // Return up to 8 symbols
    return Array.from(symbolWords).slice(0, 8);
  }

  /**
   * Extract shadow aspects from the response
   */
  private static extractShadowAspects(parsed: any): string[] | undefined {
    if (parsed.shadowAspects) return parsed.shadowAspects;
    
    // Try to extract from complex exploration
    if (parsed.complexExploration && parsed.complexExploration.toLowerCase().includes('shadow')) {
      return ['Shadow elements present in the dream require further exploration'];
    }
    
    return undefined;
  }

  /**
   * Get fallback Jungian response when parsing fails
   */
  private static getFallbackResponse(): DreamAnalysis {
    return {
      dreamTopic: 'Unconscious communication seeking integration',
      symbols: [],
      quickTake: 'Your unconscious is clearly communicating something important about your current life situation.',
      dreamWork: 'The dream offers balance to consciousness through symbolic compensation.',
      interpretation: 'I sense this dream carries significant meaning for you. While I cannot fully parse the symbolic content at this moment, your unconscious is clearly communicating something important about your current life situation. This dream presents rich symbolic material that warrants deeper reflection.',
      selfReflection: 'What does this dream awaken in you?'
    };
  }
} 