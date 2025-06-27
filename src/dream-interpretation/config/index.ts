/**
 * Dream Interpretation & Conversational AI Configuration
 * Centralized configuration management
 */

import { InterpreterType } from '../types';

interface InterpreterConfig {
  enabled: boolean;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

interface RAGConfig {
  maxFragments: number;
  relevanceThreshold: number;
  embeddingModel: string;
  searchRadius: number;
  hybridSearchWeight: number;
}

interface ConversationConfig {
  maxTurns: number;
  contextWindow: number;
  sessionTimeout: number;
  typingDelay: number;
  streamingEnabled: boolean;
}

interface QualityConfig {
  minConfidenceScore: number;
  maxRetries: number;
  validationEnabled: boolean;
  authenticityThreshold: number;
}

interface PerformanceConfig {
  cacheEnabled: boolean;
  cacheTTL: number;
  parallelStages: boolean;
  maxConcurrentInterpretations: number;
  maxConcurrentConversations: number;
}

interface DreamInterpretationConfig {
  interpreters: Record<InterpreterType, InterpreterConfig>;
  rag: RAGConfig;
  conversation: ConversationConfig;
  quality: QualityConfig;
  performance: PerformanceConfig;
  llm: {
    provider: 'openai' | 'anthropic' | 'openrouter' | 'custom';
    primaryModel: string;
    fallbackModel?: string;
    fallbackModel2?: string;
    apiKey?: string;
    baseUrl?: string;
    timeout: number;
    siteUrl?: string;
    siteName?: string;
  };
}

// Default configuration
const defaultConfig: DreamInterpretationConfig = {
  interpreters: {
    jung: {
      enabled: true,
      temperature: 0.7,
      maxTokens: 1500,
      topP: 0.9,
      frequencyPenalty: 0.3,
      presencePenalty: 0.3
    },
    lakshmi: {
      enabled: true,
      temperature: 0.8,
      maxTokens: 1500,
      topP: 0.9,
      frequencyPenalty: 0.2,
      presencePenalty: 0.2
    },
    freud: {
      enabled: false,
      temperature: 0.6,
      maxTokens: 1500,
      topP: 0.9,
      frequencyPenalty: 0.3,
      presencePenalty: 0.3
    },
    mary: {
      enabled: false,
      temperature: 0.5,
      maxTokens: 1200,
      topP: 0.9,
      frequencyPenalty: 0.2,
      presencePenalty: 0.2
    }
  },
  
  rag: {
    maxFragments: 10,
    relevanceThreshold: 0.5,
    embeddingModel: 'bge-m3',
    searchRadius: 0.8,
    hybridSearchWeight: 0.7
  },
  
  conversation: {
    maxTurns: 20,
    contextWindow: 10,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    typingDelay: 500,
    streamingEnabled: false
  },
  
  quality: {
    minConfidenceScore: 0.7,
    maxRetries: 2,
    validationEnabled: true,
    authenticityThreshold: 0.7
  },
  
  performance: {
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour
    parallelStages: false, // MVP: sequential for quality
    maxConcurrentInterpretations: 10,
    maxConcurrentConversations: 100
  },
  
  llm: {
    provider: 'openrouter',
    primaryModel: 'google/gemini-2.5-flash-preview-05-20',
    fallbackModel: 'mistralai/mistral-nemo:free',
    fallbackModel2: 'google/gemini-2.5-flash-preview-05-20',
    baseUrl: 'https://openrouter.ai/api/v1',
    timeout: 60000, // 60 seconds
    siteUrl: 'https://somni.app',
    siteName: 'Somni Dream Interpretation'
  }
};

// Configuration class
export class DreamInterpretationConfiguration {
  private static instance: DreamInterpretationConfiguration;
  private config: DreamInterpretationConfig;
  
  private constructor() {
    this.config = this.loadConfiguration();
  }
  
  static getInstance(): DreamInterpretationConfiguration {
    if (!DreamInterpretationConfiguration.instance) {
      DreamInterpretationConfiguration.instance = new DreamInterpretationConfiguration();
    }
    return DreamInterpretationConfiguration.instance;
  }
  
  /**
   * Load configuration from environment and defaults
   */
  private loadConfiguration(): DreamInterpretationConfig {
    const config = { ...defaultConfig };
    
    // Override with environment variables
    if (process.env.DREAM_INTERPRETATION_CONFIG) {
      try {
        const envConfig = JSON.parse(process.env.DREAM_INTERPRETATION_CONFIG);
        this.mergeConfig(config, envConfig);
      } catch (error) {
        console.error('Failed to parse DREAM_INTERPRETATION_CONFIG:', error);
      }
    }
    
    // Individual environment overrides
    if (process.env.LLM_PROVIDER) {
      config.llm.provider = process.env.LLM_PROVIDER as any;
    }
    
    if (process.env.LLM_PRIMARY_MODEL) {
      config.llm.primaryModel = process.env.LLM_PRIMARY_MODEL;
    }
    
    if (process.env.LLM_FALLBACK_MODEL) {
      config.llm.fallbackModel = process.env.LLM_FALLBACK_MODEL;
    }
    
    if (process.env.LLM_FALLBACK_MODEL2) {
      config.llm.fallbackModel2 = process.env.LLM_FALLBACK_MODEL2;
    }
    
    if (process.env.OPENROUTER_API_KEY) {
      config.llm.apiKey = process.env.OPENROUTER_API_KEY;
    } else if (process.env.LLM_API_KEY) {
      config.llm.apiKey = process.env.LLM_API_KEY;
    }
    
    if (process.env.LLM_BASE_URL) {
      config.llm.baseUrl = process.env.LLM_BASE_URL;
    }
    
    if (process.env.LLM_SITE_URL) {
      config.llm.siteUrl = process.env.LLM_SITE_URL;
    }
    
    if (process.env.LLM_SITE_NAME) {
      config.llm.siteName = process.env.LLM_SITE_NAME;
    }
    
    if (process.env.MAX_CONCURRENT_CONVERSATIONS) {
      config.performance.maxConcurrentConversations = parseInt(process.env.MAX_CONCURRENT_CONVERSATIONS, 10);
    }
    
    if (process.env.CONVERSATION_SESSION_TIMEOUT) {
      config.conversation.sessionTimeout = parseInt(process.env.CONVERSATION_SESSION_TIMEOUT, 10);
    }
    
    if (process.env.ENABLE_STREAMING) {
      config.conversation.streamingEnabled = process.env.ENABLE_STREAMING === 'true';
    }
    
    if (process.env.ENABLE_CACHE) {
      config.performance.cacheEnabled = process.env.ENABLE_CACHE === 'true';
    }
    
    return config;
  }
  
  /**
   * Merge configurations recursively
   */
  private mergeConfig(target: any, source: any): void {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          this.mergeConfig(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  }
  
  /**
   * Get full configuration
   */
  getConfig(): DreamInterpretationConfig {
    return { ...this.config };
  }
  
  /**
   * Get interpreter configuration
   */
  getInterpreterConfig(interpreterType: InterpreterType): InterpreterConfig {
    return { ...this.config.interpreters[interpreterType] };
  }
  
  /**
   * Get RAG configuration
   */
  getRAGConfig(): RAGConfig {
    return { ...this.config.rag };
  }
  
  /**
   * Get conversation configuration
   */
  getConversationConfig(): ConversationConfig {
    return { ...this.config.conversation };
  }
  
  /**
   * Get quality configuration
   */
  getQualityConfig(): QualityConfig {
    return { ...this.config.quality };
  }
  
  /**
   * Get performance configuration
   */
  getPerformanceConfig(): PerformanceConfig {
    return { ...this.config.performance };
  }
  
  /**
   * Get LLM configuration
   */
  getLLMConfig(): DreamInterpretationConfig['llm'] {
    return { ...this.config.llm };
  }
  
  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<DreamInterpretationConfig>): void {
    this.mergeConfig(this.config, updates);
  }
  
  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...defaultConfig };
  }
  
  /**
   * Validate configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate LLM config
    if (!this.config.llm.provider) {
      errors.push('LLM provider is required');
    }
    
    if (!this.config.llm.primaryModel) {
      errors.push('LLM primary model is required');
    }
    
    // Validate interpreter configs
    for (const [interpreter, config] of Object.entries(this.config.interpreters)) {
      if (config.enabled) {
        if (config.temperature < 0 || config.temperature > 1) {
          errors.push(`Invalid temperature for ${interpreter}: must be between 0 and 1`);
        }
        
        if (config.maxTokens < 100) {
          errors.push(`Invalid maxTokens for ${interpreter}: must be at least 100`);
        }
      }
    }
    
    // Validate RAG config
    if (this.config.rag.relevanceThreshold < 0 || this.config.rag.relevanceThreshold > 1) {
      errors.push('RAG relevance threshold must be between 0 and 1');
    }
    
    // Validate conversation config
    if (this.config.conversation.maxTurns < 1) {
      errors.push('Conversation max turns must be at least 1');
    }
    
    if (this.config.conversation.sessionTimeout < 60000) {
      errors.push('Conversation session timeout must be at least 1 minute');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Export configuration as JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }
  
  /**
   * Import configuration from JSON
   */
  importConfig(jsonString: string): void {
    try {
      const imported = JSON.parse(jsonString);
      this.config = { ...defaultConfig };
      this.mergeConfig(this.config, imported);
      
      const validation = this.validateConfig();
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export singleton instance
export const dreamInterpretationConfig = DreamInterpretationConfiguration.getInstance();

// Export types
export type {
  InterpreterConfig,
  RAGConfig,
  ConversationConfig,
  QualityConfig,
  PerformanceConfig,
  DreamInterpretationConfig
};