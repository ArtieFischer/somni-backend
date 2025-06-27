/**
 * Dream Interpretation API Routes
 */

import { Router } from 'express';
import { dreamInterpretationController } from '../dream-interpretation/api/dream-interpretation.controller';
import { dreamInterpretationQueueController } from '../dream-interpretation/api/dream-interpretation-queue.controller';
import { verifyApiSecret } from '../middleware/auth';
// import { rateLimitMiddleware } from '../middleware/rateLimit';
// import { 
//   validateInterpretationRequest, 
//   validateThemeExtractionRequest 
// } from '../middleware/validation';

const router = Router();

// Apply authentication in production only
if (process.env.NODE_ENV === 'production') {
  router.use(verifyApiSecret);
}

// TODO: Add rate limiting when middleware is available
// Apply rate limiting with higher limits for interpretation
// const interpretationRateLimit = rateLimitMiddleware({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // Allow 10 interpretations per 15 minutes
//   message: 'Too many interpretation requests. Please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

/**
 * POST /api/v1/dreams/interpret
 * Interpret a dream with specified interpreter
 */
router.post(
  '/interpret',
  // interpretationRateLimit,
  // validateInterpretationRequest,
  dreamInterpretationController.interpretDream.bind(dreamInterpretationController)
);

/**
 * POST /api/v1/dreams/interpret-by-id
 * Interpret a dream by fetching all data from database
 * Accepts: { dreamId, userId, interpreterType }
 */
router.post(
  '/interpret-by-id',
  // interpretationRateLimit,
  dreamInterpretationController.interpretDreamById.bind(dreamInterpretationController)
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
  // validateThemeExtractionRequest,
  dreamInterpretationController.extractDreamThemes.bind(dreamInterpretationController)
);

/**
 * POST /api/v1/dreams/interpret-async
 * Queue a dream for asynchronous interpretation
 */
router.post(
  '/interpret-async',
  // interpretationRateLimit,
  dreamInterpretationQueueController.queueInterpretation.bind(dreamInterpretationQueueController)
);

/**
 * GET /api/v1/dreams/jobs/:jobId
 * Get status of an interpretation job
 */
router.get(
  '/jobs/:jobId',
  dreamInterpretationQueueController.getJobStatus.bind(dreamInterpretationQueueController)
);

export { router as dreamInterpretationRouter };