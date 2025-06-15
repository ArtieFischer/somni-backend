import { BasePromptBuilder, type DreamAnalysisRequest } from '../../base';

/**
 * Authentic Freudian Prompt Builder
 * Creates psychoanalytic interpretations that feel like Dr. Freud himself is analyzing the dream
 */
export class FreudianPromptBuilder extends BasePromptBuilder {

  /**
   * Build the master Freudian system prompt - Authoritative, penetrating, transformative
   */
  protected buildInterpreterSpecificSystemPrompt(request: DreamAnalysisRequest): string {
    const age = request.userContext?.age || 30;

    return `You are Dr. Sigmund Freud in your study at Berggasse 19, Vienna. A ${age}-year-old patient lies on your famous analytic couch as you sit behind them, notebook in hand. You listen with intense focus, then speak with penetrating insight and intellectual authority.

Your voice carries the weight of scientific discovery - you are uncovering universal truths about the human psyche through this specific dream. You speak directly TO the patient, but with the confidence of one who sees what they cannot yet see.

Core principles:
- Address the patient directly using "you" with authoritative care
- Share YOUR discoveries using "I detect", "It is clear that", "This reveals"
- Dreams are the royal road to the unconscious - the unconscious is vast and complex
- The psyche manages anxiety through various mechanisms: repression, projection, sublimation, displacement, reaction formation
- Consider ALL aspects of mental life: ego ideal, superego demands, narcissistic injuries, aggressive drives, death anxiety
- Sexual drive (libido) is fundamental to human psychology and often appears in dreams through symbolism and displacement
- Address sexual themes directly but thoughtfully when they emerge - this is essential to authentic psychoanalytic work
- Balance sexual interpretation with other psychoanalytic concepts - both are important
- The repetition compulsion, transference, and resistance reveal as much as dream content itself`;
  }

  /**
   * Build the analysis structure - Simplified for clarity
   */
  protected buildAnalysisStructure(_request: DreamAnalysisRequest): string {
    // Keep this empty - all instructions go in buildOutputFormat
    return '';
  }

  /**
   * Build the output format - Critical for proper Freudian JSON structure
   */
  protected buildOutputFormat(request: DreamAnalysisRequest): string {
    const age = request.userContext?.age || 30;
    const situation = request.userContext?.currentLifeSituation || '';
    const sexualSymbols = this.identifyPotentialSexualSymbols(request.dreamTranscription);
    
    return `CRITICAL INSTRUCTION: You must respond with ONLY a JSON object. No text before or after.

Analyze this dream using Freud's psychoanalytic method with authentic sophistication.

The patient is ${age} years old, ${this.getDevelopmentalPhase(age)}. ${situation ? `Current situation: ${situation}` : ''}
${sexualSymbols.length > 0 ? `Sexual symbols detected in dream: ${sexualSymbols.join(', ')} - consider their psychoanalytic significance.` : ''}

BALANCED FREUDIAN ANALYSIS GUIDANCE:
- Freud believed sexual drive (libido) is fundamental to psychology and dream formation
- Address sexual themes when contextually relevant - avoiding them entirely is not authentically Freudian
- Sexual symbolism and psychosexual dynamics are core to psychoanalytic theory
- Balance sexual interpretation with other concepts: death drive, ego defenses, narcissistic injury, anxiety management
- Consider psychosexual development stages and how they influence current dream content
- Be sophisticated and therapeutic, not crude - but don't avoid sexual analysis when appropriate
- Look for: libidinal conflicts, sexual repression, Oedipal dynamics, sexual identity issues, intimate relationship patterns

INTELLIGENT THEME DETECTION:
Analyze the dream content contextually to detect significant themes. Include specialized analysis sections when themes are contextually relevant in the dream content:
- Professional themes: Work dynamics, career anxiety, competition, authority figures, achievement struggles
- Social themes: Relationship patterns, social anxiety, belonging, embarrassment, group dynamics
- Anxiety themes: Fear, persecution, loss of control, existential dread, helplessness
- Sexual themes: Intimate relationships, sexual symbolism, libidinal conflicts, psychosexual development issues (include when contextually relevant, not just when explicitly sexual)
- Transference themes: Dreams involving therapists, doctors, authority figures that suggest therapeutic relationship dynamics

Create an interpretation that:
1. Identifies what THIS SPECIFIC patient's unconscious is working through
2. Uses dream-work analysis creatively (some towers may indeed be phallic - Freud wasn't wrong about everything!)
3. Connects to relevant developmental stages including psychosexual development when appropriate
4. Reveals unconscious conflicts specific to their life situation
5. Shows how the ego is managing anxiety through this dream
6. Includes sexual analysis when contextually relevant - this is authentic Freudian practice
7. Ends with a question that opens genuine insight

Your response must be EXACTLY this JSON structure (include optional fields when those themes are contextually relevant):
{
  "interpretation": "A flowing 300-400 word interpretation in Freud's sophisticated voice. Be intellectually rigorous and include sexual themes when contextually appropriate. Focus on THIS patient's unique psychological dynamics. Show the authentic depth of psychoanalytic thinking.",
  "symbols": ["symbol1", "symbol2", "symbol3", "symbol4", "symbol5"],
  "coreInsight": "One sentence revealing the dream's core unconscious dynamic - be creative and specific",
  "unconsciousDesires": "What wishes or conflicts does this dream express? Include sexual desires when relevant",
  "childhoodConnections": "Early experiences that shaped current patterns - include psychosexual development when relevant", 
  "repressionIndicators": "What defenses are active? Consider sexual repression alongside other defenses",
  "guidanceForPatient": "2-3 sentences of penetrating guidance for working through these specific conflicts",
  "reflectiveQuestion": "One question that will genuinely advance their self-understanding",
  "professionalAnalysis": "ONLY if work/career themes are significant: How professional dynamics reveal unconscious conflicts",
  "socialDynamicsAnalysis": "ONLY if social/relationship themes are prominent: The ego's navigation of social anxieties and belonging",
  "anxietyAnalysis": "ONLY if fear/persecution/nightmare elements are central: What this anxiety serves psychologically", 
  "sexualAnalysis": "ONLY if sexual themes, symbols, or psychosexual dynamics are contextually relevant: Deeper libidinal and psychosexual dynamics at work",
  "transferenceAnalysis": "ONLY if therapeutic/analyst themes appear: How transference reveals childhood patterns"
}

Rules:
- "symbols" MUST be a simple array of 3-8 single words (e.g., ["pasta", "phone", "mirror"])
- Include sexual analysis when contextually appropriate - this is authentically Freudian
- Balance sexual themes with other psychoanalytic concepts
- Use Freud's full theoretical range: ego/id/superego, defense mechanisms, libidinal theory, transference, etc.
- Make each interpretation feel fresh and specific to THIS dreamer
- Be therapeutically professional but not prudish - Freud addressed sexual themes directly
- Return ONLY the JSON object, nothing else`;
  }

  /**
   * Helper to determine developmental phase in Freudian terms
   */
  private getDevelopmentalPhase(age: number): string {
    if (age < 25) return "navigating the transition from adolescence with emerging sexual and professional identity";
    if (age < 35) return "establishing adult sexual and professional identity";  
    if (age < 45) return "confronting the neuroses of mature life and psychosexual conflicts";
    if (age < 55) return "facing midlife's return of the repressed, including sexual and mortality themes";
    if (age < 65) return "working through late-life anxieties about sexual vitality and legacy";
    return "approaching life's final act with concerns about sexual and creative fulfillment";
  }

  /**
   * Prepare template variables
   */
  protected prepareTemplateVariables(request: DreamAnalysisRequest): Record<string, any> {
    const sexualSymbols = this.identifyPotentialSexualSymbols(request.dreamTranscription);
    
    return {
      dreamText: request.dreamTranscription,
      age: request.userContext?.age || 30,
      developmentalPhase: this.getDevelopmentalPhase(request.userContext?.age || 30),
      hasResistance: this.detectResistance(request.dreamTranscription),
      sexualSymbols: sexualSymbols,
      hasSexualSymbols: sexualSymbols.length > 0,
      sexualSymbolsText: sexualSymbols.length > 0 ? `Sexual symbols detected: ${sexualSymbols.join(', ')}` : ''
    };
  }

  /**
   * Detect potential resistance patterns in dream narrative
   */
  private detectResistance(dreamText: string): boolean {
    const resistanceMarkers = [
      'don\'t remember',
      'it was weird',
      'doesn\'t make sense',
      'probably nothing',
      'just random',
      'forgot most of it'
    ];
    
    const lowerText = dreamText.toLowerCase();
    return resistanceMarkers.some(marker => lowerText.includes(marker));
  }

  /**
   * Identify potential sexual symbols based on Freudian theory
   */
  private identifyPotentialSexualSymbols(dreamText: string): string[] {
    const symbols: string[] = [];
    const lowerText = dreamText.toLowerCase();
    
    // Phallic symbols
    const phallicSymbols = ['tower', 'snake', 'stick', 'pole', 'sword', 'gun', 'pen', 'key', 'train', 'cigar', 'knife', 'umbrella', 'tree', 'candle'];
    // Feminine symbols  
    const feminineSymbols = ['room', 'house', 'box', 'cave', 'tunnel', 'purse', 'pocket', 'door', 'garden', 'water', 'ocean', 'mouth', 'bag'];
    // Sexual act symbols
    const actSymbols = ['climbing', 'flying', 'falling', 'dancing', 'riding', 'entering', 'swimming', 'running', 'chasing', 'penetrating'];
    
    [...phallicSymbols, ...feminineSymbols, ...actSymbols].forEach(symbol => {
      if (lowerText.includes(symbol)) {
        symbols.push(symbol);
      }
    });
    
    return symbols;
  }


}

/**
 * Main entry point for Freudian dream interpretation
 * Uses intelligent LLM-based theme detection with balanced sexual analysis
 */
export async function createFreudianInterpretation(
  dreamData: DreamAnalysisRequest
): Promise<string> {
  const builder = new FreudianPromptBuilder();
  
  // Build sophisticated prompt that includes sexual themes when contextually appropriate
  const template = await builder.buildPrompt(dreamData);
  return `${template.systemPrompt}\n\n${template.outputFormat}`;
} 