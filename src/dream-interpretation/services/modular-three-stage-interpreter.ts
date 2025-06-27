/**
 * Modular Three-Stage Interpreter Service
 * Uses the interpreter registry for a clean, extensible architecture
 */

import { 
  DreamInterpretation, 
  InterpreterType,
  ThreeStageRequest,
  GenerationMetadata
} from '../types/extended';
import { IDreamInterpreter, StageResult } from '../interpreters/base/interpreter-interface';
import { interpreterRegistry } from '../interpreters/registry';
import { ThemeKnowledgeRetriever } from './theme-knowledge-retriever';
import { logger } from '../../utils/logger';

export class ModularThreeStageInterpreter {
  private static instance: ModularThreeStageInterpreter;
  private themeKnowledgeRetriever: ThemeKnowledgeRetriever;
  
  private constructor() {
    this.themeKnowledgeRetriever = ThemeKnowledgeRetriever.getInstance();
  }
  
  static getInstance(): ModularThreeStageInterpreter {
    if (!ModularThreeStageInterpreter.instance) {
      ModularThreeStageInterpreter.instance = new ModularThreeStageInterpreter();
    }
    return ModularThreeStageInterpreter.instance;
  }
  
  /**
   * Main interpretation method using the modular architecture
   */
  async interpretDream(request: ThreeStageRequest): Promise<StageResult<DreamInterpretation>> {
    const startTime = Date.now();
    
    logger.info('Starting modular three-stage interpretation', {
      dreamId: request.dreamId,
      interpreter: request.interpreterType,
      themeCount: request.themes.length
    });
    
    try {
      // Get the appropriate interpreter
      const interpreter = this.getInterpreter(request.interpreterType);
      
      // Retrieve knowledge fragments
      const knowledgeFragments = await this.retrieveKnowledge(request);
      
      // Build interpreter context
      const context = {
        dreamId: request.dreamId,
        userId: request.userId,
        dreamTranscription: request.dreamTranscription,
        themes: request.themes,
        userContext: request.userContext,
        knowledgeFragments
      };
      
      // Stage 1: Assess relevance
      logger.info('Stage 1: Assessing relevance', {
        dreamId: request.dreamId,
        interpreterType: request.interpreterType,
        fragmentCount: knowledgeFragments.length
      });
      
      const relevanceResult = await interpreter.assessRelevance(context);
      
      logger.info('Stage 1 complete', {
        dreamId: request.dreamId,
        success: relevanceResult.success,
        error: relevanceResult.error,
        relevantFragments: relevanceResult.data?.relevantFragments?.length || 0
      });
      
      if (!relevanceResult.success) {
        throw new Error(`Relevance assessment failed: ${relevanceResult.error}`);
      }
      
      // Stage 2: Generate full interpretation
      logger.info('Stage 2: Generating full interpretation', {
        dreamId: request.dreamId,
        interpreterType: request.interpreterType
      });
      
      const interpretationResult = await interpreter.generateFullInterpretation(
        context, 
        relevanceResult.data!
      );
      
      logger.info('Stage 2 complete', {
        dreamId: request.dreamId,
        success: interpretationResult.success,
        error: interpretationResult.error,
        hasData: !!interpretationResult.data
      });
      
      if (!interpretationResult.success) {
        throw new Error(`Full interpretation failed: ${interpretationResult.error}`);
      }
      
      // Stage 3: Format to JSON
      logger.info('Stage 3: Formatting to JSON');
      const formattingResult = await interpreter.formatToJSON(
        context,
        interpretationResult.data!,
        relevanceResult.data!
      );
      
      if (!formattingResult.success) {
        throw new Error(`JSON formatting failed: ${formattingResult.error}`);
      }
      
      // Prepare final result
      const result = formattingResult.data!;
      
      // Add metadata
      const processingTime = Date.now() - startTime;
      const fragmentIdsUsed = relevanceResult.data!.relevantFragments.map(f => f.id);
      const generationMetadata: GenerationMetadata = {
        dynamicElements: ['relevance_assessment', 'full_interpretation', 'json_formatting'],
        repetitionGuards: [],
        knowledgeSourcesUsed: fragmentIdsUsed,
        contextFactors: ['dreamContent', 'userContext', 'interpreterPersonality'],
        confidenceScore: 0.85,
        totalFragmentsRetrieved: knowledgeFragments.length,
        knowledgeFragmentsUsed: relevanceResult.data!.relevantFragments.length,
        fragmentIdsUsed: fragmentIdsUsed
      };
      
      // Validate the result
      const validation = interpreter.validate(result);
      if (!validation.isValid) {
        logger.warn('Interpretation validation failed', {
          errors: validation.errors,
          interpreterType: request.interpreterType,
          dreamId: request.dreamId
        });
        // Add validation warnings to the result metadata
        if (!result.generationMetadata) {
          result.generationMetadata = generationMetadata;
        }
        result.generationMetadata.validationWarnings = validation.errors;
      }
      
      // Return complete interpretation
      return {
        success: true,
        data: {
          ...result,
          dreamId: request.dreamId,
          interpreterId: request.interpreterType,
          interpreterType: request.interpreterType,
          timestamp: new Date().toISOString(),
          createdAt: new Date(),
          processingTime,
          generationMetadata,
          authenticityMarkers: result.authenticityMarkers || {
            personalEngagement: 0.9,
            vocabularyAuthenticity: 0.9,
            conceptualDepth: 0.9,
            therapeuticValue: 0.9
          }
        },
        metadata: {
          processingTime,
          stagesCompleted: ['relevance_assessment', 'full_interpretation', 'json_formatting']
        }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = {
        error: errorMessage,
        dreamId: request.dreamId,
        interpreterType: request.interpreterType,
        stack: error instanceof Error ? error.stack : undefined
      };
      
      logger.error('Modular three-stage interpretation failed', errorDetails);
      
      return {
        success: false,
        error: errorMessage,
        metadata: {
          dreamId: request.dreamId,
          interpreterType: request.interpreterType,
          errorDetails: errorDetails
        }
      };
    }
  }
  
  /**
   * Get the appropriate interpreter from the registry
   */
  private getInterpreter(type: InterpreterType): IDreamInterpreter {
    const interpreter = interpreterRegistry.get(type);
    
    if (!interpreter) {
      throw new Error(`Interpreter not found: ${type}. Available interpreters: ${interpreterRegistry.getTypes().join(', ')}`);
    }
    
    return interpreter;
  }
  
  /**
   * Retrieve knowledge fragments based on themes
   */
  private async retrieveKnowledge(request: ThreeStageRequest) {
    const themeCodes = request.themes.map(t => t.code);
    
    const fragments = await this.themeKnowledgeRetriever.getKnowledgeByThemes(
      themeCodes,
      request.interpreterType
    );
    
    logger.info('Knowledge retrieval complete', {
      themeCount: themeCodes.length,
      fragmentCount: fragments.length
    });
    
    return fragments.map(f => ({
      id: f.id,
      content: f.content,
      metadata: f.metadata,
      relevance: f.relevanceScore || 0.5
    }));
  }
  
  /**
   * Get available interpreters
   */
  getAvailableInterpreters() {
    return interpreterRegistry.getAll().map(interpreter => ({
      type: interpreter.type,
      metadata: interpreter.metadata,
      personality: interpreter.personality
    }));
  }
  
  /**
   * Register a new interpreter
   */
  registerInterpreter(interpreter: IDreamInterpreter) {
    interpreterRegistry.register(interpreter);
  }
}

// Export singleton instance
export const modularThreeStageInterpreter = ModularThreeStageInterpreter.getInstance();