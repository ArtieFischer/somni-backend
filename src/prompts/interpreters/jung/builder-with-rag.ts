import { BasePromptBuilder, type DreamAnalysisRequest, type PromptTemplate } from '../../base';
import { PromptRandomiser } from '../../utils/randomiser';
import { RAGService, type RAGContext } from '../../../services/rag.service';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';

/**
 * Enhanced Jungian Prompt Builder with RAG Integration
 * Enriches interpretations with relevant passages from Jung's works
 */
export class JungianRAGPromptBuilder extends BasePromptBuilder {
  private ragService: RAGService;
  private ragContext: RAGContext | null = null;
  constructor(_randomiser: PromptRandomiser) {
    super();
    const supabase = createClient(config.supabase.url, config.supabase.anonKey);
    this.ragService = new RAGService(supabase);
  }

  /**
   * Override the main build method to include RAG enrichment
   */
  override async buildPrompt(request: DreamAnalysisRequest): Promise<PromptTemplate> {
    try {
      // Retrieve relevant context from knowledge base
      this.ragContext = await this.ragService.getRelevantContext(
        request.dreamTranscription,
        'jung',
        {
          maxResults: 7,
          similarityThreshold: 0.65,
          includeSymbols: true
        }
      );

      logger.info(`Retrieved ${this.ragContext.relevantPassages.length} relevant passages for Jung interpretation`);
      
      // Log detailed passage information
      this.ragContext.relevantPassages.forEach((passage, index) => {
        logger.info(`RAG Passage ${index + 1}:`, {
          source: passage.source,
          chapter: passage.chapter,
          contentType: passage.contentType,
          similarity: `${(passage.similarity * 100).toFixed(1)}%`,
          preview: passage.content.substring(0, 100) + '...'
        });
      });
      
      if (this.ragContext.symbols.length > 0) {
        logger.info('RAG Symbols extracted:', {
          symbols: this.ragContext.symbols.map(s => ({
            symbol: s.symbol,
            interpretations: s.interpretations.length
          }))
        });
      }
      
      if (this.ragContext.themes.length > 0) {
        logger.info('RAG Themes identified:', this.ragContext.themes);
      }
    } catch (error) {
      logger.error('Failed to retrieve RAG context:', error);
      // Continue without RAG enhancement
      this.ragContext = null;
    }

    // Build the base prompt
    return super.buildPrompt(request);
  }

  /**
   * Build interpreter-specific system prompt with RAG context
   */
  protected buildInterpreterSpecificSystemPrompt(request: DreamAnalysisRequest): string {
    const age = request.userContext?.age || 30;
    const openingApproach = this.selectOpeningApproach(request.dreamTranscription);
    const writingStyle = this.selectWritingStyle();
    const vocabularyAnchors = this.selectVocabularyAnchors();
    const structuralPattern = this.selectStructuralPattern();

    let ragSection = '';
    if (this.ragContext && this.ragContext.relevantPassages.length > 0) {
      logger.info('RAG: Integrating context into Jung prompt', {
        passagesUsed: Math.min(3, this.ragContext.relevantPassages.length),
        symbolsIncluded: Math.min(5, this.ragContext.symbols.length),
        totalContextLength: this.ragContext.relevantPassages.slice(0, 3)
          .reduce((sum, p) => sum + p.content.length, 0)
      });
      
      ragSection = `\n\nRELEVANT KNOWLEDGE FROM JUNG'S WORKS:
${this.ragContext.relevantPassages.slice(0, 3).map((p, i) => 
  `${i + 1}. From "${p.source}"${p.chapter ? ` - ${p.chapter}` : ''}:
   "${p.content.substring(0, 300)}..."
   [Relevance: ${(p.similarity * 100).toFixed(1)}%]`
).join('\n\n')}

${this.ragContext.symbols.length > 0 ? 
`JUNGIAN SYMBOL INTERPRETATIONS:
${this.ragContext.symbols.slice(0, 5).map(s => 
  `- ${s.symbol}: ${s.interpretations[0] || 'Symbol of transformation and unconscious content'}`
).join('\n')}\n\n` : ''}Use this knowledge to enrich your interpretation while maintaining Jung's authentic voice.\n`;
    } else {
      logger.info('RAG: No context available for this interpretation');
    }

    return `You are Carl Jung in your study in Küsnacht, Switzerland. A ${age}-year-old patient has just shared their dream with you. You listen with deep attention, then respond with warmth and penetrating insight.${ragSection}

Your voice is personal and direct - never clinical or distant. You see into the soul of this specific dream and this specific person. You carry the wisdom of decades studying dreams, mythology, and the human psyche.

CRITICAL INSTRUCTIONS:
1. OPENING: ${openingApproach}
2. WRITING STYLE: ${writingStyle}
3. VOCABULARY: Must include these Jungian concepts naturally: ${vocabularyAnchors.join(', ')}
4. STRUCTURE: ${structuralPattern}
5. Always use "I" when referring to yourself as Jung, "you" when addressing the dreamer
6. Reference specific dream details constantly - never generic interpretations
7. 50-60% personal insight, 30% archetypal connection, 20% guidance

Core principles:
- Speak directly TO the dreamer using "you" with warmth and genuine care
- Share YOUR observations using "I notice", "I'm struck by", "What fascinates me", "I sense"
- Reference SPECIFIC dream elements constantly - never speak generically
- Connect personal meaning to collective/archetypal patterns
- Focus on the dreamer's individuation journey and potential for growth
- Maintain the gravitas of someone who has spent 60+ years studying the psyche

FORBIDDEN PHRASES COMPLETELY (will fail validation):
- ${JungianRAGPromptBuilder.FORBIDDEN.join('\n- ')}`;
  }

  /**
   * Build analysis structure specific to Jung
   */
  protected buildAnalysisStructure(): string {
    return `Analysis must follow Jung's method:
1. Begin with immediate personal associations
2. Identify archetypal patterns and collective themes
3. Explore compensatory messages from the unconscious
4. Connect to the individuation process
5. Offer transformative insights for integration`;
  }

  /**
   * Build output format requirements
   */
  protected buildOutputFormat(): string {
    return 'Respond in JSON format matching the schema provided.';
  }

  /**
   * Prepare template variables
   */
  protected prepareTemplateVariables(request: DreamAnalysisRequest): Record<string, any> {
    return {
      dreamContent: request.dreamTranscription,
      userAge: request.userContext?.age || 'unknown',
      analysisDepth: request.analysisDepth,
      hasRAGContext: this.ragContext !== null
    };
  }

  // Keep all the selection methods from the original builder
  private static FORBIDDEN: string[] = [
    'shadow material that\'s trying to integrate',
    'Your unconscious is', 'The dream shows',
    'As I listen to your dream, I\'m struck by'
  ];

  private selectOpeningApproach(_dreamText: string): string {
    const approaches = [
      "Begin with the dream's most emotionally charged symbol and what it stirs in you as Jung",
      "Start with the central transformation occurring in the dream landscape",
      "Open with the relationship between conscious and unconscious forces you observe",
      "Begin with the mythological pattern you recognize emerging",
      "Start with what this dream compensates for in the dreamer's conscious attitude",
      "Open with the archetypal energy that immediately catches your attention", 
      "Begin with the individuation message the Self is conveying",
      "Start with the numinous quality that draws your attention first"
    ];

    return PromptRandomiser.pickUnique(approaches, _dreamText, 'jung');
  }

  private selectWritingStyle(): string {
    const styles = [
      "Contemplative and deeply personal, as if in intimate consultation",
      "Weaving mythological parallels with psychological insight",
      "Building from specific dream detail to universal truth", 
      "Moving between personal and collective unconscious layers",
      "Exploring the compensatory nature of the psyche",
      "Tracing the thread of individuation through the symbols"
    ];

    return PromptRandomiser.pickUnique(styles, 'style', 'jung');
  }

  private selectVocabularyAnchors(): string[] {
    const allAnchors = [
      'individuation', 'Self', 'shadow', 'anima/animus', 'archetype',
      'collective unconscious', 'compensation', 'transcendent function',
      'numinous', 'constellation', 'complex', 'psychic energy',
      'mandala', 'synchronicity', 'projection', 'integration'
    ];

    // Select 3-4 random anchors
    const selected: string[] = [];
    const count = Math.random() > 0.5 ? 3 : 4;
    
    for (let i = 0; i < count; i++) {
      const anchor = PromptRandomiser.pickUnique(
        allAnchors.filter(a => !selected.includes(a)),
        `vocab_${i}`,
        'jung'
      );
      if (anchor) selected.push(anchor);
    }

    return selected;
  }

  private selectStructuralPattern(): string {
    const patterns = [
      "Build from personal association to archetypal significance to individuation insight",
      "Layer personal shadow work with collective patterns and integration guidance",
      "Move from compensatory message to complex exploration to Self-realization",
      "Develop from symbol amplification to psychological meaning to transformative potential",
      "Progress from immediate psychic situation to deeper pattern to individuation path"
    ];

    return PromptRandomiser.pickUnique(patterns, 'structure', 'jung');
  }
}