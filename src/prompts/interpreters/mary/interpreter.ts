import { logger } from '../../../utils/logger';
import type { DreamAnalysis, DebateProcess, DreamAnalysisWithDebate, MaryInsights } from '../../../types';

/**
 * Mary (Neuroscientist) specific interpretation parsing
 * Handles all Mary-related response parsing and fallback logic
 */
export class MaryInterpreter {
  
  /**
   * Parse Mary interpretation response with enhanced JSON and text handling
   */
  static parseResponse(aiResponse: string): DreamAnalysis | MaryInsights {
    const fullResponse = this.parseResponseWithDebate(aiResponse);
    return fullResponse.dreamAnalysis;
  }

  /**
   * Parse Mary interpretation response with debate process
   */
  static parseResponseWithDebate(aiResponse: string): DreamAnalysisWithDebate | { dreamAnalysis: MaryInsights; debateProcess?: DebateProcess } {
    try {
      let debateProcess: DebateProcess | undefined;
      let finalInterpretation: DreamAnalysis | MaryInsights;

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
      
      // Check if it's the new MaryInsights format
      if (this.isMaryInsightsFormat(parsed)) {
        finalInterpretation = this.parseMaryInsights(parsed, aiResponse);
      } 
      // Check if it's nested under 'interpretation' key
      else if (parsed.interpretation && typeof parsed.interpretation === 'object') {
        if (this.isMaryInsightsFormat(parsed.interpretation)) {
          finalInterpretation = this.parseMaryInsights(parsed.interpretation, aiResponse);
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
      
      logger.info('Successfully parsed Mary response', {
        format: 'type' in finalInterpretation && finalInterpretation.type === 'mary' ? 'MaryInsights' : 'DreamAnalysis',
        symbolsCount,
        hasDebateProcess: !!debateProcess
      });

      // Check if it's MaryInsights format
      if ('type' in finalInterpretation && finalInterpretation.type === 'mary') {
        if (debateProcess) {
          return {
            dreamAnalysis: finalInterpretation,
            debateProcess
          } as { dreamAnalysis: MaryInsights; debateProcess?: DebateProcess };
        } else {
          return {
            dreamAnalysis: finalInterpretation
          } as { dreamAnalysis: MaryInsights; debateProcess?: DebateProcess };
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
      logger.error('Failed to parse Mary response', { 
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
   * Check if the parsed object matches MaryInsights format
   */
  private static isMaryInsightsFormat(obj: any): boolean {
    // Check for key MaryInsights fields (both old and new format)
    return !!(
      obj.brainActivity || 
      obj.sleepStageIndicators || 
      obj.continuityElements ||
      obj.neuroscienceEducation ||
      obj.memoryConsolidation ||
      obj.emotionalRegulation ||
      // New neuroscience format fields
      obj.sleepStageContext ||
      obj.neuralMechanisms ||
      obj.brainRegions ||
      obj.neurotransmitterActivity ||
      obj.memoryProcessing ||
      obj.cognitiveFunction
    );
  }

  /**
   * Parse new MaryInsights format
   */
  private static parseMaryInsights(parsed: any, fullResponse: string): MaryInsights {
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
                       'Your dream reflects fascinating brain activity and memory consolidation processes.';
    
    // Extract reflective questions
    let reflectiveQuestions = interpretationData.reflectiveQuestions || [];
    if (!Array.isArray(reflectiveQuestions) || reflectiveQuestions.length === 0) {
      reflectiveQuestions = [interpretationData.selfReflection || 'How might this dream relate to your recent experiences and memories?'];
    }
    
    return {
      type: 'mary',
      interpretation: fullResponse,
      coreMessage,
      symbols,
      brainActivity: interpretationData.brainActivity || ['Neural activity patterns suggest emotional processing'],
      sleepStageIndicators: interpretationData.sleepStageIndicators || 'REM sleep characteristics present',
      continuityElements: interpretationData.continuityElements || [],
      neuroscienceEducation: interpretationData.neuroscienceEducation || 'Dreams help consolidate memories and process emotions',
      reflectiveQuestions,
      memoryConsolidation: interpretationData.memoryConsolidation,
      threatSimulation: interpretationData.threatSimulation,
      emotionalRegulation: interpretationData.emotionalRegulation,
      problemSolving: interpretationData.problemSolving,
      circadianFactors: interpretationData.circadianFactors
    };
  }

  /**
   * Parse old DreamAnalysis format OR new neuroscience format
   */
  private static parseOldFormat(parsed: any): DreamAnalysis {
    // Check if it's the new neuroscience format
    if (parsed.sleepStageContext || parsed.neuralMechanisms || parsed.memoryProcessing) {
      // Convert neuroscience format to DreamAnalysis format
      return {
        dreamTopic: parsed.sleepStageContext || 'REM sleep neural activity',
        symbols: parsed.neuralMechanisms || ['neural processing', 'memory consolidation', 'emotional regulation'],
        quickTake: parsed.neurotransmitterActivity || 'Brain processing during sleep stage',
        dreamWork: `${parsed.memoryProcessing || ''} ${parsed.emotionalRegulation || ''}`.trim() || 'Neural processes active during this dream',
        interpretation: parsed.interpretation || 'Neuroscientific analysis of dream content',
        selfReflection: parsed.practicalInsights || 'What does this reveal about your brain health?'
      };
    }
    
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

    // Third priority: Look for symbols in neuroscience analysis
    const symbolWords: Set<string> = new Set();
    
    // Common neuroscience-related symbols to look for
    const neuroscienceSymbols = [
      'memory', 'brain', 'neurons', 'REM', 'sleep', 'emotion',
      'consolidation', 'amygdala', 'hippocampus', 'cortex', 'processing',
      'fear', 'stress', 'learning', 'pattern', 'activation', 'regulation',
      'adaptation', 'survival', 'threat', 'reward', 'dopamine', 'serotonin'
    ];

    // Search in various fields
    const fieldsToSearch = [
      parsed.brainActivity ? JSON.stringify(parsed.brainActivity) : null,
      parsed.interpretation,
      parsed.neuroscienceEducation,
      parsed.memoryConsolidation,
      fullResponse
    ];

    for (const field of fieldsToSearch) {
      if (field && typeof field === 'string') {
        const fieldLower = field.toLowerCase();
        for (const symbol of neuroscienceSymbols) {
          if (fieldLower.includes(symbol)) {
            symbolWords.add(symbol);
          }
        }
      }
    }

    // If still no symbols, create generic ones based on content
    if (symbolWords.size === 0) {
      logger.warn('No symbols found, generating generic symbols');
      return ['brain', 'memory', 'emotion'];
    }

    // Return up to 8 symbols
    return Array.from(symbolWords).slice(0, 8);
  }

  /**
   * Get fallback Mary response when parsing fails
   */
  private static getFallbackResponse(): DreamAnalysis {
    return {
      dreamTopic: 'Brain processing and memory consolidation',
      symbols: [],
      quickTake: 'Your dream reflects fascinating brain activity during sleep, consolidating memories and processing emotions.',
      dreamWork: 'During REM sleep, your brain processes recent experiences and emotional content.',
      interpretation: 'This dream demonstrates your brain\'s remarkable ability to process information during sleep. While I cannot fully parse the specific content at this moment, your neural networks are clearly working to consolidate memories and regulate emotions through this dream experience.',
      selfReflection: 'How might this dream relate to your recent experiences and current emotional state?'
    };
  }
}