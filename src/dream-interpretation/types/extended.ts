/**
 * Extended type definitions for the modular dream interpretation system
 */

import { 
  DreamInterpretation as BaseDreamInterpretation,
  InterpreterType,
  GenerationMetadata as BaseGenerationMetadata,
  EmotionalTone,
  JungianCore,
  LakshmiCore,
  FreudianCore,
  NeuroscientificCore,
  InterpreterSpecificCore
} from './index';

// Re-export imported types that are used elsewhere
export { InterpreterType };

/**
 * Extended DreamInterpretation with additional fields for the modular system
 */
export interface DreamInterpretation extends Omit<BaseDreamInterpretation, 'interpreterCore' | 'generationMetadata'> {
  // Base fields (inherited)
  dreamId: string;
  interpreterId: InterpreterType;
  dreamTopic: string;
  symbols: string[];
  quickTake: string;
  interpretation: string;
  selfReflection: string;
  
  // Extended fields
  interpreterType?: InterpreterType;
  timestamp?: string;
  processingTime: number;
  
  // Optional fields for richer interpretations
  emotionalTone?: EmotionalTone;
  practicalGuidance?: string[];
  fullInterpretation?: string;
  
  // Renamed/extended core
  interpretationCore?: InterpretationCore;
  interpreterCore?: InterpreterSpecificCore;
  
  // Extended metadata
  generationMetadata?: GenerationMetadata;
  
  // Quality markers
  authenticityMarkers: AuthenticityMarkers;
  
  // Additional extended fields
  fullResponse?: any;
  stageMetadata?: any;
  createdAt: Date;
  userId?: string;
}

/**
 * Authenticity markers for interpretation quality
 */
export interface AuthenticityMarkers {
  personalEngagement: number;
  vocabularyAuthenticity: number;
  conceptualDepth: number;
  therapeuticValue: number;
}

/**
 * Extended GenerationMetadata with additional tracking fields
 */
export interface GenerationMetadata extends BaseGenerationMetadata {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stagesCompleted?: string[];
  knowledgeFragmentsUsed?: number;
  totalFragmentsRetrieved?: number;
  fragmentIdsUsed?: string[];
  interpreterMetadata?: any;
  validationWarnings?: string[];
}

/**
 * Unified InterpretationCore type that supports all interpreter types
 */
export interface InterpretationCore {
  type: 'jungian' | 'vedantic' | 'freudian' | 'neuroscientific';
  primaryInsight: string;
  keyPattern: string;
  personalGuidance: string;
  
  // Jung-specific fields
  archetypalDynamics?: {
    primaryArchetype: string;
    shadowElements: string;
    animaAnimus?: string;
    selfArchetype?: string;
    compensatoryFunction: string;
  };
  individuationInsights?: {
    currentStage: string;
    developmentalTask: string;
    integrationOpportunity: string;
  };
  complexesIdentified?: string[];
  collectiveThemes?: string[];
  
  // Lakshmi-specific fields
  spiritualDynamics?: {
    karmicPattern: string;
    dharmicGuidance: string;
    soulLesson: string;
    spiritualStage?: string;
    divineGuidance: string;
  };
  chakraInfluences?: Array<{
    chakra: string;
    influence: string;
    balancing?: string;
  }>;
  sanskritConcepts?: Array<{
    term: string;
    meaning: string;
    relevance?: string;
  }>;
  karmicThemes?: string[];
  sadhanaRecommendations?: string[];
  
  // Freud-specific fields
  unconsciousContent?: string;
  wishFulfillment?: {
    manifestWish: string;
    latentContent: string;
    defenseMechanisms: string;
  };
  psychodynamicInsights?: string[];
  
  // Neuroscientific fields
  brainActivityPatterns?: string[];
  cognitiveProcessing?: {
    memoryConsolidation: string;
    emotionalRegulation: string;
    neuralNetworkActivity: string;
  };
}

/**
 * Request type for three-stage interpretation
 */
export interface ThreeStageRequest {
  dreamId: string;
  userId: string;
  dreamTranscription: string;
  interpreterType: InterpreterType;
  themes: Array<{
    code: string;
    name: string;
    relevanceScore: number;
  }>;
  userContext?: {
    age?: number;
    gender?: string;
    occupation?: string;
    relationshipStatus?: string;
    currentLifeSituation?: string;
    emotionalState?: string;
    previousDreams?: string[];
  };
}

/**
 * Validation result with errors array
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Interpreter metadata for registry
 */
export interface InterpreterMetadata {
  name: string;
  description: string;
  strengths: string[];
  approach: string;
}

/**
 * Personality voice configuration
 */
export interface PersonalityVoice {
  name: string;
  description: string;
  voiceSignature: string;
  traits: string[];
  languagePatterns: string[];
  communicationStyle?: string;
}