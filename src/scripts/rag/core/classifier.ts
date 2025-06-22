import { jungianThemeMapper } from './jungian-theme-mapper';

export type ContentType = 
  | 'theory'
  | 'symbol'
  | 'case_study'
  | 'dream_example'
  | 'technique'
  | 'definition'
  | 'biography'
  | 'methodology'
  | 'practice';

interface ClassificationResult {
  primaryType: ContentType;
  confidence: number;
  secondaryTypes: ContentType[];
  topics: string[];
  keywords: string[];
  hasSymbols: boolean;
  hasExamples: boolean;
  hasCaseStudy: boolean;
  hasExercise: boolean;
  // Theme-based classification
  jungianConcepts?: string[];
  applicableThemes?: string[];
  interpretiveContext?: string;
}

export class ContentClassifier {
  private readonly contentPatterns: Record<ContentType, RegExp[]> = {
    theory: [
      /theoretical framework/i,
      /hypothesis/i,
      /principle of/i,
      /concept of/i,
      /theory suggests/i,
      /according to (the )?theory/i,
      /fundamental principle/i,
      /theoretical basis/i,
      /conceptual framework/i,
      /psychodynamic/i,
      /cognitive model/i,
      /neurobiological/i,
      /phenomenological/i
    ],
    symbol: [
      /symbol(izes?|ic|ism|ically)/i,
      /represents?/i,
      /archetype/i,
      /meaning of/i,
      /signifies?/i,
      /stands for/i,
      /symbolic meaning/i,
      /interpretation of/i,
      /symbolically/i,
      /metaphor/i,
      /allegory/i,
      /embodies/i,
      /personifies/i,
      /manifestation of/i
    ],
    case_study: [
      /patient/i,
      /case study/i,
      /clinical/i,
      /session/i,
      /therapy/i,
      /treatment/i,
      /analyzed?/i,
      /diagnosis/i,
      /case of/i,
      /presented with/i,
      /client/i,
      /analysand/i,
      /therapeutic/i,
      /intervention/i
    ],
    dream_example: [
      /dreamt?/i,
      /in (the|my|her|his) dream/i,
      /dream(ed|ing) (of|about)/i,
      /nightmare/i,
      /had a dream/i,
      /dream content/i,
      /dream report/i,
      /REM sleep/i,
      /lucid dream/i,
      /recurring dream/i,
      /vivid dream/i,
      /dream sequence/i,
      /dream narrative/i,
      /in this dream/i
    ],
    technique: [
      /technique/i,
      /method/i,
      /approach/i,
      /practice/i,
      /exercise/i,
      /procedure/i,
      /how to/i,
      /steps to/i,
      /guide to/i,
      /instruction/i
    ],
    definition: [
      /defined? as/i,
      /meaning/i,
      /refers? to/i,
      /is called/i,
      /known as/i,
      /definition of/i,
      /can be described as/i,
      /is a term/i,
      /denotes/i
    ],
    biography: [
      /was born/i,
      /life/i,
      /childhood/i,
      /personal/i,
      /biography/i,
      /early years/i,
      /grew up/i,
      /background/i,
      /history/i
    ],
    methodology: [
      /research/i,
      /study/i,
      /experiment/i,
      /data/i,
      /findings?/i,
      /results?/i,
      /analysis/i,
      /method(ology)?/i,
      /scientific/i,
      /empirical/i
    ],
    practice: [
      /meditation/i,
      /visualization/i,
      /breathing/i,
      /ritual/i,
      /ceremony/i,
      /spiritual practice/i,
      /yoga/i,
      /mindfulness/i,
      /contemplation/i,
      /prayer/i
    ]
  };

  private readonly topicKeywords: Record<string, string[]> = {
    // Jungian concepts
    'archetypes': [
      'archetype', 'shadow', 'anima', 'animus', 'self', 'persona', 'hero', 
      'mother', 'father', 'child', 'wise old', 'trickster', 'maiden', 'crone',
      'warrior', 'lover', 'magician', 'king', 'queen', 'fool', 'orphan',
      'caregiver', 'creator', 'destroyer', 'ruler', 'sage', 'innocent',
      'explorer', 'rebel', 'everyman', 'jester', 'mentor', 'shapeshifter'
    ],
    
    'individuation': [
      'individuation', 'self-realization', 'wholeness', 'integration', 
      'transformation', 'becoming', 'self-actualization', 'personal growth',
      'psychological development', 'inner journey', 'self-discovery',
      'authentic self', 'true nature', 'inner work', 'soul-making'
    ],
    
    'unconscious': [
      'unconscious', 'subconscious', 'repression', 'collective unconscious', 
      'personal unconscious', 'preconscious', 'subliminal', 'hidden',
      'suppressed', 'buried', 'latent', 'underlying', 'depths', 'psyche',
      'inner world', 'shadow material', 'unconscious content'
    ],
    
    // Freudian concepts
    'psychoanalysis': [
      'psychoanalysis', 'freudian', 'oedipal', 'oedipus', 'electra', 'libido', 
      'ego', 'id', 'superego', 'defense mechanism', 'repression', 'denial',
      'projection', 'displacement', 'sublimation', 'regression', 'fixation',
      'transference', 'countertransference', 'resistance', 'catharsis',
      'primary process', 'secondary process', 'pleasure principle',
      'reality principle', 'death drive', 'eros', 'thanatos'
    ],
    
    'sexuality': [
      'sexual', 'sexuality', 'erotic', 'libido', 'desire', 'attraction',
      'intimate', 'sensual', 'passionate', 'lust', 'arousal', 'seduction',
      'phallic', 'genital', 'oral', 'anal', 'polymorphous', 'perverse',
      'fetish', 'taboo', 'forbidden', 'incest', 'castration'
    ],
    
    // Dream themes
    'dreams': [
      'dream', 'nightmare', 'rem', 'sleep', 'lucid', 'manifest', 'latent', 
      'dream work', 'condensation', 'displacement', 'symbolization',
      'secondary revision', 'day residue', 'wish fulfillment', 'oneiric',
      'hypnagogic', 'hypnopompic', 'dream recall', 'dream journal',
      'recurring', 'prophetic', 'precognitive', 'telepathic', 'shared dream'
    ],
    
    'common_dream_themes': [
      'falling', 'flying', 'chase', 'chased', 'naked', 'nude', 'exposed',
      'teeth falling', 'death', 'dying', 'birth', 'pregnancy', 'baby',
      'exam', 'test', 'unprepared', 'late', 'lost', 'trapped', 'escape',
      'drowning', 'suffocating', 'paralyzed', 'frozen', 'running',
      'hiding', 'fighting', 'war', 'violence', 'accident', 'disaster',
      'apocalypse', 'end of world', 'transformation', 'metamorphosis'
    ],
    
    // Symbols and imagery
    'symbols': [
      'symbol', 'symbolism', 'meaning', 'interpretation', 'image', 'metaphor', 
      'representation', 'sign', 'emblem', 'icon', 'allegory', 'analogy',
      'correspondence', 'association', 'connotation', 'significance'
    ],
    
    'nature_symbols': [
      'water', 'ocean', 'sea', 'lake', 'river', 'rain', 'flood', 'wave',
      'fire', 'flame', 'burning', 'blaze', 'heat', 'volcano', 'sun',
      'earth', 'ground', 'soil', 'mountain', 'valley', 'cave', 'forest',
      'air', 'wind', 'breeze', 'sky', 'cloud', 'storm', 'lightning',
      'tree', 'flower', 'garden', 'wilderness', 'desert', 'jungle'
    ],
    
    'animal_symbols': [
      'animal', 'creature', 'beast', 'snake', 'serpent', 'dragon',
      'bird', 'eagle', 'owl', 'raven', 'dove', 'phoenix', 'butterfly',
      'wolf', 'dog', 'cat', 'lion', 'tiger', 'bear', 'horse', 'deer',
      'spider', 'scorpion', 'fish', 'whale', 'dolphin', 'shark',
      'elephant', 'monkey', 'fox', 'rabbit', 'mouse', 'rat'
    ],
    
    'object_symbols': [
      'house', 'home', 'room', 'door', 'window', 'wall', 'stairs',
      'bridge', 'road', 'path', 'journey', 'vehicle', 'car', 'train',
      'mirror', 'key', 'lock', 'box', 'container', 'vessel', 'cup',
      'sword', 'weapon', 'tool', 'clock', 'time', 'money', 'treasure',
      'book', 'letter', 'map', 'compass', 'light', 'lamp', 'candle'
    ],
    
    'body_symbols': [
      'body', 'face', 'eyes', 'mouth', 'teeth', 'tongue', 'hair',
      'hands', 'feet', 'legs', 'arms', 'heart', 'brain', 'blood',
      'skin', 'bones', 'naked', 'clothed', 'wounded', 'healing',
      'pregnant', 'birth', 'death', 'corpse', 'skeleton'
    ],
    
    // Therapy and healing
    'therapy': [
      'therapy', 'analysis', 'treatment', 'session', 'patient', 'client',
      'therapeutic', 'healing', 'cure', 'intervention', 'process',
      'breakthrough', 'insight', 'realization', 'cathartic', 'release',
      'integration', 'resolution', 'working through', 'processing'
    ],
    
    // Neuroscience
    'neuroscience': [
      'brain', 'neural', 'cortex', 'neuron', 'cognitive', 'neurological', 
      'synaptic', 'neurotransmitter', 'hippocampus', 'amygdala', 'thalamus',
      'prefrontal', 'limbic', 'dopamine', 'serotonin', 'gaba', 'rem sleep',
      'sleep cycle', 'circadian', 'melatonin', 'brainwave', 'eeg', 'fmri',
      'neuroplasticity', 'connectivity', 'activation', 'inhibition'
    ],
    
    // Spirituality
    'spirituality': [
      'spiritual', 'meditation', 'consciousness', 'enlightenment', 'awakening', 
      'transcendent', 'divine', 'sacred', 'holy', 'mystical', 'numinous',
      'soul', 'spirit', 'essence', 'higher self', 'cosmic', 'universal',
      'oneness', 'unity', 'bliss', 'ecstasy', 'revelation', 'epiphany',
      'kundalini', 'chakra', 'aura', 'energy', 'vibration', 'frequency'
    ],
    
    'spiritual_practices': [
      'yoga', 'meditation', 'prayer', 'mantra', 'chanting', 'ritual',
      'ceremony', 'shamanic', 'vision quest', 'sweat lodge', 'fasting',
      'pilgrimage', 'retreat', 'silence', 'solitude', 'contemplation',
      'mindfulness', 'presence', 'awareness', 'breathing', 'pranayama',
      'visualization', 'affirmation', 'intention', 'manifestation'
    ],
    
    // Emotions and states
    'emotions': [
      'fear', 'anxiety', 'terror', 'panic', 'dread', 'worry', 'stress',
      'anger', 'rage', 'fury', 'frustration', 'irritation', 'resentment',
      'sadness', 'grief', 'sorrow', 'melancholy', 'depression', 'despair',
      'joy', 'happiness', 'bliss', 'ecstasy', 'euphoria', 'pleasure',
      'love', 'compassion', 'empathy', 'affection', 'tenderness',
      'shame', 'guilt', 'embarrassment', 'humiliation', 'regret',
      'jealousy', 'envy', 'longing', 'desire', 'hope', 'anticipation'
    ],
    
    'psychological_states': [
      'conscious', 'unconscious', 'subconscious', 'altered state',
      'trance', 'hypnotic', 'dissociation', 'depersonalization',
      'flow state', 'peak experience', 'liminal', 'threshold',
      'vulnerable', 'defensive', 'resistant', 'open', 'receptive',
      'integrated', 'fragmented', 'split', 'whole', 'balanced'
    ],
    
    // Mythology and culture
    'mythology': [
      'myth', 'mythology', 'mythological', 'legend', 'folklore', 'fairy tale', 
      'gods', 'goddess', 'heroes', 'heroine', 'deity', 'pantheon',
      'creation myth', 'origin story', 'epic', 'saga', 'odyssey',
      'underworld', 'afterlife', 'heaven', 'hell', 'purgatory',
      'quest', 'grail', 'golden fleece', 'ambrosia', 'nectar'
    ],
    
    'cultural_symbols': [
      'cross', 'crucifix', 'star', 'crescent', 'yin yang', 'mandala',
      'pentagram', 'hexagram', 'ankh', 'om', 'lotus', 'rose',
      'crown', 'throne', 'scepter', 'temple', 'altar', 'sanctuary',
      'labyrinth', 'maze', 'spiral', 'circle', 'square', 'triangle',
      'pyramid', 'obelisk', 'totem', 'talisman', 'amulet'
    ],
    
    // Relationships
    'relationships': [
      'mother', 'father', 'parent', 'child', 'sibling', 'family',
      'lover', 'partner', 'spouse', 'marriage', 'divorce', 'separation',
      'friend', 'enemy', 'stranger', 'ancestor', 'descendant',
      'teacher', 'student', 'mentor', 'guide', 'authority', 'peer',
      'connection', 'bond', 'attachment', 'intimacy', 'distance'
    ],
    
    // Life stages and transitions
    'life_stages': [
      'birth', 'infancy', 'childhood', 'adolescence', 'youth', 'adulthood',
      'midlife', 'old age', 'death', 'rebirth', 'initiation', 'rite of passage',
      'transition', 'transformation', 'metamorphosis', 'evolution',
      'beginning', 'ending', 'cycle', 'season', 'phase', 'stage'
    ]
  };

  classifyContent(text: string): ClassificationResult {
    const lowerText = text.toLowerCase();
    const scores: Record<ContentType, number> = {} as any;
    
    // Calculate scores for each content type
    for (const [type, patterns] of Object.entries(this.contentPatterns)) {
      scores[type as ContentType] = patterns.reduce((score, pattern) => {
        const matches = lowerText.match(pattern);
        return score + (matches ? matches.length : 0);
      }, 0);
    }
    
    // Apply contextual boosting based on interpreter-specific patterns
    this.applyContextualBoosts(lowerText, scores);
    
    // Find primary type
    const sortedTypes = Object.entries(scores)
      .sort(([, a], [, b]) => b - a) as [ContentType, number][];
    
    const primaryType = sortedTypes[0][0];
    const primaryScore = sortedTypes[0][1];
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    
    // Extract topics
    const topics = this.extractTopics(text);
    
    // Extract keywords
    const keywords = this.extractKeywords(text);
    
    // Detect special content
    const specialContent = this.detectSpecialContent(text);
    
    // Calculate confidence based on score distribution
    const confidence = this.calculateConfidence(primaryScore, totalScore, sortedTypes);
    
    // Add theme-based classification
    const themeAnalysis = jungianThemeMapper.enhanceContentWithThemes(text, {
      primaryType,
      topics,
      keywords
    });
    
    return {
      primaryType,
      confidence,
      secondaryTypes: sortedTypes
        .slice(1)
        .filter(([, score]) => score > 0 && score >= primaryScore * 0.3) // At least 30% of primary score
        .map(([type]) => type),
      topics,
      keywords,
      ...specialContent,
      // Theme-based fields
      jungianConcepts: themeAnalysis.jungianConcepts,
      applicableThemes: themeAnalysis.applicableThemes,
      interpretiveContext: themeAnalysis.interpretiveContext
    };
  }

  private applyContextualBoosts(text: string, scores: Record<ContentType, number>): void {
    // Boost case_study if contains patient names or case numbers
    if (/\b(Patient [A-Z]|Case \d+|Mr\.|Mrs\.|Miss|Ms\.|Dr\.)\b/i.test(text)) {
      scores.case_study = (scores.case_study || 0) + 2;
    }
    
    // Boost theory if contains academic language
    if (/\b(furthermore|moreover|consequently|thus|therefore|hypothesis|postulate|paradigm|framework)\b/i.test(text)) {
      scores.theory = (scores.theory || 0) + 1;
    }
    
    // Boost practice if contains instructional language
    if (/\b(first|second|then|next|finally|begin by|start with|continue|repeat)\b/i.test(text)) {
      scores.practice = (scores.practice || 0) + 1;
      scores.technique = (scores.technique || 0) + 1;
    }
    
    // Boost dream_example if contains dream narrative markers
    if (/\b(I was|I found myself|suddenly|then I|in the dream|I dreamed|I saw myself)\b/i.test(text)) {
      scores.dream_example = (scores.dream_example || 0) + 2;
    }
    
    // Boost symbol if contains interpretive language
    if (/\b(represents|symbolizes|signifies|embodies|manifests|expresses)\b/i.test(text)) {
      scores.symbol = (scores.symbol || 0) + 1;
    }
  }

  private calculateConfidence(primaryScore: number, totalScore: number, sortedTypes: [ContentType, number][]): number {
    if (totalScore === 0) return 0.3; // Default minimum confidence instead of 0
    
    // Base confidence from primary score ratio, but with a higher floor
    let confidence = Math.max(0.4, primaryScore / totalScore);
    
    // Boost confidence if primary score is significantly higher than second
    if (sortedTypes.length > 1) {
      const secondScore = sortedTypes[1][1];
      if (primaryScore > secondScore * 1.5) { // More generous than 2x
        confidence = Math.min(confidence + 0.15, 1); // Bigger boost
      }
    }
    
    // Less aggressive penalty for close scores
    if (sortedTypes.length > 2) {
      const topThreeScores = sortedTypes.slice(0, 3).map(([, score]) => score);
      const variance = this.calculateVariance(topThreeScores);
      if (variance < 0.5) { // Only penalize if very close
        confidence = confidence * 0.9; // Smaller penalty
      }
    }
    
    // Boost confidence if we have any clear patterns at all
    if (primaryScore > 2) {
      confidence = Math.min(confidence + 0.1, 1);
    }
    
    return Math.round(confidence * 100) / 100;
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private extractTopics(text: string): string[] {
    const lowerText = text.toLowerCase();
    const foundTopics: Array<{topic: string, score: number}> = [];
    
    for (const [topic, keywords] of Object.entries(this.topicKeywords)) {
      const topicScore = keywords.reduce((score, keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerText.match(regex);
        return score + (matches ? matches.length : 0);
      }, 0);
      
      // Lower threshold for topics with many keywords
      const threshold = keywords.length > 20 ? 1 : 2;
      
      if (topicScore >= threshold) {
        foundTopics.push({ topic, score: topicScore });
      }
    }
    
    // Sort by score and return top topics
    return foundTopics
      .sort((a, b) => b.score - a.score)
      .slice(0, 8) // Return more topics
      .map(item => item.topic);
  }

  private extractKeywords(text: string): string[] {
    const keywords = new Set<string>();
    
    // Extract capitalized phrases (proper nouns, important concepts)
    const capitalizedPhrases = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
    capitalizedPhrases.forEach(phrase => {
      if (phrase.length > 3 && 
          !phrase.match(/^(The|And|But|For|With|This|That|These|Those|What|When|Where|Which|While)$/)) {
        keywords.add(phrase.toLowerCase());
      }
    });
    
    // Extract terms in quotes
    const quotedTerms = text.match(/"([^"]+)"/g) || [];
    quotedTerms.forEach(term => {
      const cleaned = term.replace(/"/g, '').toLowerCase().trim();
      if (cleaned.length > 3 && cleaned.split(' ').length <= 3) {
        keywords.add(cleaned);
      }
    });
    
    // Extract terms after "called" or "known as"
    const definedTerms = text.match(/(?:called|known as|termed|referred to as)\s+["']?([^"',.\n]+)["']?/gi) || [];
    definedTerms.forEach(match => {
      const term = match.replace(/(?:called|known as|termed)\s+["']?/i, '').replace(/["']?$/, '').trim();
      if (term.length > 3) {
        keywords.add(term.toLowerCase());
      }
    });
    
    // Extract psychological/technical terms with context
    const technicalTerms = [
      'complex', 'syndrome', 'disorder', 'mechanism', 'process', 
      'phenomenon', 'principle', 'theory', 'concept', 'archetype',
      'pattern', 'dynamic', 'function', 'structure', 'system'
    ];
    
    technicalTerms.forEach(term => {
      const regex = new RegExp(`(\\w+\\s+)?${term}`, 'gi');
      const matches = text.match(regex) || [];
      matches.forEach(match => {
        const cleaned = match.toLowerCase().trim();
        if (cleaned.split(' ').length <= 3 && cleaned !== term) {
          keywords.add(cleaned);
        }
      });
    });
    
    // Extract dream-specific terms
    const dreamPatterns = text.match(/dream(?:ed|t|ing)?\s+(?:of|about)\s+(\w+(?:\s+\w+)*)/gi) || [];
    dreamPatterns.forEach(match => {
      const subject = match.replace(/dream(?:ed|t|ing)?\s+(?:of|about)\s+/i, '').trim();
      if (subject.length > 3 && subject.split(' ').length <= 3) {
        keywords.add(subject.toLowerCase());
      }
    });
    
    // Filter and limit keywords
    return Array.from(keywords)
      .filter(kw => kw.length > 3 && kw.length < 50)
      .slice(0, 20); // Increase limit
  }

  private detectSpecialContent(text: string): {
    hasSymbols: boolean;
    hasExamples: boolean;
    hasCaseStudy: boolean;
    hasExercise: boolean;
  } {
    const lowerText = text.toLowerCase();
    
    return {
      hasSymbols: /\b(symbol|archetype|represents?|signifies?|meaning of|interpretation|metaphor|embodies)\b/i.test(text),
      hasExamples: /\b(for example|for instance|such as|like|consider|let us|imagine|suppose|e\.g\.|i\.e\.)\b/i.test(text),
      hasCaseStudy: /\b(patient|case|clinical|therapy session|analysis of|treatment|client|analysand)\b/i.test(text),
      hasExercise: /\b(exercise|practice|try this|meditation|technique|visualization|breathing|imagine yourself|close your eyes)\b/i.test(text)
    };
  }

  // Helper method to get content type description
  getContentTypeDescription(type: ContentType): string {
    const descriptions: Record<ContentType, string> = {
      theory: 'Theoretical concepts and frameworks',
      symbol: 'Symbolic meanings and interpretations',
      case_study: 'Clinical cases and patient analyses',
      dream_example: 'Dream narratives and examples',
      technique: 'Methods and therapeutic techniques',
      definition: 'Definitions and explanations of terms',
      biography: 'Biographical and personal information',
      methodology: 'Research methods and scientific approaches',
      practice: 'Spiritual or therapeutic practices'
    };
    
    return descriptions[type] || 'General content';
  }

  // Method to get relevant topics for each interpreter
  getInterpreterTopics(interpreter: string): string[] {
    const interpreterTopics: Record<string, string[]> = {
      jung: [
        'archetypes', 'individuation', 'unconscious', 'symbols', 
        'mythology', 'dreams', 'spirituality', 'life_stages'
      ],
      freud: [
        'psychoanalysis', 'sexuality', 'unconscious', 'dreams',
        'therapy', 'emotions', 'relationships', 'common_dream_themes'
      ],
      mary: [
        'neuroscience', 'dreams', 'emotions', 'psychological_states',
        'methodology', 'common_dream_themes', 'therapy'
      ],
      lakshmi: [
        'spirituality', 'spiritual_practices', 'dreams', 'symbols',
        'mythology', 'cultural_symbols', 'life_stages', 'emotions'
      ]
    };
    
    return interpreterTopics[interpreter] || Object.keys(this.topicKeywords);
  }
}