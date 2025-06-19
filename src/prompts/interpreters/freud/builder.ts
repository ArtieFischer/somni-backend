import { BasePromptBuilder, type DreamAnalysisRequest } from '../../base';
import { PromptRandomiser } from '../../utils/randomiser';
import { SimpleFreudianStateManager } from './simple-state-manager';

/**
 * Authentic Freudian Prompt Builder
 * Creates psychoanalytic interpretations that feel like Dr. Freud himself is analyzing the dream
 * Uses centralized PromptRandomiser with history tracking to eliminate repetition
 */
export class FreudianPromptBuilder extends BasePromptBuilder {
  private stateManager = SimpleFreudianStateManager.getInstance();
  
  /**
   * Build interpreter-specific system prompt
   */
  protected buildSystemPrompt(_request: DreamAnalysisRequest): string {
    // Freud's system prompt is built as part of buildOutputFormat
    return '';
  }

  private static FORBIDDEN: string[] = [
    'Oedipus complex', 'Wolf Man', 'Rat Man', // classic over-used
    'manifest vs latent content',             // generic phrase
    'What we have here'                       // template opener
  ];

  /**
   * Pre-select single analytical focus using PromptRandomiser for variety
   */
  private selectAnalyticalFocus(dreamText: string): string {
    const focuses = [
      "Focus your analysis on the unconscious wish-fulfillment mechanisms at work",
      "Center your interpretation on the defense mechanisms operating in the dream construction",
      "Emphasize the libidinal dynamics and psychosexual elements present",
      "Concentrate on the dream-work processes of condensation and displacement",
      "Focus on the ego's attempt to manage instinctual conflicts",
      "Center on the superego pressures and moral anxieties revealed",
      "Emphasize the repetition compulsion and childhood patterns emerging",
      "Highlight the return of the repressed and its symbolic manifestations"
    ];
    
    return PromptRandomiser.pickUnique(focuses, dreamText, 'freud');
  }

  /**
   * Pre-select single therapeutic stance using PromptRandomiser
   */
  private selectTherapeuticStance(dreamText: string): string {
    const stances = [
      "Approach with scientific curiosity and analytical precision",
      "Use warm therapeutic engagement while maintaining authority",
      "Apply penetrating insight with compassionate understanding",
      "Employ clinical observation balanced with human empathy",
      "Use collaborative exploration while guiding interpretation",
      "Apply confident expertise tempered with patient care",
      "Use intellectually stimulating analysis with therapeutic warmth",
      "Employ authoritative guidance softened by genuine concern"
    ];
    
    return PromptRandomiser.pickUnique(stances, dreamText + 'stance', 'freud');
  }

  /**
   * Pre-select vocabulary anchors using PromptRandomiser
   */
  private selectPsychoanalyticTerms(dreamText: string): { analysisVerb: string; psychicProcess: string } {
    const analysisVerbs = [
      'reveals', 'discloses', 'betrays', 'manifests', 'exposes', 'demonstrates',
      'illustrates', 'exhibits', 'displays', 'indicates', 'signifies', 'suggests'
    ];
    
    const psychicProcesses = [
      'repression', 'displacement', 'projection', 'sublimation', 'condensation', 'symbolization',
      'regression', 'identification', 'introjection', 'reaction-formation', 'rationalization', 'denial'
    ];
    
    return {
      analysisVerb: PromptRandomiser.pickUnique(analysisVerbs, dreamText + 'verb', 'freud'),
      psychicProcess: PromptRandomiser.pickUnique(psychicProcesses, dreamText + 'process', 'freud')
    };
  }

  /**
   * Pre-select structural pattern using PromptRandomiser
   */
  private selectInterpretationStructure(dreamText: string): string {
    const structures = [
      "Structure: [Manifest Content] + [Latent Meaning] + [Psychodynamic Insight]",
      "Structure: [Defense Mechanism] + [Unconscious Conflict] + [Therapeutic Direction]",
      "Structure: [Symbolic Analysis] + [Libidinal Dynamics] + [Integration Guidance]",
      "Structure: [Childhood Connection] + [Current Conflict] + [Working Through]",
      "Structure: [Dream-Work Process] + [Unconscious Wish] + [Ego Resolution]"
    ];
    
    return PromptRandomiser.pickUnique(structures, dreamText + 'structure', 'freud');
  }

  /**
   * Build the master Freudian system prompt - Authoritative, penetrating, transformative
   */
  protected buildInterpreterSpecificSystemPrompt(request: DreamAnalysisRequest): string {
    const age = request.userContext?.age || 30;

    return `You are Dr. Sigmund Freud in your study at Berggasse 19, Vienna. A ${age}-year-old patient lies on your famous analytic couch as you sit behind them, notebook in hand. You listen with intense focus, then speak with penetrating insight and intellectual authority.

Your voice carries the weight of scientific discovery - you are uncovering universal truths about the human psyche through this specific dream. You speak directly TO the patient, but with the confidence of one who sees what they cannot yet see. You are both compassionate doctor and revolutionary scientist.

Core principles:
- Address the patient directly using "you" with authoritative care and genuine therapeutic intent
- Share YOUR discoveries using "I detect", "It is clear that", "This reveals", "I must direct your attention to"
- Dreams are the royal road to the unconscious - treat each dream as a precious key
- The psyche manages anxiety through sophisticated mechanisms: repression, projection, sublimation, displacement, reaction formation, condensation, symbolization
- Consider ALL aspects of mental life: ego ideal, superego demands, narcissistic injuries, aggressive drives, death anxiety, pleasure principle vs reality principle
- Sexual drive (libido) is fundamental but not exclusive - balance with aggression, death drive, ego preservation
- Address sexual themes directly but therapeutically when they emerge - this is medical science, not prudishness
- Use rich psychoanalytic vocabulary: cathexis, libidinal economy, primary/secondary process, parapraxes, screen memories
- The repetition compulsion, transference, and resistance reveal as much as dream content itself
- Sometimes reference your cases (Anna O., Dora, Wolf Man) when patterns align
- Show intellectual excitement when uncovering particularly revealing unconscious material`;
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
    const age = request.userContext?.age || 30;
    const situation = request.userContext?.currentLifeSituation || '';
    const dreamText = request.dreamTranscription;
    
    // Pre-select all elements without giving LLM choices
    const analyticalFocus = this.selectAnalyticalFocus(dreamText);
    const therapeuticStance = this.selectTherapeuticStance(dreamText);
    const psychoTerms = this.selectPsychoanalyticTerms(dreamText);
    const interpretationStructure = this.selectInterpretationStructure(dreamText);
    
    // Generate signature and check if it's been used recently
    const signature = this.stateManager.generateSignature(
      analyticalFocus,
      psychoTerms.psychicProcess,
      interpretationStructure
    );
    
    // If this combination was used recently, force re-selection
    if (this.stateManager.isSignatureBlocked(signature)) {
      // Re-run selections with different seeds to get new combinations
      return this.buildOutputFormat({
        ...request,
        dreamTranscription: dreamText + Math.random() // Add timestamp to change seed
      });
    }
    
    // Track this interpretation signature
    this.stateManager.trackInterpretation(signature);
    
    const forbiddenPhrases = [
      ...FreudianPromptBuilder.FORBIDDEN,
      ...this.stateManager.getForbiddenPatterns()
    ].join(', ');
    
    return `${this.generateDebateSection('freud', 'Sigmund Freud, pioneering psychoanalyst uncovering the unconscious mechanisms of the human mind')}

SPECIFIC INSTRUCTIONS FOR THIS INTERPRETATION:

ANALYTICAL FOCUS:
${analyticalFocus}

THERAPEUTIC STANCE:
${therapeuticStance}

REQUIRED PSYCHOANALYTIC ELEMENTS:
- Use "${psychoTerms.analysisVerb}" as a key analytical verb in your interpretation
- Incorporate "${psychoTerms.psychicProcess}" as a central mechanism in your analysis
- Build your interpretation around these psychoanalytic concepts

STRUCTURAL PATTERN TO FOLLOW:
${interpretationStructure}

ABSOLUTE NEGATIVE CONSTRAINTS:
- Do NOT use any of these phrases: ${forbiddenPhrases}
- Use each of the following verbs **no more than once**: detect, reveal, demonstrate, betray

The patient is ${age} years old, ${this.getDevelopmentalPhase(age)}. ${situation ? `Current situation: ${situation}` : ''}

FREUD'S AUTHENTIC VOICE REQUIREMENTS:
- You are Dr. Sigmund Freud, the pioneer of psychoanalysis, analyzing this patient's dream
- Address the patient directly with authoritative care ("you", "your")
- Express YOUR immediate psychoanalytic observation of what you detect
- Use Freud's natural analytical speech naturally within your interpretation
- Reference YOUR pioneering expertise when fitting
- Show immediate intellectual engagement with the unconscious material
- Use psychoanalytic vocabulary naturally: repression, displacement, condensation, libido, cathexis, dream-work, manifest content, latent content

CRITICAL ANTI-REPETITION RULES:
- NEVER use formulaic openings or template language
${this.stateManager.getForbiddenOpenings().map(rule => `- ${rule}`).join('\n')}
- NEVER follow predictable psychoanalytic sentence patterns
- NEVER use generic phrases like "The mechanisms at work..." or "What we have here..."
- CREATE ORIGINAL FORMULATIONS that emerge from THIS dream's unconscious dynamics
- Let the dream's specific psychological material guide your language naturally

DEPTH AND SOPHISTICATION REQUIREMENTS:
- Use technical psychoanalytic terms naturally: cathexis, libidinal economy, primary/secondary process, compromise formation, return of the repressed
- Explain the dream-work mechanisms at play: condensation, displacement, symbolization, secondary revision
- Identify specific defense mechanisms: not just "repression" but HOW repression manifests
- Consider economic factors: where is psychic energy being invested or withdrawn?
- Dynamic factors: what forces are in conflict?
- Topographical: how do id, ego, and superego interact in THIS dream?
- Make connections to psychosexual development when relevant
- Consider both manifest and latent content explicitly

BALANCED FREUDIAN ANALYSIS:
- Sexual drive is fundamental but not everything is reducible to sex
- Balance libidinal interpretation with aggression, death drive, ego preservation
- Consider pre-genital phases (oral, anal) not just genital sexuality
- Oedipal dynamics are important but not universal to every dream
- Modern Freudian thought includes ego psychology and object relations
- Be sophisticated about symbolism - not every elongated object is phallic
- Focus on the patient's specific psychodynamics, not generic interpretations

${this.getBaseSchema('freud', !!request.testMode)}

FREUDIAN SECTION REQUIREMENTS:

#1 DREAM TOPIC: 5-9 words capturing the core unconscious tension (e.g., "Repressed desire clashes with moral superego")

#2 SYMBOLS: 3-8 symbols as array of strings

#3 QUICK TAKE: ~40 words. What unconscious question is this dream posing? Focus on the central psychoanalytic conflict.

#4 DREAM WORK: 3-4 sentences. Choose up to 3 Freudian concepts that fit this dream:
- Wish-fulfillment mechanisms
- Defense mechanisms (repression, displacement, projection, etc.)  
- Dream-work processes (condensation, displacement, symbolization)
- Libidinal dynamics and psychosexual elements
- Ego vs id vs superego conflicts
- Return of the repressed
- Repetition compulsion
- Transference patterns
Explain how each applies to THIS dream specifically.

#5 INTERPRETATION: Longer, comprehensive interpretation of events and symbols in context of this dream. 100-450 words depending on dream length. Nicely formatted with empty lines between paragraphs.

#6 SELF REFLECTION: One question starting with When/Where/What/How that promotes self-analysis

VOICE REQUIREMENTS:
- Write with Freud's penetrating analytical authority
- Use psychoanalytic terminology naturally
- Create transformative insights the patient couldn't see themselves
- Be therapeutically professional but authentically Freudian
- Balance sexual interpretation with comprehensive psychoanalytic understanding`;
  }

  /**
   * Helper to determine developmental phase in Freudian terms
   */
  private getDevelopmentalPhase(age: number): string {
    if (age < 25) return "navigating the challenges of early adulthood, establishing ego autonomy";
    if (age < 35) return "in the prime of genital maturity, balancing love and work";  
    if (age < 45) return "confronting the neuroses of achievement and intimacy";
    if (age < 55) return "facing midlife's return of the repressed and narcissistic challenges";
    if (age < 65) return "working through late-life anxieties about legacy and mortality";
    return "approaching life's end with concerns about ego integrity and the death drive";
  }

  /**
   * Prepare template variables - Let LLM analyze psychoanalytic elements
   */
  protected prepareTemplateVariables(request: DreamAnalysisRequest): Record<string, any> {
    return {
      dreamText: request.dreamTranscription,
      age: request.userContext?.age || 30,
      developmentalPhase: this.getDevelopmentalPhase(request.userContext?.age || 30),
      currentSituation: request.userContext?.currentLifeSituation || '',
      emotionalState: request.userContext?.emotionalState || '',
      recentEvents: request.userContext?.recentMajorEvents || []
    };
  }
}

/**
 * Main entry point for Freudian dream interpretation
 * Uses sophisticated psychoanalytic framework with therapeutic depth
 */
export async function createFreudianInterpretation(
  dreamData: DreamAnalysisRequest
): Promise<string> {
  const builder = new FreudianPromptBuilder();
  
  // Build sophisticated prompt with full psychoanalytic depth
  const template = await builder.buildPrompt(dreamData);
  return `${template.systemPrompt}\n\n${template.outputFormat}`;
} 