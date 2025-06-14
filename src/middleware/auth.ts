import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { supabaseService } from '../services/supabase';
import { logger } from '../utils/logger';

/**
 * Verify API secret from Supabase Edge Functions
 * This middleware ensures requests are coming from authorized Edge Functions
 */
export const verifyApiSecret = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiSecret = req.headers['x-api-secret'] as string;
  
  if (!apiSecret) {
    logger.warn('API secret missing from request', { 
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });
    return res.status(401).json({ 
      error: 'Unauthorized - API secret required' 
    });
  }
  
  if (apiSecret !== config.security.apiSecretKey) {
    logger.warn('Invalid API secret provided', { 
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });
    return res.status(401).json({ 
      error: 'Unauthorized - Invalid API secret' 
    });
  }
  
  logger.debug('API secret verified successfully');
  next();
};

/**
 * Verify Supabase JWT token and attach user to request
 * This middleware validates the user's JWT token passed through from Edge Function
 */
export const verifySupabaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers['x-supabase-token'] as string;
    
    if (!token) {
      logger.warn('Supabase token missing from request', { 
        url: req.url,
        ip: req.ip 
      });
      return res.status(401).json({ 
        error: 'Unauthorized - User token required' 
      });
    }

    // Verify token and get user
    const user = await supabaseService.verifyUserToken(token);
    
    if (!user) {
      logger.warn('Invalid or expired Supabase token', { 
        url: req.url,
        ip: req.ip 
      });
      return res.status(401).json({ 
        error: 'Unauthorized - Invalid or expired token' 
      });
    }
    
    // Attach user to request for downstream middleware/routes
    req.user = user;
    
    logger.debug('Supabase token verified successfully', { 
      userId: user.id,
      email: user.email 
    });
    
    next();
  } catch (error) {
    logger.error('Token verification error', { 
      error,
      url: req.url,
      ip: req.ip 
    });
    
    return res.status(500).json({ 
      error: 'Internal server error during authentication' 
    });
  }
};

/**
 * Combined authentication middleware
 * Verifies both API secret and Supabase token in sequence
 */
export const authenticateRequest = [
  verifyApiSecret,
  verifySupabaseToken
];

/**
 * Optional: Rate limiting bypass for authenticated requests
 * This can be used to provide higher rate limits for verified users
 */
export const attachUserContext = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Add user ID to rate limiting key if user is authenticated
  if (req.user) {
    (req as any).rateLimitKey = `user:${req.user.id}`;
  } else {
    (req as any).rateLimitKey = `ip:${req.ip}`;
  }
  
  next();
}; 