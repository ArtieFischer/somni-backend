import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../services/supabase';
import { logger } from '../utils/logger';

/**
 * Development auth middleware that accepts service role key for testing
 * WARNING: Only use in development!
 */
export const isAuthenticatedDev = async (
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
    
    // Check if it's the service role key (development only!)
    if (process.env.NODE_ENV === 'development' && 
        token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.warn('Using service role key for authentication - DEV ONLY');
      
      // For service role, we need to get the user from the request body or params
      // This is a hack for testing only!
      const dreamId = req.body.dreamId || req.params.dreamId;
      
      if (dreamId) {
        try {
          // Get the user who owns this dream
          const { data: dream, error: dreamError } = await supabaseService.getServiceClient()
            .from('dreams')
            .select('user_id')
            .eq('id', dreamId)
            .single();
          
          if (dreamError) {
            logger.error('Error fetching dream for auth:', dreamError);
            res.status(404).json({
              success: false,
              error: 'Dream not found'
            });
            return;
          }
          
          if (dream) {
            req.user = { id: dream.user_id } as any;
            next();
            return;
          }
        } catch (error) {
          logger.error('Database error in auth-dev:', error);
          res.status(500).json({
            success: false,
            error: 'Database error during authentication'
          });
          return;
        }
      }
      
      // For endpoints that don't need dreamId, use a default test user
      // This should only be used for testing non-dream-specific endpoints
      req.user = { id: 'test-user-id' } as any;
      logger.warn('Using default test user - DEV ONLY');
      next();
      return;
    }
    
    // Normal JWT auth
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