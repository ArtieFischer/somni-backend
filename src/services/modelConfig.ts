import { models, costTracking } from '../config';
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

// Per-interpreter configuration
export interface InterpreterModelConfig {
  defaultModel: string;
  fallbackModel: string;
  temperature: number;
  maxTokens: number;
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

// Quick model switching constants - Easy entry point for model comparison
export const QUICK_MODELS = {
  LLAMA_4: 'meta-llama/llama-4-scout:free',
  GPT_4O_MINI: 'openai/gpt-4o-mini', 
  CLAUDE_HAIKU: 'anthropic/claude-3-haiku',
  LLAMA_3_1: 'meta-llama/llama-3.1-8b-instruct:free',
  GEMMA_2: 'google/gemma-2-9b-it:free'
} as const;

export class ModelConfigService {
  private readonly availableModels: ModelConfig[];
  private costLog: CostEntry[] = [];
  private totalCost = 0;
  
  // Single source of truth for interpreter-specific configuration
  private readonly interpreterConfigs: Record<InterpreterType, InterpreterModelConfig> = {
    jung: {
      defaultModel: QUICK_MODELS.LLAMA_4,
      fallbackModel: QUICK_MODELS.LLAMA_3_1,
      temperature: 0.9,  // Higher for more creative Jungian analysis
      maxTokens: 2000
    },
    freud: {
      defaultModel: QUICK_MODELS.LLAMA_4,
      fallbackModel: QUICK_MODELS.GPT_4O_MINI,
      temperature: 0.7,  // Moderate for Freudian analysis
      maxTokens: 1500
    },
    neuroscientist: {
      defaultModel: QUICK_MODELS.LLAMA_4,
      fallbackModel: QUICK_MODELS.GEMMA_2,
      temperature: 0.5,  // Lower for more factual scientific analysis
      maxTokens: 1500
    },
    astrologist: {
      defaultModel: QUICK_MODELS.LLAMA_4,
      fallbackModel: QUICK_MODELS.LLAMA_3_1,
      temperature: 0.8,  // Higher for mystical interpretations
      maxTokens: 1500
    }
  };

  constructor() {
    // Initialize with Llama 4 models first
    this.availableModels = [
      {
        id: 'meta-llama/llama-4-scout:free',
        name: 'Llama 4 Scout (Free)',
        provider: 'openrouter',
        maxTokens: 20000,
        temperature: 0.9,
        costPerKToken: 0,
        recommended: true,
        interpreterTypes: ['jung', 'freud', 'neuroscientist', 'astrologist'],
      },
      {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        name: 'Llama 3.1 8B (Free)',
        provider: 'openrouter',
        maxTokens: 8000,
        temperature: 0.7,
        costPerKToken: 0,
        recommended: true,
        interpreterTypes: ['jung', 'freud', 'neuroscientist', 'astrologist'],
      },
      {
        id: 'google/gemma-2-9b-it:free',
        name: 'Gemma 2 9B (Free)',
        provider: 'openrouter',
        maxTokens: 8000,
        temperature: 0.7,
        costPerKToken: 0,
        recommended: false,
        interpreterTypes: ['neuroscientist', 'astrologist'],
      },
      // Paid models as additional options
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'openrouter',
        maxTokens: 200000,
        temperature: 0.7,
        costPerKToken: 0.25,
        recommended: true,
        interpreterTypes: ['jung', 'freud'],
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openrouter',
        maxTokens: 128000,
        temperature: 0.7,
        costPerKToken: 0.15,
        recommended: true,
        interpreterTypes: ['jung', 'freud', 'neuroscientist'],
      },
    ];

    logger.info('Model configuration initialized', {
      interpreterConfigs: Object.entries(this.interpreterConfigs).map(([type, config]) => ({
        interpreter: type,
        defaultModel: config.defaultModel,
        temperature: config.temperature
      }))
    });
  }

  /**
   * Easy model switching - Change the default model for an interpreter
   * @param interpreterType - The interpreter to update
   * @param modelId - New model ID from QUICK_MODELS or any valid model ID
   */
  setDefaultModel(interpreterType: InterpreterType, modelId: string): void {
    const modelConfig = this.getModelConfig(modelId);
    if (!modelConfig) {
      logger.warn(`Model ${modelId} not found in available models.`);
      return;
    }
    
    this.interpreterConfigs[interpreterType].defaultModel = modelId;
    logger.info(`Default model for ${interpreterType} changed to: ${modelConfig.name} (${modelId})`);
  }

  /**
   * Get the best model for an interpreter type
   */
  getBestModelForInterpreter(interpreterType: InterpreterType): string {
    return this.interpreterConfigs[interpreterType].defaultModel;
  }

  /**
   * Get interpreter-specific configuration
   */
  getInterpreterConfig(interpreterType: InterpreterType): InterpreterModelConfig {
    return this.interpreterConfigs[interpreterType];
  }

  /**
   * Update interpreter configuration
   */
  updateInterpreterConfig(
    interpreterType: InterpreterType, 
    config: Partial<InterpreterModelConfig>
  ): void {
    this.interpreterConfigs[interpreterType] = {
      ...this.interpreterConfigs[interpreterType],
      ...config
    };
    logger.info(`Updated ${interpreterType} configuration`, config);
  }

  /**
   * Get model chain for interpreter with fallback
   */
  getModelChain(preferredModel?: string, interpreterType?: InterpreterType): string[] {
    if (interpreterType) {
      const config = this.interpreterConfigs[interpreterType];
      return [config.defaultModel, config.fallbackModel];
    }
    
    // Generic fallback chain if no interpreter specified
    return [
      preferredModel || QUICK_MODELS.LLAMA_4,
      QUICK_MODELS.LLAMA_3_1,
      QUICK_MODELS.GEMMA_2
    ];
  }

  /**
   * Get default model for interpreter or global default
   */
  getDefaultModel(interpreterType?: InterpreterType): string {
    if (interpreterType) {
      return this.interpreterConfigs[interpreterType].defaultModel;
    }
    return QUICK_MODELS.LLAMA_4; // Global default
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
   * Get model parameters for API call with interpreter-specific defaults
   */
  getModelParameters(
    modelId: string, 
    interpreterType?: InterpreterType,
    overrides: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): {
    model: string;
    maxTokens: number;
    temperature: number;
  } {
    // Get interpreter-specific defaults if available
    const interpreterConfig = interpreterType ? this.interpreterConfigs[interpreterType] : null;
    const modelConfig = this.getModelConfig(modelId);
    
    return {
      model: modelId,
      maxTokens: overrides.maxTokens ?? interpreterConfig?.maxTokens ?? modelConfig?.maxTokens ?? models.maxTokens,
      temperature: overrides.temperature ?? interpreterConfig?.temperature ?? modelConfig?.temperature ?? models.temperature,
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

  /**
   * Quick model switching helpers for easy comparison testing
   */
  
  /**
   * Quick model switching helpers for specific interpreters
   */
  
  /**
   * Switch Jung to GPT-4o Mini for comparison
   */
  switchJungToGPT4oMini(): void {
    this.setDefaultModel('jung', QUICK_MODELS.GPT_4O_MINI);
  }

  /**
   * Switch Jung to Claude Haiku for comparison  
   */
  switchJungToClaude(): void {
    this.setDefaultModel('jung', QUICK_MODELS.CLAUDE_HAIKU);
  }

  /**
   * Switch all interpreters to a specific model
   */
  switchAllToModel(modelId: string): void {
    const types: InterpreterType[] = ['jung', 'freud', 'neuroscientist', 'astrologist'];
    types.forEach(type => this.setDefaultModel(type, modelId));
  }

  /**
   * Get current model info for an interpreter
   */
  getCurrentModelInfo(interpreterType: InterpreterType): { 
    id: string; 
    name: string; 
    cost: number;
    temperature: number;
    maxTokens: number;
  } {
    const interpreterConfig = this.interpreterConfigs[interpreterType];
    const modelConfig = this.getModelConfig(interpreterConfig.defaultModel);
    return {
      id: interpreterConfig.defaultModel,
      name: modelConfig?.name || 'Unknown Model',
      cost: modelConfig?.costPerKToken || 0,
      temperature: interpreterConfig.temperature,
      maxTokens: interpreterConfig.maxTokens
    };
  }
}

// Export singleton instance
export const modelConfigService = new ModelConfigService(); 