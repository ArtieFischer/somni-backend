import type { 
  UserContext, 
  DreamHistory, 
  InterpreterType
} from '../types';
import { logger } from '../utils/logger';
import { DebateModule } from './utils/debate';

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
  testMode?: boolean; // Flag to enable debug features like debate process visibility
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
   * Unified JSON schema for all interpreters
   * Structured for optimal user experience with 7 clear sections
   */
  protected getBaseSchema(interpreterType: InterpreterType, includeDebugFields: boolean = false): string {
    
    const debugFields = includeDebugFields ? `,
  "_debug_hypothesis_a": "[MUST BE EXACTLY 70-80 WORDS: First detailed interpretation focusing on specific dream elements like the exact type of water, where it appears, how it affects movement, and what this reveals about the dreamer's current emotional state and relationships. Be specific to THIS dream, not generic concepts.]",
  "_debug_hypothesis_b": "[MUST BE EXACTLY 70-80 WORDS: Second interpretation taking completely different angle on same dream elements. If A focused on emotional blockages, focus on transformation themes. Use same specific symbols but different psychological lens.]",
  "_debug_hypothesis_c": "[MUST BE EXACTLY 70-80 WORDS: Third interpretation with different focus entirely. Perhaps archetypal vs personal, or past vs future potential. Make distinctly different from A and B while addressing SAME specific dream elements.]",
  "_debug_evaluation": "[Detailed explanation of which hypothesis you chose and why - consider uniqueness, personal relevance, insight depth]",
  "_debug_selected": "[A, B, or C]"` : '';

    return `
Your entire reply MUST be valid JSON with this exact structure:
{
  "dreamTopic": "[5-9 word hook capturing core tension - creative title for dream list display]",
  "symbols": ["symbol1", "symbol2", "symbol3"],
  "quickTake": "[One or two sentences (~40 words) summarizing the central psychological question posed by the dream]",
  "dreamWork": "[3-4 sentences mentioning up to 3 core ideas from ${interpreterType} psychology. Explain each idea's relevance in context; no textbook detours]",
  "interpretation": "[Longer, comprehensive interpretation of events and symbols in context of this dream. 100-450 words depending on dream length. Nicely formatted with empty lines between paragraphs]",
  "selfReflection": "[One question (≤25 words) starting with When/Where/What/How]"${debugFields}
}

All fields are required. Keep sections concise and impactful.
    `.trim();
  }

  /**
   * Generate debate instructions for quality improvement
   * Available to all interpreters for optional integration
   */
  protected generateDebateSection(
    interpreterType: InterpreterType, 
    interpreterPersonality: string
  ): string {
    return DebateModule.generateCompleteDebateSection(interpreterType, interpreterPersonality);
  }

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