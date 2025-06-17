import { FreudianPromptBuilder } from './builder';
import type { DreamAnalysisRequest, PromptTemplate } from '../../base';
import { logger } from '../../../utils/logger';
import { RAGService, type RAGOptions } from '../../../services/rag.service';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../../config';

/**
 * RAG-Enhanced Freudian Prompt Builder
 * Extends the base Freudian builder with intelligent RAG filtering and metadata-based retrieval
 */
export class FreudianRAGPromptBuilder extends FreudianPromptBuilder {
  private ragService: RAGService;
  private lastRetrievedContext: any = null;
  private recentChunkIds = new Set<string | number>(); // For anti-repetition
  
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
    // Freud's system prompt is built as part of buildOutputFormat
    return '';
  }

  /**
   * Override buildPrompt to add RAG context before building the prompt
   * This is a synchronous wrapper that maintains compatibility
   */
  override buildPrompt(request: DreamAnalysisRequest): PromptTemplate {
    // For now, return the base prompt without RAG enhancement
    logger.warn('RAG enhancement requested but using synchronous buildPrompt - returning base prompt');
    return super.buildPrompt(request);
  }

  /**
   * Async version with intelligent Freudian filtering
   */
  async buildPromptAsync(request: DreamAnalysisRequest): Promise<PromptTemplate> {
    try {
      // Retrieve relevant Freud passages with intelligent filtering
      const ragContext = await this.retrieveFreudContext(request);
      
      // Build the base prompt using parent class method
      const basePrompt = super.buildPrompt(request);
      
      // For Freud, the main content is in outputFormat, not systemPrompt
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
      logger.warn('RAG retrieval failed, falling back to standard Freud prompt', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Fall back to standard Freud prompt if RAG fails
      return super.buildPrompt(request);
    }
  }

  /**
   * Intelligently determine filtering and boosting based on dream content
   */
  private analyzeFreudianThemes(dreamContent: string, userContext?: any): {
    filter: Record<string, any>;
    boost: Record<string, string[]>;
    maxResults: number;
  } {
    const situation = userContext?.currentLifeSituation?.toLowerCase() || '';
    const emotions = userContext?.emotionalState?.toLowerCase() || '';
    
    // Default to dream topic
    let filter: Record<string, any> = { topic: 'dream' };
    let boost: Record<string, string[]> = {};
    let maxResults = 8;
    
    // Trauma/repetition patterns - expand to metapsychology
    if (/trauma|nightmare|repetition|recurring|again and again|death|dying|war|accident/i.test(dreamContent)) {
      filter = { topic: { $in: ['dream', 'metapsych'] } };
      boost = { subtopic: ['trauma', 'repetition', 'death_drive', 'anxiety'] };
      maxResults = 10;
    }
    // Anxiety/defense patterns
    else if (/anxiety|fear|panic|worried|nervous|defense|protect|hide/i.test(dreamContent)) {
      filter = { topic: { $in: ['dream', 'metapsych'] } };
      boost = { subtopic: ['anxiety', 'defence', 'repression'] };
    }
    // Sexual/libidinal themes
    else if (/sexual|erotic|naked|desire|attraction|intimate|bed|touch/i.test(dreamContent)) {
      filter = { topic: { $in: ['dream', 'metapsych'] } };
      boost = { subtopic: ['libido', 'psychosexual', 'wish'] };
    }
    // Family/oedipal themes
    else if (/mother|father|parent|family|child|brother|sister/i.test(dreamContent)) {
      filter = { topic: { $in: ['dream', 'case'] } };
      boost = { subtopic: ['oedipus', 'family', 'child'] };
      maxResults = 10;
    }
    // Slips/forgetting (ancillary)
    else if (/forget|forgot|slip|mistake|wrong|accident|meant to/i.test(dreamContent)) {
      filter = { topic: { $in: ['dream', 'ancillary'] } };
      boost = { subtopic: ['slip', 'forgetting'] };
    }
    // Symbolism focus
    else if (/symbol|meaning|represent|stands for|disguise/i.test(dreamContent)) {
      filter = { topic: 'dream' };
      boost = { subtopic: ['symbol', 'condensation', 'displacement'] };
    }
    // Authority/cultural themes
    else if (/authority|leader|god|religion|culture|society|rules/i.test(dreamContent)) {
      filter = { topic: { $in: ['dream', 'culture'] } };
      boost = { subtopic: ['authority', 'religion', 'father'] };
    }
    
    // Check user context for additional filtering
    if (situation.includes('relationship') || emotions.includes('love')) {
      boost['subtopic'] = [...(boost['subtopic'] || []), 'libido', 'oedipus'];
    }
    
    logger.info('Freudian theme analysis', {
      dreamLength: dreamContent.length,
      filter,
      boost,
      maxResults
    });
    
    return { filter, boost, maxResults };
  }

  /**
   * Retrieve relevant Freud passages from the knowledge base with intelligent filtering
   */
  private async retrieveFreudContext(request: DreamAnalysisRequest): Promise<{
    passages: Array<{
      content: string;
      source: string;
      relevance: number;
      topic?: string;
      subtopic?: string[];
    }>;
    symbols: Record<string, string>;
  }> {
    try {
      const { filter, boost, maxResults } = this.analyzeFreudianThemes(
        request.dreamTranscription,
        request.userContext
      );
      
      const ragOptions: RAGOptions = {
        maxResults,
        similarityThreshold: 0.65,
        includeSymbols: true,
        where: filter,
        boost
      };
      
      // Use the RAG service with metadata filtering
      const ragContext = await this.ragService.getRelevantContext(
        request.dreamTranscription,
        'freud',
        ragOptions
      );

      // Filter out recently used chunks (anti-repetition)
      const filteredPassages = ragContext.relevantPassages.filter(p => {
        if (p.id && this.recentChunkIds.has(p.id)) {
          logger.info('Filtering out repeated chunk', { id: p.id });
          return false;
        }
        return true;
      });
      
      // If too few passages after filtering, broaden the search
      if (filteredPassages.length < 3 && filter['topic'] !== 'dream') {
        logger.info('Too few passages after filtering, broadening search');
        const fallbackContext = await this.ragService.getRelevantContext(
          request.dreamTranscription,
          'freud',
          {
            ...ragOptions,
            where: { 'topic': { $in: ['dream', 'metapsych'] } }
          }
        );
        
        // Add non-duplicate passages
        fallbackContext.relevantPassages.forEach(p => {
          if (!p.id || !this.recentChunkIds.has(p.id)) {
            filteredPassages.push(p);
          }
        });
      }
      
      // Update recent chunk IDs (keep last 20)
      filteredPassages.forEach(p => {
        if (p.id) {
          this.recentChunkIds.add(p.id);
          if (this.recentChunkIds.size > 20) {
            const firstId = this.recentChunkIds.values().next().value;
            if (firstId) this.recentChunkIds.delete(firstId);
          }
        }
      });

      logger.info('Retrieved Freud RAG context', {
        passageCount: filteredPassages.length,
        symbolCount: ragContext.symbols.length,
        themesCount: ragContext.themes.length,
        averageRelevance: filteredPassages.length > 0 
          ? filteredPassages.reduce((sum, p) => sum + p.similarity, 0) / filteredPassages.length 
          : 0,
        filter,
        boost
      });

      // Transform symbols array into a Record for backward compatibility
      const symbolsRecord: Record<string, string> = {};
      ragContext.symbols.forEach(symbolData => {
        if (symbolData.interpretations.length > 0) {
          symbolsRecord[symbolData.symbol] = symbolData.interpretations.join('; ');
        }
      });

      const result = {
        passages: filteredPassages.map(p => ({
          content: p.content,
          source: `${p.source}${p.chapter ? ` - ${p.chapter}` : ''}`,
          relevance: p.similarity,
          topic: p.metadata?.['topic'],
          subtopic: p.metadata?.['subtopic']
        })),
        symbols: symbolsRecord
      };
      
      // Store for test mode access
      this.lastRetrievedContext = {
        ...result,
        rawPassages: filteredPassages,
        rawSymbols: ragContext.symbols,
        themes: ragContext.themes,
        filter,
        boost
      };
      
      return result;
    } catch (error) {
      logger.error('Failed to retrieve Freud RAG context', {
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
      passages: Array<{ 
        content: string; 
        source: string; 
        relevance: number;
        topic?: string;
        subtopic?: string[];
      }>;
      symbols: Record<string, string>;
    }
  ): string {
    if (ragContext.passages.length === 0) {
      return originalPrompt;
    }

    // Build the RAG context section with Freudian flavor
    const ragSection = `
RELEVANT PSYCHOANALYTIC KNOWLEDGE FROM FREUD'S WORKS:
${ragContext.passages.map((passage, i) => `
${i + 1}. From "${passage.source}"${passage.topic ? ` [${passage.topic}]` : ''}:
   "${passage.content}"
   ${passage.subtopic ? `Topics: ${passage.subtopic.join(', ')}` : ''}
   [Relevance: ${(passage.relevance * 100).toFixed(1)}%]
`).join('\n')}

${Object.keys(ragContext.symbols).length > 0 ? `
PSYCHOANALYTIC SYMBOL INTERPRETATIONS:
${Object.entries(ragContext.symbols).map(([symbol, interpretation]) => 
  `- ${symbol}: ${interpretation}`
).join('\n')}
` : ''}

IMPORTANT: Integrate these psychoanalytic insights naturally into your interpretation. Let Freud's documented theories inform your analysis while maintaining his authentic voice and therapeutic approach. Focus on the specific mechanisms and dynamics revealed in these passages as they apply to THIS patient's dream.

================================================================================
`;

    // Insert the RAG context after the personality section but before the output format
    const personalityEndMarker = 'FREUD\'S AUTHENTIC VOICE REQUIREMENTS:';
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