/**
 * Abstract base class for all dream interpreters
 */

import { 
  IDreamInterpreter, 
  InterpreterContext, 
  StageResult, 
  RelevanceAssessment,
  FullInterpretationResult,
  FormattedInterpretation,
  InterpreterConfig
} from './interpreter-interface';
import { 
  DreamInterpretation, 
  InterpreterType, 
  InterpretationCore,
  ValidationResult,
  InterpreterMetadata,
  PersonalityVoice
} from '../../types/extended';
import { openRouterService } from '../../../services/openrouter';
import { logger } from '../../../utils/logger';

export abstract class BaseDreamInterpreter implements IDreamInterpreter {
  protected openrouter = openRouterService;
  
  readonly type: InterpreterType;
  readonly metadata: InterpreterMetadata;
  readonly personality: PersonalityVoice;
  
  constructor(config: InterpreterConfig) {
    this.type = config.type;
    this.metadata = config.metadata;
    this.personality = config.personality;
  }
  
  /**
   * Stage 1: Assess relevance of knowledge and themes
   */
  async assessRelevance(context: InterpreterContext): Promise<StageResult<RelevanceAssessment>> {
    try {
      const prompt = this.buildRelevancePrompt(context);
      
      const response = await this.openrouter.generateCompletion(
        [
          {
            role: 'system',
            content: this.getSystemPrompt('relevance')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          temperature: 0.3,
          maxTokens: 1500,
          interpreterType: this.type
        }
      );
      
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const assessment = JSON.parse(jsonMatch ? jsonMatch[0] : response.content);
      
      return {
        success: true,
        data: this.validateRelevanceAssessment(assessment),
        metadata: {
          model: response.model,
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens
        }
      };
      
    } catch (error) {
      logger.error('Relevance assessment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Stage 2: Generate full interpretation
   */
  async generateFullInterpretation(
    context: InterpreterContext,
    relevanceData: RelevanceAssessment
  ): Promise<StageResult<FullInterpretationResult>> {
    try {
      const prompt = this.buildInterpretationPrompt(context, relevanceData);
      
      const response = await this.openrouter.generateCompletion(
        [
          {
            role: 'system',
            content: this.getSystemPrompt('interpretation')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          temperature: 0.7,
          maxTokens: 3000,
          interpreterType: this.type
        }
      );
      
      // Extract key insights and symbols from the interpretation
      const result = this.extractInterpretationData(response.content);
      
      return {
        success: true,
        data: result,
        metadata: {
          model: response.model,
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens
        }
      };
      
    } catch (error) {
      logger.error('Full interpretation generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Stage 3: Format into structured JSON
   */
  async formatToJSON(
    context: InterpreterContext,
    fullInterpretation: FullInterpretationResult,
    relevanceData: RelevanceAssessment
  ): Promise<StageResult<FormattedInterpretation>> {
    try {
      const prompt = this.buildFormattingPrompt(context, fullInterpretation, relevanceData);
      
      const response = await this.openrouter.generateCompletion(
        [
          {
            role: 'system',
            content: this.getSystemPrompt('formatting')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          temperature: 0.2,
          maxTokens: 2000,
          interpreterType: this.type
        }
      );
      
      // Extract JSON from response (handle markdown code blocks)
      let jsonString = response.content;
      
      // Try to extract JSON from markdown code blocks first
      const codeBlockMatch = response.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      } else {
        // Fall back to finding raw JSON
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
      }
      
      let formatted;
      try {
        formatted = JSON.parse(jsonString);
      } catch (parseError) {
        logger.error('JSON parsing failed, attempting to clean:', parseError);
        // Try to clean common issues
        jsonString = jsonString
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
          .replace(/'/g, '"') // Replace single quotes with double quotes
          .replace(/(\w+):/g, '"$1":'); // Quote unquoted keys
        
        formatted = JSON.parse(jsonString);
      }
      
      // Add metadata and full interpretation
      const result: FormattedInterpretation = {
        ...formatted,
        fullInterpretation: fullInterpretation.interpretation,
        authenticityMarkers: {
          personalEngagement: 0.9,
          vocabularyAuthenticity: 0.9,
          conceptualDepth: 0.9,
          therapeuticValue: 0.9
        },
        stageMetadata: {
          relevanceAssessment: relevanceData,
          interpretationMetadata: fullInterpretation
        }
      };
      
      return {
        success: true,
        data: result,
        metadata: {
          model: response.model,
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens
        }
      };
      
    } catch (error) {
      logger.error('JSON formatting failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Validate the final interpretation
   */
  validate(interpretation: DreamInterpretation): ValidationResult {
    const errors: string[] = [];
    
    // Basic validation
    if (!interpretation.dreamId) errors.push('Missing dreamId');
    if (!interpretation.interpretation || interpretation.interpretation.length < 50) {
      errors.push('Interpretation too short');
    }
    if (!interpretation.symbols || interpretation.symbols.length === 0) {
      errors.push('No symbols identified');
    }
    if (!interpretation.quickTake || interpretation.quickTake.length < 20) {
      errors.push('Quick take too short');
    }
    
    // Interpreter-specific validation
    const specificErrors = this.validateInterpreterSpecific(interpretation);
    errors.push(...specificErrors);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get all prompts for this interpreter
   */
  getPrompts() {
    return {
      relevanceAssessment: this.getRelevancePrompt(),
      fullInterpretation: this.getInterpretationPrompt(),
      jsonFormatting: this.getFormattingPrompt()
    };
  }
  
  /**
   * Protected methods to be implemented by specific interpreters
   */
  protected abstract getRelevancePrompt(): string;
  protected abstract getInterpretationPrompt(): string;
  protected abstract getFormattingPrompt(): string;
  protected abstract validateInterpreterSpecific(interpretation: DreamInterpretation): string[];
  abstract getCoreStructure(): InterpretationCore;
  
  /**
   * Helper methods
   */
  protected getSystemPrompt(stage: 'relevance' | 'interpretation' | 'formatting'): string {
    const basePrompt = `You are ${this.personality.name}, ${this.personality.description}. 
${this.personality.voiceSignature}`;
    
    switch (stage) {
      case 'relevance':
        return `${basePrompt}\n\nYour task is to assess the relevance of provided knowledge fragments and themes to the dream. Return only valid JSON.`;
      case 'interpretation':
        return `${basePrompt}\n\nYour task is to provide a comprehensive dream interpretation using your unique perspective and expertise.`;
      case 'formatting':
        return `${basePrompt}\n\nYour task is to format the interpretation into a structured JSON response. Return only valid JSON.`;
    }
  }
  
  protected buildRelevancePrompt(context: InterpreterContext): string {
    const basePrompt = this.getRelevancePrompt();
    return basePrompt
      .replace('{{dream}}', context.dreamTranscription)
      .replace('{{themes}}', context.themes.map(t => t.name).join(', '))
      .replace('{{fragments}}', JSON.stringify(context.knowledgeFragments || []));
  }
  
  protected buildInterpretationPrompt(
    context: InterpreterContext, 
    relevanceData: RelevanceAssessment
  ): string {
    const basePrompt = this.getInterpretationPrompt();
    return basePrompt
      .replace('{{dream}}', context.dreamTranscription)
      .replace('{{relevantThemes}}', relevanceData.relevantThemes.join(', '))
      .replace('{{relevantFragments}}', JSON.stringify(relevanceData.relevantFragments))
      .replace('{{userContext}}', JSON.stringify(context.userContext || {}));
  }
  
  protected buildFormattingPrompt(
    context: InterpreterContext,
    fullInterpretation: FullInterpretationResult,
    relevanceData: RelevanceAssessment
  ): string {
    const basePrompt = this.getFormattingPrompt();
    return basePrompt
      .replace('{{dream}}', context.dreamTranscription)
      .replace('{{interpretation}}', fullInterpretation.interpretation)
      .replace('{{symbols}}', fullInterpretation.symbolsIdentified.join(', '))
      .replace('{{keyInsights}}', fullInterpretation.keyInsights.join('\n'));
  }
  
  protected validateRelevanceAssessment(data: any): RelevanceAssessment {
    // Ensure required fields exist with defaults
    return {
      relevantThemes: data.relevantThemes || [],
      relevantFragments: data.relevantFragments || [],
      focusAreas: data.focusAreas || []
    };
  }
  
  protected extractInterpretationData(interpretation: string): FullInterpretationResult {
    // Extract symbols and key insights from the interpretation text
    // This is a basic implementation - specific interpreters can override
    const symbols: string[] = [];
    const keyInsights: string[] = [];
    
    // Look for common symbol patterns
    const symbolPatterns = [
      /symbol(?:s)? of (\w+)/gi,
      /(\w+) represents?/gi,
      /(\w+) symbolizes?/gi
    ];
    
    for (const pattern of symbolPatterns) {
      const matches = interpretation.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 2) {
          symbols.push(match[1]);
        }
      }
    }
    
    // Extract first few sentences as key insights
    const sentences = interpretation.match(/[^.!?]+[.!?]+/g) || [];
    keyInsights.push(...sentences.slice(0, 3).map(s => s.trim()));
    
    return {
      interpretation,
      symbolsIdentified: [...new Set(symbols)].slice(0, 10),
      keyInsights: keyInsights.slice(0, 5)
    };
  }
}