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

Return ONLY a JSON object with this exact structure:
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
}

IMPORTANT: Select ONLY the 2 most relevant fragments that directly enhance the interpretation.
Return ONLY valid JSON, no explanatory text before or after.`,

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
  "interpretation": "CONDENSED INTERPRETATION: 2 focused paragraphs, 150-180 words TOTAL. ALWAYS ADDRESS THE USER DIRECTLY as 'you/your'. First paragraph (4-5 sentences): Identify the primary archetypes and psychological dynamics revealed in your dream imagery and narrative. Second paragraph (3-4 sentences): Analyze the compensatory function - what your psyche is balancing and what this reveals about your individuation process. Use MAXIMUM 3 Jungian terms. Focus purely on dream interpretation, no advice or guidance.",
  "dreamTopic": "Brief phrase capturing the core psychological theme",
  "quickTake": "2-3 sentence summary of the dream's message",
  "symbols": ["symbol1", "symbol2", ...],
  "emotionalTone": {
    "primary": "main emotion",
    "secondary": "supporting emotion",
    "intensity": 0.7
  },
  "interpreterCore": {
    "type": "jungian",
    "dreamWork": "Describe the psychological work the dream is doing",
    "archetypalDynamics": {
      "primaryArchetype": "The main archetype present (e.g., The Shadow, The Wise Old Man)",
      "archetypalTension": "The tension or conflict between archetypal forces",
      "individuationGuidance": "How this relates to your individuation journey"
    },
    "shadowElements": "What shadow content is revealed in the dream",
    "compensatoryFunction": "What conscious attitude is being balanced by this dream",
    "individuationInsight": "Key insight about your individuation process and personal growth"
  },
  "practicalGuidance": [
    "Specific action or reflection 1",
    "Specific action or reflection 2"
  ],
  "selfReflection": "SHORT QUESTION (10-15 words MAX) about SPECIFIC dream element. MUST reference actual dream imagery/event. Examples: 'What did the shadow figure reveal about you?' or 'Why did the bridge collapse suddenly?' DO NOT ask generic questions. MUST BE UNDER 15 WORDS."
}

Return ONLY valid JSON.`
};