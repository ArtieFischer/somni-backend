import { JungianPromptBuilder } from './builder';
import type { DreamAnalysisRequest, PromptTemplate } from '../../base';
import { logger } from '../../../utils/logger';
import { RAGService } from '../../../services/rag.service';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../../config';

/**
 * RAG-Enhanced Jungian Prompt Builder
 * Extends the base Jungian builder with RAG (Retrieval-Augmented Generation) capabilities
 */
export class JungianRAGPromptBuilder extends JungianPromptBuilder {
  private ragService: RAGService;
  private lastRetrievedContext: any = null; // Store last retrieved context for test mode
  
  constructor() {
    super();
    // Create a supabase client for RAG service
    const supabase = createClient(config.supabase.url, config.supabase.anonKey);
    this.ragService = new RAGService(supabase);
  }
  
  /**
   * Get the last retrieved RAG context (for test mode)
   */
  getLastRetrievedContext(): any {
    return this.lastRetrievedContext;
  }
  
  /**
   * Build interpreter-specific system prompt
   */
  protected override buildSystemPrompt(_request: DreamAnalysisRequest): string {
    // Jung's system prompt is built as part of buildOutputFormat
    return '';
  }

  /**
   * Override buildPrompt to add RAG context before building the prompt
   * This is a synchronous wrapper that maintains compatibility
   */
  override buildPrompt(request: DreamAnalysisRequest): PromptTemplate {
    // For now, return the base prompt without RAG enhancement
    // In a real implementation, this would need to be async
    logger.warn('RAG enhancement requested but using synchronous buildPrompt - returning base prompt');
    return super.buildPrompt(request);
  }

  /**
   * Async version for future RAG implementation
   */
  async buildPromptAsync(request: DreamAnalysisRequest): Promise<PromptTemplate> {
    try {
      // Retrieve relevant Jung passages
      const ragContext = await this.retrieveJungContext(request.dreamTranscription);
      
      // Build the base prompt using parent class method
      const basePrompt = super.buildPrompt(request);
      
      // For Jung, the main content is in outputFormat, not systemPrompt
      const enhancedOutputFormat = this.enhanceWithRAGContext(basePrompt.outputFormat, ragContext);
      
      return {
        ...basePrompt,
        outputFormat: enhancedOutputFormat,
        variables: {
          ...basePrompt.variables,
          hasRAGContext: ragContext.passages.length > 0
        }
      };
    } catch (error) {
      logger.warn('RAG retrieval failed, falling back to standard Jung prompt', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Fall back to standard Jung prompt if RAG fails
      return super.buildPrompt(request);
    }
  }

  /**
   * Retrieve relevant Jung passages from the knowledge base
   */
  private async retrieveJungContext(dreamContent: string): Promise<{
    passages: Array<{
      content: string;
      source: string;
      relevance: number;
    }>;
    symbols: Record<string, string>;
  }> {
    try {
      // Use the actual RAG service to retrieve relevant context
      const ragContext = await this.ragService.getRelevantContext(
        dreamContent,
        'jung',
        {
          maxResults: 7,  // Retrieve up to 7 passages like before
          similarityThreshold: 0.7,
          includeSymbols: true
        }
      );

      logger.info('Retrieved Jung RAG context', {
        passageCount: ragContext.relevantPassages.length,
        symbolCount: ragContext.symbols.length,
        themesCount: ragContext.themes.length,
        averageRelevance: ragContext.relevantPassages.length > 0 
          ? ragContext.relevantPassages.reduce((sum, p) => sum + p.similarity, 0) / ragContext.relevantPassages.length 
          : 0
      });

      // Transform symbols array into a Record for backward compatibility
      const symbolsRecord: Record<string, string> = {};
      ragContext.symbols.forEach(symbolData => {
        if (symbolData.interpretations.length > 0) {
          // Join multiple interpretations with a semicolon
          symbolsRecord[symbolData.symbol] = symbolData.interpretations.join('; ');
        }
      });

      const result = {
        passages: ragContext.relevantPassages.map(p => ({
          content: p.content,
          source: `${p.source}${p.chapter ? ` - ${p.chapter}` : ''}`,
          relevance: p.similarity
        })),
        symbols: symbolsRecord
      };
      
      // Store for test mode access
      this.lastRetrievedContext = {
        ...result,
        rawPassages: ragContext.relevantPassages,
        rawSymbols: ragContext.symbols,
        themes: ragContext.themes
      };
      
      return result;
    } catch (error) {
      logger.error('Failed to retrieve Jung RAG context', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { passages: [], symbols: {} };
    }
  }

  /**
   * Enhance the prompt with RAG context
   */
  private enhanceWithRAGContext(
    originalPrompt: string, 
    ragContext: {
      passages: Array<{ content: string; source: string; relevance: number }>;
      symbols: Record<string, string>;
    }
  ): string {
    if (ragContext.passages.length === 0) {
      return originalPrompt;
    }

    // Build the RAG context section
    const ragSection = `
RELEVANT KNOWLEDGE FROM JUNG'S WORKS:
${ragContext.passages.map((passage, i) => `
${i + 1}. From "${passage.source}":
   "${passage.content}"
   [Relevance: ${(passage.relevance * 100).toFixed(1)}%]
`).join('\n')}

${Object.keys(ragContext.symbols).length > 0 ? `
JUNGIAN SYMBOL INTERPRETATIONS:
${Object.entries(ragContext.symbols).map(([symbol, interpretation]) => 
  `- ${symbol}: ${interpretation}`
).join('\n')}
` : ''}

IMPORTANT: Integrate these insights naturally into your interpretation. Do not quote directly unless the passage is extraordinarily relevant. Instead, let Jung's documented thoughts inform and deepen your analysis.

================================================================================
`;

    // Insert the RAG context after the personality section but before the output format
    const personalityEndMarker = 'JUNG\'S AUTHENTIC VOICE REQUIREMENTS:';
    const outputFormatMarker = 'CRITICAL ANTI-REPETITION RULES:';
    
    const personalityEnd = originalPrompt.indexOf(personalityEndMarker);
    const outputFormatStart = originalPrompt.indexOf(outputFormatMarker);
    
    if (personalityEnd !== -1 && outputFormatStart !== -1) {
      // Find the end of the personality section
      const insertPosition = originalPrompt.indexOf('\n\n', personalityEnd) + 2;
      
      return (
        originalPrompt.slice(0, insertPosition) +
        ragSection +
        originalPrompt.slice(insertPosition)
      );
    } else {
      // Fallback: prepend to the entire prompt
      return ragSection + '\n' + originalPrompt;
    }
  }
}