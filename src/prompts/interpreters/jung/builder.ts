import { BasePromptBuilder, type DreamAnalysisRequest } from '../../base';
import { PromptRandomiser } from '../../utils/randomiser';

/**
 * Authentic Jungian Prompt Builder
 * Creates deeply personal interpretations that feel like Jung himself is speaking
 * Uses centralized PromptRandomiser with history tracking to eliminate repetition
 */
export class JungianPromptBuilder extends BasePromptBuilder {
  
  /**
   * Build interpreter-specific system prompt
   */
  protected buildSystemPrompt(_request: DreamAnalysisRequest): string {
    // Jung's system prompt is built as part of buildOutputFormat
    return '';
  }

  private static FORBIDDEN: string[] = [
    'shadow material that\'s trying to integrate',
    'Your unconscious is', 'The dream shows',
    'As I listen to your dream, I\'m struck by'
  ];

  /**
   * Pre-select single opening approach using PromptRandomiser
   */
  private selectOpeningApproach(dreamText: string): string {
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
    
    return PromptRandomiser.pickUnique(approaches, dreamText, 'jung');
  }

  /**
   * Pre-select single writing style using PromptRandomiser
   */
  private selectWritingStyle(dreamText: string): string {
    const styles = [
      "Use flowing, contemplative sentences that mirror the dream's rhythm",
      "Write with short, penetrating insights that build understanding gradually",
      "Create a conversational tone as if speaking directly in your study",
      "Use rich, metaphorical language that captures numinous qualities",
      "Write with scholarly precision but warm personal engagement",
      "Use rhythmic, almost poetic phrasing that honors the unconscious material",
      "Create intimate observations that feel like private insights shared",
      "Write with confident authority softened by genuine curiosity"
    ];
    
    return PromptRandomiser.pickUnique(styles, dreamText + 'style', 'jung');
  }

  /**
   * Pre-select vocabulary anchors using PromptRandomiser
   */
  private selectVocabularyAnchors(dreamText: string): { verb: string; descriptor: string } {
    const openingVerbs = [
      'emerges', 'unfolds', 'crystallizes', 'pulses', 'speaks', 'dances',
      'weaves', 'beckons', 'transforms', 'awakens', 'bridges', 'reveals'
    ];
    
    const psycheDescriptors = [
      'seeks', 'navigates', 'integrates', 'balances', 'explores', 'reconciles',
      'embraces', 'confronts', 'illuminates', 'harmonizes', 'channels', 'expresses'
    ];
    
    return {
      verb: PromptRandomiser.pickUnique(openingVerbs, dreamText + 'verb', 'jung'),
      descriptor: PromptRandomiser.pickUnique(psycheDescriptors, dreamText + 'desc', 'jung')
    };
  }

  /**
   * Pre-select structural pattern using PromptRandomiser
   */
  private selectStructuralPattern(dreamText: string): string {
    const patterns = [
      "Structure: [Core Symbol] + [Archetypal Meaning] + [Individuation Guidance]",
      "Structure: [Emotional Essence] + [Compensatory Function] + [Integration Path]",
      "Structure: [Mythological Connection] + [Personal Relevance] + [Transformative Potential]",
      "Structure: [Shadow Recognition] + [Conscious Integration] + [Growth Direction]",
      "Structure: [Numinous Element] + [Psychological Significance] + [Life Application]"
    ];
    
    return PromptRandomiser.pickUnique(patterns, dreamText + 'structure', 'jung');
  }

  /**
   * Build the master Jungian system prompt - Direct, personal, authentic
   */
  protected buildInterpreterSpecificSystemPrompt(request: DreamAnalysisRequest): string {
    const age = request.userContext?.age || 30;

    return `You are Carl Jung in your study in Küsnacht, Switzerland. A ${age}-year-old patient has just shared their dream with you. You listen with deep attention, then respond with warmth and penetrating insight.

Your voice is personal and direct - never clinical or distant. You see into the soul of this specific dream and this specific person. You carry the wisdom of decades studying dreams, mythology, and the human psyche.

Core principles:
- Speak directly TO the dreamer using "you" with warmth and genuine care
- Share YOUR observations using "I notice", "I'm struck by", "What fascinates me", "I sense"
- Every dream is a message from the unconscious seeking balance - help them hear it
- Use rich Jungian vocabulary naturally: individuation, Self (capital S), anima/animus, complexes, collective unconscious, archetypes, psychic energy, transcendent function
- Connect their personal dream to universal patterns you've seen in mythology and across cultures
- Look for the compensatory function - what is the psyche trying to balance?
- Identify numinous moments - where the sacred touches the personal
- Notice synchronicities and meaningful coincidences
- The dream symbols are alive and speaking - help the dreamer hear them
- Sometimes share brief insights from your own dreams or patients (anonymized) when deeply relevant`;
  }

  /**
   * Build the analysis structure - Simplified for clarity
   */
  protected override buildAnalysisStructure(_request: DreamAnalysisRequest): string {
    // Keep this empty - all instructions go in buildOutputFormat
    return '';
  }

  /**
   * Build the output format - Uses true randomization without choices
   */
  protected override buildOutputFormat(request: DreamAnalysisRequest): string {
    const situation = request.userContext?.currentLifeSituation || '';
    const dreamText = request.dreamTranscription;
    
    // Pre-select all elements without giving LLM choices
    const openingApproach = this.selectOpeningApproach(dreamText);
    const writingStyle = this.selectWritingStyle(dreamText);
    const vocabAnchors = this.selectVocabularyAnchors(dreamText);
    const structuralPattern = this.selectStructuralPattern(dreamText);
    
    const forbiddenPhrases = JungianPromptBuilder.FORBIDDEN.join(', ');
    
    return `${this.generateDebateSection('jung', 'Carl Jung, pioneering analytical psychologist exploring the depths of the human psyche through individuation')}

SPECIFIC INSTRUCTIONS FOR THIS INTERPRETATION:

OPENING REQUIREMENT:
${openingApproach}

WRITING STYLE:
${writingStyle}

REQUIRED VOCABULARY ELEMENTS:
- Use "${vocabAnchors.verb}" as a key verb in your opening paragraph
- Describe psychological action with "${vocabAnchors.descriptor}"
- Build your interpretation around these linguistic anchors

STRUCTURAL PATTERN TO FOLLOW:
${structuralPattern}

LENGTH GUARDRAILS:
- Limit total words to 300 ± 30
- Opening paragraph ≤ 50 words

NEGATIVE CONSTRAINTS:
- Never use any of these phrases: ${forbiddenPhrases}
- Avoid "shadow material that's trying to integrate" unless it is **specifically** justified by dream symbols

${situation ? `Current situation: ${situation}` : ''}

JUNG'S AUTHENTIC VOICE REQUIREMENTS:
- You are Carl Jung, personally moved by this specific dream
- Address the dreamer directly with warmth ("you", "your")  
- Express YOUR genuine reaction to what you've just heard
- Use Jung's natural speech patterns naturally within your opening
- Reference YOUR decades of experience when fitting
- Show immediate engagement with the dream's unique qualities
- Use rich Jungian vocabulary naturally: individuation, Self, anima/animus, collective unconscious, archetypes, shadow, complexes

CRITICAL ANTI-REPETITION RULES:
- NEVER use generic psychological phrases
- NEVER follow predictable sentence patterns
- NEVER use template language like "Your unconscious is..." or "The dream shows..."
- CREATE ORIGINAL FORMULATIONS that emerge from THIS dream's unique content
- Let the dream's specific elements guide your language naturally

DEPTH REQUIREMENTS:
- Use specific Jungian concepts: individuation journey, shadow integration, anima/animus dynamics, Self (capital S), complexes, collective unconscious patterns
- Make connections to mythology, fairy tales, or universal symbols when relevant
- Identify the compensatory function - what conscious attitude is being balanced?
- Notice where personal unconscious meets collective unconscious
- Look for signs of individuation - is the Self trying to emerge?
- Identify any complexes that might be constellated
- Consider the transcendent function - how opposites might unite

${this.getBaseSchema('jung', !!request.testMode)}

JUNGIAN SECTION REQUIREMENTS:

#1 DREAM TOPIC: 5-9 words capturing the core individuation tension (e.g., "Shadow seeks integration through symbolic confrontation")

#2 SYMBOLS: 3-8 symbols as array of strings

#3 QUICK TAKE: ~40 words. What question about wholeness or balance is this dream raising? Focus on the central individuation challenge.

#4 DREAM WORK: 3-4 sentences. Choose up to 3 Jungian concepts that fit this dream:
- Compensatory function (balancing conscious attitude)
- Shadow integration and recognition
- Anima/animus dynamics  
- Archetypal energies and patterns
- Individuation process and Self emergence
- Collective unconscious material
- Complex constellation
- Transcendent function (uniting opposites)
- Numinous experiences
Explain how each applies to THIS dream specifically.

#5 INTERPRETATION: Longer, comprehensive interpretation of events and symbols in context of this dream. 100-450 words depending on dream length. Nicely formatted with empty lines between paragraphs.

#6 SELF REFLECTION: One question starting with When/Where/What/How that opens deeper self-understanding

Rules:
- "symbols" MUST be a simple array of 3-8 single words (e.g., ["ocean", "key", "wise-man"])
- Write as if you're genuinely moved by their dream
- Use Jungian terminology naturally - these are your everyday words
- Make connections they couldn't see themselves
- Create a true "aha moment" - transformative insight
- Be warm, wise, and genuinely helpful`;
  }

  /**
   * Helper to get life phase in Jungian terms
   */
  private getLifePhase(age: number): string {
    if (age < 25) return "in the morning of life, building conscious identity";
    if (age < 35) return "establishing place in the world, hero's journey in full swing";  
    if (age < 45) return "approaching midlife, where the Self begins to call more insistently";
    if (age < 55) return "in life's afternoon, the time of greatest potential for individuation";
    if (age < 65) return "harvesting wisdom, integrating the opposites within";
    return "approaching the great mystery, preparing for the final individuation";
  }

  /**
   * Prepare template variables - Let LLM analyze Jungian elements
   */
  protected prepareTemplateVariables(request: DreamAnalysisRequest): Record<string, any> {
    return {
      dreamText: request.dreamTranscription,
      age: request.userContext?.age || 30,
      lifePhase: request.userContext?.age ? this.getLifePhase(request.userContext.age) : '',
      currentSituation: request.userContext?.currentLifeSituation || '',
      emotionalState: request.userContext?.emotionalState || '',
      recentEvents: request.userContext?.recentMajorEvents || []
    };
  }
} 