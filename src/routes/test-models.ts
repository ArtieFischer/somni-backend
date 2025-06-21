import { Router, Request, Response } from 'express';
import { openRouterService } from '../services/openrouter';
import { modelConfigService } from '../services/modelConfig';
import { logger } from '../utils/logger';
import { verifyApiSecret } from '../middleware/auth';
import type { InterpreterType } from '../types';

const router = Router();

// Test model configuration and selection
router.post('/test-model-config', verifyApiSecret, async (req: Request, res: Response) => {
  try {
    const { interpreterType, preferredModel } = req.body;

    // Get available models
    const availableModels = await openRouterService.getAvailableModels();
    
    // Get recommended models for each interpreter
    const recommendations = modelConfigService.getRecommendedModels();
    
    // Get best model for specific interpreter type
    const bestModel = interpreterType 
      ? openRouterService.getBestModelForInterpreter(interpreterType as InterpreterType)
      : null;

    // Get model chain for fallback testing
    const modelChain = modelConfigService.getModelChain(preferredModel);

    res.json({
      success: true,
      data: {
        availableModels,
        recommendations,
        bestModelForInterpreter: bestModel ? {
          interpreterType,
          recommendedModel: bestModel,
        } : null,
        fallbackChain: {
          preferredModel: preferredModel || 'default',
          chain: modelChain,
        },
        totalModels: availableModels.length,
      },
    });
  } catch (error) {
    logger.error('Model config test failed', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Test actual model completion with fallbacks
router.post('/test-completion', verifyApiSecret, async (req: Request, res: Response) => {
  try {
    const { 
      message = "Hello! Please respond with 'TEST SUCCESS' to confirm the model is working.",
      interpreterType = 'jung',
      preferredModel,
      dreamId = `test-${Date.now()}`,
    } = req.body;

    const startTime = Date.now();

    // Test completion with model configuration system
    const result = await openRouterService.generateCompletion([
      { role: 'user', content: message }
    ], {
      model: preferredModel,
      interpreterType: interpreterType as InterpreterType,
      dreamId,
      maxTokens: 100,
      temperature: 0.3,
    });

    const duration = Date.now() - startTime;

    // Get cost summary
    const costSummary = openRouterService.getCostSummary();

    res.json({
      success: true,
      data: {
        response: result.content,
        modelUsed: result.model,
        tokenUsage: result.usage,
        duration,
        costSummary: {
          totalCost: costSummary.totalCost,
          totalRequests: costSummary.totalRequests,
          recentEntries: costSummary.recentEntries.slice(-3), // Last 3 entries
        },
      },
    });
  } catch (error) {
    logger.error('Model completion test failed', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Test model fallback behavior
router.post('/test-fallback', verifyApiSecret, async (req: Request, res: Response) => {
  try {
    const { interpreterType = 'jung' } = req.body;

    // Try with an invalid model to trigger fallback
    const invalidModel = 'invalid/model:test';
    
    logger.info('Testing fallback with invalid model', { invalidModel });

    const result = await openRouterService.generateCompletion([
      { role: 'user', content: 'Say "FALLBACK SUCCESS" if you can see this.' }
    ], {
      model: invalidModel, // This should trigger fallback
      interpreterType: interpreterType as InterpreterType,
      dreamId: `fallback-test-${Date.now()}`,
      maxTokens: 50,
      temperature: 0,
    });

    res.json({
      success: true,
      data: {
        message: 'Fallback system working correctly',
        attemptedModel: invalidModel,
        actualModelUsed: result.model,
        response: result.content,
        tokenUsage: result.usage,
      },
    });
  } catch (error) {
    logger.error('Fallback test failed', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get cost summary and model statistics
router.get('/cost-summary', verifyApiSecret, async (_req: Request, res: Response) => {
  try {
    const costSummary = openRouterService.getCostSummary();
    const availableModels = modelConfigService.getAvailableModels();

    res.json({
      success: true,
      data: {
        costSummary,
        modelConfigurations: availableModels.map(model => ({
          id: model.id,
          name: model.name,
          costPerKToken: model.costPerKToken,
          recommended: model.recommended,
          interpreterTypes: model.interpreterTypes,
          maxTokens: model.maxTokens,
        })),
      },
    });
  } catch (error) {
    logger.error('Cost summary failed', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Reset cost tracking (for testing)
router.post('/reset-costs', verifyApiSecret, async (_req: Request, res: Response) => {
  try {
    modelConfigService.resetCostTracking();
    
    res.json({
      success: true,
      message: 'Cost tracking reset successfully',
    });
  } catch (error) {
    logger.error('Cost reset failed', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Test metadata batch generation
router.post('/test/metadata', verifyApiSecret, async (req: Request, res: Response) => {
  try {
    const { transcript, dreamId, model } = req.body;
    
    if (!transcript) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is required'
      });
    }
    
    logger.info('Testing metadata batch generation', { 
      dreamId,
      transcriptLength: transcript.length,
      model: model || 'default'
    });
    
    const result = await openRouterService.generateDreamMetadata(transcript, { 
      dreamId,
      model
    });
    
    // Calculate symbol validation statistics
    const invalidSymbols = result.symbols.filter(s => 
      !result.validatedSymbols.includes(s)
    );
    
    res.json({
      success: true,
      ...result,
      symbolValidation: {
        totalSymbols: result.symbols.length,
        validSymbols: result.validatedSymbols.length,
        invalidSymbols: invalidSymbols.length,
        invalidSymbolsList: invalidSymbols,
        validationRate: result.symbols.length > 0 
          ? `${Math.round((result.validatedSymbols.length / result.symbols.length) * 100)}%`
          : '0%'
      }
    });
  } catch (error) {
    logger.error('Metadata generation test failed', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/models/test/cost-tracking
 * Test cost tracking functionality
 */
router.get('/test/cost-tracking', async (_req: Request, res: Response) => {
  try {
    logger.info('Testing cost tracking functionality');
    
    // Test OpenRouter completion with cost tracking parameters
    const testCompletion = await openRouterService.generateCompletion([
      { role: 'user', content: 'Hello, please respond with "Cost tracking test successful" if you can see this message.' }
    ], {
      maxTokens: 20,
      temperature: 0,
      interpreterType: 'jung',
      dreamId: 'test-cost-tracking-' + Date.now()
    });

    // Get current cost summary
    const costSummary = openRouterService.getCostSummary();
    
    logger.info('Cost tracking test completed', {
      response: testCompletion.content,
      model: testCompletion.model,
      tokenUsage: testCompletion.usage,
      costSummary
    });

    res.json({
      success: true,
      message: 'Cost tracking test completed',
      testResult: {
        model: testCompletion.model,
        response: testCompletion.content,
        tokenUsage: testCompletion.usage
      },
      costSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Cost tracking test failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: 'Cost tracking test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as testModelsRouter }; 