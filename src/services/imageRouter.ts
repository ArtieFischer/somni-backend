import axios, { AxiosError } from 'axios';
import logger from '../utils/logger';

interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  negative_prompt?: string;
  steps?: number;
  cfg_scale?: number;
  seed?: number;
}

interface ImageGenerationResponse {
  id: string;
  created: number;
  model: string;
  image_url: string;
  prompt: string;
}

export class ImageRouterService {
  private apiKey: string;
  private baseUrl = 'https://api.imagerouter.io/v1';
  private primaryModel: string;
  private fallbackModel: string;

  constructor() {
    this.apiKey = process.env['IMAGEROUTER_API_KEY'] || '0ebe51abf48b02cb2073ad5058c7981c0cc994b40ef1fc512f9bbf64e4fc9c0b';
    this.primaryModel = process.env['IMAGE_PRIMARY_MODEL'] || 'google/gemini-2.0-flash-exp:free';
    this.fallbackModel = process.env['IMAGE_FALLBACK_MODEL'] || 'black-forest-labs/FLUX-1-schnell:free';
  }

  /**
   * Generate an image based on a scene description
   */
  async generateDreamImage(
    sceneDescription: string,
    options: Partial<ImageGenerationRequest> = {}
  ): Promise<string> {
    // Combine scene description with new style prompt
    const styledPrompt = `${sceneDescription}. Style: 8mm camera photography, scanned with low-resolution 90s scanner ethereal and abstract, very limited colors with one dominating (its purple OR green), afterglow, surreal atmosphere, artistic interpretation`;

    // Try primary model first
    const models = [this.primaryModel, this.fallbackModel];
    let lastError: Error | null = null;

    for (const model of models) {
      const requestPayload: ImageGenerationRequest = {
        prompt: styledPrompt,
        model: options.model || model,
        width: options.width || 512,
        height: options.height || 512,
        negative_prompt: options.negative_prompt || 'realistic, photographic, sharp focus, high detail',
        steps: options.steps || 20,
        cfg_scale: options.cfg_scale || 7.5,
        ...(options.seed && { seed: options.seed }),
      };

      try {
        logger.info('Generating dream image via ImageRouter', {
          model: requestPayload.model,
          promptLength: styledPrompt.length,
          attempt: model === this.primaryModel ? 'primary' : 'fallback',
        });

        const response = await axios.post<ImageGenerationResponse>(
          `${this.baseUrl}/images/generations`,
          requestPayload,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000, // 60 second timeout for image generation
          }
        );

        logger.info('Dream image generated successfully', {
          imageId: response.data.id,
          imageUrl: response.data.image_url,
          model: response.data.model,
          usedFallback: model === this.fallbackModel,
        });

        return response.data.image_url;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        logger.warn(`Failed to generate image with ${model}`, {
          model,
          error: lastError.message,
          ...((error instanceof AxiosError) && {
            status: error.response?.status,
            data: error.response?.data,
          }),
        });

        // If this was the primary model, try the fallback
        if (model === this.primaryModel) {
          logger.info('Attempting fallback model for image generation');
          continue;
        }
      }
    }

    // If we get here, both models failed
    logger.error('Failed to generate dream image with both models', {
      error: lastError?.message || 'Unknown error',
    });

    throw this.handleImageRouterError(lastError);
  }

  /**
   * Download an image from URL and return as buffer
   */
  async downloadImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download image', {
        imageUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to download generated image');
    }
  }

  /**
   * Handle ImageRouter API errors
   */
  private handleImageRouterError(error: unknown): Error {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;

      switch (status) {
        case 401:
          return new Error('Invalid ImageRouter API key');
        case 429:
          return new Error('Image generation rate limit exceeded. Please try again later');
        case 400:
          return new Error(`Invalid image generation request: ${message}`);
        case 500:
        case 502:
        case 503:
          return new Error('Image generation service temporarily unavailable');
        default:
          return new Error(`Image generation failed: ${message}`);
      }
    }

    return error instanceof Error ? error : new Error('Unknown image generation error');
  }
}

// Export singleton instance
export const imageRouterService = new ImageRouterService();