/**
 * Base interpreter interface that all dream interpreters must implement
 */

import { 
  DreamInterpretation, 
  InterpreterType,
  InterpretationCore,
  ValidationResult,
  InterpreterMetadata,
  PersonalityVoice
} from '../../types/extended';

export interface InterpreterContext {
  dreamId: string;
  userId: string;
  dreamTranscription: string;
  themes: Array<{ code: string; name: string; relevanceScore: number }>;
  userContext?: {
    age?: number;
    gender?: string;
    occupation?: string;
    relationshipStatus?: string;
    currentLifeSituation?: string;
    emotionalState?: string;
    previousDreams?: string[];
  };
  knowledgeFragments?: Array<{
    content: string;
    metadata: any;
    relevance: number;
  }>;
}

export interface StageResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface RelevanceAssessment {
  relevantThemes: string[];
  relevantFragments: Array<{
    content: string;
    relevance: number;
    reason: string;
  }>;
  focusAreas: string[];
}

export interface FullInterpretationResult {
  interpretation: string;
  keyInsights: string[];
  symbolsIdentified: string[];
}

export interface FormattedInterpretation extends DreamInterpretation {
  fullInterpretation?: string;
  stageMetadata?: {
    relevanceAssessment?: RelevanceAssessment;
    interpretationMetadata?: Record<string, any>;
  };
}

/**
 * Core interface that all dream interpreters must implement
 */
export interface IDreamInterpreter {
  /**
   * Unique identifier for this interpreter
   */
  readonly type: InterpreterType;
  
  /**
   * Metadata about this interpreter
   */
  readonly metadata: InterpreterMetadata;
  
  /**
   * Personality voice configuration
   */
  readonly personality: PersonalityVoice;
  
  /**
   * Stage 1: Assess relevance of knowledge and themes
   */
  assessRelevance(context: InterpreterContext): Promise<StageResult<RelevanceAssessment>>;
  
  /**
   * Stage 2: Generate full interpretation
   */
  generateFullInterpretation(
    context: InterpreterContext, 
    relevanceData: RelevanceAssessment
  ): Promise<StageResult<FullInterpretationResult>>;
  
  /**
   * Stage 3: Format into structured JSON
   */
  formatToJSON(
    context: InterpreterContext,
    fullInterpretation: FullInterpretationResult,
    relevanceData: RelevanceAssessment
  ): Promise<StageResult<FormattedInterpretation>>;
  
  /**
   * Validate the final interpretation
   */
  validate(interpretation: DreamInterpretation): ValidationResult;
  
  /**
   * Get interpreter-specific prompts
   */
  getPrompts(): {
    relevanceAssessment: string;
    fullInterpretation: string;
    jsonFormatting: string;
  };
  
  /**
   * Get interpreter-specific core structure
   */
  getCoreStructure(): InterpretationCore;
}

/**
 * Configuration for creating an interpreter
 */
export interface InterpreterConfig {
  type: InterpreterType;
  metadata: InterpreterMetadata;
  personality: PersonalityVoice;
  customPrompts?: Partial<{
    relevanceAssessment: string;
    fullInterpretation: string;
    jsonFormatting: string;
  }>;
}