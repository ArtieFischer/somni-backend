import { logger } from '../utils/logger';
import { PromptBuilderService } from './factory';
import { InterpretationParser } from './interpretation';
import { ResponseStandardizer } from './utils/response-standardizer';
import { openRouterService } from '../services/openrouter';
import { modelConfigService } from '../services/modelConfig';
import type { 
  InterpretationRequest, 
  InterpretationResponse, 
  InterpreterType,
  TokenUsage
} from '../types';
import type { PromptTemplate } from './base';

/**
 * Consolidated Dream Interpretation Service
 * 
 * This service handles the complete dream interpretation pipeline:
 * 1. Request validation and processing
 * 2. Prompt building with contextual analysis
 * 3. AI generation via OpenRouter
 * 4. Response parsing and structuring
 * 5. Error handling and logging
 * 
 * Previously scattered across multiple files, now centralized in prompts/
 */
export class DreamInterpretationService {

  /**
   * Complete dream interpretation pipeline
   * Main entry point for all interpretation requests
   */
  async interpretDream(request: InterpretationRequest): Promise<InterpretationResponse> {
    const startTime = Date.now();
    
    try {
      // Validate request first
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          dreamId: request.dreamId,
          error: `Request validation failed: ${validation.errors.join(', ')}`,
          metadata: {
            interpreterType: request.interpreterType,
            modelUsed: 'validation_failed',
            processedAt: new Date().toISOString(),
            analysisDepth: request.analysisDepth || 'initial',
            duration: Date.now() - startTime
          }
        };
      }

      logger.info('🌙 Starting dream interpretation', {
        dreamId: request.dreamId,
        interpreterType: request.interpreterType,
        analysisDepth: request.analysisDepth || 'initial',
        hasUserContext: !!request.userContext,
        hasPreviousDreams: !!request.previousDreams?.length,
        dreamLength: request.dreamTranscription.length
      });

      // Step 1: Build contextual prompt using our modular system
      const { promptTemplate, ragContext } = await this.buildContextualPrompt(request);
      
      // Step 2: Generate AI interpretation with timeout
      const aiResponse = await this.generateInterpretationWithTimeout(request, promptTemplate);
      
      // Step 3: Parse and structure the response with debate process
      const fullAnalysis = await InterpretationParser.parseInterpretationResponseWithDebate(
        aiResponse.content,
        request.interpreterType
      );
      
      // Step 4: Build final response with metadata
      const response = this.buildFinalResponse(request, aiResponse, fullAnalysis, startTime, ragContext);

      logger.info('✨ Dream interpretation completed successfully', {
        dreamId: request.dreamId,
        interpreterType: request.interpreterType,
        duration: Date.now() - startTime,
        modelUsed: aiResponse.model,
        tokenUsage: aiResponse.usage?.totalTokens,
        responseSize: aiResponse.content.length,
        symbolsFound: this.getSymbolsCount(fullAnalysis.dreamAnalysis),
        hasDebateProcess: !!fullAnalysis.debateProcess
      });

      return response;
      
    } catch (error) {
      return this.handleInterpretationError(request, error, startTime);
    }
  }

  /**
   * Build contextual prompt with all available information
   */
  private async buildContextualPrompt(request: InterpretationRequest): Promise<{
    promptTemplate: PromptTemplate;
    ragContext?: any;
  }> {
    try {
      // Convert to internal format and build prompt
      const dreamAnalysisRequest = {
        dreamTranscription: request.dreamTranscription,
        interpreterType: request.interpreterType,
        ...(request.userContext && { userContext: request.userContext }),
        ...(request.previousDreams && { previousDreams: request.previousDreams }),
        analysisDepth: request.analysisDepth || 'initial' as const,
        ...(request.specialPrompts && { specialPrompts: request.specialPrompts }),
        ...(request.testMode && { testMode: request.testMode })
      };

      const result = await PromptBuilderService.buildInterpretationPrompt(dreamAnalysisRequest);
      const promptTemplate = result.prompt;
      const ragContext = result.ragContext;
      
      logger.info('📝 Prompt built successfully', {
        interpreterType: request.interpreterType,
        promptLength: promptTemplate.systemPrompt.length,
        hasUserContext: !!request.userContext,
        analysisDepth: request.analysisDepth,
        hasRagContext: !!ragContext
      });

      return { promptTemplate, ragContext };
      
    } catch (error) {
      logger.error('❌ Failed to build prompt', {
        interpreterType: request.interpreterType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Prompt building failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate AI interpretation with timeout protection
   */
  private async generateInterpretationWithTimeout(
    request: InterpretationRequest, 
    promptTemplate: { systemPrompt: string; analysisStructure: string; outputFormat: string; variables: any },
    timeoutMs: number = 30000 // 30 second timeout
  ): Promise<{ content: string; usage: TokenUsage; model: string }> {
    return Promise.race([
      this.generateInterpretation(request, promptTemplate),
      new Promise<{ content: string; usage: TokenUsage; model: string }>((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timeout after 30 seconds')), timeoutMs)
      )
    ]);
  }

  /**
   * Generate AI interpretation using optimal model selection
   */
  private async generateInterpretation(
    request: InterpretationRequest, 
    promptTemplate: { systemPrompt: string; analysisStructure: string; outputFormat: string; variables: any }
  ) {
    try {
      // Force Llama 4 for Jung interpreter
      const modelToUse = modelConfigService.getBestModelForInterpreter(request.interpreterType);
      
      // Build the complete prompt
      const fullSystemPrompt = `${promptTemplate.systemPrompt}

${promptTemplate.outputFormat}`;

      const messages = [
        {
          role: 'system' as const,
          content: fullSystemPrompt
        },
        {
          role: 'user' as const,
          content: `Please interpret this dream:

"${request.dreamTranscription}"

Remember: Respond with ONLY the JSON object as specified.`
        }
      ];

      logger.info('🤖 Generating AI interpretation', {
        model: modelToUse,
        interpreterType: request.interpreterType,
        systemPromptLength: fullSystemPrompt.length,
        dreamLength: request.dreamTranscription.length
      });

      // Generate with specific model
      const result = await openRouterService.generateCompletion(messages, {
        model: modelToUse,
        // Temperature and maxTokens will be taken from interpreter-specific config
        interpreterType: request.interpreterType,
        dreamId: request.dreamId
      });

      return {
        content: result.content,
        usage: result.usage,
        model: result.model
      };

    } catch (error) {
      logger.error('❌ AI generation failed', {
        interpreterType: request.interpreterType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`AI interpretation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build final structured response
   */
  private buildFinalResponse(
    request: InterpretationRequest,
    aiResponse: { content: string; usage: TokenUsage; model: string },
    fullAnalysis: any,
    startTime: number,
    ragContext?: any
  ): InterpretationResponse {
    const duration = Date.now() - startTime;
    
    // Extract the interpretation (handling both old and new formats)
    const interpretation = fullAnalysis.dreamAnalysis || fullAnalysis;
    
    // Standardize the response to ensure consistent structure
    const standardizedResponse = ResponseStandardizer.standardizeResponse(interpretation);
    
    // Prepare response with debate process if available
    const responseData: any = {
      success: true,
      dreamId: request.dreamId,
      interpretation: standardizedResponse,
      aiResponse: aiResponse.content, // Raw AI response for debugging
      metadata: {
        interpreterType: request.interpreterType,
        modelUsed: aiResponse.model,
        processedAt: new Date().toISOString(),
        analysisDepth: request.analysisDepth || 'initial',
        duration,
        tokenUsage: {
          ...aiResponse.usage,
          cost: this.calculateCost(aiResponse.model, aiResponse.usage)
        }
      }
    };

    // Add debate process only in test mode for debugging/development
    if (request.testMode && fullAnalysis.debateProcess) {
      responseData.debateProcess = fullAnalysis.debateProcess;
    }
    
    // Add RAG process only in test mode for debugging/development
    if (request.testMode && ragContext) {
      logger.info('Adding RAG process to test response', {
        hasRagContext: !!ragContext,
        passagesCount: ragContext.passages?.length || 0,
        hasRawPassages: !!ragContext.rawPassages
      });
      
      responseData.ragProcess = {
        passagesFound: ragContext.passages?.length || 0,
        passages: ragContext.rawPassages?.map((p: any) => ({
          content: p.content,
          source: p.source,
          chapter: p.chapter,
          contentType: p.contentType,
          similarity: p.similarity
        })) || [],
        symbolsExtracted: ragContext.rawSymbols || [],
        themes: ragContext.themes || []
      };
    } else {
      logger.info('Not adding RAG process', {
        testMode: request.testMode,
        hasRagContext: !!ragContext,
        interpreterType: request.interpreterType
      });
    }
    
    return responseData;
  }

  /**
   * Handle interpretation errors with proper logging and response
   */
  private handleInterpretationError(
    request: InterpretationRequest, 
    error: unknown, 
    startTime: number
  ): InterpretationResponse {
    const duration = Date.now() - startTime;
    
    logger.error('💥 Dream interpretation failed', {
      dreamId: request.dreamId,
      interpreterType: request.interpreterType,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    });

    return {
      success: false,
      dreamId: request.dreamId,
      error: error instanceof Error ? error.message : 'Dream interpretation failed',
      metadata: {
        interpreterType: request.interpreterType,
        modelUsed: 'error',
        processedAt: new Date().toISOString(),
        analysisDepth: request.analysisDepth || 'initial',
        duration
      }
    };
  }

  /**
   * Get available interpreter types with metadata
   */
  getAvailableInterpreters() {
    return {
      jung: {
        name: 'Jungian',
        description: 'Deep psychological analysis based on Carl Jung\'s analytical psychology, focusing on individuation, shadow work, and archetypal symbols.',
        features: ['Shadow integration', 'Active imagination', 'Archetypal analysis', 'Individuation guidance'],
        analysisDepths: ['initial', 'deep', 'transformative'],
        specializations: ['Archetypal analysis', 'Shadow work', 'Individuation journey', 'Active imagination']
      },
      freud: {
        name: 'Freudian',
        description: 'Classic psychoanalytic interpretation focusing on unconscious desires, repression, and symbolic meanings.',
        features: ['Unconscious desires', 'Dream work analysis', 'Childhood connections', 'Repression indicators'],
        analysisDepths: ['initial', 'deep', 'transformative'],
        specializations: ['Sexual symbolism', 'Oedipal dynamics', 'Transference analysis', 'Wish fulfillment']
      },
      neuroscientist: {
        name: 'Neuroscientific',
        description: 'Science-based analysis exploring neurobiological processes, memory consolidation, and cognitive functions.',
        features: ['Sleep stage analysis', 'Memory consolidation', 'Brain region involvement', 'Cognitive processes'],
        analysisDepths: ['initial', 'deep'],
        status: 'coming_soon'
      },
      astrologist: {
        name: 'Astrological',
        description: 'Cosmic and spiritual interpretation connecting dreams to planetary influences and astrological symbolism.',
        features: ['Planetary influences', 'Zodiac connections', 'Cosmic timing', 'Spiritual insights'],
        analysisDepths: ['initial', 'deep'],
        status: 'coming_soon'
      }
    };
  }

  /**
   * Validate interpretation request
   */
  validateRequest(request: InterpretationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.dreamId) errors.push('dreamId is required');
    if (!request.dreamTranscription?.trim()) errors.push('dreamTranscription is required');
    if (!request.interpreterType) errors.push('interpreterType is required');
    
    if (request.dreamTranscription && request.dreamTranscription.length < 10) {
      errors.push('dreamTranscription must be at least 10 characters');
    }
    
    if (request.dreamTranscription && request.dreamTranscription.length > 5000) {
      errors.push('dreamTranscription must be less than 5000 characters');
    }

    const validInterpreters = ['jung', 'freud', 'neuroscientist', 'astrologist'];
    if (request.interpreterType && !validInterpreters.includes(request.interpreterType)) {
      errors.push(`interpreterType must be one of: ${validInterpreters.join(', ')}`);
    }

    const validDepths = ['initial', 'deep', 'transformative'];
    if (request.analysisDepth && !validDepths.includes(request.analysisDepth)) {
      errors.push(`analysisDepth must be one of: ${validDepths.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create test scenarios for validation
   */
  createTestScenarios() {
    return {
      minimal: {
        dreamId: 'test-minimal-001',
        dreamTranscription: 'I was flying over the ocean.',
        interpreterType: 'jung' as InterpreterType,
        analysisDepth: 'initial' as const
      },
      rich_context: {
        dreamId: 'test-rich-002',
        dreamTranscription: 'I was in a dark forest and met an old wise man who gave me a golden key. I felt both scared and curious as I held the key.',
        interpreterType: 'jung' as InterpreterType,
        userContext: {
          age: 45,
          currentLifeSituation: 'Going through major life transition',
          emotionalState: 'Anxious but seeking guidance',
          recurringSymbols: ['keys', 'wise figures', 'forests'],
          recentMajorEvents: ['Career change', 'Relationship ending']
        },
        analysisDepth: 'transformative' as const,
        specialPrompts: {
          synchronicity: 'I met an elderly man at a bookstore the day after this dream who reminded me of the dream figure',
          isNightmare: false
        }
      },
      nightmare: {
        dreamId: 'test-nightmare-003',
        dreamTranscription: 'A dark shadow creature was chasing me through endless corridors. I felt terrified and trapped with no way out.',
        interpreterType: 'jung' as InterpreterType,
        analysisDepth: 'deep' as const,
        specialPrompts: {
          isNightmare: true
        }
      }
    };
  }

  /**
   * Calculate cost for a specific model and token usage
   */
  private calculateCost(modelId: string, tokenUsage: TokenUsage): number {
    const modelConfig = modelConfigService.getModelConfig(modelId);
    if (!modelConfig || !modelConfig.costPerKToken) return 0;
    return (tokenUsage.totalTokens / 1000) * modelConfig.costPerKToken;
  }

  /**
   * Helper to get symbols count from interpretations
   */
  private getSymbolsCount(interpretation: any): number {
    // After standardization, all interpretations have symbols array
    if (interpretation && Array.isArray(interpretation.symbols)) {
      return interpretation.symbols.length;
    }
    // Check if it's wrapped in dreamAnalysis
    if (interpretation?.dreamAnalysis && Array.isArray(interpretation.dreamAnalysis.symbols)) {
      return interpretation.dreamAnalysis.symbols.length;
    }
    return 0;
  }
}

// Export singleton instance
export const dreamInterpretationService = new DreamInterpretationService(); 