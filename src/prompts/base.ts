import type { InterpreterType, UserContext, DreamHistory } from '../types';
import { DebateModule } from './utils/debate';

/**
 * Base interface for dream analysis requests
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
  testMode?: boolean;
}

/**
 * Prompt template structure
 */
export interface PromptTemplate {
  systemPrompt: string;
  analysisStructure: string;
  outputFormat: string;
  variables: {
    dreamContent: string;
    interpreterType: InterpreterType;
    userContext?: UserContext;
    previousDreams?: DreamHistory[];
    analysisDepth: string;
    specialPrompts?: any;
    hasRAGContext?: boolean;
  };
}

/**
 * Base class for all prompt builders
 * Provides common functionality and enforces consistent structure
 */
export abstract class BasePromptBuilder {
  
  /**
   * Build the complete prompt for dream interpretation
   */
  buildPrompt(request: DreamAnalysisRequest): PromptTemplate {
    const systemPrompt = this.buildSystemPrompt(request);
    const analysisStructure = this.buildAnalysisStructure(request);
    const outputFormat = this.buildOutputFormat(request);
    
    return {
      systemPrompt,
      analysisStructure,
      outputFormat,
      variables: {
        dreamContent: request.dreamTranscription,
        interpreterType: request.interpreterType,
        ...(request.userContext !== undefined && { userContext: request.userContext }),
        ...(request.previousDreams !== undefined && { previousDreams: request.previousDreams }),
        analysisDepth: request.analysisDepth as string,
        ...(request.specialPrompts !== undefined && { specialPrompts: request.specialPrompts }),
        hasRAGContext: false
      }
    };
  }
  
  /**
   * Build interpreter-specific system prompt
   */
  protected abstract buildSystemPrompt(request: DreamAnalysisRequest): string;
  
  /**
   * Build analysis structure (usually empty, instructions go in output format)
   */
  protected buildAnalysisStructure(_request: DreamAnalysisRequest): string {
    // Most interpreters keep this empty
    return '';
  }
  
  /**
   * Build output format instructions
   */
  protected abstract buildOutputFormat(request: DreamAnalysisRequest): string;
  
  /**
   * Generate debate section for quality enhancement
   */
  protected generateDebateSection(interpreterType: string, interpreterPersonality: string): string {
    return DebateModule.generateCompleteDebateSection(interpreterType, interpreterPersonality);
  }
  
  /**
   * Get base JSON schema for all interpreters
   */
  protected getBaseSchema(_interpreterType: string, includeDebugFields: boolean = false): string {
    const baseSchema = `
OUTPUT FORMAT - You MUST respond with ONLY a JSON object containing these EXACT fields:

{
  "dreamTopic": "5-9 word dream topic that captures the essence",
  "symbols": ["symbol1", "symbol2", "symbol3"],
  "quickTake": "~40 word summary of the dream's meaning",
  "dreamWork": "3-4 sentences explaining the dream mechanisms at play",
  "interpretation": "Comprehensive interpretation (100-450 words)",
  "selfReflection": "One reflective question for the dreamer"${includeDebugFields ? `,
  "_debug_hypothesis_a": "First detailed interpretation hypothesis (~75 words)",
  "_debug_hypothesis_b": "Second detailed interpretation hypothesis (~75 words)",
  "_debug_hypothesis_c": "Third detailed interpretation hypothesis (~75 words)",
  "_debug_evaluation": "Explanation of which hypothesis was selected and why",
  "_debug_selected": "A, B, or C"` : ''}
}`;
    
    return baseSchema;
  }
}