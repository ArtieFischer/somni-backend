import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { logger } from '../utils/logger';
import * as InterpretationValidation from '../utils/validation';

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
  duration: z.number().positive('Duration must be positive').optional(),
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

// Dream interpretation validation
export const validateInterpretationRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Validate the request body
    const validatedData = InterpretationValidation.validateInterpretationRequest(req.body);
    
    // Automatically determine life phase if user context is provided
    if (validatedData.userContext && validatedData.userContext.age) {
      validatedData.userContext.lifePhase = InterpretationValidation.determineLifePhase(validatedData.userContext.age);
    }
    
    // Set default analysis depth if not provided
    if (!validatedData.analysisDepth) {
      validatedData.analysisDepth = 'initial';
    }
    
    // Replace the request body with validated data
    req.body = validatedData;
    
    logger.info('Interpretation request validated successfully', {
      dreamId: validatedData.dreamId,
      interpreterType: validatedData.interpreterType,
      analysisDepth: validatedData.analysisDepth,
      hasUserContext: !!validatedData.userContext,
      hasPreviousDreams: !!validatedData.previousDreams?.length
    });
    
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
        received: 'received' in err ? err.received : undefined
      }));
      
      logger.warn('Interpretation request validation failed', {
        errors: validationErrors,
        requestBody: req.body
      });
      
      res.status(400).json({
        success: false,
        error: 'Request validation failed',
        details: {
          code: 'VALIDATION_ERROR',
          validationErrors
        }
      });
      return;
    }
    
    logger.error('Unexpected validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestBody: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal validation error'
    });
  }
};

// Validate interpretation response before sending
export const validateInterpretationResponse = (response: any): boolean => {
  try {
    InterpretationValidation.validateInterpretationResponse(response);
    return true;
  } catch (error) {
    logger.error('Interpretation response validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      response: response
    });
    return false;
  }
};

// Content length validation for interpretation requests
export const validateInterpretationContentLength = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = req.get('content-length');
  const maxSize = 1024 * 1024; // 1MB limit for interpretation requests
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    logger.warn('Interpretation request too large', {
      contentLength: parseInt(contentLength),
      maxSize,
      userAgent: req.get('user-agent')
    });
    
    res.status(413).json({
      success: false,
      error: 'Request too large',
      details: {
        code: 'CONTENT_TOO_LARGE',
        maxSize: `${maxSize / 1024}KB`,
        received: `${Math.round(parseInt(contentLength) / 1024)}KB`
      }
    });
    return;
  }
  
  next();
};

// Specialized validation for user context
export const validateUserContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (req.body.userContext) {
      const validatedContext = InterpretationValidation.validateUserContext(req.body.userContext);
      req.body.userContext = validatedContext;
      
      // Automatically determine life phase
      if (validatedContext.age) {
        req.body.userContext.lifePhase = InterpretationValidation.determineLifePhase(validatedContext.age);
      }
    }
    
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const contextErrors = error.errors.map(err => ({
        field: `userContext.${err.path.join('.')}`,
        message: err.message
      }));
      
      res.status(400).json({
        success: false,
        error: 'User context validation failed',
        details: {
          code: 'USER_CONTEXT_VALIDATION_ERROR',
          errors: contextErrors
        }
      });
      return;
    }
    
    next(error);
  }
};

// Interpretation type validation
export const validateInterpreterType = (req: Request, res: Response, next: NextFunction): void => {
  const interpreterType = req.body.interpreterType;
  const validTypes = ['jung', 'freud', 'mary', 'astrologist'];
  
  if (!interpreterType || !validTypes.includes(interpreterType)) {
    logger.warn('Invalid interpreter type provided', {
      provided: interpreterType,
      validTypes,
      requestId: req.headers['x-request-id']
    });
    
    res.status(400).json({
      success: false,
      error: 'Invalid interpreter type',
      details: {
        code: 'INVALID_INTERPRETER_TYPE',
        provided: interpreterType,
        validTypes
      }
    });
    return;
  }
  
  next();
};

// Dream content validation
export const validateDreamContent = (req: Request, res: Response, next: NextFunction): void => {
  const { dreamTranscription } = req.body;
  
  if (!dreamTranscription || typeof dreamTranscription !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Dream transcription is required',
      details: {
        code: 'MISSING_DREAM_TRANSCRIPTION'
      }
    });
    return;
  }
  
  const cleanedTranscription = dreamTranscription.trim();
  
  if (cleanedTranscription.length < 10) {
    res.status(400).json({
      success: false,
      error: 'Dream transcription too short',
      details: {
        code: 'DREAM_TOO_SHORT',
        minLength: 10,
        received: cleanedTranscription.length
      }
    });
    return;
  }
  
  if (cleanedTranscription.length > InterpretationValidation.VALIDATION_LIMITS.MAX_DREAM_TRANSCRIPTION_LENGTH) {
    res.status(400).json({
      success: false,
      error: 'Dream transcription too long',
      details: {
        code: 'DREAM_TOO_LONG',
        maxLength: InterpretationValidation.VALIDATION_LIMITS.MAX_DREAM_TRANSCRIPTION_LENGTH,
        received: cleanedTranscription.length
      }
    });
    return;
  }
  
  // Update the body with cleaned transcription
  req.body.dreamTranscription = cleanedTranscription;
  
  next();
};

// Theme extraction request validation
export const validateThemeExtractionRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { dreamTranscription } = req.body;
  
  if (!dreamTranscription || typeof dreamTranscription !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Dream transcription is required for theme extraction',
      details: {
        code: 'MISSING_DREAM_TRANSCRIPTION'
      }
    });
    return;
  }
  
  const cleanedTranscription = dreamTranscription.trim();
  
  if (cleanedTranscription.length < 50) {
    res.status(400).json({
      success: false,
      error: 'Dream transcription too short for meaningful theme extraction',
      details: {
        code: 'DREAM_TOO_SHORT',
        minLength: 50,
        received: cleanedTranscription.length
      }
    });
    return;
  }
  
  req.body.dreamTranscription = cleanedTranscription;
  next();
}; 