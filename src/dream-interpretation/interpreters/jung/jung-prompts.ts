/**
 * Jung-specific prompts for the three-stage interpretation process
 */

export const jungPrompts = {
  relevanceAssessment: `Assess the relevance of themes and knowledge fragments to this dream from a Jungian perspective.

Dream: {{dream}}
Themes identified: {{themes}}
Knowledge fragments: {{fragments}}

Analyze which themes and fragments are most relevant for understanding:
1. Archetypal patterns and symbols
2. Shadow elements and projections
3. Anima/animus manifestations
4. Compensatory function of the dream
5. Individuation process indicators

Return a JSON object with:
{
  "relevantThemes": ["theme1", "theme2", ...],
  "relevantFragments": [
    {
      "content": "fragment text",
      "relevance": 0.8,
      "reason": "why this is relevant from Jungian perspective"
    }
  ],
  "focusAreas": ["primary psychological dynamic", "secondary theme", ...]
}`,

  fullInterpretation: `Provide a comprehensive Jungian interpretation of this dream, drawing upon analytical psychology principles.

Dream: {{dream}}
Relevant themes: {{relevantThemes}}
Relevant knowledge: {{relevantFragments}}
User context: {{userContext}}

Create a 400-600 word interpretation that:

1. Identifies the primary archetypes at play (Shadow, Anima/Animus, Self, Persona, etc.)
2. Explores the compensatory function - what conscious attitude is being balanced?
3. Analyzes symbols in both personal and collective contexts
4. Discusses relevant complexes that may be activated
5. Connects to the individuation process - what stage or challenge is presented?
6. Examines the relationship between ego and unconscious elements
7. Identifies opportunities for integration and psychological growth

Use your characteristic voice that blends:
- Deep psychological insight with accessible explanation
- Personal symbolism with collective/archetypal themes  
- Scientific observation with intuitive understanding
- References to your theoretical framework when relevant

Remember to:
- Always address the user directly as "you" (never "the dreamer" or third person)
- Include specific examples from the dream
- Connect symbols to both personal and universal meanings
- Maintain hope while acknowledging psychological challenges`,

  jsonFormatting: `Format the dream interpretation into a structured JSON response.

Dream: {{dream}}
Full interpretation: {{interpretation}}
Symbols identified: {{symbols}}
Key insights: {{keyInsights}}

Create a JSON object that captures the essence of the Jungian interpretation:

{
  "dreamId": "provided-dream-id",
  "interpretation": "MUST BE 2-3 DISTINCT PARAGRAPHS separated by \\n\\n. Each paragraph should be 4-6 sentences. Total length approximately 40% of full interpretation. ALWAYS ADDRESS THE USER DIRECTLY as 'you/your' - NEVER use third person references like 'the dreamer'. FOCUS ONLY ON INTERPRETING THE DREAM SYMBOLS AND NARRATIVE - do NOT include advice, guidance, or instructions (save those for practicalGuidance field). First paragraph: Identify the primary archetypes and psychological dynamics revealed in your dream imagery and plot. Second paragraph: Analyze the compensatory function and unconscious elements - what the specific dream symbols and interactions reveal about your psyche. Optional third paragraph: Explore deeper symbolic meanings and connections to collective themes present in your dream narrative. IMPORTANT: Use a MAXIMUM of 4 Jungian technical terms total (choose from: anima/animus, Self, shadow, complex, individuation, archetype, collective unconscious, persona). Stay focused on dream analysis only. This must read as a complete multi-paragraph interpretation, NOT a single block of text.",
  "dreamTopic": "Brief phrase capturing the core psychological theme",
  "quickTake": "2-3 sentence summary of the dream's message",
  "symbols": ["symbol1", "symbol2", ...],
  "emotionalTone": {
    "primary": "main emotion",
    "secondary": "supporting emotion",
    "intensity": 0.7
  },
  "interpretationCore": {
    "type": "jungian",
    "primaryInsight": "The main psychological insight",
    "keyPattern": "The recurring pattern or theme",
    "personalGuidance": "Specific advice for you",
    "archetypalDynamics": {
      "primaryArchetype": "e.g., The Shadow",
      "shadowElements": "What shadow content is revealed",
      "animaAnimus": "Contrasexual elements if present",
      "selfArchetype": "How the Self manifests",
      "compensatoryFunction": "What conscious attitude is being balanced"
    },
    "individuationInsights": {
      "currentStage": "Where in the individuation journey",
      "developmentalTask": "What needs to be integrated",
      "integrationOpportunity": "How to work with this material"
    },
    "complexesIdentified": ["complex1", "complex2"],
    "collectiveThemes": ["universal theme1", "cultural pattern"]
  },
  "practicalGuidance": [
    "Specific action or reflection 1",
    "Specific action or reflection 2"
  ],
  "selfReflection": "A specific, contextualized question that directly references elements from the dream (e.g., 'What does the glass wall between you and your mother represent in your current relationship?' or 'When the floor became water and you began floating, what control did you need to release?'). Make it personal and tied to specific dream imagery."
}

Return ONLY valid JSON.`
};