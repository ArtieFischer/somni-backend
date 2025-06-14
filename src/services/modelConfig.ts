import { openRouter, models, costTracking } from '../config';
import { logger } from '../utils/logger';
import type { InterpreterType, TokenUsage } from '../types';

// Model configuration interface
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openrouter';
  maxTokens: number;
  temperature: number;
  costPerKToken?: number; // USD per 1000 tokens
  recommended: boolean;
  interpreterTypes: InterpreterType[];
}

// Cost tracking interface
export interface CostEntry {
  timestamp: string;
  model: string;
  tokenUsage: TokenUsage;
  estimatedCost: number;
  interpreterType: InterpreterType;
  dreamId: string;
}

export class ModelConfigService {
  private readonly availableModels: ModelConfig[];
  private costLog: CostEntry[] = [];
  private totalCost = 0;

  constructor() {
    // Initialize available models with their configurations
    this.availableModels = [
      {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        name: 'Llama 3.1 8B (Free)',
        provider: 'openrouter',
        maxTokens: 8000,
        temperature: 0.7,
        costPerKToken: 0, // Free model
        recommended: true,
        interpreterTypes: ['jung', 'freud', 'neuroscientist', 'astrologist'],
      },
      {
        id: 'meta-llama/llama-3.1-70b-instruct:free',
        name: 'Llama 3.1 70B (Free)',
        provider: 'openrouter',
        maxTokens: 8000,
        temperature: 0.7,
        costPerKToken: 0, // Free model
        recommended: true,
        interpreterTypes: ['jung', 'freud', 'neuroscientist', 'astrologist'],
      },
      {
        id: 'google/gemma-2-9b-it:free',
        name: 'Gemma 2 9B (Free)',
        provider: 'openrouter',
        maxTokens: 8000,
        temperature: 0.7,
        costPerKToken: 0, // Free model
        recommended: false,
        interpreterTypes: ['neuroscientist', 'astrologist'],
      },
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'openrouter',
        maxTokens: 200000,
        temperature: 0.7,
        costPerKToken: 0.25, // Estimated cost
        recommended: true,
        interpreterTypes: ['jung', 'freud'],
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openrouter',
        maxTokens: 128000,
        temperature: 0.7,
        costPerKToken: 0.15, // Estimated cost
        recommended: true,
        interpreterTypes: ['jung', 'freud', 'neuroscientist'],
      },
    ];

    logger.info('Model configuration service initialized', {
      availableModels: this.availableModels.length,
      defaultModel: openRouter.defaultModel,
      fallbackModels: openRouter.fallbackModels,
      costTrackingEnabled: costTracking.enabled,
    });
  }

  /**
   * Get the best model for a specific interpreter type
   */
  getBestModelForInterpreter(interpreterType: InterpreterType): string {
    // Find models that support this interpreter type
    const compatibleModels = this.availableModels.filter(model =>
      model.interpreterTypes.includes(interpreterType)
    );

    if (compatibleModels.length === 0) {
      logger.warn('No compatible models found for interpreter', { interpreterType });
      return openRouter.defaultModel;
    }

    // Prioritize free models, then recommended models
    const bestModel = compatibleModels.find(model => 
      model.costPerKToken === 0 && model.recommended
    ) || compatibleModels.find(model => 
      model.recommended
    ) || compatibleModels[0];

    if (!bestModel) {
      logger.warn('No best model found, using default', { interpreterType });
      return openRouter.defaultModel;
    }

    logger.debug('Selected model for interpreter', {
      interpreterType,
      selectedModel: bestModel.id,
      modelName: bestModel.name,
    });

    return bestModel.id;
  }

  /**
   * Get model configuration with fallback chain
   */
  getModelChain(preferredModel?: string): string[] {
    const chain: string[] = [];

    // 1. Use preferred model if specified and available
    if (preferredModel && this.isModelAvailable(preferredModel)) {
      chain.push(preferredModel);
    }

    // 2. Use default model if not already in chain
    if (!chain.includes(openRouter.defaultModel)) {
      chain.push(openRouter.defaultModel);
    }

    // 3. Add fallback models
    openRouter.fallbackModels.forEach(model => {
      if (!chain.includes(model) && this.isModelAvailable(model)) {
        chain.push(model);
      }
    });

    // 4. Ensure we have at least one free model as final fallback
    const freeModel = this.availableModels.find(m => m.costPerKToken === 0);
    if (freeModel && !chain.includes(freeModel.id)) {
      chain.push(freeModel.id);
    }

    logger.debug('Generated model chain', { preferredModel, chain });
    return chain;
  }

  /**
   * Get model configuration by ID
   */
  getModelConfig(modelId: string): ModelConfig | undefined {
    return this.availableModels.find(model => model.id === modelId);
  }

  /**
   * Check if a model is available and supported
   */
  isModelAvailable(modelId: string): boolean {
    return this.availableModels.some(model => model.id === modelId);
  }

  /**
   * Get recommended models for each interpreter type
   */
  getRecommendedModels(): Record<InterpreterType, string[]> {
    const recommendations: Record<InterpreterType, string[]> = {
      jung: [],
      freud: [],
      neuroscientist: [],
      astrologist: [],
    };

    this.availableModels.forEach(model => {
      if (model.recommended) {
        model.interpreterTypes.forEach(type => {
          if (!recommendations[type].includes(model.id)) {
            recommendations[type].push(model.id);
          }
        });
      }
    });

    return recommendations;
  }

  /**
   * Get model parameters for API call
   */
  getModelParameters(modelId: string, overrides: {
    maxTokens?: number;
    temperature?: number;
  } = {}): {
    model: string;
    maxTokens: number;
    temperature: number;
  } {
    const modelConfig = this.getModelConfig(modelId);
    
    return {
      model: modelId,
      maxTokens: overrides.maxTokens ?? modelConfig?.maxTokens ?? models.maxTokens,
      temperature: overrides.temperature ?? modelConfig?.temperature ?? models.temperature,
    };
  }

  /**
   * Track cost for a model usage
   */
  trackCost(
    modelId: string,
    tokenUsage: TokenUsage,
    interpreterType: InterpreterType,
    dreamId: string
  ): void {
    if (!costTracking.enabled) return;

    const modelConfig = this.getModelConfig(modelId);
    const estimatedCost = this.calculateCost(tokenUsage, modelConfig?.costPerKToken ?? 0);

    const costEntry: CostEntry = {
      timestamp: new Date().toISOString(),
      model: modelId,
      tokenUsage,
      estimatedCost,
      interpreterType,
      dreamId,
    };

    this.costLog.push(costEntry);
    this.totalCost += estimatedCost;

    // Check if we've exceeded the cost threshold
    if (this.totalCost >= costTracking.alertThreshold) {
      logger.warn('Cost threshold exceeded', {
        totalCost: this.totalCost,
        threshold: costTracking.alertThreshold,
        recentUsage: estimatedCost,
      });
    }

    logger.info('Cost tracked', {
      model: modelId,
      interpreterType,
      dreamId,
      estimatedCost,
      totalCost: this.totalCost,
      tokenUsage,
    });
  }

  /**
   * Calculate estimated cost based on token usage
   */
  private calculateCost(tokenUsage: TokenUsage, costPerKToken: number): number {
    if (costPerKToken === 0) return 0;
    return (tokenUsage.totalTokens / 1000) * costPerKToken;
  }

  /**
   * Get cost summary
   */
  getCostSummary(): {
    totalCost: number;
    totalRequests: number;
    totalTokens: number;
    costByModel: Record<string, number>;
    costByInterpreter: Record<InterpreterType, number>;
    recentEntries: CostEntry[];
  } {
    const costByModel: Record<string, number> = {};
    const costByInterpreter: Record<InterpreterType, number> = {
      jung: 0,
      freud: 0,
      neuroscientist: 0,
      astrologist: 0,
    };
    let totalTokens = 0;

    this.costLog.forEach(entry => {
      costByModel[entry.model] = (costByModel[entry.model] || 0) + entry.estimatedCost;
      costByInterpreter[entry.interpreterType] = (costByInterpreter[entry.interpreterType] || 0) + entry.estimatedCost;
      totalTokens += entry.tokenUsage.totalTokens;
    });

    return {
      totalCost: this.totalCost,
      totalRequests: this.costLog.length,
      totalTokens,
      costByModel,
      costByInterpreter,
      recentEntries: this.costLog.slice(-10), // Last 10 entries
    };
  }

  /**
   * Reset cost tracking (for testing or monthly resets)
   */
  resetCostTracking(): void {
    this.costLog = [];
    this.totalCost = 0;
    logger.info('Cost tracking reset');
  }

  /**
   * Get all available models
   */
  getAvailableModels(): ModelConfig[] {
    return [...this.availableModels];
  }
}

// Export singleton instance
export const modelConfigService = new ModelConfigService(); 