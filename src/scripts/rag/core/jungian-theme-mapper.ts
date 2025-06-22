/**
 * Maps universal dream themes to Jungian concepts
 * This allows Jung to interpret modern dreams through his theoretical framework
 * while maintaining his authentic voice and terminology
 */

interface JungianConcept {
  concept: string;
  description: string;
  relatedArchetypes?: string[];
  psychologicalProcess?: string;
}

interface ThemeMapping {
  themeCode: string;
  jungianConcepts: JungianConcept[];
  interpretiveApproach: string;
}

export class JungianThemeMapper {
  // Core Jungian concepts that remain constant
  private readonly CORE_CONCEPTS = {
    SHADOW: {
      concept: 'Shadow',
      description: 'The rejected and hidden aspects of the personality',
      relatedArchetypes: ['Dark Double', 'Enemy', 'Trickster'],
      psychologicalProcess: 'Integration of rejected aspects'
    },
    ANIMA_ANIMUS: {
      concept: 'Anima/Animus',
      description: 'The contrasexual aspect of the psyche',
      relatedArchetypes: ['Wise Woman', 'Wise Old Man', 'Lover'],
      psychologicalProcess: 'Integration of opposite gender qualities'
    },
    SELF: {
      concept: 'Self',
      description: 'The unified whole of conscious and unconscious',
      relatedArchetypes: ['Mandala', 'Divine Child', 'Wise Old Man/Woman'],
      psychologicalProcess: 'Individuation'
    },
    PERSONA: {
      concept: 'Persona',
      description: 'The mask we present to the world',
      relatedArchetypes: ['Mask', 'Actor', 'Social Role'],
      psychologicalProcess: 'Social adaptation vs authentic self'
    },
    COLLECTIVE_UNCONSCIOUS: {
      concept: 'Collective Unconscious',
      description: 'Shared psychic material of humanity',
      relatedArchetypes: ['Great Mother', 'Hero', 'Trickster'],
      psychologicalProcess: 'Connection to universal human experience'
    }
  };

  // Map modern themes to Jungian interpretations
  private readonly themeToJungianMap: Record<string, ThemeMapping> = {
    // Technology themes → Shadow and Collective Unconscious
    'ai': {
      themeCode: 'ai',
      jungianConcepts: [
        this.CORE_CONCEPTS.SHADOW,
        this.CORE_CONCEPTS.COLLECTIVE_UNCONSCIOUS
      ],
      interpretiveApproach: 'The fear of artificial intelligence replacing human consciousness reflects the shadow of our technological age - the collective anxiety about losing our humanity to our own creations.'
    },
    'virtual_reality': {
      themeCode: 'virtual_reality',
      jungianConcepts: [
        this.CORE_CONCEPTS.PERSONA,
        {
          concept: 'Reality vs Illusion',
          description: 'The boundary between inner and outer reality',
          psychologicalProcess: 'Distinguishing authentic experience from projection'
        }
      ],
      interpretiveApproach: 'Virtual reality in dreams represents the modern expression of ancient questions about maya (illusion) and reality, the persona we construct versus authentic being.'
    },
    'social_media': {
      themeCode: 'social_media',
      jungianConcepts: [
        this.CORE_CONCEPTS.PERSONA,
        {
          concept: 'Projection',
          description: 'Seeing our unconscious contents in others',
          psychologicalProcess: 'Withdrawing projections'
        }
      ],
      interpretiveApproach: 'Social media dreams reveal the inflation of the persona and the projection of our unconscious onto the collective digital screen.'
    },
    
    // Classic archetypal themes
    'snake': {
      themeCode: 'snake',
      jungianConcepts: [
        {
          concept: 'Transformation Symbol',
          description: 'The snake as symbol of renewal and transformation',
          relatedArchetypes: ['Ouroboros', 'Kundalini'],
          psychologicalProcess: 'Psychic transformation and renewal'
        },
        this.CORE_CONCEPTS.SHADOW
      ],
      interpretiveApproach: 'The snake is one of the most ancient symbols of transformation, representing both the dangerous and healing aspects of the unconscious.'
    },
    'death': {
      themeCode: 'death',
      jungianConcepts: [
        {
          concept: 'Psychic Death and Rebirth',
          description: 'The death of old attitudes and birth of new consciousness',
          psychologicalProcess: 'Transformation of personality'
        },
        this.CORE_CONCEPTS.SELF
      ],
      interpretiveApproach: 'Death in dreams rarely means physical death but rather the end of a psychological attitude that must die for new growth.'
    },
    'shadow': {
      themeCode: 'shadow',
      jungianConcepts: [
        this.CORE_CONCEPTS.SHADOW
      ],
      interpretiveApproach: 'Direct encounter with the shadow - the dark double that contains all we refuse to acknowledge about ourselves.'
    },
    
    // Relationship themes
    'betrayal': {
      themeCode: 'betrayal',
      jungianConcepts: [
        this.CORE_CONCEPTS.SHADOW,
        {
          concept: 'Projection',
          description: 'Seeing our own capacity for betrayal in others',
          psychologicalProcess: 'Recognizing our own shadow'
        }
      ],
      interpretiveApproach: 'Betrayal dreams often reveal where we betray ourselves or project our own shadow onto others.'
    },
    'ex_partner': {
      themeCode: 'ex_partner',
      jungianConcepts: [
        this.CORE_CONCEPTS.ANIMA_ANIMUS,
        {
          concept: 'Unlived Life',
          description: 'Aspects of self projected onto past relationships',
          psychologicalProcess: 'Reclaiming projections'
        }
      ],
      interpretiveApproach: 'Former partners in dreams often represent unlived aspects of our own personality we projected onto them.'
    },
    
    // Environmental/modern anxieties
    'climate_change': {
      themeCode: 'climate_change',
      jungianConcepts: [
        this.CORE_CONCEPTS.COLLECTIVE_UNCONSCIOUS,
        {
          concept: 'World Soul (Anima Mundi)',
          description: 'The suffering of the collective soul of the world',
          psychologicalProcess: 'Awakening to collective responsibility'
        }
      ],
      interpretiveApproach: 'Climate anxiety in dreams reflects the collective unconscious awareness of our disconnection from nature and the world soul.'
    },
    
    // Movement themes
    'flying': {
      themeCode: 'flying',
      jungianConcepts: [
        {
          concept: 'Spiritual Liberation',
          description: 'Rising above earthly limitations',
          relatedArchetypes: ['Spirit', 'Puer Aeternus'],
          psychologicalProcess: 'Transcendent function'
        },
        {
          concept: 'Inflation',
          description: 'Identification with archetypal powers',
          psychologicalProcess: 'Need for grounding'
        }
      ],
      interpretiveApproach: 'Flying can represent spiritual liberation or dangerous inflation - rising above limitations or losing touch with reality.'
    },
    'falling': {
      themeCode: 'falling',
      jungianConcepts: [
        {
          concept: 'Loss of Ego Control',
          description: 'Surrender to unconscious forces',
          psychologicalProcess: 'Letting go of conscious control'
        },
        this.CORE_CONCEPTS.SHADOW
      ],
      interpretiveApproach: 'Falling represents the necessary descent into the unconscious, the loss of ego control that precedes transformation.'
    },
    'being_chased': {
      themeCode: 'being_chased',
      jungianConcepts: [
        this.CORE_CONCEPTS.SHADOW,
        {
          concept: 'Repressed Content',
          description: 'Unconscious content demanding attention',
          psychologicalProcess: 'Confronting what we flee from'
        }
      ],
      interpretiveApproach: 'What chases us in dreams is often what we refuse to face in ourselves - the shadow demanding integration.'
    }
  };

  /**
   * Get Jungian concepts for a dream theme
   */
  getJungianConcepts(themeCode: string): ThemeMapping | null {
    return this.themeToJungianMap[themeCode] || null;
  }

  /**
   * Get all themes that relate to a specific Jungian concept
   */
  getThemesByJungianConcept(conceptName: string): string[] {
    return Object.entries(this.themeToJungianMap)
      .filter(([_, mapping]) => 
        mapping.jungianConcepts.some(c => c.concept === conceptName)
      )
      .map(([themeCode]) => themeCode);
  }

  /**
   * Map a dream's themes to relevant Jungian concepts for retrieval
   */
  mapDreamToJungianConcepts(dreamThemes: string[]): {
    concepts: Set<string>;
    interpretiveHints: string[];
  } {
    const concepts = new Set<string>();
    const interpretiveHints: string[] = [];

    for (const theme of dreamThemes) {
      const mapping = this.getJungianConcepts(theme);
      if (mapping) {
        mapping.jungianConcepts.forEach(concept => {
          concepts.add(concept.concept);
        });
        interpretiveHints.push(mapping.interpretiveApproach);
      }
    }

    return { concepts, interpretiveHints };
  }

  /**
   * Enhance content metadata with theme mappings
   */
  enhanceContentWithThemes(
    content: string,
    existingMetadata: any
  ): {
    jungianConcepts: string[];
    applicableThemes: string[];
    interpretiveContext: string;
  } {
    // Analyze content for Jungian concepts
    const detectedConcepts: string[] = [];
    const applicableThemes: string[] = [];
    
    // Check for concept mentions in content
    const contentLower = content.toLowerCase();
    
    // Check for shadow mentions
    if (contentLower.includes('shadow') || contentLower.includes('dark side') || 
        contentLower.includes('rejected') || contentLower.includes('repressed')) {
      detectedConcepts.push('Shadow');
      applicableThemes.push(...this.getThemesByJungianConcept('Shadow'));
    }
    
    // Check for anima/animus
    if (contentLower.includes('anima') || contentLower.includes('animus') || 
        contentLower.includes('contrasexual') || contentLower.includes('inner woman') ||
        contentLower.includes('inner man')) {
      detectedConcepts.push('Anima/Animus');
      applicableThemes.push(...this.getThemesByJungianConcept('Anima/Animus'));
    }
    
    // Check for Self/individuation
    if (contentLower.includes('self') || contentLower.includes('individuation') || 
        contentLower.includes('wholeness') || contentLower.includes('mandala')) {
      detectedConcepts.push('Self');
      applicableThemes.push(...this.getThemesByJungianConcept('Self'));
    }
    
    // Check for persona
    if (contentLower.includes('persona') || contentLower.includes('mask') || 
        contentLower.includes('social face') || contentLower.includes('public image')) {
      detectedConcepts.push('Persona');
      applicableThemes.push(...this.getThemesByJungianConcept('Persona'));
    }
    
    // Check for collective unconscious
    if (contentLower.includes('collective unconscious') || contentLower.includes('archetype') || 
        contentLower.includes('universal') || contentLower.includes('primordial')) {
      detectedConcepts.push('Collective Unconscious');
      applicableThemes.push(...this.getThemesByJungianConcept('Collective Unconscious'));
    }
    
    // Check for specific symbols
    if (contentLower.includes('snake') || contentLower.includes('serpent')) {
      applicableThemes.push('snake');
    }
    if (contentLower.includes('death') || contentLower.includes('dying')) {
      applicableThemes.push('death');
    }
    if (contentLower.includes('flying') || contentLower.includes('flight')) {
      applicableThemes.push('flying');
    }
    if (contentLower.includes('falling') || contentLower.includes('fall')) {
      applicableThemes.push('falling');
    }
    if (contentLower.includes('chase') || contentLower.includes('pursued')) {
      applicableThemes.push('being_chased');
    }
    
    // Create interpretive context
    const interpretiveContext = detectedConcepts.length > 0
      ? `This passage relates to ${detectedConcepts.join(', ')} and can interpret dreams about ${applicableThemes.slice(0, 5).join(', ')}`
      : 'General Jungian perspective on dream symbolism';
    
    return {
      jungianConcepts: [...new Set(detectedConcepts)],
      applicableThemes: [...new Set(applicableThemes)],
      interpretiveContext
    };
  }
}

// Export singleton instance
export const jungianThemeMapper = new JungianThemeMapper();