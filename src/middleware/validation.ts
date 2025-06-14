import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

/**
 * Generic request validation middleware factory
 */
export const validateRequest = <T extends ZodSchema>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validationResult = schema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        
        logger.warn('Request validation failed', {
          url: req.url,
          method: req.method,
          userId: req.user?.id,
          errors: errorDetails,
        });
        
        res.status(400).json({
          error: 'Validation failed',
          details: errorDetails,
        });
        return;
      }
      
      // Replace request body with validated data
      req.body = validationResult.data;
      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        error,
        url: req.url,
        method: req.method,
      });
      
      res.status(500).json({
        error: 'Internal validation error',
      });
      return;
    }
  };
};

/**
 * Transcription request validation schema
 */
export const transcribeRequestSchema = z.object({
  dreamId: z.string().uuid('Invalid dream ID format'),
  audioBase64: z.string().min(1, 'Audio data is required'),
  duration: z.number().positive('Duration must be positive'),
  options: z.object({
    languageCode: z.string().nullable().optional(),
    tagAudioEvents: z.boolean().optional().default(true),
    diarize: z.boolean().optional().default(false),
  }).optional().default({}),
});

/**
 * Health check query validation schema
 */
export const healthCheckQuerySchema = z.object({
  detailed: z.string().optional().transform(val => val === 'true'),
}).optional();

/**
 * Validate transcription request
 */
export const validateTranscribeRequest = validateRequest(transcribeRequestSchema);

/**
 * Validate health check query parameters
 */
export const validateHealthCheckQuery = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const validationResult = healthCheckQuerySchema.safeParse(req.query);
    
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: validationResult.error.issues,
      });
      return;
    }
    
    // Cast to any to avoid TypeScript strict query type issues
    (req as any).query = validationResult.data || {};
    next();
  } catch (error) {
    logger.error('Query validation error', { error, url: req.url });
    res.status(500).json({
      error: 'Internal validation error',
    });
    return;
  }
};

/**
 * Validate UUID parameters
 */
export const validateUuidParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const paramValue = req.params[paramName];
    
    if (!paramValue) {
      res.status(400).json({
        error: `Missing parameter: ${paramName}`,
      });
      return;
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(paramValue)) {
      res.status(400).json({
        error: `Invalid ${paramName} format. Must be a valid UUID.`,
      });
      return;
    }
    
    next();
  };
};

/**
 * Content-Type validation middleware
 */
export const validateContentType = (expectedType: string = 'application/json') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes(expectedType)) {
      logger.warn('Invalid content type', {
        expected: expectedType,
        received: contentType,
        url: req.url,
      });
      
      res.status(415).json({
        error: `Content-Type must be ${expectedType}`,
      });
      return;
    }
    
    next();
  };
};

/**
 * Request size validation middleware
 */
export const validateRequestSize = (maxSizeBytes: number = 50 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      
      if (size > maxSizeBytes) {
        logger.warn('Request too large', {
          size,
          maxSize: maxSizeBytes,
          url: req.url,
        });
        
        res.status(413).json({
          error: `Request too large. Maximum size is ${Math.floor(maxSizeBytes / 1024 / 1024)}MB`,
        });
        return;
      }
    }
    
    next();
  };
}; 