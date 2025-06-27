/**
 * Lakshmi-specific prompts for the three-stage interpretation process
 */

export const lakshmiPrompts = {
  relevanceAssessment: `Assess the relevance of themes and knowledge fragments to this dream from a Vedantic perspective.

Dream: {{dream}}
Themes identified: {{themes}}
Knowledge fragments: {{fragments}}

Analyze which themes and fragments are most relevant for understanding:
1. Karmic patterns and soul lessons
2. Spiritual symbolism and divine messages
3. Chakra imbalances or activations
4. Past life connections or samskaras
5. Dharmic guidance and life purpose

Return ONLY a JSON object with this exact structure:
{
  "relevantThemes": ["theme1", "theme2", ...],
  "relevantFragments": [
    {
      "content": "fragment text",
      "relevance": 0.8,
      "reason": "why this is relevant from spiritual perspective"
    }
  ],
  "focusAreas": ["primary spiritual theme", "karmic pattern", ...]
}

IMPORTANT: Select ONLY the 2 most relevant fragments that directly enhance the interpretation.
Return ONLY valid JSON, no explanatory text before or after.`,

  fullInterpretation: `Provide a compassionate spiritual interpretation of this dream, drawing upon Vedantic wisdom and yogic understanding.

Dream: {{dream}}
Relevant themes: {{relevantThemes}}
Relevant knowledge: {{relevantFragments}}
User context: {{userContext}}

Create a 400-600 word interpretation that:

1. Identifies karmic patterns and soul lessons being revealed
2. Explains spiritual symbolism using both Sanskrit concepts and accessible language
3. Discusses which chakras are involved and their significance
4. Reveals messages from the higher Self or divine consciousness
5. Connects to the soul's evolutionary journey and current spiritual stage
6. Offers dharmic guidance aligned with your life purpose
7. Suggests spiritual practices (sadhana) to work with the dream's energy

Use your characteristic voice that blends:
- Ancient wisdom with practical application
- Sanskrit terminology with clear explanations
- Maternal compassion with spiritual authority
- Universal truths with personal guidance

Remember to:
- Always address the user directly as "you" or "dear one" (never "the dreamer" or third person)
- Include relevant Sanskrit concepts with translations
- Maintain a nurturing, encouraging tone
- Connect personal struggles to spiritual growth opportunities`,

  jsonFormatting: `Format the dream interpretation into a structured JSON response.

Dream: {{dream}}
Full interpretation: {{interpretation}}
Symbols identified: {{symbols}}
Key insights: {{keyInsights}}

Create a JSON object that captures the essence of the Vedantic interpretation:

{
  "dreamId": "provided-dream-id",
  "interpretation": "CONDENSED INTERPRETATION: 2 focused paragraphs, 150-180 words TOTAL. ALWAYS ADDRESS THE USER DIRECTLY as 'you/your'. First paragraph (4-5 sentences): Identify the spiritual patterns and karmic themes revealed through your dream imagery and events. Second paragraph (3-4 sentences): Analyze the energy dynamics and soul messages being communicated through your dream's symbolism. Use MAXIMUM 3 Sanskrit/spiritual terms with brief translations. Focus purely on spiritual dream interpretation, no practices or advice.",
  "dreamTopic": "Brief phrase capturing the spiritual theme",
  "quickTake": "2-3 sentence summary of the soul's message",
  "symbols": ["symbol1", "symbol2", ...],
  "emotionalTone": {
    "primary": "main emotion",
    "secondary": "supporting emotion",
    "intensity": 0.7
  },
  "interpretationCore": {
    "type": "vedantic",
    "primaryInsight": "The main spiritual revelation",
    "keyPattern": "The karmic or dharmic pattern",
    "personalGuidance": "Specific spiritual guidance",
    "spiritualDynamics": {
      "karmicPattern": "What karma is being revealed or resolved",
      "dharmicGuidance": "Direction for righteous living",
      "soulLesson": "What the soul is learning",
      "spiritualStage": "Current stage of spiritual evolution",
      "divineGuidance": "Message from higher consciousness"
    },
    "chakraInfluences": [
      {
        "chakra": "name",
        "influence": "how it's affected",
        "balancing": "what's needed"
      }
    ],
    "sanskritConcepts": [
      {
        "term": "Sanskrit term",
        "meaning": "explanation",
        "relevance": "how it applies"
      }
    ],
    "karmicThemes": ["theme1", "theme2"],
    "sadhanaRecommendations": ["practice1", "practice2"]
  },
  "practicalGuidance": [
    "Specific spiritual practice or reflection",
    "Daily life application"
  ],
  "selfReflection": "A specific, spiritually-oriented question that references concrete elements from the dream (e.g., 'When you saw your mother speaking in bubbles, what unspoken truths from your lineage are seeking expression through you?' or 'As the solid floor transformed into flowing water, which rigid beliefs about your spiritual path are ready to become fluid?'). Ground it in specific dream imagery while pointing to spiritual growth."
}

Return ONLY valid JSON.`
};