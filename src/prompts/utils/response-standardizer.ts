import type { DreamAnalysis, JungianInsights, FreudianInsights, MaryInsights } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Standardizes interpretation responses to ensure consistent structure
 * across all interpreter types.
 */
export class ResponseStandardizer {
  /**
   * Convert any interpreter-specific format to standard DreamAnalysis format
   * while preserving additional fields in an additionalInfo object
   */
  static standardizeResponse(
    interpretation: DreamAnalysis | JungianInsights | FreudianInsights | MaryInsights
  ): DreamAnalysis & { additionalInfo?: Record<string, any> } {
    // If it's already in DreamAnalysis format, return as is
    if (this.isDreamAnalysis(interpretation)) {
      return interpretation;
    }

    // Handle JungianInsights
    if ('type' in interpretation && interpretation.type === 'jungian') {
      return this.standardizeJungianInsights(interpretation as JungianInsights);
    }

    // Handle FreudianInsights
    if ('type' in interpretation && interpretation.type === 'freudian') {
      return this.standardizeFreudianInsights(interpretation as FreudianInsights);
    }

    // Handle MaryInsights
    if ('type' in interpretation && interpretation.type === 'mary') {
      return this.standardizeMaryInsights(interpretation as MaryInsights);
    }

    // Fallback - should not reach here
    logger.warn('Unknown interpretation format, returning as is');
    return interpretation as DreamAnalysis;
  }

  /**
   * Check if the object is in DreamAnalysis format
   */
  private static isDreamAnalysis(obj: any): obj is DreamAnalysis {
    return !!(
      obj.dreamTopic &&
      Array.isArray(obj.symbols) &&
      obj.quickTake &&
      obj.dreamWork &&
      obj.interpretation &&
      obj.selfReflection &&
      !('type' in obj) // DreamAnalysis doesn't have a type field
    );
  }

  /**
   * Convert JungianInsights to standardized format
   */
  private static standardizeJungianInsights(insights: JungianInsights): DreamAnalysis & { additionalInfo?: Record<string, any> } {
    // Extract the main interpretation text
    let interpretationText = '';
    let personalAssociations: any[] = [];
    let archetypalConnections: any[] = [];
    
    // Try to parse the interpretation field if it's JSON
    if (insights.interpretation) {
      try {
        const parsed = JSON.parse(insights.interpretation);
        interpretationText = parsed.interpretation || parsed.individuationInsight || parsed.individuationMessage || '';
        
        // Extract personal associations and archetypal connections
        if (parsed.personalAssociations) {
          personalAssociations = parsed.personalAssociations;
        }
        if (parsed.archetypalConnections) {
          archetypalConnections = parsed.archetypalConnections;
        }
        
        // Build comprehensive interpretation from various fields
        if (!interpretationText && personalAssociations.length > 0) {
          interpretationText = personalAssociations.map((pa: any) => 
            `${pa.observation || ''}\n\n${pa.insight || ''}`
          ).join('\n\n');
        }
      } catch {
        // If not JSON, use as is
        interpretationText = insights.interpretation;
      }
    }
    
    // Fallback to coreMessage if no interpretation found
    if (!interpretationText) {
      interpretationText = insights.coreMessage || 'Your unconscious speaks through profound symbolic language.';
    }

    // Build dreamWork from various Jung-specific fields
    const dreamWork = insights.compensatoryFunction || 'This dream offers compensation for conscious attitudes through symbolic representation.';

    // Build quickTake from phenomenological opening or core message
    const quickTake = insights.phenomenologicalOpening || insights.coreMessage || 'Your unconscious speaks through profound symbolic language.';

    // Extract self-reflection question
    const selfReflection = insights.reflectiveQuestions?.[0] || 'What aspect of your Self is seeking recognition through this dream?';

    // Create dream topic from core message (truncate to 5-9 words)
    const dreamTopic = this.createDreamTopic(insights.coreMessage || interpretationText);

    // Gather additional Jung-specific fields
    const additionalInfo: Record<string, any> = {};
    
    if (insights.shadowAspects) additionalInfo['shadowAspects'] = insights.shadowAspects;
    if (insights.individuationGuidance) additionalInfo['individuationGuidance'] = insights.individuationGuidance;
    if (insights.activeImaginationExercise) additionalInfo['activeImaginationExercise'] = insights.activeImaginationExercise;
    if (insights.isBigDream !== undefined) additionalInfo['isBigDream'] = insights.isBigDream;
    if (insights.lifePhaseGuidance) additionalInfo['lifePhaseGuidance'] = insights.lifePhaseGuidance;
    if (insights.animaAnimusContent) additionalInfo['animaAnimusContent'] = insights.animaAnimusContent;
    if (insights.synchronicityConnection) additionalInfo['synchronicityConnection'] = insights.synchronicityConnection;
    
    // Add archetypal connections and personal associations if they were extracted
    if (archetypalConnections.length > 0) {
      additionalInfo['archetypalConnections'] = archetypalConnections;
    }
    if (personalAssociations.length > 0) {
      additionalInfo['personalAssociations'] = personalAssociations;
    }

    return {
      dreamTopic,
      symbols: insights.symbols || [],
      quickTake,
      dreamWork,
      interpretation: interpretationText || insights.coreMessage,
      selfReflection,
      ...(Object.keys(additionalInfo).length > 0 && { additionalInfo })
    };
  }

  /**
   * Convert FreudianInsights to standardized format
   */
  private static standardizeFreudianInsights(insights: FreudianInsights): DreamAnalysis & { additionalInfo?: Record<string, any> } {
    // Extract core interpretation
    const interpretationText = insights.interpretation || insights.coreMessage;

    // Build dreamWork from Freudian concepts
    const dreamWork = `This dream reveals unconscious desires and repressed content. ${insights.unconsciousDesires?.[0] || 'The manifest content conceals latent meanings.'} ${insights.repressionIndicators?.[0] || 'Defense mechanisms are at play.'}`;

    // Create quickTake
    const quickTake = insights.coreMessage || 'Your unconscious reveals hidden desires through symbolic transformation.';

    // Extract self-reflection
    const selfReflection = insights.reflectiveQuestions?.[0] || 'What forbidden wishes might this dream be expressing?';

    // Create dream topic
    const dreamTopic = this.createDreamTopic(insights.coreMessage || interpretationText);

    // Gather additional Freud-specific fields
    const additionalInfo: Record<string, any> = {};
    
    if (insights.unconsciousDesires) additionalInfo['unconsciousDesires'] = insights.unconsciousDesires;
    if (insights.childhoodConnections) additionalInfo['childhoodConnections'] = insights.childhoodConnections;
    if (insights.repressionIndicators) additionalInfo['repressionIndicators'] = insights.repressionIndicators;
    if (insights.oedipalDynamics) additionalInfo['oedipalDynamics'] = insights.oedipalDynamics;
    if (insights.transferenceElements) additionalInfo['transferenceElements'] = insights.transferenceElements;
    if (insights.professionalAnalysis) additionalInfo['professionalAnalysis'] = insights.professionalAnalysis;
    if (insights.socialDynamicsAnalysis) additionalInfo['socialDynamicsAnalysis'] = insights.socialDynamicsAnalysis;
    if (insights.anxietyAnalysis) additionalInfo['anxietyAnalysis'] = insights.anxietyAnalysis;
    if (insights.sexualAnalysis) additionalInfo['sexualAnalysis'] = insights.sexualAnalysis;
    if (insights.transferenceAnalysis) additionalInfo['transferenceAnalysis'] = insights.transferenceAnalysis;

    return {
      dreamTopic,
      symbols: insights.symbols || [],
      quickTake,
      dreamWork,
      interpretation: interpretationText,
      selfReflection,
      ...(Object.keys(additionalInfo).length > 0 && { additionalInfo })
    };
  }

  /**
   * Convert MaryInsights to standardized format
   */
  private static standardizeMaryInsights(insights: MaryInsights): DreamAnalysis & { additionalInfo?: Record<string, any> } {
    // Extract core interpretation
    const interpretationText = insights.interpretation || insights.coreMessage;

    // Build dreamWork from neuroscience concepts
    const dreamWork = `${insights.sleepStageIndicators || 'REM sleep activity suggests emotional processing.'} ${insights.brainActivity?.[0] || 'Neural patterns indicate memory consolidation.'} ${insights.continuityElements?.[0] || 'Day residue influences dream content.'}`;

    // Create quickTake
    const quickTake = insights.coreMessage || 'Your brain processes emotions and memories through dream symbolism.';

    // Extract self-reflection
    const selfReflection = insights.reflectiveQuestions?.[0] || 'How might this dream reflect your brain\'s processing of recent experiences?';

    // Create dream topic
    const dreamTopic = this.createDreamTopic(insights.coreMessage || interpretationText);

    // Gather additional neuroscience-specific fields
    const additionalInfo: Record<string, any> = {};
    
    if (insights.brainActivity) additionalInfo['brainActivity'] = insights.brainActivity;
    if (insights.sleepStageIndicators) additionalInfo['sleepStageIndicators'] = insights.sleepStageIndicators;
    if (insights.continuityElements) additionalInfo['continuityElements'] = insights.continuityElements;
    if (insights.neuroscienceEducation) additionalInfo['neuroscienceEducation'] = insights.neuroscienceEducation;
    if (insights.memoryConsolidation) additionalInfo['memoryConsolidation'] = insights.memoryConsolidation;
    if (insights.threatSimulation) additionalInfo['threatSimulation'] = insights.threatSimulation;
    if (insights.emotionalRegulation) additionalInfo['emotionalRegulation'] = insights.emotionalRegulation;
    if (insights.problemSolving) additionalInfo['problemSolving'] = insights.problemSolving;
    if (insights.circadianFactors) additionalInfo['circadianFactors'] = insights.circadianFactors;

    return {
      dreamTopic,
      symbols: insights.symbols || [],
      quickTake,
      dreamWork,
      interpretation: interpretationText,
      selfReflection,
      ...(Object.keys(additionalInfo).length > 0 && { additionalInfo })
    };
  }

  /**
   * Create a 5-9 word dream topic from longer text
   */
  private static createDreamTopic(text: string): string {
    if (!text) return 'Unconscious communication through symbolic imagery';
    
    // Clean the text
    const cleaned = text.replace(/[.,!?;:]/g, '').trim();
    const words = cleaned.split(/\s+/);
    
    // If already 5-9 words, return as is
    if (words.length >= 5 && words.length <= 9) {
      return cleaned;
    }
    
    // If too long, take first 8 words
    if (words.length > 9) {
      return words.slice(0, 8).join(' ');
    }
    
    // If too short, add context
    return `${cleaned} reveals unconscious patterns`;
  }
}