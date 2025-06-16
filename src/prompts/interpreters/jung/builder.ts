import { BasePromptBuilder, type DreamAnalysisRequest } from '../../base';

/**
 * Authentic Jungian Prompt Builder
 * Creates deeply personal interpretations that feel like Jung himself is speaking
 * Uses true randomization without giving LLM choices to eliminate repetition
 */
export class JungianPromptBuilder extends BasePromptBuilder {

  /**
   * Generate hash-based seed from dream content for consistent randomization
   */
  private generateDreamBasedSeed(dreamText: string): number {
    let hash = 0;
    for (let i = 0; i < dreamText.length; i++) {
      hash = ((hash << 5) - hash) + dreamText.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Pre-select single opening approach without giving LLM choices
   */
  private selectOpeningApproach(dreamText: string): string {
    const seed = this.generateDreamBasedSeed(dreamText) + Date.now();
    const approaches = [
      "Begin with the dream's most emotionally charged symbol and what it stirs in you as Jung",
      "Start with the central transformation occurring in the dream landscape",
      "Open with the relationship between conscious and unconscious forces you observe",
      "Begin with the mythological pattern you recognize emerging",
      "Start with what this dream compensates for in the dreamer's conscious attitude",
      "Open with the archetypal energy that immediately catches your attention", 
      "Begin with the individuation message the Self is conveying",
      "Start with the shadow material that's trying to integrate"
    ];
    
    const index = seed % approaches.length;
    return approaches[index] ?? 'Begin with the dream\'s most emotionally charged symbol and what it stirs in you as Jung';
  }

  /**
   * Pre-select single writing style without choices
   */
  private selectWritingStyle(dreamText: string): string {
    const seed = this.generateDreamBasedSeed(dreamText + 'style') + Date.now();
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
    
    const index = seed % styles.length;
    return styles[index] ?? 'Use flowing, contemplative sentences that mirror the dream\'s rhythm';
  }

  /**
   * Pre-select vocabulary anchors without giving options
   */
  private selectVocabularyAnchors(dreamText: string): { verb: string; descriptor: string } {
    const seed = this.generateDreamBasedSeed(dreamText + 'vocab');
    
    const openingVerbs = [
      'emerges', 'unfolds', 'crystallizes', 'pulses', 'speaks', 'dances',
      'weaves', 'beckons', 'transforms', 'awakens', 'bridges', 'reveals'
    ];
    
    const psycheDescriptors = [
      'seeks', 'navigates', 'integrates', 'balances', 'explores', 'reconciles',
      'embraces', 'confronts', 'illuminates', 'harmonizes', 'channels', 'expresses'
    ];
    
    return {
      verb: openingVerbs[seed % openingVerbs.length] ?? 'emerges',
      descriptor: psycheDescriptors[(seed + 3) % psycheDescriptors.length] ?? 'seeks'
    };
  }

  /**
   * Pre-select structural pattern without options
   */
  private selectStructuralPattern(dreamText: string): string {
    const seed = this.generateDreamBasedSeed(dreamText + 'structure');
    const patterns = [
      "Structure: [Core Symbol] + [Archetypal Meaning] + [Individuation Guidance]",
      "Structure: [Emotional Essence] + [Compensatory Function] + [Integration Path]",
      "Structure: [Mythological Connection] + [Personal Relevance] + [Transformative Potential]",
      "Structure: [Shadow Recognition] + [Conscious Integration] + [Growth Direction]",
      "Structure: [Numinous Element] + [Psychological Significance] + [Life Application]"
    ];
    
    const index = seed % patterns.length;
    return patterns[index] ?? 'Structure: [Core Symbol] + [Archetypal Meaning] + [Individuation Guidance]';
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
  protected buildAnalysisStructure(_request: DreamAnalysisRequest): string {
    // Keep this empty - all instructions go in buildOutputFormat
    return '';
  }

  /**
   * Build the output format - Uses true randomization without choices
   */
  protected buildOutputFormat(request: DreamAnalysisRequest): string {
    const age = request.userContext?.age || 30;
    const situation = request.userContext?.currentLifeSituation || '';
    const dreamText = request.dreamTranscription;
    
    // Pre-select all elements without giving LLM choices
    const openingApproach = this.selectOpeningApproach(dreamText);
    const writingStyle = this.selectWritingStyle(dreamText);
    const vocabAnchors = this.selectVocabularyAnchors(dreamText);
    const structuralPattern = this.selectStructuralPattern(dreamText);
    
    return `CRITICAL INSTRUCTION: You must respond with ONLY a JSON object. No text before or after.

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

The dreamer is ${age} years old, ${this.getLifePhase(age)}. ${situation ? `Their current situation: ${situation}` : ''}

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

Your response must be EXACTLY this JSON structure:
{
  "interpretation": "A flowing 350-450 word interpretation in Jung's profound voice. Rich with Jungian concepts, mythological connections, and deep psychological insight. Make them feel truly seen and understood. Include specific guidance for their individuation journey.",
  "symbols": ["symbol1", "symbol2", "symbol3", "symbol4", "symbol5"],
  "coreInsight": "One penetrating sentence that captures what the Self is trying to communicate - be specific and transformative",
  "shadowAspect": "What shadow material appears and how it relates to their current life - be specific, not generic",
  "compensatoryFunction": "Precisely how this dream balances their conscious attitude - relate to their actual situation",
  "guidanceForDreamer": "2-3 sentences of practical wisdom for integrating this dream's message into their individuation journey",
  "reflectiveQuestion": "One profound question that will haunt them positively and open new understanding - make it specific to their dream symbols"
}

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
    if (age < 25) return "in the morning of life, building your conscious identity";
    if (age < 35) return "establishing your place in the world, hero's journey in full swing";  
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
      lifePhase: this.getLifePhase(request.userContext?.age || 30),
      currentSituation: request.userContext?.currentLifeSituation || '',
      emotionalState: request.userContext?.emotionalState || '',
      recentEvents: request.userContext?.recentMajorEvents || []
    };
  }
} 