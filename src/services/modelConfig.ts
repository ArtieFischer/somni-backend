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

export class ModelConfigService {
  private readonly availableModels: ModelConfig[];
  private costLog: CostEntry[] = [];
  private totalCost = 0;
  
  // Single source of truth for model configuration
  private readonly defaultModel = 'meta-llama/llama-4-scout:free';
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
        maxTokens: 8000,
        temperature: 0.7,
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

    logger.info('Model configuration initialized with Llama 4 as default', {
      defaultModel: this.defaultModel,
      primaryModel: this.availableModels[0]?.name || 'No models available'
    });
  }

  /**
   * Get the best model for Jung interpreter - prioritize Llama 4
   */
  getBestModelForInterpreter(interpreterType: InterpreterType): string {
    if (interpreterType === 'jung') {
      // Always prefer Llama 4 for Jung
      return this.defaultModel;
    }
    
    // Original logic for other interpreters
    const compatibleModels = this.availableModels.filter(model =>
      model.interpreterTypes.includes(interpreterType)
    );

    return compatibleModels[0]?.id || this.defaultModel;
  }

  /**
   * Get model chain ensuring Llama 4 is first
   */
  getModelChain(preferredModel?: string): string[] {
    // If specifically requesting Llama 4, ensure it's first
    if (preferredModel?.includes('llama-4')) {
      return [preferredModel, ...this.fallbackChain.filter(m => m !== preferredModel)];
    }
    
    // Otherwise use our SSOT chain
    return [...this.fallbackChain];
  }

  /**
   * Get default model - SSOT
   */
  getDefaultModel(): string {
    return this.defaultModel;
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