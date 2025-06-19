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
  // New diversity options
  excludeIds?: (string | number)[];
  diversityMode?: 'similarity' | 'diverse' | 'random-weighted';
  excludeSources?: string[];
  focusSymbols?: string[];
  preferSources?: string[]; // Prefer certain sources
  requireDifferentChapters?: boolean; // Ensure passages from different chapters
}

export class EnhancedRAGService {
  // Cache for tracking used passages across requests
  private static usedPassagesCache = new Map<string, Set<string>>();
  private static sourceRotation = new Map<string, string[]>();
  private static chapterHistory = new Map<string, string[]>();
  
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
        boost,
        excludeIds = [],
        diversityMode = 'diverse',
        excludeSources = [],
        focusSymbols = [],
        preferSources = [],
        requireDifferentChapters = interpreterType === 'freud' // Default true for Freud
      } = options || {};

      logger.info('Enhanced RAG: Starting context retrieval', {
        interpreterType,
        dreamLength: dreamContent.length,
        maxResults,
        similarityThreshold,
        includeSymbols,
        hasMetadataFilter: !!where,
        hasBoostConfig: !!boost,
        diversityMode,
        excludeSourcesCount: excludeSources.length,
        focusSymbolsCount: focusSymbols.length,
        preferSourcesCount: preferSources.length,
        requireDifferentChapters
      });

      // Generate embedding for the dream
      const dreamEmbedding = await embeddingsService.generateEmbedding(dreamContent);

      // Get more results than needed for diversity selection
      const searchLimit = interpreterType === 'freud' 
        ? maxResults * 6  // More for Freud to ensure variety
        : maxResults * 4;
      
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
      
      // Apply filters
      let filteredPassages: RetrievedKnowledge[] = passages || [];
      
      // Filter out excluded IDs
      if (excludeIds.length > 0) {
        filteredPassages = filteredPassages.filter(p => 
          !excludeIds.includes(p.id || '')
        );
      }
      
      // Filter out excluded sources
      if (excludeSources.length > 0) {
        filteredPassages = filteredPassages.filter(p => 
          !excludeSources.includes(p.source)
        );
      }
      
      // Apply metadata filtering
      if (where && filteredPassages.length > 0) {
        filteredPassages = filteredPassages.filter((p: RetrievedKnowledge) => {
          if (!p.metadata) return false;
          
          for (const [key, value] of Object.entries(where)) {
            if (key === 'topic' && typeof value === 'string') {
              if (p.metadata[key] !== value) return false;
            } else if (key === 'topic' && value && typeof value === 'object' && '$in' in value) {
              const allowedTopics = value.$in as string[];
              if (!allowedTopics.includes(p.metadata[key])) return false;
            }
          }
          return true;
        });
      }
      
      // Apply boosting
      if (boost && filteredPassages.length > 0) {
        filteredPassages = this.applyEnhancedBoost(filteredPassages, boost, preferSources);
      }
      
      // Apply diversity selection based on mode
      filteredPassages = await this.selectWithEnhancedDiversity(
        filteredPassages, 
        maxResults, 
        diversityMode,
        interpreterType,
        dreamContent,
        focusSymbols,
        requireDifferentChapters
      );
      
      logger.info(`Enhanced RAG: Selected ${filteredPassages.length} diverse passages`);

      // Track used passages
      this.trackUsedPassages(interpreterType, dreamContent, filteredPassages);

      // Extract symbols and themes if requested
      let symbols: Array<{symbol: string; interpretations: string[]}> = [];
      let themes: string[] = [];

      if (includeSymbols && filteredPassages && filteredPassages.length > 0) {
        logger.info('Enhanced RAG: Extracting symbols and themes from passages');
        const symbolData = await this.extractEnhancedSymbolsAndThemes(
          dreamContent, 
          filteredPassages,
          focusSymbols,
          interpreterType
        );
        symbols = symbolData.symbols;
        themes = symbolData.themes;
        
        if (symbols.length > 0) {
          logger.info(`Enhanced RAG: Extracted ${symbols.length} symbols with interpretations`);
        }
        if (themes.length > 0) {
          logger.info(`Enhanced RAG: Identified ${themes.length} themes:`, themes);
        }
      }

      return {
        relevantPassages: filteredPassages || [],
        symbols,
        themes
      };
    } catch (error) {
      logger.error('Enhanced RAG service error:', error);
      throw new Error('Failed to retrieve relevant context');
    }
  }

  private async selectWithEnhancedDiversity(
    passages: RetrievedKnowledge[],
    maxResults: number,
    mode: 'similarity' | 'diverse' | 'random-weighted',
    interpreterType: string,
    _dreamContent: string,
    _focusSymbols: string[],
    requireDifferentChapters: boolean
  ): Promise<RetrievedKnowledge[]> {
    if (passages.length <= maxResults) {
      return passages;
    }

    // For Freud, use special diversity logic
    if (interpreterType === 'freud') {
      return this.selectFreudianDiversity(passages, maxResults, requireDifferentChapters);
    }

    switch (mode) {
      case 'similarity':
        // Simple top-N by similarity
        return passages.slice(0, maxResults);
        
      case 'diverse':
        // Mix of high similarity and diverse sources
        const topSimilar = passages.slice(0, Math.ceil(maxResults / 3));
        const remaining = passages.slice(Math.ceil(maxResults / 3));
        
        // Group by source and chapter
        const bySourceChapter = new Map<string, RetrievedKnowledge[]>();
        remaining.forEach(p => {
          const key = `${p.source}|${p.chapter || 'no-chapter'}`;
          if (!bySourceChapter.has(key)) {
            bySourceChapter.set(key, []);
          }
          bySourceChapter.get(key)!.push(p);
        });
        
        // Pick from different sources/chapters
        const diversePicks: RetrievedKnowledge[] = [];
        const keys = Array.from(bySourceChapter.keys());
        let keyIndex = 0;
        
        while (diversePicks.length < maxResults - topSimilar.length && keys.length > 0) {
          const keyIdx = keyIndex % keys.length;
          const key = keys[keyIdx];
          if (!key) break;
          
          const passages = bySourceChapter.get(key);
          
          if (passages && passages.length > 0) {
            const picked = passages.shift();
            if (picked) diversePicks.push(picked);
            if (passages.length === 0) {
              keys.splice(keyIdx, 1);
            }
          }
          keyIndex++;
        }
        
        return [...topSimilar, ...diversePicks];
        
      case 'random-weighted':
        // Random selection weighted by similarity
        const selected: RetrievedKnowledge[] = [];
        const available = [...passages];
        
        // Always include top 2
        selected.push(...available.splice(0, 2));
        
        // Randomly select rest with similarity weighting
        while (selected.length < maxResults && available.length > 0) {
          const weights = available.map(p => Math.pow(p.similarity, 2)); // Square for stronger weighting
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          
          let random = Math.random() * totalWeight;
          let selectedIndex = 0;
          
          for (let i = 0; i < weights.length; i++) {
            random -= weights[i] || 0;
            if (random <= 0) {
              selectedIndex = i;
              break;
            }
          }
          
          const picked = available.splice(selectedIndex, 1)[0];
          if (picked) selected.push(picked);
        }
        
        return selected;
        
      default:
        return passages.slice(0, maxResults);
    }
  }

  private selectFreudianDiversity(
    passages: RetrievedKnowledge[],
    maxResults: number,
    requireDifferentChapters: boolean
  ): RetrievedKnowledge[] {
    const selected: RetrievedKnowledge[] = [];
    const usedSources = new Set<string>();
    const usedChapters = new Set<string>();
    const usedTopics = new Set<string>();
    
    // Always include the top match
    if (passages.length > 0) {
      const top = passages[0];
      if (top) {
        selected.push(top);
        usedSources.add(top.source);
        if (top.chapter) usedChapters.add(top.chapter);
        if (top.metadata?.['topic']) usedTopics.add(top.metadata['topic']);
      }
    }
    
    // Then select based on diversity criteria
    for (const passage of passages.slice(1)) {
      if (selected.length >= maxResults) break;
      
      // Score based on diversity factors
      let diversityScore = passage.similarity;
      
      // Bonus for different source
      if (!usedSources.has(passage.source)) {
        diversityScore += 0.15;
      }
      
      // Bonus for different chapter
      if (requireDifferentChapters && passage.chapter && !usedChapters.has(passage.chapter)) {
        diversityScore += 0.1;
      }
      
      // Bonus for different topic
      if (passage.metadata?.['topic'] && !usedTopics.has(passage.metadata['topic'])) {
        diversityScore += 0.05;
      }
      
      // Penalty for same source and chapter
      if (usedSources.has(passage.source) && passage.chapter && usedChapters.has(passage.chapter)) {
        diversityScore -= 0.2;
      }
      
      passage.similarity = diversityScore; // Temporarily modify for sorting
    }
    
    // Re-sort by diversity score
    passages.slice(1).sort((a, b) => b.similarity - a.similarity);
    
    // Select remaining passages
    for (const passage of passages.slice(1)) {
      if (selected.length >= maxResults) break;
      
      // Skip if we already have 2 from the same source
      const sourceCount = selected.filter(p => p.source === passage.source).length;
      if (sourceCount >= 2) continue;
      
      selected.push(passage);
      usedSources.add(passage.source);
      if (passage.chapter) usedChapters.add(passage.chapter);
      if (passage.metadata?.['topic']) usedTopics.add(passage.metadata['topic']);
    }
    
    return selected;
  }

  private applyEnhancedBoost(
    passages: RetrievedKnowledge[],
    boost: Record<string, string[]>,
    preferSources: string[]
  ): RetrievedKnowledge[] {
    return passages.map((p: RetrievedKnowledge) => {
      let boostedSimilarity = p.similarity;
      
      // Check topic boost
      if (boost['topic'] && p.metadata?.['topic']) {
        if (boost['topic'].includes(p.metadata['topic'])) {
          boostedSimilarity += 0.1;
        }
      }
      
      // Check subtopic boost
      if (boost['subtopic'] && p.metadata?.['subtopic'] && Array.isArray(p.metadata['subtopic'])) {
        const hasBoostSubtopic = boost['subtopic'].some((st: string) => 
          (p.metadata?.['subtopic'] as string[]).includes(st)
        );
        if (hasBoostSubtopic) {
          boostedSimilarity += 0.08;
        }
      }
      
      // Check source boost
      if (boost['source'] && boost['source'].includes(p.source)) {
        boostedSimilarity += 0.05;
      }
      
      // Apply source preference
      if (preferSources.includes(p.source)) {
        boostedSimilarity += 0.07;
      }
      
      return { ...p, similarity: boostedSimilarity };
    }).sort((a: RetrievedKnowledge, b: RetrievedKnowledge) => b.similarity - a.similarity);
  }

  private trackUsedPassages(
    interpreterType: string,
    _dreamContent: string,
    passages: RetrievedKnowledge[]
  ): void {
    const cacheKey = `${interpreterType}`;
    const usedSet = EnhancedRAGService.usedPassagesCache.get(cacheKey) || new Set<string>();
    
    passages.forEach(p => {
      const id = p.id?.toString() || p.content.substring(0, 100);
      usedSet.add(id);
    });
    
    // Keep only last 100 used passages for Freud, 50 for others
    const maxCache = interpreterType === 'freud' ? 100 : 50;
    if (usedSet.size > maxCache) {
      const arr = Array.from(usedSet);
      const toKeep = arr.slice(-maxCache);
      EnhancedRAGService.usedPassagesCache.set(cacheKey, new Set(toKeep));
    } else {
      EnhancedRAGService.usedPassagesCache.set(cacheKey, usedSet);
    }
    
    // Track source usage
    const sourceKey = `${interpreterType}-sources`;
    const sourceList = EnhancedRAGService.sourceRotation.get(sourceKey) || [];
    passages.forEach(p => {
      if (!sourceList.includes(p.source)) {
        sourceList.push(p.source);
      }
    });
    // Keep last 20 sources
    if (sourceList.length > 20) {
      EnhancedRAGService.sourceRotation.set(sourceKey, sourceList.slice(-20));
    } else {
      EnhancedRAGService.sourceRotation.set(sourceKey, sourceList);
    }
    
    // Track chapter usage for Freud
    if (interpreterType === 'freud') {
      const chapterKey = `${interpreterType}-chapters`;
      const chapterList = EnhancedRAGService.chapterHistory.get(chapterKey) || [];
      passages.forEach(p => {
        if (p.chapter && !chapterList.includes(p.chapter)) {
          chapterList.push(p.chapter);
        }
      });
      if (chapterList.length > 30) {
        EnhancedRAGService.chapterHistory.set(chapterKey, chapterList.slice(-30));
      } else {
        EnhancedRAGService.chapterHistory.set(chapterKey, chapterList);
      }
    }
  }

  private async extractEnhancedSymbolsAndThemes(
    dreamContent: string,
    passages: RetrievedKnowledge[],
    focusSymbols: string[] = [],
    interpreterType: string
  ): Promise<{ symbols: Array<{symbol: string; interpretations: string[]}>; themes: string[] }> {
    // Expanded list of symbols with Freudian emphasis
    const symbolPatterns = [
      // Elements
      { pattern: /\b(water|ocean|sea|lake|river|rain|flood|drowning|swimming)\b/gi, symbol: 'water' },
      { pattern: /\b(fire|flame|burning|blaze|heat|smoke|ember)\b/gi, symbol: 'fire' },
      { pattern: /\b(earth|ground|soil|land|dirt|mud)\b/gi, symbol: 'earth' },
      { pattern: /\b(air|wind|breeze|sky|flying|floating)\b/gi, symbol: 'air' },
      { pattern: /\b(light|glow|bright|illuminat|dark|shadow|darkness)\b/gi, symbol: 'light/shadow' },
      
      // Body parts (Freudian)
      { pattern: /\b(mouth|lips|tongue|teeth|eating|biting|sucking|oral)\b/gi, symbol: 'oral' },
      { pattern: /\b(penis|phallus|erection|penetrat|rod|stick|sword|gun)\b/gi, symbol: 'phallus' },
      { pattern: /\b(vagina|womb|hole|cave|opening|vessel|container)\b/gi, symbol: 'feminine' },
      { pattern: /\b(breast|chest|bosom|nipple|nursing|feeding)\b/gi, symbol: 'breast' },
      { pattern: /\b(anus|buttocks|bottom|defecation|toilet|bathroom)\b/gi, symbol: 'anal' },
      { pattern: /\b(hair|bald|shaving|cutting hair|losing hair)\b/gi, symbol: 'hair' },
      
      // Sexual/Erotic
      { pattern: /\b(sex|sexual|erotic|desire|pleasure|orgasm|climax)\b/gi, symbol: 'sexuality' },
      { pattern: /\b(naked|nude|undress|strip|expose|revealing)\b/gi, symbol: 'nakedness' },
      { pattern: /\b(kiss|embrace|caress|touch|fondle|stroke)\b/gi, symbol: 'intimacy' },
      { pattern: /\b(bed|bedroom|sheets|pillow|lying down)\b/gi, symbol: 'bed' },
      
      // Family figures
      { pattern: /\b(mother|mom|mama|maternal|mommy)\b/gi, symbol: 'mother' },
      { pattern: /\b(father|dad|papa|paternal|daddy)\b/gi, symbol: 'father' },
      { pattern: /\b(child|baby|infant|youth|young|little)\b/gi, symbol: 'child' },
      { pattern: /\b(brother|sister|sibling)\b/gi, symbol: 'sibling' },
      { pattern: /\b(husband|wife|spouse|partner)\b/gi, symbol: 'spouse' },
      
      // Authority/Control
      { pattern: /\b(boss|authority|police|judge|teacher|principal)\b/gi, symbol: 'authority' },
      { pattern: /\b(control|power|dominate|submit|obey|rebel)\b/gi, symbol: 'control' },
      { pattern: /\b(guilt|shame|embarrass|wrong|sin|bad)\b/gi, symbol: 'guilt' },
      { pattern: /\b(punish|discipline|scold|criticize|judge)\b/gi, symbol: 'punishment' },
      
      // Places
      { pattern: /\b(house|home|building|room|apartment)\b/gi, symbol: 'house' },
      { pattern: /\b(door|entrance|portal|gate|threshold)\b/gi, symbol: 'door' },
      { pattern: /\b(window|opening|view|glass)\b/gi, symbol: 'window' },
      { pattern: /\b(basement|cellar|underground|attic|hidden)\b/gi, symbol: 'hidden-place' },
      { pattern: /\b(bathroom|toilet|shower|bath)\b/gi, symbol: 'bathroom' },
      { pattern: /\b(bedroom|bed|sleep|dream)\b/gi, symbol: 'bedroom' },
      
      // Actions/States
      { pattern: /\b(fall|falling|drop|descend|sink|collapse)\b/gi, symbol: 'falling' },
      { pattern: /\b(run|running|chase|escape|flee|pursue)\b/gi, symbol: 'running' },
      { pattern: /\b(hide|hiding|conceal|secret|cover)\b/gi, symbol: 'hiding' },
      { pattern: /\b(transform|change|morph|become|turn into)\b/gi, symbol: 'transformation' },
      { pattern: /\b(death|dying|dead|kill|murder|funeral)\b/gi, symbol: 'death' },
      { pattern: /\b(birth|born|pregnant|baby|new life)\b/gi, symbol: 'birth' },
      
      // Objects (Freudian)
      { pattern: /\b(knife|sword|gun|weapon|sharp|cut|stab)\b/gi, symbol: 'weapon' },
      { pattern: /\b(box|container|vessel|jar|purse|bag)\b/gi, symbol: 'container' },
      { pattern: /\b(key|lock|open|close|unlock)\b/gi, symbol: 'key' },
      { pattern: /\b(mirror|reflection|image|see self)\b/gi, symbol: 'mirror' },
      { pattern: /\b(money|coin|treasure|wealth|pay)\b/gi, symbol: 'money' },
      
      // Animals
      { pattern: /\b(snake|serpent|python|viper)\b/gi, symbol: 'serpent' },
      { pattern: /\b(animal|creature|beast|wild)\b/gi, symbol: 'animal' },
      { pattern: /\b(bird|fly|wings|feather)\b/gi, symbol: 'bird' },
      { pattern: /\b(cat|feline|kitten)\b/gi, symbol: 'cat' },
      { pattern: /\b(dog|canine|puppy|wolf)\b/gi, symbol: 'dog' },
      { pattern: /\b(horse|riding|gallop|stallion)\b/gi, symbol: 'horse' }
    ];
    
    // Find symbols in the dream
    const foundSymbols = new Set<string>();
    
    // Priority to focus symbols if provided
    if (focusSymbols.length > 0) {
      focusSymbols.forEach(s => foundSymbols.add(s));
    }
    
    // Then find from patterns
    for (const { pattern, symbol } of symbolPatterns) {
      if (pattern.test(dreamContent)) {
        foundSymbols.add(symbol);
      }
    }

    // Extract interpretations from passages
    const symbolInterpretations = new Map<string, Set<string>>();
    const themes = new Set<string>();

    const symbolsArray = Array.from(foundSymbols);
    
    logger.info(`Enhanced RAG: Found ${symbolsArray.length} symbols in dream:`, symbolsArray);

    for (const passage of passages) {
      // Look for symbol mentions in passages
      for (const symbol of symbolsArray) {
        const symbolVariations = this.getEnhancedSymbolVariations(symbol);
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
          }).slice(0, 3); // Up to 3 sentences per symbol
          
          relevantSentences.forEach(s => {
            const trimmed = s.trim();
            if (trimmed.length > 20 && trimmed.length < 300) {
              symbolInterpretations.get(symbol)?.add(trimmed);
            }
          });
        }
      }

      // Extract themes with more variety for Freud
      const themeKeywords = interpreterType === 'freud' ? [
        // Freudian themes
        'libido', 'repression', 'transference', 'cathexis', 'sublimation',
        'ego', 'id', 'superego', 'oedipus', 'castration', 'primal scene',
        'unconscious', 'preconscious', 'conscious', 'pleasure principle',
        'reality principle', 'death drive', 'eros', 'thanatos', 'narcissism',
        'hysteria', 'neurosis', 'psychosis', 'defense mechanism', 'resistance',
        'dream-work', 'wish fulfillment', 'screen memory', 'repetition compulsion',
        'object relations', 'identification', 'introjection', 'projection'
      ] : [
        // Jungian themes
        'individuation', 'archetype', 'shadow', 'anima', 'animus', 'self',
        'collective unconscious', 'synchronicity', 'complex', 'persona'
      ];
      
      themeKeywords.forEach(keyword => {
        if (passage.content.toLowerCase().includes(keyword)) {
          themes.add(keyword);
        }
      });
    }

    // Limit interpretations per symbol for variety
    const maxInterpretationsPerSymbol = interpreterType === 'freud' ? 4 : 3;
    const limitedInterpretations = Array.from(symbolInterpretations.entries()).map(([symbol, interps]) => ({
      symbol,
      interpretations: Array.from(interps).slice(0, maxInterpretationsPerSymbol)
    }));

    return {
      symbols: limitedInterpretations,
      themes: Array.from(themes).slice(0, interpreterType === 'freud' ? 7 : 5)
    };
  }

  private getEnhancedSymbolVariations(symbol: string): string[] {
    const variations: Record<string, string[]> = {
      // Elements
      'water': ['water', 'ocean', 'sea', 'lake', 'river', 'rain', 'flood', 'wave', 'stream', 'drowning', 'swimming', 'liquid', 'fluid'],
      'fire': ['fire', 'flame', 'burning', 'blaze', 'heat', 'ember', 'inferno', 'combustion', 'ignite', 'smoke'],
      'earth': ['earth', 'ground', 'soil', 'land', 'dirt', 'mud', 'clay', 'terrain'],
      'air': ['air', 'wind', 'breeze', 'atmosphere', 'breath', 'oxygen', 'gas'],
      
      // Sexual/Body
      'oral': ['oral', 'mouth', 'lips', 'tongue', 'teeth', 'eating', 'sucking', 'biting', 'consumption', 'devour', 'swallow'],
      'phallus': ['penis', 'phallus', 'phallic', 'masculine', 'potency', 'erection', 'penetration', 'sword', 'tower', 'stick', 'rod'],
      'feminine': ['vagina', 'feminine', 'womb', 'receptive', 'cave', 'vessel', 'container', 'hollow', 'opening'],
      'breast': ['breast', 'bosom', 'chest', 'nipple', 'mammary', 'nursing', 'nourishment'],
      'anal': ['anal', 'anus', 'defecation', 'control', 'retention', 'order', 'obsessive', 'toilet', 'bowel'],
      'sexuality': ['sex', 'sexual', 'erotic', 'desire', 'libido', 'pleasure', 'sensual', 'carnal', 'lust'],
      'nakedness': ['naked', 'nude', 'undressed', 'bare', 'exposed', 'unclothed', 'stripped'],
      
      // Family
      'mother': ['mother', 'maternal', 'mom', 'mama', 'nurturing', 'womb', 'birth', 'feeding'],
      'father': ['father', 'paternal', 'dad', 'papa', 'patriarch', 'authority', 'law'],
      'child': ['child', 'infant', 'baby', 'youth', 'young', 'offspring', 'progeny'],
      
      // Psychological states
      'guilt': ['guilt', 'shame', 'remorse', 'conscience', 'moral', 'sin', 'wrong'],
      'authority': ['authority', 'power', 'control', 'dominance', 'submission', 'hierarchy'],
      'hiding': ['hide', 'hidden', 'conceal', 'secret', 'repress', 'suppress', 'bury'],
      
      // Death/Birth
      'death': ['death', 'dying', 'dead', 'mortality', 'end', 'termination', 'extinction'],
      'birth': ['birth', 'born', 'creation', 'beginning', 'genesis', 'origin', 'emergence'],
      
      // Objects
      'weapon': ['weapon', 'knife', 'sword', 'gun', 'blade', 'sharp', 'cut', 'pierce'],
      'container': ['container', 'box', 'vessel', 'jar', 'receptacle', 'holder', 'enclosure'],
      'mirror': ['mirror', 'reflection', 'image', 'narcissism', 'self-image', 'double']
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
RELEVANT PSYCHOANALYTIC KNOWLEDGE:
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

RELEVANT THEMES:
${context.themes.map(t => `- ${t}`).join('\n')}`;
    }

    // Insert the context before the dream content
    enrichedPrompt = enrichedPrompt.replace(
      'DREAM CONTENT:',
      `${passagesSection}${symbolsSection}${themesSection}

Use this knowledge to enrich your interpretation while maintaining the analytical approach.

DREAM CONTENT:`
    );

    return enrichedPrompt;
  }

  // Public method to get recently used sources
  getRecentlyUsedSources(interpreterType: string): string[] {
    const sourceKey = `${interpreterType}-sources`;
    return EnhancedRAGService.sourceRotation.get(sourceKey) || [];
  }

  // Public method to get recently used chapters
  getRecentlyUsedChapters(interpreterType: string): string[] {
    const chapterKey = `${interpreterType}-chapters`;
    return EnhancedRAGService.chapterHistory.get(chapterKey) || [];
  }

  // Public method to clear cache
  clearCache(interpreterType?: string): void {
    if (interpreterType) {
      EnhancedRAGService.usedPassagesCache.delete(interpreterType);
      EnhancedRAGService.sourceRotation.delete(`${interpreterType}-sources`);
      EnhancedRAGService.chapterHistory.delete(`${interpreterType}-chapters`);
    } else {
      EnhancedRAGService.usedPassagesCache.clear();
      EnhancedRAGService.sourceRotation.clear();
      EnhancedRAGService.chapterHistory.clear();
    }
  }
}

// Export as RAGService for compatibility
export { EnhancedRAGService as RAGService };