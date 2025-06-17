import { SupabaseClient } from '@supabase/supabase-js';
import { embeddingsService } from './embeddings.service';
import { logger } from '../utils/logger';

export interface RetrievedKnowledge {
  content: string;
  source: string;
  chapter?: string;
  contentType: string;
  similarity: number;
  metadata?: Record<string, any>;
  id?: string | number;
}

export interface RAGContext {
  relevantPassages: RetrievedKnowledge[];
  symbols: Array<{
    symbol: string;
    interpretations: string[];
  }>;
  themes: string[];
}

export interface RAGOptions {
  maxResults?: number;
  similarityThreshold?: number;
  includeSymbols?: boolean;
  where?: Record<string, any>;
  boost?: Record<string, string[]>;
}

export class RAGService {
  constructor(private supabase: SupabaseClient) {}

  async getRelevantContext(
    dreamContent: string,
    interpreterType: string = 'jung',
    options?: RAGOptions
  ): Promise<RAGContext> {
    try {
      const { 
        maxResults = 5, 
        similarityThreshold = 0.7,
        includeSymbols = true,
        where,
        boost
      } = options || {};

      logger.info('RAG: Starting context retrieval', {
        interpreterType,
        dreamLength: dreamContent.length,
        maxResults,
        similarityThreshold,
        includeSymbols,
        hasMetadataFilter: !!where,
        hasBoostConfig: !!boost
      });

      // Generate embedding for the dream
      const dreamEmbedding = await embeddingsService.generateEmbedding(dreamContent);

      // For now, use client-side filtering until we fix the enhanced search function
      // Get more results than needed and filter client-side
      const searchLimit = where ? maxResults * 3 : maxResults;
      
      // Use basic search
      const { data: passages, error } = await this.supabase.rpc('search_knowledge', {
        query_embedding: dreamEmbedding,
        target_interpreter: interpreterType,
        similarity_threshold: similarityThreshold,
        max_results: searchLimit
      });

      if (error) {
        logger.error('Error searching knowledge base:', error);
        throw error;
      }
      
      // Apply client-side filtering if metadata filter is provided
      let filteredPassages: RetrievedKnowledge[] = passages || [];
      
      if (where && filteredPassages.length > 0) {
        filteredPassages = filteredPassages.filter((p: RetrievedKnowledge) => {
          if (!p.metadata) return false;
          
          // Check if metadata matches the where clause
          for (const [key, value] of Object.entries(where)) {
            if (key === 'topic' && typeof value === 'string') {
              if (p.metadata[key] !== value) return false;
            } else if (key === 'topic' && value && typeof value === 'object' && '$in' in value) {
              // Handle $in operator for topic
              const allowedTopics = value.$in as string[];
              if (!allowedTopics.includes(p.metadata[key])) return false;
            }
          }
          return true;
        });
        
        logger.info(`RAG: Filtered from ${passages?.length || 0} to ${filteredPassages.length} passages using metadata filter`);
      }
      
      // Apply boosting if specified
      if (boost && filteredPassages.length > 0) {
        filteredPassages = filteredPassages.map((p: RetrievedKnowledge) => {
          let boostedSimilarity = p.similarity;
          
          // Check subtopic boost
          if (boost['subtopic'] && p.metadata?.['subtopic'] && Array.isArray(p.metadata['subtopic'])) {
            const hasBoostSubtopic = boost['subtopic'].some((st: string) => 
              (p.metadata?.['subtopic'] as string[]).includes(st)
            );
            if (hasBoostSubtopic) {
              boostedSimilarity += 0.08;
            }
          }
          
          return { ...p, similarity: boostedSimilarity };
        }).sort((a: RetrievedKnowledge, b: RetrievedKnowledge) => b.similarity - a.similarity);
      }
      
      // Limit to requested number of results
      filteredPassages = filteredPassages.slice(0, maxResults);
      
      logger.info(`RAG: Found ${filteredPassages.length} passages above ${similarityThreshold} threshold after filtering`);

      // Extract symbols and themes if requested
      let symbols: Array<{symbol: string; interpretations: string[]}> = [];
      let themes: string[] = [];

      if (includeSymbols && filteredPassages && filteredPassages.length > 0) {
        logger.info('RAG: Extracting symbols and themes from passages');
        const symbolData = await this.extractSymbolsAndThemes(dreamContent, filteredPassages);
        symbols = symbolData.symbols;
        themes = symbolData.themes;
        
        if (symbols.length > 0) {
          logger.info(`RAG: Extracted ${symbols.length} symbols with interpretations`);
        }
        if (themes.length > 0) {
          logger.info(`RAG: Identified ${themes.length} themes:`, themes);
        }
      }

      return {
        relevantPassages: filteredPassages || [],
        symbols,
        themes
      };
    } catch (error) {
      logger.error('RAG service error:', error);
      throw new Error('Failed to retrieve relevant context');
    }
  }

  private async extractSymbolsAndThemes(
    dreamContent: string,
    passages: RetrievedKnowledge[]
  ): Promise<{ symbols: Array<{symbol: string; interpretations: string[]}>; themes: string[] }> {
    // Extract potential symbols from dream using a more sophisticated approach
    
    // Expanded list of Jungian symbols with variations
    const symbolPatterns = [
      // Elements
      { pattern: /\b(water|ocean|sea|lake|river|rain|flood)\b/gi, symbol: 'water' },
      { pattern: /\b(fire|flame|burning|blaze|heat)\b/gi, symbol: 'fire' },
      { pattern: /\b(earth|ground|soil|land)\b/gi, symbol: 'earth' },
      { pattern: /\b(air|wind|breeze|sky)\b/gi, symbol: 'air' },
      { pattern: /\b(light|glow|bright|illuminat|dark|shadow)\b/gi, symbol: 'light/shadow' },
      
      // Animals
      { pattern: /\b(snake|serpent|python)\b/gi, symbol: 'serpent' },
      { pattern: /\b(animal|creature|beast)\b/gi, symbol: 'animal' },
      { pattern: /\b(bird|fly|flying|wings)\b/gi, symbol: 'flying' },
      { pattern: /\b(cat|dog|wolf|lion|bear)\b/gi, symbol: 'animal-guide' },
      
      // People
      { pattern: /\b(mother|mom|maternal)\b/gi, symbol: 'mother' },
      { pattern: /\b(father|dad|paternal)\b/gi, symbol: 'father' },
      { pattern: /\b(child|baby|infant|youth)\b/gi, symbol: 'child' },
      { pattern: /\b(old|elder|wise|sage|ancient)\b/gi, symbol: 'wise-old' },
      { pattern: /\b(shadow|dark figure|stranger)\b/gi, symbol: 'shadow' },
      
      // Places
      { pattern: /\b(house|home|building|room)\b/gi, symbol: 'house' },
      { pattern: /\b(door|entrance|portal|gate)\b/gi, symbol: 'door' },
      { pattern: /\b(window|opening|view)\b/gi, symbol: 'window' },
      { pattern: /\b(library|books|knowledge|wisdom)\b/gi, symbol: 'library' },
      { pattern: /\b(labyrinth|maze|path|journey)\b/gi, symbol: 'labyrinth' },
      { pattern: /\b(forest|woods|tree|nature)\b/gi, symbol: 'forest' },
      
      // Actions/States
      { pattern: /\b(transform|change|morph|become)\b/gi, symbol: 'transformation' },
      { pattern: /\b(death|dying|dead|end)\b/gi, symbol: 'death' },
      { pattern: /\b(birth|born|new|begin)\b/gi, symbol: 'birth' },
      { pattern: /\b(fall|falling|drop|descend)\b/gi, symbol: 'falling' },
      { pattern: /\b(run|running|chase|escape)\b/gi, symbol: 'running' },
      
      // Jungian specific
      { pattern: /\b(self|Self|individuation)\b/gi, symbol: 'Self' },
      { pattern: /\b(anima|animus|feminine|masculine)\b/gi, symbol: 'anima/animus' },
      { pattern: /\b(mandala|circle|center|whole)\b/gi, symbol: 'mandala' },
      { pattern: /\b(symbol|archetype|collective)\b/gi, symbol: 'archetype' }
    ];
    
    // Find symbols in the dream
    const foundSymbols = new Set<string>();
    for (const { pattern, symbol } of symbolPatterns) {
      if (pattern.test(dreamContent)) {
        foundSymbols.add(symbol);
      }
    }

    // Extract interpretations from passages
    const symbolInterpretations = new Map<string, Set<string>>();
    const themes = new Set<string>();

    // Convert foundSymbols Set to array for iteration
    const symbolsArray = Array.from(foundSymbols);
    
    logger.info(`RAG: Found ${symbolsArray.length} symbols in dream:`, symbolsArray);

    for (const passage of passages) {
      // Look for symbol mentions in passages
      for (const symbol of symbolsArray) {
        // Check if the symbol or related terms appear in the passage
        const symbolVariations = this.getSymbolVariations(symbol);
        const passageLower = passage.content.toLowerCase();
        
        if (symbolVariations.some(variation => passageLower.includes(variation))) {
          if (!symbolInterpretations.has(symbol)) {
            symbolInterpretations.set(symbol, new Set());
          }
          
          // Extract sentences containing the symbol
          const sentences = passage.content.split(/[.!?]+/);
          const relevantSentences = sentences.filter(s => {
            const sLower = s.toLowerCase();
            return symbolVariations.some(variation => sLower.includes(variation));
          }).slice(0, 2); // Max 2 sentences per passage
          
          relevantSentences.forEach(s => {
            const trimmed = s.trim();
            if (trimmed.length > 20) { // Only add meaningful sentences
              symbolInterpretations.get(symbol)?.add(trimmed);
            }
          });
        }
      }

      // Extract themes based on content type and keywords
      if (passage.contentType === 'theory') {
        const themeKeywords = ['individuation', 'archetype', 'shadow', 'anima', 'animus', 'self'];
        themeKeywords.forEach(keyword => {
          if (passage.content.toLowerCase().includes(keyword)) {
            themes.add(keyword);
          }
        });
      }
    }

    return {
      symbols: Array.from(symbolInterpretations.entries()).map(([symbol, interps]) => ({
        symbol,
        interpretations: Array.from(interps)
      })),
      themes: Array.from(themes)
    };
  }

  private getSymbolVariations(symbol: string): string[] {
    // Map symbols to their variations for better matching
    const variations: Record<string, string[]> = {
      'water': ['water', 'ocean', 'sea', 'lake', 'river', 'rain', 'flood', 'wave', 'stream'],
      'fire': ['fire', 'flame', 'burning', 'blaze', 'heat', 'ember', 'inferno'],
      'serpent': ['snake', 'serpent', 'python', 'viper', 'cobra'],
      'shadow': ['shadow', 'dark', 'darkness', 'shade', 'obscure'],
      'light/shadow': ['light', 'shadow', 'bright', 'dark', 'illuminat', 'glow'],
      'mother': ['mother', 'maternal', 'mom', 'nurturing'],
      'father': ['father', 'paternal', 'dad', 'patriarch'],
      'child': ['child', 'infant', 'baby', 'youth', 'young'],
      'house': ['house', 'home', 'dwelling', 'building', 'structure'],
      'library': ['library', 'books', 'knowledge', 'wisdom', 'archive'],
      'labyrinth': ['labyrinth', 'maze', 'path', 'journey', 'winding'],
      'transformation': ['transform', 'change', 'metamorphosis', 'morph', 'evolve'],
      'Self': ['self', 'Self', 'individuation', 'wholeness'],
      'anima/animus': ['anima', 'animus', 'feminine', 'masculine', 'soul'],
      'archetype': ['archetype', 'symbol', 'pattern', 'collective', 'universal']
    };
    
    return variations[symbol] || [symbol];
  }

  async enrichPromptWithContext(
    basePrompt: string,
    context: RAGContext
  ): Promise<string> {
    if (!context.relevantPassages.length) {
      return basePrompt;
    }

    let enrichedPrompt = basePrompt;

    // Add relevant passages section
    const passagesSection = `
RELEVANT JUNGIAN KNOWLEDGE:
${context.relevantPassages.map((p, i) => 
  `${i + 1}. From "${p.source}"${p.chapter ? ` - ${p.chapter}` : ''}:
   "${p.content}"
   [Relevance: ${(p.similarity * 100).toFixed(1)}%]`
).join('\n\n')}`;

    // Add symbols section if present
    let symbolsSection = '';
    if (context.symbols.length > 0) {
      symbolsSection = `

SYMBOL INTERPRETATIONS:
${context.symbols.map(s => 
  `- ${s.symbol}: ${s.interpretations.join(' | ')}`
).join('\n')}`;
    }

    // Add themes section if present
    let themesSection = '';
    if (context.themes.length > 0) {
      themesSection = `

RELEVANT JUNGIAN THEMES:
${context.themes.map(t => `- ${t}`).join('\n')}`;
    }

    // Insert the context before the dream content
    enrichedPrompt = enrichedPrompt.replace(
      'DREAM CONTENT:',
      `${passagesSection}${symbolsSection}${themesSection}

Use this knowledge to enrich your interpretation while maintaining Jung's analytical approach.

DREAM CONTENT:`
    );

    return enrichedPrompt;
  }
}