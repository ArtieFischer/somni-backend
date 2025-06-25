import { Router, Request, Response } from 'express';
import { config } from '../config';
import { supabaseService } from '../services/supabase';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/debug-service-role/test
 * Test service role access
 */
router.get('/test', async (_req: Request, res: Response) => {
  try {
    // Test 1: Check if service role key is configured
    const hasServiceKey = !!config.supabase.serviceRoleKey;
    const keyLength = config.supabase.serviceRoleKey?.length || 0;
    const keyPrefix = config.supabase.serviceRoleKey?.substring(0, 20) || '';

    // Test 2: Try to query embedding_jobs with regular client
    let regularClientError = null;
    try {
      const { error } = await supabaseService.getClient()
        .from('embedding_jobs')
        .select('count(*)', { count: 'exact', head: true });
      
      if (error) regularClientError = error;
    } catch (e) {
      regularClientError = e;
    }

    // Test 3: Try to query embedding_jobs with service client
    let serviceClientError = null;
    let serviceClientData = null;
    try {
      const { data, error, count } = await supabaseService.getServiceClient()
        .from('embedding_jobs')
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        serviceClientError = error;
      } else {
        serviceClientData = { count, sample: data };
      }
    } catch (e) {
      serviceClientError = e;
    }

    // Test 4: Check auth status
    let authUser = null;
    try {
      const { data: { user }, error } = await supabaseService.getServiceClient().auth.getUser();
      if (!error && user) {
        authUser = { id: user.id, role: user.role };
      }
    } catch (e) {
      // Expected to fail with service role
    }

    // Test 5: Direct RLS check
    let rlsStatus = null;
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')
        .eq('tablename', 'embedding_jobs')
        .single();
      
      if (!error && data) {
        rlsStatus = data;
      }
    } catch (e) {
      // Might not have access to system tables
    }

    return res.json({
      serviceKeyConfig: {
        configured: hasServiceKey,
        keyLength,
        keyPrefix: keyPrefix + '...'
      },
      regularClient: {
        error: regularClientError
      },
      serviceClient: {
        error: serviceClientError,
        data: serviceClientData
      },
      authStatus: authUser,
      rlsStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Debug service role test failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return res.status(500).json({
      success: false,
      error: 'Debug test failed'
    });
  }
});

export { router as debugServiceRoleRouter };