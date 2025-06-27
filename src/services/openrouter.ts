import OpenAI from 'openai';
import { openRouter, models } from '../config';
import { logger } from '../utils/logger';
import { modelConfigService } from './modelConfig';
import type { TokenUsage, InterpreterType } from '../types';
import type { CostEntry } from './modelConfig';

export class OpenRouterService {
  private client: OpenAI;

  constructor() {
    
    // Initialize OpenAI client with OpenRouter configuration
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openRouter.apiKey,
      defaultHeaders: {
        ...(openRouter.siteUrl && { 'HTTP-Referer': openRouter.siteUrl }),
        ...(openRouter.siteName && { 'X-Title': openRouter.siteName }),
      },
    });

    logger.info('OpenRouter service initialized', {
      baseURL: 'https://openrouter.ai/api/v1',
      globalDefaultModel: modelConfigService.getDefaultModel(),
      hasSiteUrl: !!openRouter.siteUrl,
      hasSiteName: !!openRouter.siteName,
    });
  }

  /**
   * Generate a chat completion using OpenRouter with fallback support
   */
  async generateCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      interpreterType?: InterpreterType;
      dreamId?: string;
      responseFormat?: { type: 'json_object' };
    } = {}
  ): Promise<{
    content: string;
    usage: TokenUsage;
    model: string;
  }> {
    const startTime = Date.now();
    
    // Get model chain with fallbacks
    const modelChain = modelConfigService.getModelChain(options.model, options.interpreterType);
    
    for (let i = 0; i < modelChain.length; i++) {
      const currentModel = modelChain[i];
      
      if (!currentModel) {
        logger.error('Invalid model in chain', { index: i, modelChain });
        continue;
      }
      
      try {
        const result = await this.attemptCompletion(
          messages,
          currentModel,
          options,
          startTime
        );
        
        // Track cost if enabled and both parameters are provided
        if (options.interpreterType && options.dreamId) {
          modelConfigService.trackCost(
            currentModel,
            result.usage,
            options.interpreterType,
            options.dreamId
          );
        }
        
        return result;
      } catch (error) {
        logger.warn(`Model ${currentModel} failed, trying next in chain`, {
          model: currentModel,
          attempt: i + 1,
          totalModels: modelChain.length,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        // If this is the last model in the chain, throw the error
        if (i === modelChain.length - 1) {
          throw error;
        }
        
        // Wait before retrying with next model
        await this.delay(models.retryDelayMs);
      }
    }
    
    throw new Error('All models in fallback chain failed');
  }

  /**
   * Attempt completion with a specific model
   */
  private async attemptCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      interpreterType?: InterpreterType;
      dreamId?: string;
      responseFormat?: { type: 'json_object' };
    },
    startTime: number
  ): Promise<{
    content: string;
    usage: TokenUsage;
    model: string;
  }> {
    try {
      // Get model parameters from configuration
      const modelParams = modelConfigService.getModelParameters(
        model, 
        options.interpreterType,
        {
          ...(options.maxTokens !== undefined && { maxTokens: options.maxTokens }),
          ...(options.temperature !== undefined && { temperature: options.temperature }),
        }
      );

      logger.info('Generating OpenRouter completion', {
        model,
        messageCount: messages.length,
        temperature: modelParams.temperature,
        maxTokens: modelParams.maxTokens,
        interpreterType: options.interpreterType,
      });

      // Check if model supports response_format
      // Llama 4 models don't support response_format parameter
      const supportsResponseFormat = !modelParams.model.includes('llama-4-scout') && !modelParams.model.includes('llama-4-maverick') && !modelParams.model.includes('gemma');
      
      const requestParams = {
        model: modelParams.model,
        messages,
        temperature: modelParams.temperature,
        max_tokens: modelParams.maxTokens,
        stream: false,
        ...(options.responseFormat && supportsResponseFormat && { response_format: options.responseFormat }),
      };
      
      logger.info('OpenRouter request params', {
        model: requestParams.model,
        max_tokens: requestParams.max_tokens,
        temperature: requestParams.temperature,
        hasResponseFormat: !!requestParams.response_format
      });
      
      const completion = await this.client.chat.completions.create(requestParams) as OpenAI.Chat.Completions.ChatCompletion;

      if (!completion || !completion.choices || !completion.choices[0]) {
        throw new Error('Invalid response structure from OpenRouter API');
      }

      if (!completion.choices[0].message?.content) {
        throw new Error('No content returned from OpenRouter API');
      }

      const content = completion.choices[0].message.content;
      const usage: TokenUsage = {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
      };

      const duration = Date.now() - startTime;

      logger.info('OpenRouter completion successful', {
        model,
        duration,
        tokenUsage: usage,
        contentLength: content.length,
      });

      return {
        content,
        usage,
        model,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('OpenRouter completion failed', {
        model,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error,
      });

      throw this.handleOpenRouterError(error);
    }
  }

  /**
   * Generate a streaming completion (for future use)
   */
  async generateStreamingCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<AsyncIterable<string>> {
    const model = options.model || modelConfigService.getDefaultModel();

    try {
      logger.info('Generating OpenRouter streaming completion', {
        model,
        messageCount: messages.length,
      });

      const stream = await this.client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
        stream: true,
      });

      return this.createStreamIterator(stream);
    } catch (error) {
      logger.error('OpenRouter streaming completion failed', {
        model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw this.handleOpenRouterError(error);
    }
  }

  /**
   * Create an async iterator for streaming responses
   */
  private async *createStreamIterator(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  ): AsyncIterable<string> {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * Test connection to OpenRouter API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateCompletion([
        { role: 'user', content: 'Hello, please respond with "OK" if you can see this message.' }
      ], {
        maxTokens: 10,
        temperature: 0,
      });

      const isValid = response.content.toLowerCase().includes('ok');
      
      logger.info('OpenRouter connection test', {
        success: isValid,
        model: response.model,
        tokenUsage: response.usage,
      });

      return isValid;
    } catch (error) {
      logger.error('OpenRouter connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get available models (for future implementation)
   */
  async getAvailableModels(): Promise<string[]> {
    return modelConfigService.getAvailableModels().map(model => model.id);
  }

  /**
   * Get model recommendations for interpreter type
   */
  getBestModelForInterpreter(interpreterType: InterpreterType): string {
    return modelConfigService.getBestModelForInterpreter(interpreterType);
  }

  /**
   * Get cost summary
   */
  getCostSummary(): {
    totalCost: number;
    totalRequests: number;
    totalTokens: number;
    costByModel: Record<string, number>;
    costByInterpreter: Record<InterpreterType, number>;
    recentEntries: CostEntry[];
  } {
    return modelConfigService.getCostSummary();
  }

  /**
   * Generate a creative title for a dream based on its transcription
   */
  async generateDreamTitle(
    transcript: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    } = {}
  ): Promise<string> {
    const prompt = `Based on the following dream transcription, create a short, creative, and evocative title (4-7 words maximum). The title should capture the essence or most striking element of the dream. Do not include any interpretation or analysis, just the title itself.

Dream transcription:
"${transcript}"

Title:`;

    try {
      logger.info('Generating dream title', {
        transcriptLength: transcript.length,
        model: options.model || 'meta-llama/llama-4-maverick:free',
      });

      const response = await this.generateCompletion(
        [{ role: 'user', content: prompt }],
        {
          model: options.model || 'meta-llama/llama-4-maverick:free',
          temperature: options.temperature ?? 0.7,
          maxTokens: options.maxTokens ?? 20,
        }
      );

      // Clean up the title (remove quotes, extra whitespace, etc.)
      const title = response.content
        .trim()
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/\.$/, '') // Remove trailing period
        .trim();

      logger.info('Dream title generated', {
        title,
        tokenUsage: response.usage,
        model: response.model,
      });

      return title;
    } catch (error) {
      logger.error('Failed to generate dream title', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Return a fallback title based on timestamp
      const date = new Date();
      return `Dream of ${date.toLocaleDateString()}`;
    }
  }

  /**
   * Generate a visual scene description for a dream based on its transcription
   */
  async generateDreamSceneDescription(
    transcript: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    } = {}
  ): Promise<string> {
    const prompt = `Based on the following dream transcription, create a short (max 30 words) description of a single visual scene that illustrates the dream. Focus only on what can be seen - colors, objects, environment, lighting. No symbolism, no interpretation, just pure visual description.

Dream transcription:
"${transcript}"

Visual scene description:`;

    try {
      logger.info('Generating dream scene description', {
        transcriptLength: transcript.length,
        model: options.model || 'meta-llama/llama-4-maverick:free',
      });

      const response = await this.generateCompletion(
        [{ role: 'user', content: prompt }],
        {
          model: options.model || 'meta-llama/llama-4-maverick:free',
          temperature: options.temperature ?? 0.8,
          maxTokens: options.maxTokens ?? 100,
        }
      );

      const sceneDescription = response.content.trim();

      logger.info('Dream scene description generated', {
        descriptionLength: sceneDescription.length,
        tokenUsage: response.usage,
        model: response.model,
      });

      return sceneDescription;
    } catch (error) {
      logger.error('Failed to generate dream scene description', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Return a generic scene description as fallback
      return 'A dreamlike scene with soft colors and abstract shapes floating in a misty atmosphere';
    }
  }

  /**
   * Generate dream metadata (title and image prompt) in a single batched call
   */
  async generateDreamMetadata(
    transcript: string,
    options: {
      model?: string;
      dreamId?: string;
    } = {}
  ): Promise<{
    title: string;
    imagePrompt: string;
    mood: number;
    clarity: number;
    usage: TokenUsage;
    model: string;
  }> {
    const startTime = Date.now();
    
    const systemPrompt = `You are DREAM-METADATA v1. Work strictly in English.
IMPORTANT: You MUST return ONLY a valid JSON object with no other text, explanation, or formatting.
Return a single-line minified JSON. No additional keys.
Context: You are analyzing dream descriptions submitted by users seeking psychological help and self-improvement.`;

    const userPrompt = `### TASKS
1. "title": 4-7 words, evocative, no punctuation at the end.
2. "imagePrompt": ≤ 30 words. Create a single visual scene that illustrates the dream. Focus only on what can be seen - colors, objects, environment, lighting. Pure visual description, present tense.
3. "mood": Integer 1-5. Assess the emotional tone: 1=very negative/frightening, 2=somewhat negative/uncomfortable, 3=neutral/mixed, 4=somewhat positive/pleasant, 5=very positive/joyful.
4. "clarity": Integer 1-100. Assess dream coherence and recall quality: 1-20=fragmented/unclear, 21-40=somewhat unclear, 41-60=moderately clear, 61-80=mostly clear, 81-100=extremely vivid/detailed.

### RULES
• Each field is independent – do not let wording of one influence another.  
• Use only information from the FULL transcript below.
• For imagePrompt: Be specific with visual details - textures, colors, lighting, atmosphere. No feelings or interpretations.
• For mood: Consider the overall emotional atmosphere and dreamer's apparent feelings.
• For clarity: Consider level of detail, coherence of narrative, and apparent recall quality.
• Output **exactly** this JSON schema: {"title":"…","imagePrompt":"…","mood":1-5,"clarity":1-100}
• CRITICAL: Return ONLY the JSON object, nothing else. No markdown, no explanations, just: {"title":"…","imagePrompt":"…","mood":3,"clarity":50}

### DREAM TRANSCRIPT
${transcript}`;

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // Enhanced model chain with JSON-friendly models
    // Models known to work well with JSON: Mistral variants, Dolphin, and newer models
    const modelChain = options.model 
      ? [options.model]
      : [
          'mistralai/mistral-nemo:free',           // Good at following instructions
          'cognitivecomputations/dolphin3.0-mistral-24b:free', // Very good at structured output
          'google/gemma-2-9b-it:free',             // Google's model, good at structured tasks
          'meta-llama/llama-4-maverick:free'        // Fallback, doesn't support response_format
        ];
    
    let lastError: unknown;
    const maxRetriesPerModel = 2; // Retry each model up to 2 times for JSON parsing issues

    for (const model of modelChain) {
      for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
        try {
          logger.info('Attempting dream metadata generation', { 
            model,
            attempt,
            dreamId: options.dreamId,
            transcriptLength: transcript.length 
          });

          // Check if the model supports response_format parameter
          const supportsResponseFormat = !model.includes('llama-4-scout') && !model.includes('llama-4-maverick');
          
          const requestParams: any = {
            model,
            messages,
            temperature: attempt === 1 ? 0.7 : 0.3, // Lower temperature on retry
            max_tokens: 250 // Slightly more tokens to ensure complete JSON
          };
          
          if (supportsResponseFormat) {
            requestParams.response_format = { type: 'json_object' };
          }
          
          const completion = await this.client.chat.completions.create(requestParams);

          const content = completion.choices[0]?.message?.content || '';
          const usage: TokenUsage = {
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0,
            totalTokens: completion.usage?.total_tokens || 0,
          };

          // Parse and validate the JSON response
          interface MetadataResponse {
            title: string;
            imagePrompt: string;
            mood: number;
            clarity: number;
          }
          let metadata: MetadataResponse;
          
          try {
            // Clean the content first
            let cleanedContent = content.trim();
            
            // Remove common prefixes/suffixes that models might add
            cleanedContent = cleanedContent.replace(/^```json\s*/i, '');
            cleanedContent = cleanedContent.replace(/\s*```$/i, '');
            cleanedContent = cleanedContent.replace(/^json\s*/i, '');
            cleanedContent = cleanedContent.replace(/^Here is the JSON.*?:/i, '');
            cleanedContent = cleanedContent.replace(/^The JSON response is.*?:/i, '');
            
            // Try multiple extraction strategies
            let jsonString: string | null = null;
            
            // Strategy 1: Direct parse if it's clean JSON
            if (cleanedContent.startsWith('{') && cleanedContent.endsWith('}')) {
              jsonString = cleanedContent;
            }
            
            // Strategy 2: Extract JSON with all required fields
            if (!jsonString) {
              const fullJsonMatch = cleanedContent.match(/\{[^{}]*"title"[^{}]*"imagePrompt"[^{}]*"mood"[^{}]*"clarity"[^{}]*\}/);
              if (fullJsonMatch) {
                jsonString = fullJsonMatch[0];
              }
            }
            
            // Strategy 3: Extract any JSON-like object and hope it has our fields
            if (!jsonString) {
              const anyJsonMatch = cleanedContent.match(/\{[^{}]+\}/);
              if (anyJsonMatch) {
                jsonString = anyJsonMatch[0];
              }
            }
            
            if (!jsonString) {
              throw new Error('No JSON object found in response');
            }
            
            metadata = JSON.parse(jsonString);
            
          } catch (parseError) {
            logger.error('Failed to parse metadata JSON', { 
              error: parseError,
              content: content.substring(0, 500), // Log first 500 chars
              model,
              attempt,
              dreamId: options.dreamId 
            });
            
            if (attempt < maxRetriesPerModel) {
              // Wait before retrying
              await this.delay(500);
              continue; // Retry with same model
            }
            
            throw new Error('Invalid JSON response from model after retries');
          }

          // Validate the response structure
          if (!metadata.title || !metadata.imagePrompt || 
              typeof metadata.mood !== 'number' || typeof metadata.clarity !== 'number') {
            logger.error('Invalid metadata structure', {
              model,
              metadata,
              dreamId: options.dreamId
            });
            
            if (attempt < maxRetriesPerModel) {
              await this.delay(500);
              continue; // Retry with same model
            }
            
            throw new Error('Invalid metadata structure');
          }
          
          // Validate and clamp mood to 1-5
          if (metadata.mood < 1 || metadata.mood > 5) {
            metadata.mood = Math.max(1, Math.min(5, Math.round(metadata.mood)));
          }
          
          // Validate and clamp clarity to 1-100
          if (metadata.clarity < 1 || metadata.clarity > 100) {
            metadata.clarity = Math.max(1, Math.min(100, Math.round(metadata.clarity)));
          }
          
          // Clean up title and imagePrompt
          metadata.title = metadata.title.trim().replace(/\.$/, ''); // Remove trailing period
          metadata.imagePrompt = metadata.imagePrompt.trim();

          // Track costs
          modelConfigService.trackCost(
            model,
            usage,
            'jung' as InterpreterType, // Use a default type for metadata
            options.dreamId || 'metadata-gen'
          );

          const responseTime = Date.now() - startTime;
          logger.info('Dream metadata generated successfully', {
            model,
            dreamId: options.dreamId,
            responseTime,
            usage,
            attempt
          });

          return {
            title: metadata.title,
            imagePrompt: metadata.imagePrompt,
            mood: metadata.mood,
            clarity: metadata.clarity,
            usage,
            model
          };

        } catch (error) {
          lastError = error;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const is503Error = errorMessage.includes('503');
          const isRateLimit = errorMessage.includes('429');
          
          logger.error('Dream metadata generation failed', {
            model,
            attempt,
            dreamId: options.dreamId,
            error: errorMessage,
            is503Error,
            isRateLimit
          });

          // If it's the last attempt for the last model, throw
          if (model === modelChain[modelChain.length - 1] && attempt === maxRetriesPerModel) {
            throw this.handleOpenRouterError(lastError);
          }

          // Wait before next attempt/model
          let waitTime = 1000; // Default wait
          if (is503Error) waitTime = 3000;
          if (isRateLimit) waitTime = 5000;
          
          logger.info(`Waiting ${waitTime}ms before ${attempt < maxRetriesPerModel ? 'retry' : 'next model'}`, { 
            dreamId: options.dreamId 
          });
          await this.delay(waitTime);
        }
      }
    }

    // This should never be reached due to the throw above, but TypeScript needs it
    throw this.handleOpenRouterError(lastError || new Error('All models failed'));
  }


  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle OpenRouter API errors and convert to user-friendly messages
   */
  private handleOpenRouterError(error: unknown): Error {
    if (error instanceof Error) {
      // Handle specific OpenRouter/OpenAI API errors
      if (error.message.includes('401')) {
        return new Error('Invalid OpenRouter API key. Please check your configuration.');
      }
      
      if (error.message.includes('429')) {
        return new Error('Rate limit exceeded. Please try again later.');
      }
      
      if (error.message.includes('insufficient_quota')) {
        return new Error('Insufficient API quota. Please add credits to your OpenRouter account.');
      }
      
      if (error.message.includes('model_not_found')) {
        return new Error('The specified model is not available. Please try a different model.');
      }
      
      if (error.message.includes('context_length_exceeded')) {
        return new Error('Request too long. Please shorten your dream description.');
      }
      
      if (error.message.includes('timeout')) {
        return new Error('Request timed out. Please try again.');
      }
      
      // Return original error for unknown cases
      return error;
    }

    return new Error('Unknown error occurred while processing with OpenRouter API');
  }
}

// Export singleton instance
export const openRouterService = new OpenRouterService();