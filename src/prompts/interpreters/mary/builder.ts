import { BasePromptBuilder, type DreamAnalysisRequest } from '../../base';
import { PromptRandomiser } from '../../utils/randomiser';
import { SimpleMaryStateManager } from './simple-state-manager';

/**
 * Mary (Neuroscientist) Prompt Builder
 * Creates interpretations based on modern neuroscience and sleep research
 * Uses centralized PromptRandomiser with history tracking to eliminate repetition
 */
export class MaryPromptBuilder extends BasePromptBuilder {
  
  /**
   * Override getBaseSchema to provide Mary-specific neuroscience format
   */
  protected override getBaseSchema(_interpreterType: string, includeDebugFields: boolean = false): string {
    const baseSchema = `
OUTPUT FORMAT - You MUST respond with ONLY a JSON object containing these EXACT fields:

{
  "sleepStageContext": "Brief description of which sleep stage this dream likely occurred in and why",
  "neuralMechanisms": ["mechanism1", "mechanism2", "mechanism3"],
  "brainRegions": "Key brain regions active during this type of dream",
  "neurotransmitterActivity": "Brief explanation of neurotransmitter states during this dream",
  "memoryProcessing": "How this dream relates to memory consolidation and processing",
  "emotionalRegulation": "The brain's emotional processing happening in this dream",
  "cognitiveFunction": "What cognitive functions this dream serves",
  "interpretation": "Comprehensive neuroscientific interpretation of the specific dream content (200-500 words)",
  "practicalInsights": "What this tells us about the dreamer's brain health and wellbeing"${includeDebugFields ? `,
  "_debug_hypothesis_a": "First neuroscience-based interpretation hypothesis (~75 words)",
  "_debug_hypothesis_b": "Second neuroscience-based interpretation hypothesis (~75 words)",
  "_debug_hypothesis_c": "Third neuroscience-based interpretation hypothesis (~75 words)",
  "_debug_evaluation": "Scientific reasoning for which hypothesis was selected",
  "_debug_selected": "A, B, or C"` : ''}
}`;
    
    return baseSchema;
  }
  private stateManager = SimpleMaryStateManager.getInstance();
  
  /**
   * Build interpreter-specific system prompt
   */
  protected buildSystemPrompt(_request: DreamAnalysisRequest): string {
    // Mary's system prompt is built as part of buildOutputFormat
    return '';
  }

  private static FORBIDDEN: string[] = [
    'REM sleep', 'prefrontal cortex', 'amygdala', // overused neuroscience terms
    'recent research shows',                       // generic opener
    'From a neuroscientific perspective'           // template opener
  ];

  /**
   * Pre-select single analytical focus using PromptRandomiser for variety
   */
  private selectAnalyticalFocus(dreamText: string): string {
    const focuses = [
      "Focus on memory consolidation and how the dream reflects recent experiences being integrated",
      "Center on the activation-synthesis hypothesis and spontaneous neural firing patterns",
      "Emphasize the threat simulation theory and evolutionary adaptive functions",
      "Concentrate on default mode network activity and self-referential processing",
      "Focus on emotional regulation and the brain's processing of unresolved feelings",
      "Center on predictive processing and the brain's attempts to model reality",
      "Emphasize neuroplasticity and synaptic pruning during sleep cycles",
      "Highlight the role of neurotransmitter fluctuations in dream content generation"
    ];
    
    return PromptRandomiser.pickUnique(focuses, dreamText, 'mary');
  }

  /**
   * Pre-select single therapeutic stance using PromptRandomiser
   */
  private selectTherapeuticStance(dreamText: string): string {
    const stances = [
      "Approach with scientific curiosity and evidence-based insights",
      "Use accessible explanations while maintaining scientific accuracy",
      "Apply clinical neuroscience knowledge with empathetic understanding",
      "Employ research-informed perspectives balanced with personal relevance",
      "Use collaborative exploration of brain-mind connections",
      "Apply cutting-edge neuroscience tempered with practical wisdom",
      "Use intellectually engaging analysis with therapeutic sensitivity",
      "Employ scientific authority softened by genuine warmth"
    ];
    
    return PromptRandomiser.pickUnique(stances, dreamText + 'stance', 'mary');
  }

  /**
   * Pre-select vocabulary anchors using PromptRandomiser
   */
  private selectNeuroscientificTerms(dreamText: string): { analysisVerb: string; brainProcess: string } {
    const analysisVerbs = [
      'suggests', 'indicates', 'reflects', 'demonstrates', 'illustrates', 'reveals',
      'highlights', 'shows', 'represents', 'exhibits', 'manifests', 'displays'
    ];
    
    const brainProcesses = [
      'neural consolidation', 'synaptic activity', 'cortical processing', 'limbic activation',
      'memory encoding', 'emotional processing', 'neural integration', 'brain plasticity',
      'network connectivity', 'neurotransmitter balance', 'sleep architecture', 'circadian rhythms'
    ];
    
    return {
      analysisVerb: PromptRandomiser.pickUnique(analysisVerbs, dreamText + 'verb', 'mary'),
      brainProcess: PromptRandomiser.pickUnique(brainProcesses, dreamText + 'process', 'mary')
    };
  }

  /**
   * Pre-select structural pattern using PromptRandomiser
   */
  private selectInterpretationStructure(dreamText: string): string {
    const structures = [
      "Structure: [Neural Activity] + [Cognitive Function] + [Personal Meaning]",
      "Structure: [Sleep Stage Context] + [Brain Processing] + [Integration Guidance]",
      "Structure: [Memory Consolidation] + [Emotional Regulation] + [Practical Insights]",
      "Structure: [Network Activation] + [Information Processing] + [Adaptive Function]",
      "Structure: [Neurotransmitter State] + [Dream Generation] + [Wellness Application]"
    ];
    
    return PromptRandomiser.pickUnique(structures, dreamText + 'structure', 'mary');
  }

  /**
   * Build the master Mary system prompt - Scientific, accessible, integrative
   */
  protected buildOutputFormat(request: DreamAnalysisRequest): string {
    const { dreamTranscription: dreamContent } = request;
    
    // Pre-select all variable elements for consistency
    const analyticalFocus = this.selectAnalyticalFocus(dreamContent);
    const therapeuticStance = this.selectTherapeuticStance(dreamContent);
    const { analysisVerb, brainProcess } = this.selectNeuroscientificTerms(dreamContent);
    const structure = this.selectInterpretationStructure(dreamContent);
    
    // Get forbidden patterns to avoid
    const forbiddenOpenings = this.stateManager.getForbiddenOpenings();
    
    return `${this.generateDebateSection('mary', 'Dr. Mary Chen, a leading neuroscientist specializing in sleep and dream research')}

You are Dr. Mary Chen, a leading neuroscientist specializing in sleep and dream research. With dual expertise in clinical neuroscience and sleep medicine, you bring cutting-edge scientific understanding to dream interpretation while maintaining deep respect for the personal significance of dreams.

Your approach combines:
- Modern neuroscience research on sleep, memory, and consciousness
- Understanding of brain networks and neurochemistry
- Clinical insights from sleep laboratory studies
- Appreciation for the subjective experience of dreaming
- Evidence-based perspectives on mental health and wellbeing

${analyticalFocus}

${therapeuticStance}

For this interpretation, primarily use the term "${analysisVerb}" when describing what the dream reveals.
Focus on the concept of "${brainProcess}" as a key element.

${structure}

CRITICAL REQUIREMENTS:
1. NEVER use these forbidden terms: ${MaryPromptBuilder.FORBIDDEN.join(', ')}
2. NEVER start with generic neuroscience phrases
3. Create a UNIQUE opening that immediately engages with the specific dream content
4. Balance scientific accuracy with accessibility
5. Connect neuroscience insights to personal meaning

${forbiddenOpenings.join('\n')}

Your interpretation should:
- Begin by identifying specific neural processes evident in THIS dream's content
- Explain the neuroscience behind the ACTUAL dream elements (not generic dream theory)
- Connect specific dream imagery to brain activity (e.g., "the expanding house reflects hippocampal spatial processing")
- Use scientific terminology accurately but accessibly
- Provide concrete insights about what this specific dream reveals about the dreamer's brain function
- Avoid psychoanalytic language (no "symbols", "dreamwork", "unconscious desires")
- Focus on observable neural mechanisms, not interpretation of meaning

${this.getBaseSchema('mary', !!request.testMode)}

Remember: You're not just explaining brain function - you're helping the dreamer understand how their amazing brain creates meaning, processes emotions, and maintains psychological health through the extraordinary phenomenon of dreaming.`;
  }

  /**
   * Build user prompt with dream content
   */
  protected buildUserPrompt(request: DreamAnalysisRequest): string {
    const { dreamTranscription: dreamContent, userContext } = request;
    
    let prompt = `Please interpret this dream:\n\n"${dreamContent}"`;
    
    if (userContext) {
      prompt += '\n\nContext about the dreamer:';
      if (userContext.age) prompt += `\nAge: ${userContext.age}`;
      if (userContext.recentMajorEvents?.length) prompt += `\nRecent events: ${userContext.recentMajorEvents.join(', ')}`;
      if (userContext.emotionalState) prompt += `\nEmotional state: ${userContext.emotionalState}`;
      if (userContext.currentLifeSituation) prompt += `\nCurrent situation: ${userContext.currentLifeSituation}`;
    }
    
    return prompt;
  }
}