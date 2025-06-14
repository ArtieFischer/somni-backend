import OpenAI from 'openai';
import { openRouter } from '../config';
import { logger } from '../utils/logger';
import type { TokenUsage } from '../types';

export class OpenRouterService {
  private client: OpenAI;
  private defaultModel: string;

  constructor() {
    this.defaultModel = openRouter.defaultModel;
    
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
      defaultModel: this.defaultModel,
      hasSiteUrl: !!openRouter.siteUrl,
      hasSiteName: !!openRouter.siteName,
    });
  }

  /**
   * Generate a chat completion using OpenRouter
   */
  async generateCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<{
    content: string;
    usage: TokenUsage;
    model: string;
  }> {
    const startTime = Date.now();
    const model = options.model || this.defaultModel;

    try {
      logger.info('Generating OpenRouter completion', {
        model,
        messageCount: messages.length,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

      const completion = await this.client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
        stream: false,
      });

      if (!completion.choices[0]?.message?.content) {
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
    const model = options.model || this.defaultModel;

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
    // This would require calling OpenRouter's models endpoint
    // For now, return a list of common models
    return [
      'meta-llama/llama-3.1-8b-instruct:free',
      'meta-llama/llama-3.1-70b-instruct:free',
      'microsoft/wizardlm-2-8x22b',
      'anthropic/claude-3-haiku',
      'openai/gpt-4o-mini',
      'google/gemma-2-9b-it:free',
    ];
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