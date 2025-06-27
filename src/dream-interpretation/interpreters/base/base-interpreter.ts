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
import { dreamInterpretationConfig } from '../../config';

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
      
      // Get current model from config
      const config = dreamInterpretationConfig.getLLMConfig();
      const currentModel = config.primaryModel;
      
      // Use higher token limit for gemini-2.5-flash
      const maxTokens = currentModel.includes('gemini-2.5-flash') ? 1500 : 800;
      
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
          maxTokens,
          interpreterType: this.type,
          responseFormat: { type: 'json_object' }
        }
      );
      
      // Parse JSON response - with schema validation, the response should be valid JSON
      let assessment;
      try {
        assessment = JSON.parse(response.content);
      } catch (parseError) {
        // Log the actual response for debugging
        logger.error('Failed to parse JSON response in assessRelevance', {
          rawContent: response.content,
          contentLength: response.content.length,
          parseError: parseError instanceof Error ? parseError.message : String(parseError)
        });
        
        // Fallback: Extract JSON from response (handle markdown code blocks)
        let cleanedContent = response.content;
        
        // Remove markdown code blocks
        cleanedContent = cleanedContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
        
        // Try to extract JSON object
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonStr = jsonMatch[0];
          
          // Try to fix common JSON issues
          // Fix unescaped quotes within string values
          jsonStr = jsonStr.replace(/"([^"]*)":\s*"([^"]*)"/g, (match, key, value) => {
            // Escape any unescaped quotes within the value
            const escapedValue = value.replace(/(?<!\\)"/g, '\\"');
            return `"${key}": "${escapedValue}"`;
          });
          
          assessment = JSON.parse(jsonStr);
        } else {
          assessment = JSON.parse(cleanedContent);
        }
      }
      
      return {
        success: true,
        data: this.validateRelevanceAssessment(assessment, context.knowledgeFragments || []),
        metadata: {
          model: response.model,
          promptTokens: response.usage?.promptTokens,
          completionTokens: response.usage?.completionTokens
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
          promptTokens: response.usage?.promptTokens,
          completionTokens: response.usage?.completionTokens
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
      
      // Use a model better suited for JSON generation
      const jsonFriendlyModel = this.type === 'mary' 
        ? 'mistralai/mistral-nemo:free'  // Mary uses Mistral for JSON
        : this.type === 'freud'
        ? 'openai/gpt-4o-mini'  // Freud already has GPT-4o-mini as fallback
        : undefined;  // Others use default chain
      
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
          interpreterType: this.type,
          responseFormat: { type: 'json_object' },
          model: jsonFriendlyModel
        }
      );
      
      // Parse JSON response - with schema validation, the response should be valid JSON
      let formatted;
      try {
        formatted = JSON.parse(response.content);
      } catch (parseError) {
        logger.warn('Direct JSON parsing failed, attempting extraction:', parseError);
        
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
        
        try {
          formatted = JSON.parse(jsonString);
        } catch (secondError) {
          logger.error('JSON extraction and parsing failed:', secondError);
          logger.error('Response content:', response.content.substring(0, 500));
          
          // With strict schema, parsing failures should be rare
          // If they occur, it's likely a model issue
          throw new Error(`Failed to parse JSON response: ${secondError instanceof Error ? secondError.message : String(secondError)}`);
        }
      }
      
      // Add metadata and full interpretation
      // Fix: Map interpretationCore to interpreterCore if present
      if (formatted.interpretationCore) {
        formatted.interpreterCore = formatted.interpretationCore;
        delete formatted.interpretationCore;
      }
      
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
          promptTokens: response.usage?.promptTokens,
          completionTokens: response.usage?.completionTokens
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
        return `${basePrompt}\n\nYour task is to assess the relevance of provided knowledge fragments and themes to the dream. Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Do not wrap the JSON in \`\`\`json blocks. Start your response with { and end with }.`;
      case 'interpretation':
        return `${basePrompt}\n\nYour task is to provide a comprehensive dream interpretation using your unique perspective and expertise.`;
      case 'formatting':
        return `${basePrompt}\n\nYour task is to format the interpretation into a structured JSON response. Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Do not wrap the JSON in \`\`\`json blocks. Start your response with { and end with }.`;
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
  
  protected validateRelevanceAssessment(
    data: any, 
    originalFragments: Array<{ id: string; content: string; metadata: any; relevance: number }>
  ): RelevanceAssessment {
    // Ensure required fields exist with defaults
    const relevantFragments = (data.relevantFragments || []).map((fragment: any) => {
      // Try to match the fragment content to the original fragment ID
      const originalFragment = originalFragments.find(orig => 
        orig.content === fragment.content || 
        // Fallback: partial match for truncated content
        orig.content.includes(fragment.content) ||
        fragment.content.includes(orig.content)
      );
      
      return {
        id: originalFragment?.id || `unknown-${Math.random().toString(36).substr(2, 9)}`,
        content: fragment.content,
        relevance: fragment.relevance || 0.5,
        reason: fragment.reason || 'Selected during relevance assessment'
      };
    });
    
    return {
      relevantThemes: data.relevantThemes || [],
      relevantFragments,
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