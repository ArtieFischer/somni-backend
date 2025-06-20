import { Router, Request, Response } from 'express';
import { verifyApiSecret } from '../middleware/auth';
import { validateContentType } from '../middleware/validation';
import { openRouterService } from '../services/openrouter';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

// Validation schema for scene description request
const sceneDescriptionSchema = z.object({
  dreamTranscription: z.string().min(10).max(10000),
  options: z.object({
    maxTokens: z.number().min(50).max(500).optional(),
    temperature: z.number().min(0).max(1).optional(),
    model: z.string().optional(),
  }).optional(),
});

/**
 * POST /api/v1/scene-description
 * 
 * Generate a visual scene description from a dream transcription
 * This endpoint is for testing and development purposes
 */
router.post(
  '/',
  validateContentType('application/json'),
  verifyApiSecret,
  async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = sceneDescriptionSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: validationResult.error.errors,
        });
      }

      const { dreamTranscription, options } = validationResult.data;

      logger.info('Generating scene description', {
        transcriptionLength: dreamTranscription.length,
        options,
      });

      // Generate scene description
      const sceneDescription = await openRouterService.generateDreamSceneDescription(
        dreamTranscription,
        {
          maxTokens: options?.maxTokens ?? 100,
          temperature: options?.temperature ?? 0.8,
          ...(options?.model && { model: options.model }),
        }
      );

      logger.info('Scene description generated successfully', {
        descriptionLength: sceneDescription.length,
      });

      return res.json({
        success: true,
        sceneDescription,
        metadata: {
          transcriptionLength: dreamTranscription.length,
          descriptionLength: sceneDescription.length,
          generatedAt: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('Failed to generate scene description', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to generate scene description',
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/v1/scene-description/test
 * 
 * Test endpoint with a sample dream
 */
router.get('/test', verifyApiSecret, async (_req: Request, res: Response) => {
  const sampleDream = "I was walking through a forest made of glass. The trees were transparent and sparkled in the sunlight.";
  
  try {
    const sceneDescription = await openRouterService.generateDreamSceneDescription(sampleDream);
    
    return res.json({
      success: true,
      sampleDream,
      sceneDescription,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export { router as sceneDescriptionRouter };