import express, { Request, Response } from 'express';
import { dreamInterpretationService } from '../prompts';
import { modelConfigService } from '../services/modelConfig';
import { 
  validateInterpretationRequest, 
  validateInterpretationContentLength,
  validateUserContextMiddleware,
  validateInterpreterType,
  validateDreamContent
} from '../middleware/validation';
import { authenticateRequest, verifyApiSecret } from '../middleware/auth';
import { transcriptionRateLimit } from '../middleware/rateLimit';
import { logger } from '../utils/logger';
import type { InterpretationRequest, InterpreterType } from '../types';

const router = express.Router();

// =============================================================================
// TEST ROUTES (API Secret Only)
// =============================================================================

const testRouter = express.Router();
testRouter.use(verifyApiSecret);
testRouter.use(transcriptionRateLimit);

/**
 * POST /api/v1/interpretation/test/interpret
 * Test dream interpretation endpoint
 */
testRouter.post('/interpret', [
  validateInterpretationContentLength,
  validateDreamContent,
  validateInterpreterType,
  validateUserContextMiddleware,
  validateInterpretationRequest
], async (req: Request, res: Response) => {
  const startTime = Date.now();
  const request = req.body as InterpretationRequest;
  
  try {
    // Add test mode flag to request
    const testRequest = { ...request, testMode: true };
    
    // Use our consolidated service
    const result = await dreamInterpretationService.interpretDream(testRequest);
    
    // Add test mode flag
    const testResponse = {
      ...result,
      testMode: true,
      testDuration: Date.now() - startTime
    };

    logger.info('TEST interpretation completed', {
      dreamId: request.dreamId,
      interpreterType: request.interpreterType,
      success: result.success,
      duration: Date.now() - startTime
    });

    res.json(testResponse);

  } catch (error) {
    logger.error('TEST interpretation failed', {
      dreamId: request.dreamId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      dreamId: request.dreamId,
      error: error instanceof Error ? error.message : 'Internal server error',
      testMode: true
    });
  }
});

/**
 * GET /api/v1/interpretation/test/interpreters
 * Get available interpreter types
 */
testRouter.get('/interpreters', (_req: Request, res: Response) => {
  try {
    const interpreters = dreamInterpretationService.getAvailableInterpreters();
    
    res.json({
      success: true,
      interpreters,
      testMode: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch interpreter types'
    });
  }
});

/**
 * POST /api/v1/interpretation/test/validate
 * Validate request format
 */
testRouter.post('/validate', (req: Request, res: Response) => {
  try {
    const validation = dreamInterpretationService.validateRequest(req.body);
    
    res.json({
      success: true,
      validation,
      testMode: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation failed'
    });
  }
});

/**
 * GET /api/v1/interpretation/test/scenarios
 * Get test scenarios for validation
 */
testRouter.get('/scenarios', (_req: Request, res: Response) => {
  try {
    const scenarios = dreamInterpretationService.createTestScenarios();
    
    res.json({
      success: true,
      scenarios,
      testMode: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get test scenarios'
    });
  }
});

// Mount test routes
router.use('/test', testRouter);

// =============================================================================
// PRODUCTION ROUTES (Full Authentication)
// =============================================================================

const prodRouter = express.Router();
prodRouter.use(authenticateRequest);
prodRouter.use(transcriptionRateLimit);

/**
 * POST /api/v1/interpretation/interpret
 * Main dream interpretation endpoint
 */
prodRouter.post('/interpret', [
  validateInterpretationContentLength,
  validateDreamContent,
  validateInterpreterType,
  validateUserContextMiddleware,
  validateInterpretationRequest
], async (req: Request, res: Response) => {
  const request = req.body as InterpretationRequest;
  
  try {
    logger.info('Production interpretation started', {
      dreamId: request.dreamId,
      interpreterType: request.interpreterType,
      userId: req.user?.id
    });

    // Use our consolidated service
    const result = await dreamInterpretationService.interpretDream(request);

    logger.info('Production interpretation completed', {
      dreamId: request.dreamId,
      success: result.success,
      userId: req.user?.id
    });

    res.json(result);

  } catch (error) {
    logger.error('Production interpretation failed', {
      dreamId: request.dreamId,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      dreamId: request.dreamId,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/interpretation/interpreters
 * Get available interpreter types (production)
 */
prodRouter.get('/interpreters', (_req: Request, res: Response) => {
  try {
    const interpreters = dreamInterpretationService.getAvailableInterpreters();
    
    res.json({
      success: true,
      interpreters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch interpreter types'
    });
  }
});

// Mount production routes
router.use('/', prodRouter);

// Easy model switching endpoint for comparison testing
router.post('/switch-model', async (req, res) => {
  try {
    const { model } = req.body;
    
    if (!model) {
      return res.status(400).json({ 
        error: 'Model parameter required. Use: llama4, gpt4o-mini, claude, llama3, or a full model ID' 
      });
    }

    // Quick switch shortcuts - use the imported service directly
    
    // Get interpreter type from body, or switch all if not specified
    const { interpreterType } = req.body;
    
    if (interpreterType) {
      // Switch model for specific interpreter
      modelConfigService.setDefaultModel(interpreterType as InterpreterType, model);
      const currentModel = modelConfigService.getCurrentModelInfo(interpreterType as InterpreterType);
      
      return res.json({
        success: true,
        message: `Model for ${interpreterType} switched successfully`,
        currentModel: {
          interpreter: interpreterType,
          id: currentModel.id,
          name: currentModel.name,
          temperature: currentModel.temperature,
          maxTokens: currentModel.maxTokens,
          costPerKToken: currentModel.cost
        }
      });
    }
    
    // Switch all interpreters to the model
    modelConfigService.switchAllToModel(model);
    
    // Get info for all interpreters
    const interpreterModels = (['jung', 'freud', 'mary', 'astrologist'] as InterpreterType[])
      .map(type => ({
        interpreter: type,
        ...modelConfigService.getCurrentModelInfo(type)
      }));
    
    return res.json({
      success: true,
      message: `All interpreters switched to ${model}`,
      interpreterModels
    });

  } catch (error) {
    logger.error('Failed to switch model:', error);
    return res.status(500).json({ 
      error: 'Failed to switch model',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current model info
router.get('/current-model', async (req, res) => {
  try {
    const { interpreterType } = req.query;
    
    if (interpreterType) {
      const currentModel = modelConfigService.getCurrentModelInfo(interpreterType as InterpreterType);
      return res.json({
        interpreter: interpreterType,
        currentModel: {
          id: currentModel.id,
          name: currentModel.name,
          temperature: currentModel.temperature,
          maxTokens: currentModel.maxTokens,
          costPerKToken: currentModel.cost
        }
      });
    }
    
    // Return info for all interpreters
    const interpreterModels = (['jung', 'freud', 'mary', 'astrologist'] as InterpreterType[])
      .map(type => ({
        interpreter: type,
        ...modelConfigService.getCurrentModelInfo(type)
      }));
    
    return res.json({
      interpreterModels
    });
  } catch (error) {
    logger.error('Failed to get current model:', error);
    return res.status(500).json({ error: 'Failed to get current model info' });
  }
});

export default router; 