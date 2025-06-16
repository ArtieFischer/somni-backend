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
  
  // Single source of truth for model configuration
  private currentDefaultModel: string = QUICK_MODELS.LLAMA_4; // <-- Change this for easy model switching
  
  private readonly fallbackChain = [
    'meta-llama/llama-4-scout:free',     // Primary model - free Llama 4
    'meta-llama/llama-3.1-8b-instruct:free',  // Second fallback
    'google/gemma-2-9b-it:free'          // Last resort
  ];

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
      currentDefaultModel: this.currentDefaultModel,
      primaryModel: this.availableModels.find(m => m.id === this.currentDefaultModel)?.name || 'Model not found'
    });
  }

  /**
   * Easy model switching - Change the default model at runtime
   * @param modelId - New model ID from QUICK_MODELS or any valid model ID
   */
  setDefaultModel(modelId: string): void {
    const modelConfig = this.getModelConfig(modelId);
    if (!modelConfig) {
      logger.warn(`Model ${modelId} not found in available models. Keeping current default.`);
      return;
    }
    
    this.currentDefaultModel = modelId;
    logger.info(`Default model changed to: ${modelConfig.name} (${modelId})`);
  }

  /**
   * Get the best model for Jung interpreter - prioritize current default
   */
  getBestModelForInterpreter(interpreterType: InterpreterType): string {
    if (interpreterType === 'jung') {
      // Always prefer current default for Jung
      return this.currentDefaultModel;
    }
    
    // Original logic for other interpreters
    const compatibleModels = this.availableModels.filter(model =>
      model.interpreterTypes.includes(interpreterType)
    );

    return compatibleModels[0]?.id || this.currentDefaultModel;
  }

  /**
   * Get model chain ensuring current default is first
   */
  getModelChain(preferredModel?: string): string[] {
    // If specifically requesting current default, ensure it's first
    if (preferredModel?.includes('llama-4')) {
      return [preferredModel, ...this.fallbackChain.filter(m => m !== preferredModel)];
    }
    
    // Otherwise use current default first, then fallback chain
    return [this.currentDefaultModel, ...this.fallbackChain.filter(m => m !== this.currentDefaultModel)];
  }

  /**
   * Get default model - SSOT
   */
  getDefaultModel(): string {
    return this.currentDefaultModel;
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

  /**
   * Quick model switching helpers for easy comparison testing
   */
  
  /**
   * Switch to GPT-4o Mini for comparison
   */
  switchToGPT4oMini(): void {
    this.setDefaultModel(QUICK_MODELS.GPT_4O_MINI);
  }

  /**
   * Switch to Claude Haiku for comparison  
   */
  switchToClaude(): void {
    this.setDefaultModel(QUICK_MODELS.CLAUDE_HAIKU);
  }

  /**
   * Switch back to Llama 4 (default)
   */
  switchToLlama4(): void {
    this.setDefaultModel(QUICK_MODELS.LLAMA_4);
  }

  /**
   * Switch to Llama 3.1 for comparison
   */
  switchToLlama3(): void {
    this.setDefaultModel(QUICK_MODELS.LLAMA_3_1);
  }

  /**
   * Get current model info
   */
  getCurrentModelInfo(): { id: string; name: string; cost: number } {
    const config = this.getModelConfig(this.currentDefaultModel);
    return {
      id: this.currentDefaultModel,
      name: config?.name || 'Unknown Model',
      cost: config?.costPerKToken || 0
    };
  }
}

// Export singleton instance
export const modelConfigService = new ModelConfigService(); 