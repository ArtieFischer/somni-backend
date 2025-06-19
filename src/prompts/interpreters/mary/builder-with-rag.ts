import { MaryPromptBuilder } from './builder';
import type { DreamAnalysisRequest, PromptTemplate } from '../../base';
import { logger } from '../../../utils/logger';
import { RAGService, type RAGOptions } from '../../../services/rag.service';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../../config';

/**
 * RAG-Enhanced Mary (Neuroscientist) Prompt Builder
 * Extends the base Mary builder with intelligent RAG filtering and metadata-based retrieval
 */
export class MaryRAGPromptBuilder extends MaryPromptBuilder {
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
    // Mary's system prompt is built as part of buildOutputFormat
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
   * Async version with intelligent neuroscience filtering
   */
  async buildPromptAsync(request: DreamAnalysisRequest): Promise<PromptTemplate> {
    try {
      // Retrieve relevant neuroscience passages with intelligent filtering
      const ragContext = await this.retrieveNeuroscienceContext(request);
      
      // Build the base prompt using parent class method
      const basePrompt = super.buildPrompt(request);
      
      // For Mary, the main content is in outputFormat, not systemPrompt
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
      logger.warn('RAG retrieval failed, falling back to standard Mary prompt', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Fall back to standard Mary prompt if RAG fails
      return super.buildPrompt(request);
    }
  }

  /**
   * Intelligently determine filtering and boosting based on dream content
   */
  private analyzeNeuroscienceThemes(dreamContent: string, userContext?: any): {
    filter: Record<string, any>;
    boost: Record<string, string[]>;
    maxResults: number;
  } {
    // const situation = userContext?.currentLifeSituation?.toLowerCase() || '';
    // const emotions = userContext?.emotionalState?.toLowerCase() || '';
    
    // Default to Mary's metadata structure
    let filter: Record<string, any> = {};
    let boost: Record<string, string[]> = {};
    let maxResults = 8;
    
    // Memory and learning patterns
    if (/memory|remember|forget|learning|study|exam|school/i.test(dreamContent)) {
      boost = { subtopic: ['memory', 'consolidation', 'hippocampus', 'learning'] };
      maxResults = 10;
    }
    
    // Emotional processing
    else if (/fear|anxiety|stress|trauma|nightmare|threat/i.test(dreamContent)) {
      boost = { subtopic: ['emotion', 'amygdala', 'threat', 'stress', 'cortisol'] };
      maxResults = 10;
    }
    
    // Sleep disorders or quality
    else if (/insomnia|tired|exhausted|can't sleep|wake up/i.test(dreamContent) ||
             userContext?.currentLifeSituation?.includes('sleep') === true) {
      boost = { subtopic: ['sleep_disorders', 'circadian', 'sleep_quality', 'insomnia'] };
      maxResults = 10;
    }
    
    // Lucid or vivid dreams
    else if (/lucid|vivid|aware|control|flying|realized.*dreaming/i.test(dreamContent)) {
      boost = { subtopic: ['lucid', 'consciousness', 'awareness', 'control'] };
      maxResults = 8;
    }
    
    // Creativity and problem-solving
    else if (/creative|solve|solution|idea|invention|discovery/i.test(dreamContent)) {
      boost = { subtopic: ['creativity', 'problem_solving', 'insight', 'innovation'] };
      maxResults = 8;
    }
    
    // Default to general dream neuroscience
    else {
      boost = { subtopic: ['rem', 'neural_activity', 'brain_networks', 'dream_generation'] };
      maxResults = 6;
    }
    
    logger.info('Mary theme analysis', {
      themes: boost['subtopic'] || [],
      dreamLength: dreamContent.length,
      hasUserContext: !!userContext
    });
    
    return { filter, boost, maxResults };
  }

  /**
   * Retrieve relevant neuroscience context from vectorDB
   */
  private async retrieveNeuroscienceContext(request: DreamAnalysisRequest): Promise<{
    passages: any[];
    metadata: any;
  }> {
    const { dreamTranscription: dreamContent, userContext } = request;
    
    // Analyze themes for intelligent filtering
    const { filter, boost, maxResults } = this.analyzeNeuroscienceThemes(dreamContent, userContext);
    
    // Build options for RAG retrieval
    const options: RAGOptions = {
      similarityThreshold: 0.65, // Slightly lower for scientific content
      maxResults
      // Temporarily disabled metadata filtering to fix function overload issue
      // where: filter,
      // boost
    };
    
    logger.info('Retrieving neuroscience context', {
      filter,
      boost,
      maxResults,
      excludedCount: this.recentChunkIds.size
    });
    
    // Search for relevant passages
    const results = await this.ragService.getRelevantContext(
      this.buildSearchQuery(dreamContent, userContext),
      'mary',
      options
    );
    
    // Track retrieved chunks to avoid repetition
    results.relevantPassages.forEach((r: any) => {
      if (r.id) this.recentChunkIds.add(r.id);
    });
    
    // Keep recent chunk list manageable
    if (this.recentChunkIds.size > 50) {
      const idsArray = Array.from(this.recentChunkIds);
      this.recentChunkIds = new Set(idsArray.slice(-30));
    }
    
    this.lastRetrievedContext = {
      passages: results.relevantPassages,
      metadata: { filter, boost, resultCount: results.relevantPassages.length }
    };
    
    return this.lastRetrievedContext;
  }

  /**
   * Build search query optimized for neuroscience content
   */
  private buildSearchQuery(dreamContent: string, userContext?: any): string {
    const elements = [dreamContent];
    
    // Add relevant context for better matching
    if (userContext?.emotionalState) {
      elements.push(`emotional state: ${userContext.emotionalState}`);
    }
    
    if (userContext?.sleepQuality) {
      elements.push(`sleep quality: ${userContext.sleepQuality}`);
    }
    
    // Extract key themes for neuroscience relevance
    const themes = [];
    if (/memory|remember|forget/i.test(dreamContent)) themes.push('memory consolidation');
    if (/fear|anxiety|threat/i.test(dreamContent)) themes.push('emotional processing');
    if (/creative|solve|idea/i.test(dreamContent)) themes.push('creative problem solving');
    if (/lucid|aware|control/i.test(dreamContent)) themes.push('conscious awareness');
    
    if (themes.length > 0) {
      elements.push(`neuroscience themes: ${themes.join(', ')}`);
    }
    
    return elements.join(' ');
  }

  /**
   * Enhance the output format with RAG context
   */
  private enhanceWithRAGContext(baseFormat: string, ragContext: any): string {
    if (!ragContext.passages || ragContext.passages.length === 0) {
      return baseFormat;
    }
    
    // Format the retrieved passages
    const formattedPassages = ragContext.passages.map((p: any, idx: number) => {
      const source = p.source || p.metadata?.source || 'neuroscience text';
      const chapter = p.chapter || p.metadata?.chapter || '';
      return `[${idx + 1}] From "${source}"${chapter ? `, ${chapter}` : ''}:\n"${p.content}"`;
    }).join('\n\n');
    
    // Insert RAG context into the prompt
    const ragSection = `
RELEVANT NEUROSCIENCE RESEARCH:
The following passages from neuroscience literature may inform your interpretation:

${formattedPassages}

IMPORTANT: Integrate these scientific insights naturally into your interpretation. Do not simply quote or paraphrase - use them to deepen your understanding and provide evidence-based insights while maintaining your warm, accessible style.
`;
    
    // Insert after the main instructions but before the requirements
    const insertPoint = baseFormat.indexOf('CRITICAL REQUIREMENTS:');
    if (insertPoint > -1) {
      return baseFormat.slice(0, insertPoint) + ragSection + '\n' + baseFormat.slice(insertPoint);
    }
    
    // Fallback: append at the end
    return baseFormat + '\n\n' + ragSection;
  }
}