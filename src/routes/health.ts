import { Router, Request, Response } from 'express';
import { elevenLabsService } from '../services/elevenlabs';
import { supabaseService } from '../services/supabase';
import { openRouterService } from '../services/openrouter';
import { config } from '../config';
import { logger } from '../utils/logger';
import { healthCheckRateLimit } from '../middleware/rateLimit';
import { validateHealthCheckQuery } from '../middleware/validation';
import type { HealthResponse } from '../types';

const router = Router();

// Simple health check endpoint
router.get(
  '/',
  healthCheckRateLimit,
  validateHealthCheckQuery,
  async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      const detailed = (req.query as any)?.detailed || false;
      
      const baseResponse: HealthResponse = {
        status: 'operational',
        service: 'somni-backend',
        timestamp: new Date().toISOString(),
        version: process.env['npm_package_version'] || '1.0.0',
        uptime: process.uptime(),
      };

      // Quick health check - just return basic info
      if (!detailed) {
        return res.json(baseResponse);
      }

      // Detailed health check - test external services
      const serviceChecks = await Promise.allSettled([
        elevenLabsService.checkHealth(),
        checkSupabaseHealth(),
        checkOpenRouterHealth(),
      ]);

      const elevenLabsHealth = serviceChecks[0];
      const supabaseHealth = serviceChecks[1];
      const openRouterHealth = serviceChecks[2];

      const serviceStatus = {
        elevenlabs: elevenLabsHealth.status === 'fulfilled' 
          ? elevenLabsHealth.value 
          : { status: 'unhealthy', details: 'Service check failed' },
        supabase: supabaseHealth.status === 'fulfilled' 
          ? supabaseHealth.value 
          : { status: 'unhealthy', details: 'Service check failed' },
        openrouter: openRouterHealth.status === 'fulfilled' 
          ? openRouterHealth.value 
          : { status: 'unhealthy', details: 'Service check failed' },
      };

      // Determine overall status
      const allHealthy = Object.values(serviceStatus).every(
        service => service.status === 'healthy'
      );

      const overallStatus = allHealthy ? 'operational' : 'degraded';
      const responseTime = Date.now() - startTime;

      const detailedResponse: HealthResponse & { services?: any; responseTime?: number } = {
        ...baseResponse,
        status: overallStatus,
        services: serviceStatus,
        responseTime: responseTime,
      };

      logger.info('Health check completed', {
        status: overallStatus,
        responseTime,
        detailed: true,
      });

      return res.json(detailedResponse);
    } catch (error) {
      logger.error('Health check failed', { error });
      
      const errorResponse: HealthResponse = {
        status: 'down',
        service: 'somni-backend',
        timestamp: new Date().toISOString(),
      };

      return res.status(503).json(errorResponse);
    }
  }
);

// Readiness probe endpoint (for Kubernetes/Railway)
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Quick checks for essential services
    const checks = await Promise.allSettled([
      checkEssentialServices(),
    ]);

    const ready = checks.every(check => check.status === 'fulfilled');

    if (ready) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not-ready',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      status: 'not-ready',
      error: 'Service unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});

// Liveness probe endpoint (for Kubernetes/Railway)
router.get('/live', (_req: Request, res: Response) => {
  // Simple liveness check - if the server can respond, it's alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Check Supabase connectivity
 */
async function checkSupabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
  try {
    // Try to make a simple query to verify Supabase connection
    // Note: This uses service role key, so it should work without user context
    await supabaseService.verifyUserToken('dummy-token'); // Will fail gracefully
    
    return { status: 'healthy' };
  } catch (error: any) {
    logger.warn('Supabase health check failed', { error: error.message });
    return { 
      status: 'unhealthy', 
      details: 'Database connection failed' 
    };
  }
}

/**
 * Check OpenRouter connectivity
 */
async function checkOpenRouterHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
  try {
    const isConnected = await openRouterService.testConnection();
    
    if (isConnected) {
      return { status: 'healthy' };
    } else {
      return { 
        status: 'unhealthy', 
        details: 'OpenRouter API test failed' 
      };
    }
  } catch (error: any) {
    logger.warn('OpenRouter health check failed', { error: error.message });
    return { 
      status: 'unhealthy', 
      details: error.message || 'OpenRouter API connection failed' 
    };
  }
}

/**
 * Check essential services for readiness
 */
async function checkEssentialServices(): Promise<boolean> {
  try {
    // Check if we can create ElevenLabs client (basic validation)
    if (!config.elevenLabs.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Check if Supabase is configured
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      throw new Error('Supabase not properly configured');
    }

    // Check if OpenRouter is configured
    if (!config.openRouter.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    return true;
  } catch (error) {
    logger.error('Essential services check failed', { error });
    return false;
  }
}

export { router as healthRouter }; 