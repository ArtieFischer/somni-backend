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
): void => {
  const apiSecret = req.headers['x-api-secret'] as string;
  
  if (!apiSecret) {
    logger.warn('API secret missing from request', { 
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });
    res.status(401).json({ 
      error: 'Unauthorized - API secret required' 
    });
    return;
  }
  
  if (apiSecret !== config.security.apiSecretKey) {
    logger.warn('Invalid API secret provided', { 
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });
    res.status(401).json({ 
      error: 'Unauthorized - Invalid API secret' 
    });
    return;
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
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('JWT token missing from request', { 
        url: req.url,
        ip: req.ip 
      });
      res.status(401).json({ 
        error: 'Unauthorized - Bearer token required' 
      });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseService.auth.getUser(token);
    
    if (error || !user) {
      logger.warn('Invalid JWT token', { 
        error,
        url: req.url,
        ip: req.ip 
      });
      res.status(401).json({ 
        error: 'Unauthorized - Invalid token' 
      });
      return;
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
    
    res.status(500).json({ 
      error: 'Internal server error during authentication' 
    });
    return;
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
  _res: Response,
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

/**
 * Simple authentication middleware that only checks for user on request
 * For routes that need authentication but not API secret verification
 */
export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false,
        error: 'Unauthorized - Bearer token required' 
      });
      return;
    }
    
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabaseService.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ 
        success: false,
        error: 'Unauthorized - Invalid token' 
      });
      return;
    }
    
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during authentication' 
    });
  }
};