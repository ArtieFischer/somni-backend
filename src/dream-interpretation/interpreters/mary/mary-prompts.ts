/**
 * Mary-specific prompts for the three-stage interpretation process
 */

export const maryPrompts = {
  relevanceAssessment: `Assess the relevance of themes and knowledge fragments to this dream from a neuroscientific perspective.

Dream: {{dream}}
Themes identified: {{themes}}
Knowledge fragments: {{fragments}}

Analyze which themes and fragments are most relevant for understanding:
1. Neural activation patterns and brain regions involved
2. Memory consolidation and processing mechanisms
3. Emotional regulation and limbic system activity
4. Sleep stage characteristics (REM vs NREM features)
5. Neurotransmitter systems and their influence
6. Cognitive processing and executive function aspects

Return ONLY a JSON object with this exact structure:
{
  "relevantThemes": ["theme1", "theme2", ...],
  "relevantFragments": [
    {
      "content": "fragment text",
      "relevance": 0.8,
      "reason": "how this relates to neural mechanisms"
    }
  ],
  "focusAreas": ["primary neural process", "cognitive function", "emotional processing", ...]
}

IMPORTANT: Select ONLY the 2 most relevant fragments that directly enhance the interpretation.
Return ONLY valid JSON, no explanatory text before or after.`,

  fullInterpretation: `Provide a comprehensive neuroscientific interpretation of this dream, drawing upon current sleep and brain research.

Dream: {{dream}}
Relevant themes: {{relevantThemes}}
Relevant knowledge: {{relevantFragments}}
User context: {{userContext}}

Create a 400-600 word interpretation that:

1. Explains the neural mechanisms underlying the dream experience
2. Identifies which brain regions are particularly active (hippocampus, amygdala, prefrontal cortex, etc.)
3. Discusses memory consolidation processes and how recent experiences are being integrated
4. Analyzes emotional processing and threat simulation functions
5. Examines sleep stage characteristics and their influence on dream content
6. Explores neurotransmitter dynamics (acetylcholine, dopamine, serotonin)
7. Connects dream patterns to cognitive functions and neural plasticity

Use your characteristic voice that blends:
- Scientific rigor with accessible explanation
- Research findings with practical application
- Technical accuracy with empathetic understanding
- Evidence-based insights with personal relevance

Remember to:
- Always address the user directly as "you" (never "the dreamer" or third person)
- Reference specific research when relevant (e.g., "Recent fMRI studies show...")
- Explain complex neuroscience in understandable terms
- Connect brain function to lived experience
- Maintain scientific integrity while being personable`,

  jsonFormatting: `Format the dream interpretation into a structured JSON response.

Dream: {{dream}}
Full interpretation: {{interpretation}}
Symbols identified: {{symbols}}
Key insights: {{keyInsights}}

Create a JSON object that captures the essence of the neuroscientific interpretation:

{
  "dreamId": "provided-dream-id",
  "interpretation": "CONDENSED INTERPRETATION: 2 focused paragraphs, 150-180 words TOTAL. ALWAYS ADDRESS THE USER DIRECTLY as 'you/your'. First paragraph (4-5 sentences): Explain which brain regions (hippocampus, amygdala, cortex) generated your specific dream imagery and the neural mechanisms involved. Second paragraph (3-4 sentences): Analyze what memory consolidation or emotional processing your brain was performing through this dream narrative. Use MAXIMUM 3 neuroscientific terms. Focus purely on brain-based dream analysis, no sleep hygiene advice.",
  "dreamTopic": "Brief phrase capturing the neural/cognitive theme",
  "quickTake": "2-3 sentence summary of the brain's processing",
  "symbols": ["symbol1", "symbol2", ...],
  "emotionalTone": {
    "primary": "main emotion",
    "secondary": "supporting emotion",
    "intensity": 0.7
  },
  "interpretationCore": {
    "type": "neuroscientific",
    "primaryInsight": "The main neuroscientific understanding",
    "keyPattern": "The core neural/cognitive pattern",
    "personalGuidance": "Specific brain-based guidance",
    "neuroscientificElements": {
      "brainRegions": {
        "hippocampus": "Role in memory formation and spatial navigation",
        "amygdala": "Emotional processing and threat detection",
        "prefrontalCortex": "Executive function and logical reasoning status",
        "visualCortex": "Generation of dream imagery",
        "motorCortex": "Movement sensations in dreams"
      },
      "sleepStage": {
        "stage": "REM or NREM characteristics",
        "features": "Specific sleep stage features present",
        "timing": "Likely timing in sleep cycle"
      },
      "neurotransmitters": {
        "acetylcholine": "Role in REM sleep and vivid dreams",
        "dopamine": "Reward and motivation aspects",
        "serotonin": "Mood regulation influences",
        "norepinephrine": "Stress response modulation"
      },
      "cognitiveProcesses": [
        "Memory consolidation type",
        "Emotional regulation mechanism",
        "Problem-solving attempts"
      ],
      "memoryProcessing": {
        "type": "Declarative, procedural, or emotional",
        "consolidation": "How memories are being integrated",
        "associations": "Neural network connections being strengthened"
      }
    },
    "researchConnections": [
      "Relevant sleep study findings",
      "Applicable neuroscience theories"
    ]
  },
  "practicalGuidance": [
    "Brain-health focused suggestion",
    "Sleep optimization recommendation"
  ],
  "selfReflection": "SHORT QUESTION (10-15 words MAX) about SPECIFIC dream element. MUST reference actual dream imagery/event. Examples: 'What memories triggered the flying sensation?' or 'Why did familiar faces blur?' DO NOT ask generic questions. MUST BE UNDER 15 WORDS."
}

Return ONLY valid JSON.`
};