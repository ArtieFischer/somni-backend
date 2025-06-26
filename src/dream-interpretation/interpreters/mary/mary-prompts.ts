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

Return a JSON object with:
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

IMPORTANT: Select ONLY the 3 most relevant fragments that directly enhance the interpretation.`,

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
  "interpretation": "MUST BE 2-3 DISTINCT PARAGRAPHS separated by \\n\\n. Each paragraph should be 4-6 sentences. Total length approximately 40% of full interpretation. ALWAYS ADDRESS THE USER DIRECTLY as 'you/your' - NEVER use third person references. FOCUS ONLY ON INTERPRETING THE DREAM FROM A NEUROSCIENCE PERSPECTIVE - do NOT include sleep hygiene advice or behavioral recommendations (save those for practicalGuidance field). First paragraph: Analyze the neural mechanisms active in your dream - which brain regions generated the specific imagery and emotions you experienced. Second paragraph: Explore how your brain was processing memories and emotions through the dream narrative, including relevant neurotransmitter activity. Optional third paragraph: Connect dream patterns to cognitive functions and neural plasticity demonstrated in your dream. IMPORTANT: Use a MAXIMUM of 4 neuroscientific terms total (choose from: hippocampus, amygdala, prefrontal cortex, REM sleep, consolidation, neural plasticity, neurotransmitters, activation-synthesis). Stay focused on brain-based dream analysis only.",
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
  "selfReflection": "A scientifically-grounded question that references specific dream elements while exploring neural processes (e.g., 'When you experienced the sensation of flying in your dream, what real-life situations might your brain be rehearsing through motor cortex activation?' or 'As familiar faces morphed into strangers, how might your hippocampus be reorganizing social memories?'). Connect dream imagery to brain function."
}

Return ONLY valid JSON.`
};