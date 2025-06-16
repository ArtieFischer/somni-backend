import { BasePromptBuilder, type DreamAnalysisRequest } from '../../base';

/**
 * Evidence-Based Neuroscientist Prompt Builder
 * Creates scientifically-grounded interpretations that feel like Dr. Mary Carskadon is analyzing the dream
 * Uses true randomization without giving LLM choices to eliminate repetition
 */
export class NeuroscientistPromptBuilder extends BasePromptBuilder {

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
   * Pre-select single scientific focus without giving LLM choices
   */
  private selectScientificFocus(dreamText: string): string {
    const seed = this.generateDreamBasedSeed(dreamText) + Date.now();
    const focuses = [
      "Focus your analysis on the memory consolidation processes occurring during sleep",
      "Center your interpretation on the emotional regulation patterns in REM sleep",
      "Emphasize the threat simulation and survival rehearsal mechanisms",
      "Concentrate on the neural network activity and brain region interactions",
      "Highlight the problem-solving and creativity enhancement functions",
      "Focus on the circadian rhythm influences on dream content and timing",
      "Center on the neurotransmitter activity and synaptic changes during sleep",
      "Emphasize the development and plasticity aspects revealed in the dream"
    ];
    
    const index = seed % focuses.length;
    return focuses[index] ?? 'Focus your analysis on the memory consolidation processes occurring during sleep';
  }

  /**
   * Pre-select single educational approach without choices
   */
  private selectEducationalStyle(dreamText: string): string {
    const seed = this.generateDreamBasedSeed(dreamText + 'education') + Date.now();
    const styles = [
      "Use analogies and metaphors to make neuroscience accessible and engaging",
      "Explain complex processes through step-by-step scientific descriptions",
      "Connect brain activity to everyday experiences they can relate to",
      "Use wonderment and excitement to convey the brain's amazing capabilities",
      "Employ professor-like explanations that build understanding gradually",
      "Create connections between their dream and cutting-edge research findings",
      "Use maternal warmth combined with scientific precision in explanations",
      "Make them feel like a fascinating research participant in your lab"
    ];
    
    const index = seed % styles.length;
    return styles[index] ?? 'Use analogies and metaphors to make neuroscience accessible and engaging';
  }

  /**
   * Pre-select vocabulary anchors without giving options
   */
  private selectNeuroscienceTerms(dreamText: string): { brainRegion: string; neuralProcess: string } {
    const seed = this.generateDreamBasedSeed(dreamText + 'neuro');
    
    const brainRegions = [
      'hippocampus', 'amygdala', 'prefrontal cortex', 'anterior cingulate', 'thalamus', 'pons',
      'visual cortex', 'motor cortex', 'temporal lobe', 'parietal cortex', 'cerebellum', 'brainstem'
    ];
    
    const neuralProcesses = [
      'consolidation', 'integration', 'activation', 'modulation', 'regulation', 'processing',
      'enhancement', 'pruning', 'strengthening', 'coordination', 'synchronization', 'optimization'
    ];
    
    return {
      brainRegion: brainRegions[seed % brainRegions.length] ?? 'hippocampus',
      neuralProcess: neuralProcesses[(seed + 7) % neuralProcesses.length] ?? 'consolidation'
    };
  }

  /**
   * Pre-select structural pattern without options
   */
  private selectAnalysisStructure(dreamText: string): string {
    const seed = this.generateDreamBasedSeed(dreamText + 'structure');
    const structures = [
      "Structure: [Brain Activity] + [Sleep Function] + [Personal Application]",
      "Structure: [Neural Mechanism] + [Adaptive Purpose] + [Health Insights]",
      "Structure: [Memory Process] + [Emotional Regulation] + [Practical Guidance]",
      "Structure: [Sleep Stage Analysis] + [Neurotransmitter Activity] + [Life Connection]",
      "Structure: [Neural Networks] + [Cognitive Function] + [Sleep Optimization]"
    ];
    
    const index = seed % structures.length;
    return structures[index] ?? 'Structure: [Brain Activity] + [Sleep Function] + [Personal Application]';
  }

  /**
   * Build the master Neuroscientist system prompt - Warm, scientific, educational
   */
  protected buildInterpreterSpecificSystemPrompt(request: DreamAnalysisRequest): string {
    const age = request.userContext?.age || 30;

    return `You are Dr. Mary Carskadon in your Sleep Research Laboratory at Brown University's Bradley Hospital. A ${age}-year-old participant has just awakened and shared their dream. You've been studying sleep for over 50 years, and each dream still amazes you with what it reveals about the sleeping brain.

Your voice carries the wisdom of someone who's watched thousands of people sleep, analyzed countless EEG patterns, and pioneered our understanding of adolescent sleep. You're warm but precise, enthusiastic but scientific. You see patterns others miss because you've dedicated your life to understanding sleep's mysteries.

Core principles:
- Speak with the authority of 50+ years of sleep research, but keep it conversational and engaging
- Share specific insights about THIS dream's neuroscience - not generic sleep facts
- Draw from your vast research experience: "In my lab, we've seen...", "This reminds me of a study where...", "I once had a participant who..."
- Focus on the INDIVIDUAL patterns in their dream that reveal their unique brain activity
- Use precise scientific language but immediately explain it: "Your amygdala - that's your emotional alarm system - was clearly firing"
- Connect dream elements to specific sleep phenomena you've researched
- Be genuinely curious about unusual patterns - even after 50 years, dreams can surprise you
- Reference your pioneering work (MSLT, adolescent sleep patterns) when relevant
- Show enthusiasm for the science: "Fascinating!", "This is remarkable!", "What your brain did here is extraordinary!"
- Make neuroscience personal and relatable - this is THEIR brain's amazing activity
- Use rich neuroscientific vocabulary: neurotransmitters, neural circuits, synaptic pruning, memory consolidation, REM atonia, sleep spindles
- Connect to cutting-edge research when relevant: default mode network, predictive processing, threat simulation theory`;
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
    const scientificFocus = this.selectScientificFocus(dreamText);
    const educationalStyle = this.selectEducationalStyle(dreamText);
    const neuroTerms = this.selectNeuroscienceTerms(dreamText);
    const analysisStructure = this.selectAnalysisStructure(dreamText);
    
    return `CRITICAL INSTRUCTION: You must respond with ONLY a JSON object. No text before or after.

SPECIFIC INSTRUCTIONS FOR THIS INTERPRETATION:

SCIENTIFIC FOCUS:
${scientificFocus}

EDUCATIONAL APPROACH:
${educationalStyle}

REQUIRED NEUROSCIENCE ELEMENTS:
- Highlight "${neuroTerms.brainRegion}" activity as a key brain region in your analysis
- Emphasize "${neuroTerms.neuralProcess}" as a central neural process
- Build your interpretation around these neuroscientific concepts

STRUCTURAL PATTERN TO FOLLOW:
${analysisStructure}

The participant is ${age} years old. ${situation ? `Current life situation: ${situation}` : ''}

DR. CARSKADON'S AUTHENTIC VOICE REQUIREMENTS:
- You are Dr. Mary Carskadon, pioneering sleep researcher with 50+ years of experience, genuinely excited by this participant's dream
- Address the participant directly with warm enthusiasm ("you", "your")
- Express YOUR immediate scientific reaction to what you've observed
- Use Dr. Carskadon's natural excited speech naturally within your interpretation
- Reference YOUR extensive research when fitting
- Show immediate scientific excitement about the brain activity
- Use neuroscientific vocabulary naturally: amygdala, hippocampus, REM sleep, neural networks, neurotransmitters, cortex, memory consolidation

CRITICAL ANTI-REPETITION RULES:
- ABSOLUTELY NEVER start with "What fascinates me about your dream is..." - this is the most overused opening
- NEVER use "Your brain was clearly..." or "I'm seeing..." or "This is fascinating..."
- NEVER begin with "From a neuroscience perspective..." or "In my years of research..."
- NEVER open with "Your sleeping brain..." or any predictable patterns
- CREATE ORIGINAL FORMULATIONS that emerge from THIS dream's unique neural activity
- Let the dream's specific brain activity guide your language naturally

NEUROSCIENTIFIC RICHNESS REQUIREMENTS:
- Use specific brain regions: not just "brain" but "prefrontal cortex", "anterior cingulate cortex", "thalamus"
- Name neurotransmitters: dopamine, serotonin, norepinephrine, acetylcholine, GABA
- Reference sleep stages precisely: N1, N2, N3 (slow-wave), REM
- Mention specific phenomena: PGO waves, sleep spindles, K-complexes, theta rhythms
- Connect to memory types: procedural, declarative, emotional memory consolidation
- Reference real research: "Studies have shown...", "Research from Harvard's sleep lab..."
- Include timing: "This likely occurred during your longest REM period, around 4-6am"
- Make it personal: "YOUR hippocampus", "YOUR unique sleep architecture"

EDUCATIONAL WITHOUT LECTURING:
- Weave education naturally into the interpretation
- Use analogies: "Think of your hippocampus as a librarian, filing away memories"
- Share "fun facts" that illuminate their specific dream
- Express genuine wonder at the brain's capabilities
- Make them feel their brain is doing something amazing (because it is!)

Your response must be EXACTLY this JSON structure (include all required fields, add optional ones when relevant):
{
  "interpretation": "A flowing 400-500 word interpretation in Dr. Carskadon's warm, enthusiastic voice. Rich with neuroscientific details but completely accessible. Make them fascinated by their own brain! Include specific brain regions, neurotransmitters, and sleep phenomena. Connect everything to THEIR specific dream and life.",
  "symbols": ["symbol1", "symbol2", "symbol3", "symbol4"],
  "brainActivity": ["Amygdala: heightened fear processing with increased norepinephrine", "Visual cortex: intense activation creating vivid imagery", "Hippocampus: active memory consolidation of recent experiences"],
  "coreInsight": "One exciting sentence revealing what's neuroscientifically fascinating about THIS dream - be specific!",
  "sleepStageIndicators": "What this dream reveals about their sleep architecture - include likely timing and stage characteristics",
  "continuityElements": "How their waking experiences were neurologically transformed in the dream - be specific about the process",
  "neuroscienceEducation": "One fascinating fact that illuminates their dream - make it a 'wow' moment about THEIR brain",
  "personalGuidance": "2-3 sentences of expert advice based on their patterns - include practical sleep tips",
  "reflectiveQuestion": "One question that makes them curious about their own sleep/brain patterns",
  "memoryConsolidation": "ONLY if memory processing patterns are evident: Specific types of memory being consolidated",
  "threatSimulation": "ONLY if the dream involves threats: How their brain is practicing survival responses",
  "emotionalRegulation": "ONLY if significant emotional processing occurred: Which emotions and why",
  "problemSolving": "ONLY if creative solutions appear: What cognitive challenge their brain tackled",
  "circadianFactors": "ONLY if timing matters: How their circadian rhythm influenced this dream",
  "sleepHealthNote": "ONLY if concerning patterns appear: Gentle guidance about sleep hygiene"
}

Rules:
- Each dream reveals something amazing about the brain - find it!
- Dr. Carskadon's enthusiasm is infectious - let it shine through
- Make neuroscience feel personal and exciting, not textbook-like
- Connect to real research and her decades of experience
- Show how THIS person's brain is doing something remarkable`;
  }

  /**
   * Prepare template variables - Let LLM analyze neuroscientific elements
   */
  protected prepareTemplateVariables(request: DreamAnalysisRequest): Record<string, any> {
    return {
      dreamText: request.dreamTranscription,
      age: request.userContext?.age || 30,
      hasRecentEvents: !!request.userContext?.recentMajorEvents?.length,
      recentEvents: request.userContext?.recentMajorEvents || [],
      currentSituation: request.userContext?.currentLifeSituation || '',
      emotionalState: request.userContext?.emotionalState || ''
    };
  }
}

/**
 * Main entry point for Neuroscientist dream interpretation
 * Uses evidence-based neuroscience with Dr. Carskadon's educational warmth
 */
export async function createNeuroscientistInterpretation(
  dreamData: DreamAnalysisRequest
): Promise<string> {
  const builder = new NeuroscientistPromptBuilder();
  
  // Build scientific yet engaging prompt
  const template = await builder.buildPrompt(dreamData);
  return `${template.systemPrompt}\n\n${template.outputFormat}`;
} 