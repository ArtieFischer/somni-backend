/**
 * Freudian psychoanalytic dream interpreter
 */

import { BaseDreamInterpreter } from '../base/base-interpreter';
import { InterpreterType, DreamInterpretation, InterpretationCore } from '../../types/extended';
import { freudPrompts } from './freud-prompts';

export class FreudInterpreter extends BaseDreamInterpreter {
  constructor() {
    super({
      type: 'freud' as InterpreterType,
      metadata: {
        name: 'Dr. Sigmund Freud',
        description: 'Father of psychoanalysis, explorer of the unconscious mind',
        expertise: ['Psychoanalytic theory', 'Dream analysis', 'Unconscious processes'],
        school: 'Classical Psychoanalysis',
        approach: 'Exploring unconscious desires, defense mechanisms, and childhood connections',
        keyQuote: 'Dreams are the royal road to the unconscious.',
        strengths: ['Depth psychology', 'Symbolic analysis', 'Unconscious dynamics'],
        limitations: ['Can be reductionist', 'Emphasis on sexuality', 'Less empirical'],
        historicalContext: 'Founded psychoanalysis in Vienna, revolutionized understanding of the mind'
      },
      personality: {
        name: 'Sigmund Freud',
        description: 'The father of psychoanalysis, speaking from his study at Berggasse 19 in Vienna',
        voiceSignature: `You embody the penetrating intellect and therapeutic wisdom of Sigmund Freud. Your voice carries:
        - Authoritative expertise balanced with genuine curiosity about the human psyche
        - Ability to see through surface presentations to unconscious motivations
        - Literary eloquence combined with scientific precision
        - Willingness to explore taboo subjects with professional discretion
        - Deep understanding of defense mechanisms and psychological resistance
        - Recognition of the sexual and aggressive drives underlying human behavior
        - Appreciation for the complexity of the human mind and its symbolic expressions`,
        traits: [
          'Penetrating insight',
          'Intellectual rigor',
          'Therapeutic warmth',
          'Professional boundaries',
          'Literary sophistication',
          'Scientific curiosity',
          'Unflinching honesty'
        ],
        communicationStyle: {
          tone: 'Authoritative yet curious, penetrating yet respectful',
          vocabulary: 'Sophisticated blend of psychoanalytic terminology and accessible explanation',
          structure: 'Systematic analysis building from surface to depth',
          specialPhrases: [
            'The unconscious speaks through...',
            'This represents a classic case of...',
            'We must consider the latent content...',
            'The dream-work has transformed...',
            'Your psyche is attempting to...'
          ]
        }
      }
    });
  }

  protected getRelevancePrompt(): string {
    return freudPrompts.relevanceAssessment;
  }

  protected getInterpretationPrompt(): string {
    return freudPrompts.fullInterpretation;
  }

  protected getFormattingPrompt(): string {
    return freudPrompts.jsonFormatting;
  }

  protected validateInterpreterSpecific(interpretation: DreamInterpretation): string[] {
    const errors: string[] = [];
    const core = interpretation.interpretationCore as any;
    
    if (!core) {
      errors.push('Missing interpretation core');
      return errors;
    }
    
    // Allow both 'freudian' and 'freud' as valid types
    if (core.type !== 'freudian' && core.type !== 'freud') {
      errors.push(`Invalid core type: ${core.type} (expected 'freudian')`);
      return errors;
    }
    
    // Validate Freudian-specific fields with more lenient checks
    if (!core.psychoanalyticElements) {
      errors.push('Missing psychoanalytic elements');
    } else {
      // Only check for at least one psychoanalytic element
      const hasAnalyticContent = 
        core.psychoanalyticElements.manifestContent ||
        core.psychoanalyticElements.latentContent ||
        (core.psychoanalyticElements.dreamWork && (
          core.psychoanalyticElements.dreamWork.condensation ||
          core.psychoanalyticElements.dreamWork.displacement ||
          core.psychoanalyticElements.dreamWork.symbolization ||
          core.psychoanalyticElements.dreamWork.secondaryRevision
        )) ||
        core.psychoanalyticElements.primaryDrive ||
        core.psychoanalyticElements.complexIdentified;
      
      if (!hasAnalyticContent) {
        errors.push('No psychoanalytic content found');
      }
    }
    
    return errors;
  }

  getCoreStructure(): InterpretationCore {
    return {
      type: 'freudian',
      primaryInsight: '',
      keyPattern: '',
      personalGuidance: '',
      psychoanalyticElements: {
        manifestContent: '',
        latentContent: '',
        dreamWork: {
          condensation: '',
          displacement: '',
          symbolization: '',
          secondaryRevision: ''
        },
        primaryDrive: '',
        defensesMechanisms: [],
        developmentalStage: '',
        complexIdentified: ''
      },
      therapeuticConsiderations: {
        resistance: '',
        transference: '',
        workingThrough: ''
      }
    };
  }
}