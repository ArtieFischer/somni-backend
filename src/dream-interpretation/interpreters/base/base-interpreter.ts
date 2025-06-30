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
import { modelConfigService } from '../../../services/modelConfig';

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
   * Generate JSON completion with automatic retry on parse errors
   */
  protected async generateJSONWithRetry(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      interpreterType?: InterpreterType;
      responseFormat?: { type: 'json_object' };
    },
    parseFunction: (content: string) => any
  ): Promise<{ parsed: any; model: string; usage: any }> {
    // Get the full model chain
    const modelChain = modelConfigService.getModelChain(undefined, this.type);
    
    logger.info('Starting JSON generation with retry chain', {
      interpreterType: this.type,
      modelChain,
      totalModels: modelChain.length
    });
    
    let lastError: Error | null = null;
    
    // Try each model in the chain
    for (let i = 0; i < modelChain.length; i++) {
      const currentModel = modelChain[i];
      
      try {
        logger.info(`Attempting JSON generation with model ${i + 1}/${modelChain.length}`, {
          model: currentModel,
          interpreterType: this.type
        });
        
        // Make the request with the specific model
        const response = await this.openrouter.generateCompletion(
          messages,
          {
            ...options,
            model: currentModel,
            responseFormat: { type: 'json_object' }
          }
        );
        
        // Try to parse the response
        try {
          const parsed = parseFunction(response.content);
          
          logger.info('Successfully parsed JSON response', {
            model: currentModel,
            interpreterType: this.type,
            attempt: i + 1
          });
          
          return {
            parsed,
            model: response.model,
            usage: response.usage
          };
        } catch (parseError) {
          logger.warn('JSON parsing failed, trying next model', {
            model: currentModel,
            attempt: i + 1,
            totalModels: modelChain.length,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            contentPreview: response.content.substring(0, 200)
          });
          
          lastError = parseError instanceof Error ? parseError : new Error(String(parseError));
          
          // Continue to next model
          continue;
        }
      } catch (requestError) {
        logger.warn('Model request failed, trying next model', {
          model: currentModel,
          attempt: i + 1,
          totalModels: modelChain.length,
          error: requestError instanceof Error ? requestError.message : String(requestError)
        });
        
        lastError = requestError instanceof Error ? requestError : new Error(String(requestError));
        
        // Continue to next model
        continue;
      }
    }
    
    // All models failed
    logger.error('All models in chain failed to generate valid JSON', {
      modelChain,
      interpreterType: this.type,
      lastError: lastError?.message
    });
    
    throw new Error(`Failed to generate valid JSON after trying all models: ${lastError?.message}`);
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
      
      // Define the parse function that includes our JSON cleaning logic
      const parseJSON = (content: string) => {
        // First try direct parsing
        try {
          return JSON.parse(content);
        } catch (firstError) {
          // Log the initial failure
          logger.debug('Direct JSON parsing failed, attempting cleanup', {
            error: firstError instanceof Error ? firstError.message : String(firstError),
            contentLength: content.length
          });
          
          // Fallback: Extract JSON from response (handle markdown code blocks)
          let cleanedContent = content;
          
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
            
            return JSON.parse(jsonStr);
          } else {
            return JSON.parse(cleanedContent);
          }
        }
      };
      
      // Use the retry method
      const result = await this.generateJSONWithRetry(
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
        },
        parseJSON
      );
      
      return {
        success: true,
        data: this.validateRelevanceAssessment(result.parsed, context.knowledgeFragments || []),
        metadata: {
          model: result.model,
          promptTokens: result.usage?.promptTokens,
          completionTokens: result.usage?.completionTokens
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
      
      // Define the parse function that includes our JSON cleaning logic
      const parseJSON = (content: string) => {
        // First try direct parsing
        try {
          return JSON.parse(content);
        } catch (firstError) {
          logger.debug('Direct JSON parsing failed in formatToJSON, attempting extraction', {
            error: firstError instanceof Error ? firstError.message : String(firstError)
          });
          
          // Extract JSON from response (handle markdown code blocks)
          let jsonString = content;
          
          // Try to extract JSON from markdown code blocks first
          const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (codeBlockMatch) {
            jsonString = codeBlockMatch[1];
          } else {
            // Fall back to finding raw JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonString = jsonMatch[0];
            }
          }
          
          return JSON.parse(jsonString);
        }
      };
      
      // Use the retry method
      const result = await this.generateJSONWithRetry(
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
          responseFormat: { type: 'json_object' }
        },
        parseJSON
      );
      
      const formatted = result.parsed;
      
      // Add metadata and full interpretation
      // Fix: Map interpretationCore to interpreterCore if present
      if (formatted.interpretationCore) {
        formatted.interpreterCore = formatted.interpretationCore;
        delete formatted.interpretationCore;
      }
      
      const finalResult: FormattedInterpretation = {
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
        data: finalResult,
        metadata: {
          model: result.model,
          promptTokens: result.usage?.promptTokens,
          completionTokens: result.usage?.completionTokens
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
    
    // Only validate mandatory fields
    if (!interpretation.dreamId) errors.push('Missing dreamId');
    
    // Condensed interpretation is mandatory
    if (!interpretation.interpretation || interpretation.interpretation.length < 50) {
      errors.push('Interpretation too short');
    }
    
    // Other fields are optional but warn if missing
    const warnings: string[] = [];
    if (!interpretation.symbols || interpretation.symbols.length === 0) {
      warnings.push('No symbols identified');
    }
    if (!interpretation.quickTake || interpretation.quickTake.length < 20) {
      warnings.push('Quick take too short or missing');
    }
    
    // Log warnings but don't fail validation
    if (warnings.length > 0) {
      logger.warn('Validation warnings', {
        dreamId: interpretation.dreamId,
        warnings
      });
    }
    
    // Interpreter-specific validation (make these warnings too)
    const specificErrors = this.validateInterpreterSpecific(interpretation);
    if (specificErrors.length > 0) {
      logger.warn('Interpreter-specific validation warnings', {
        dreamId: interpretation.dreamId,
        warnings: specificErrors
      });
    }
    
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