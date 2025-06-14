import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Rate limiting configuration for transcription endpoints
 */
export const transcriptionRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes by default
  max: config.rateLimit.maxRequests, // 100 requests per window by default
  
  // Custom key generator to support user-based rate limiting
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise fall back to IP
    const rateLimitKey = (req as any).rateLimitKey || `ip:${req.ip}`;
    return rateLimitKey;
  },
  
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      url: req.url,
      userAgent: req.get('User-Agent'),
    });
    
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000), // seconds
    });
  },
  
  // Skip rate limiting in development if needed
  skip: (req: Request) => {
    return config.isDevelopment && req.get('X-Skip-Rate-Limit') === 'true';
  },
  
  // Standardized headers
  standardHeaders: true,
  legacyHeaders: false,
  
  // Custom message
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});

/**
 * More lenient rate limiting for health check endpoints
 */
export const healthCheckRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  },
  
  handler: (req: Request, res: Response) => {
    logger.warn('Health check rate limit exceeded', {
      ip: req.ip,
      url: req.url,
    });
    
    res.status(429).json({
      error: 'Too many health check requests',
    });
  },
  
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiting for other endpoints
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window (more generous)
  
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  },
  
  handler: (req: Request, res: Response) => {
    logger.warn('General rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
    });
    
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
    });
  },
  
  standardHeaders: true,
  legacyHeaders: false,
}); 