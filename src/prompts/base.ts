import type { 
  UserContext, 
  DreamHistory, 
  InterpreterType
} from '../types';
import { logger } from '../utils/logger';

/**
 * Dream analysis request structure
 */
export interface DreamAnalysisRequest {
  dreamTranscription: string;
  interpreterType: InterpreterType;
  userContext?: UserContext;
  previousDreams?: DreamHistory[];
  analysisDepth: 'initial' | 'deep' | 'transformative';
  specialPrompts?: {
    synchronicity?: string;
    isNightmare?: boolean;
    customContext?: string;
  };
}

/**
 * Prompt template structure
 */
export interface PromptTemplate {
  systemPrompt: string;
  analysisStructure: string;
  outputFormat: string;
  variables: Record<string, any>;
}

/**
 * Abstract base class for all interpreter prompt builders
 * Simplified to focus on what we actually use
 */
export abstract class BasePromptBuilder {

  /**
   * Main entry point - builds complete prompt for interpretation
   */
  public async buildPrompt(request: DreamAnalysisRequest): Promise<PromptTemplate> {
    try {
      // Build interpreter-specific system prompt
      const systemPrompt = this.buildInterpreterSpecificSystemPrompt(request);
      
      // Create analysis structure (mostly empty for Jung)
      const analysisStructure = this.buildAnalysisStructure(request);
      
      // Define output format (critical for JSON structure)
      const outputFormat = this.buildOutputFormat(request);
      
      // Prepare template variables
      const variables = this.prepareTemplateVariables(request);

      logger.info('Prompt built successfully', {
        interpreterType: request.interpreterType,
        analysisDepth: request.analysisDepth,
        hasUserContext: !!request.userContext,
        systemPromptLength: systemPrompt.length
      });

      return {
        systemPrompt,
        analysisStructure,
        outputFormat,
        variables
      };

    } catch (error) {
      logger.error('Prompt building failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        interpreterType: request.interpreterType
      });
      throw new Error(`Failed to build ${request.interpreterType} prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Abstract methods that must be implemented by specific interpreters
  protected abstract buildInterpreterSpecificSystemPrompt(request: DreamAnalysisRequest): string;
  protected abstract buildAnalysisStructure(request: DreamAnalysisRequest): string;
  protected abstract buildOutputFormat(request: DreamAnalysisRequest): string;
  protected abstract prepareTemplateVariables(request: DreamAnalysisRequest): Record<string, any>;
} 