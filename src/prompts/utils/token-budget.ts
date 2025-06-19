import { encoding_for_model } from 'tiktoken';
import { logger } from '../../utils/logger';

export interface TokenBudget {
  total: number;
  personality: number;
  rag: number;
  format: number;
  variance: number;
  dream: number;
}

export class TokenBudgetManager {
  private static encoder = encoding_for_model('gpt-4');
  
  /**
   * Default token budgets for different models
   */
  private static readonly MODEL_LIMITS: Record<string, number> = {
    'claude-3-opus': 195000,
    'claude-3-sonnet': 195000,
    'gpt-4-turbo': 120000,
    'gpt-4': 8000,
    'default': 8000
  };
  
  /**
   * Get token count for a string
   */
  static countTokens(text: string): number {
    try {
      return this.encoder.encode(text).length;
    } catch (error) {
      // Fallback to rough estimation if encoding fails
      logger.warn('Token encoding failed, using estimation', { error });
      return Math.ceil(text.length / 4);
    }
  }
  
  /**
   * Create a token budget for a specific model
   */
  static createBudget(modelName: string = 'default'): TokenBudget {
    const totalLimit = this.MODEL_LIMITS[modelName] || this.MODEL_LIMITS['default'] || 8000;
    
    // Reserve some tokens for model output
    const availableForPrompt = Math.floor(totalLimit * 0.6); // 60% for prompt, 40% for response
    
    return {
      total: availableForPrompt,
      personality: 1000,  // Core Freud personality
      rag: 2000,         // RAG context
      format: 800,       // Output format instructions
      variance: 400,     // Randomization elements
      dream: availableForPrompt - 4200  // Remaining for dream content
    };
  }
  
  /**
   * Trim content to fit within token budget
   */
  static trimToFit(content: string, maxTokens: number): string {
    const currentTokens = this.countTokens(content);
    
    if (currentTokens <= maxTokens) {
      return content;
    }
    
    // Binary search for the right length
    let low = 0;
    let high = content.length;
    let result = '';
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = content.substring(0, mid);
      const tokenCount = this.countTokens(candidate);
      
      if (tokenCount <= maxTokens) {
        result = candidate;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    // Add ellipsis if we trimmed
    if (result.length < content.length) {
      result += '...';
    }
    
    return result;
  }
  
  /**
   * Prioritize and trim RAG passages to fit budget
   */
  static trimRAGPassages(
    passages: Array<{ content: string; relevance: number; [key: string]: any }>,
    maxTokens: number
  ): Array<{ content: string; relevance: number; [key: string]: any }> {
    // Sort by relevance
    const sorted = [...passages].sort((a, b) => b.relevance - a.relevance);
    
    const result = [];
    let totalTokens = 0;
    
    for (const passage of sorted) {
      const passageTokens = this.countTokens(passage.content);
      
      if (totalTokens + passageTokens <= maxTokens) {
        result.push(passage);
        totalTokens += passageTokens;
      } else {
        // Try to fit a trimmed version
        const remainingBudget = maxTokens - totalTokens;
        if (remainingBudget > 100) { // Only include if we can fit meaningful content
          const trimmedContent = this.trimToFit(passage.content, remainingBudget - 50); // Reserve some tokens
          if (trimmedContent.length > 50) {
            result.push({ ...passage, content: trimmedContent });
            break;
          }
        }
      }
    }
    
    return result;
  }
  
  /**
   * Log token usage for monitoring
   */
  static logUsage(
    section: string,
    content: string,
    budget: number
  ): void {
    const tokens = this.countTokens(content);
    const percentage = (tokens / budget * 100).toFixed(1);
    
    logger.info(`Token usage for ${section}`, {
      tokens,
      budget,
      percentage: `${percentage}%`,
      overBudget: tokens > budget
    });
  }
}