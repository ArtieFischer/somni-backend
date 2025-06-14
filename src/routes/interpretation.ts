import express, { Request, Response } from 'express';
import { dreamInterpretationService } from '../prompts';
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
import type { InterpretationRequest } from '../types';

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
    // Use our consolidated service
    const result = await dreamInterpretationService.interpretDream(request);
    
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

export default router; 