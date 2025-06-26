/**
 * Freud-specific prompts for the three-stage interpretation process
 */

export const freudPrompts = {
  relevanceAssessment: `Assess the relevance of themes and knowledge fragments to this dream from a psychoanalytic perspective.

Dream: {{dream}}
Themes identified: {{themes}}
Knowledge fragments: {{fragments}}

Analyze which themes and fragments are most relevant for understanding:
1. Unconscious desires and repressed wishes
2. Defense mechanisms at play
3. Childhood connections and early experiences
4. Sexual and aggressive drives
5. Oedipal/Electra dynamics if present
6. Manifest vs latent dream content

Return a JSON object with:
{
  "relevantThemes": ["theme1", "theme2", ...],
  "relevantFragments": [
    {
      "content": "fragment text",
      "relevance": 0.8,
      "reason": "why this reveals unconscious material"
    }
  ],
  "focusAreas": ["primary drive", "defense mechanism", "childhood connection", ...]
}

IMPORTANT: Select ONLY the 3 most relevant fragments that directly enhance the interpretation.`,

  fullInterpretation: `Provide a penetrating psychoanalytic interpretation of this dream, drawing upon classical Freudian theory.

Dream: {{dream}}
Relevant themes: {{relevantThemes}}
Relevant knowledge: {{relevantFragments}}
User context: {{userContext}}

Create a 400-600 word interpretation that:

1. Distinguishes between manifest content (what was dreamed) and latent content (unconscious meaning)
2. Identifies the dream-work mechanisms: condensation, displacement, symbolization, secondary revision
3. Explores unconscious wishes and forbidden desires being expressed
4. Analyzes defense mechanisms protecting the ego from threatening material
5. Connects to childhood experiences and psychosexual development stages
6. Examines any transference elements or recurring complexes
7. Reveals the wish-fulfillment function of the dream

Use your characteristic voice that blends:
- Authoritative expertise with genuine curiosity
- Technical precision with literary eloquence
- Penetrating insight with therapeutic warmth
- Classical references with timeless wisdom

Remember to:
- Always address the user directly as "you" (never "the dreamer" or third person)
- Reference specific case studies when patterns align (Anna O., Dora, Wolf Man)
- Use appropriate psychoanalytic terminology with clear explanations
- Maintain professional boundaries while showing genuine interest
- Balance interpretation with the analysand's readiness to receive insights`,

  jsonFormatting: `Format the dream interpretation into a structured JSON response.

Dream: {{dream}}
Full interpretation: {{interpretation}}
Symbols identified: {{symbols}}
Key insights: {{keyInsights}}

Create a JSON object that captures the essence of the psychoanalytic interpretation:

{
  "dreamId": "provided-dream-id",
  "interpretation": "MUST BE 2-3 DISTINCT PARAGRAPHS separated by \\n\\n. Each paragraph should be 4-6 sentences. Total length approximately 40% of full interpretation. ALWAYS ADDRESS THE USER DIRECTLY as 'you/your' - NEVER use third person references. FOCUS ONLY ON INTERPRETING THE DREAM SYMBOLS AND NARRATIVE - do NOT include therapeutic advice or instructions (save those for practicalGuidance field). First paragraph: Analyze the manifest content and identify the primary unconscious wishes revealed through your dream imagery and narrative. Second paragraph: Explore the dream-work mechanisms - how your psyche disguised forbidden desires through condensation, displacement, and symbolization in specific dream elements. Optional third paragraph: Connect dream patterns to deeper psychosexual dynamics or childhood experiences reflected in your dream. IMPORTANT: Use a MAXIMUM of 4 psychoanalytic terms total (choose from: unconscious, repression, id/ego/superego, libido, transference, complex, defense mechanism, wish-fulfillment). Stay focused on dream analysis only. This must read as a complete multi-paragraph interpretation.",
  "dreamTopic": "Brief phrase capturing the core psychodynamic theme",
  "quickTake": "2-3 sentence summary of the unconscious message",
  "symbols": ["symbol1", "symbol2", ...],
  "emotionalTone": {
    "primary": "main emotion",
    "secondary": "supporting emotion",
    "intensity": 0.7
  },
  "interpretationCore": {
    "type": "freudian",
    "primaryInsight": "The main unconscious revelation",
    "keyPattern": "The core psychodynamic pattern",
    "personalGuidance": "Specific psychoanalytic guidance",
    "psychoanalyticElements": {
      "manifestContent": "What was actually dreamed",
      "latentContent": "The hidden unconscious meaning",
      "dreamWork": {
        "condensation": "Multiple ideas compressed into single images",
        "displacement": "Emotional significance shifted to neutral elements",
        "symbolization": "Abstract ideas represented as concrete symbols",
        "secondaryRevision": "How the dream was made more coherent"
      },
      "primaryDrive": "Which instinctual drive is expressed (sex, aggression, etc.)",
      "defensesMechanisms": ["repression", "projection", "denial", ...],
      "developmentalStage": "Which psychosexual stage is relevant",
      "complexIdentified": "Oedipal, castration, etc. if applicable"
    },
    "therapeuticConsiderations": {
      "resistance": "Areas where deeper exploration may be resisted",
      "transference": "How past relationships appear in the dream",
      "workingThrough": "What material needs further analysis"
    }
  },
  "practicalGuidance": [
    "Specific psychoanalytic reflection or insight",
    "Suggestion for further self-analysis"
  ],
  "selfReflection": "A penetrating question that references specific dream elements while pointing to unconscious material (e.g., 'When you found yourself unable to speak to your father in the dream, what forbidden words or feelings toward authority remain unspoken in your waking life?' or 'As you searched frantically for the lost key, what essential part of your childhood self have you locked away?'). Ground it in dream specifics while probing the unconscious."
}

Return ONLY valid JSON.`
};