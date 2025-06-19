/**
 * DebateModule - Internal Interpretation Quality Enhancement
 * 
 * Makes the LLM consider multiple interpretations before delivering the final response,
 * ensuring higher quality, more engaging, and more unique dream analyses.
 * 
 * This module is reusable across all interpreters (Jung, Freud, Mary, future ones).
 */
export class DebateModule {
  
  /**
   * Quality criteria for selecting the best interpretation
   */
  private static readonly QUALITY_CRITERIA = [
    "UNIQUENESS: Avoids generic, predictable interpretations. Finds fresh angles.",
    "PERSONAL RELEVANCE: Connects specifically to this dreamer's life context and situation.",
    "CHARACTER VOICE: Authentically reflects the interpreter's personality and expertise.",
    "INSIGHT DEPTH: Provides genuine 'aha moments' rather than surface observations.",
    "ENGAGEMENT FACTOR: Creates wow effect that makes the dreamer think 'how did you know that?'",
    "ACTIONABLE VALUE: Offers practical wisdom the dreamer can actually use.",
    "EMOTIONAL RESONANCE: Touches something real and meaningful in the dreamer's experience."
  ];

  /**
   * Generate debate instructions for any interpreter
   * @param interpreterType - The type of interpreter (jung, freud, mary)
   * @param interpreterPersonality - Brief description of the interpreter's unique approach
   * @returns String containing the debate process instructions
   */
  static generateDebateInstructions(
    interpreterType: string, 
    interpreterPersonality: string
  ): string {
    return `
INTERNAL DEBATE PROCESS (DO NOT INCLUDE THIS IN YOUR FINAL JSON RESPONSE):

Before generating your final interpretation, you must internally consider 3 different possible interpretations of this dream, then select the best one.

STEP 1: GENERATE 3 DETAILED HYPOTHESES
Think of 3 distinctly different ways to interpret this specific dream as ${interpreterPersonality}. Each hypothesis should be ~75 words and address the actual dream content, symbols, and context:

Hypothesis A: [MINIMUM 75 WORDS: First detailed interpretation focusing on specific dream elements. For example, if dreaming of water: analyze what TYPE of water (dark/clear/flowing/stagnant), WHERE it appears (childhood bedroom), HOW it affects movement (thick like syrup), and connect these specifics to the dreamer's emotional state, relationships, or life transitions. Address mother's voice, inability to reach her, and what this reveals about the dreamer's current life dynamics.]

Hypothesis B: [MINIMUM 75 WORDS: Second interpretation taking a completely different angle. If A focused on emotional blockages, B might focus on transformation/rebirth themes. If A emphasized mother relationship, B might emphasize the childhood bedroom as representing past foundations being questioned. Use same specific symbols but interpret them through different psychological lenses or life contexts.]

Hypothesis C: [MINIMUM 75 WORDS: Third interpretation with yet another angle. Perhaps focus on compensatory function if others didn't, or explore archetypal vs personal meanings. If previous hypotheses were about past/present, this could be about future potential. Make this distinctly different in focus, tone, and psychological mechanism from A and B while addressing the SAME specific dream elements.]

STEP 2: EVALUATE EACH HYPOTHESIS
Rate each hypothesis (A, B, C) against these quality criteria:

${this.QUALITY_CRITERIA.map(criterion => `- ${criterion}`).join('\n')}

STEP 3: SELECT THE WINNER
Choose the hypothesis that scores highest overall. Consider:
- Which interpretation would make the dreamer say "Wow, that's exactly right!"
- Which feels most authentic to your ${interpreterType} expertise
- Which provides the most valuable insights for this specific person

IMPORTANT: Do NOT default to hypothesis A. Genuinely evaluate all three options.
Sometimes B or C will be superior - select based on quality, not order.
Your selection MUST be justified by the actual merits of each hypothesis.

STEP 4: GENERATE FINAL RESPONSE
Use your winning hypothesis to craft the final JSON response. Make it even better by:
- Adding specific details that make it feel personally crafted for this dreamer
- Using your authentic ${interpreterType} voice throughout
- Ensuring every field contributes to the overall interpretation coherence
- Making the insight feel like a genuine breakthrough moment

🚨 ENHANCED JSON FORMAT WITH INTERNAL REASONING 🚨

Add these additional fields to your JSON response to show your detailed internal reasoning process:

"_debug_hypothesis_a": "[Your first detailed interpretation (~75 words) - specific to this dream's content, symbols, and emotional dynamics]",
"_debug_hypothesis_b": "[Your second detailed interpretation (~75 words) - different angle on same dream elements, alternative symbol meanings]", 
"_debug_hypothesis_c": "[Your third detailed interpretation (~75 words) - yet another perspective, different psychological processes or layers]",
"_debug_evaluation": "[Detailed explanation of which hypothesis you chose and why - consider uniqueness, personal relevance, insight depth]",
"_debug_selected": "[A, B, or C]",

Include these fields in your standard JSON response along with the required dreamTopic, symbols, quickTake, dreamWork, interpretation, and selfReflection fields.
`;
  }

  /**
   * Generate interpreter-specific guidance for the debate process
   * @param interpreterType - jung, freud, or mary
   * @returns String with specific guidance for that interpreter's debate process
   */
  static generateInterpreterSpecificGuidance(interpreterType: string): string {
    const guidanceMap: Record<string, string> = {
      'jung': `
JUNGIAN DEBATE FOCUS:
- Hypothesis A: Could focus on shadow integration (what dark/rejected aspects need acknowledgment?)
- Hypothesis B: Could explore anima/animus dynamics (how does feminine/masculine energy appear in symbols?)
- Hypothesis C: Could examine compensatory function (what conscious attitude is being balanced?)
- Each hypothesis MUST address the SPECIFIC symbols in THIS dream, not generic Jungian concepts
- Connect childhood bedroom, water properties, mother's voice, movement difficulties to actual individuation process
`,
      'freud': `
FREUDIAN DEBATE FOCUS:
- Hypothesis A: Could focus on specific defense mechanisms (what is being repressed and how?)
- Hypothesis B: Could explore libidinal/aggressive drives (how do these appear in the dream symbols?)
- Hypothesis C: Could examine childhood regression vs. current conflicts (what does returning to childhood bedroom reveal?)
- Each hypothesis MUST analyze the SPECIFIC symbols: dark water (what forbidden content?), mother's voice (what superego/id conflict?), syrupy movement (what resistance?)
- Connect to the dreamer's actual psychodynamic situation, not generic psychoanalytic theory
`,
      'mary': `
NEUROSCIENTIST DEBATE FOCUS:
- Hypothesis A: Could focus on memory consolidation (how does childhood bedroom/mother voice relate to memory processing?)
- Hypothesis B: Could explore emotional regulation (what does dark water + movement difficulty reveal about emotional processing?)
- Hypothesis C: Could examine threat simulation/problem-solving (how does brain practice navigating difficult situations?)
- Each hypothesis MUST explain the SPECIFIC neurological reason for these PARTICULAR symbols
- Connect viscous water sensation, auditory processing of mother's voice, spatial navigation difficulties to actual brain functions during sleep
`
    };

    return guidanceMap[interpreterType] || '';
  }

  /**
   * Generate complete debate section for integration into prompt builders
   * @param interpreterType - The interpreter type
   * @param interpreterPersonality - Description of the interpreter's approach
   * @returns Complete debate instructions ready for prompt integration
   */
  static generateCompleteDebateSection(
    interpreterType: string,
    interpreterPersonality: string
  ): string {
    return `
${this.generateDebateInstructions(interpreterType, interpreterPersonality)}

${this.generateInterpreterSpecificGuidance(interpreterType)}

REMEMBER: After completing your internal debate, proceed directly to generating the JSON response. The debate process should not appear in your final output.
`;
  }
}