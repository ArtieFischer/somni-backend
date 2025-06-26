/**
 * Dream Interpretation API Routes
 */

import { Router } from 'express';
import { dreamInterpretationController } from '../dream-interpretation/api/dream-interpretation.controller';
import { isAuthenticated } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { 
  validateInterpretationRequest, 
  validateThemeExtractionRequest 
} from '../middleware/validation';

const router = Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// Apply rate limiting with higher limits for interpretation
const interpretationRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Allow 10 interpretations per 15 minutes
  message: 'Too many interpretation requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/v1/dreams/interpret
 * Interpret a dream with specified interpreter
 */
router.post(
  '/interpret',
  interpretationRateLimit,
  validateInterpretationRequest,
  dreamInterpretationController.interpretDream.bind(dreamInterpretationController)
);

/**
 * GET /api/v1/dreams/:dreamId/interpretations
 * Get all interpretations for a specific dream
 */
router.get(
  '/:dreamId/interpretations',
  dreamInterpretationController.getDreamInterpretations.bind(dreamInterpretationController)
);

/**
 * GET /api/v1/dreams/interpreters
 * Get list of available interpreters
 */
router.get(
  '/interpreters',
  dreamInterpretationController.getInterpreters.bind(dreamInterpretationController)
);

/**
 * POST /api/v1/dreams/:dreamId/themes
 * Extract themes from a dream (fallback if not already done)
 */
router.post(
  '/:dreamId/themes',
  validateThemeExtractionRequest,
  dreamInterpretationController.extractDreamThemes.bind(dreamInterpretationController)
);

export { router as dreamInterpretationRouter };