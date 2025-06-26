/**
 * Core type definitions for Dream Interpretation and Conversational AI
 * These types are shared across both features for consistency
 */

// ==================== BASE TYPES ====================

export type InterpreterType = 'jung' | 'lakshmi' | 'freud' | 'mary';

export interface DreamContext {
  dreamId: string;
  userId: string;
  dreamTranscription: string;
  themes: DreamTheme[];
  symbols: string[];
  emotionalTone?: EmotionalTone;
  userContext?: UserContext;
  previousDreams?: DreamSummary[];
  interpretationDate: Date;
}

export interface DreamTheme {
  code: string;
  name: string;
  relevanceScore: number;
  symbolInterpretations?: Record<string, string>;
}

export interface EmotionalTone {
  primary: string;
  intensity: number; // 0-1
  secondary?: string[];
}

export interface UserContext {
  age?: number;
  lifeStage?: string;
  currentLifeSituation?: string;
  emotionalState?: string;
  culturalBackground?: string;
  recurringSymbols?: string[];
  dreamFrequency?: 'rarely' | 'occasionally' | 'frequently' | 'nightly';
  previousInterpretations?: number;
}

export interface DreamSummary {
  dreamId: string;
  date: Date;
  mainThemes: string[];
  emotionalTone: string;
  interpretationType?: InterpreterType;
}

// ==================== KNOWLEDGE & RAG TYPES ====================

export interface KnowledgeFragment {
  id: string;
  content: string;
  source: string;
  interpreter: InterpreterType;
  themes: string[];
  relevanceScore?: number;
  metadata?: Record<string, any>;
}

export interface RAGContext {
  relevantKnowledge: KnowledgeFragment[];
  themeConnections: ThemeConnection[];
  confidenceScore: number;
}

export interface ThemeConnection {
  themeCode: string;
  themeName: string;
  knowledgeFragmentIds: string[];
  connectionStrength: number;
}

// ==================== PERSONALITY TYPES ====================

export interface InterpreterPersonality {
  id: string;
  name: string;
  fullName: string;
  approach: 'jungian' | 'spiritual' | 'freudian' | 'cognitive';
  
  traits: PersonalityTraits;
  voiceSignature: VoiceSignature;
  interpretationLens: InterpretationLens;
  conversationalStyle: ConversationalStyle;
  diversityRules: DiversityRules;
}

export interface PersonalityTraits {
  intellectualStyle: 'philosophical' | 'scientific' | 'mystical' | 'analytical';
  emotionalTone: 'warm' | 'authoritative' | 'nurturing' | 'clinical';
  questioningStyle: 'socratic' | 'direct' | 'gentle' | 'probing';
  languageComplexity: 'simple' | 'moderate' | 'sophisticated' | 'esoteric';
  responseLength: 'concise' | 'moderate' | 'detailed' | 'comprehensive';
  personalEngagement: 'intimate' | 'professional' | 'pastoral' | 'scholarly';
}

export interface VoiceSignature {
  keyPhrases: string[];
  avoidPhrases: string[];
  vocabularyPreferences: string[];
  sentenceStructures: string[];
  rhetoricalDevices: string[];
}

export interface InterpretationLens {
  primaryFocus: string[];
  symbolicEmphasis: string[];
  therapeuticGoals: string[];
  culturalReferences: string[];
  theoreticalFramework: string[];
}

export interface ConversationalStyle {
  greeting: string;
  questioningStyle: string;
  responseLength: string;
  emotionalTone: string;
  languageComplexity: string;
  pacingPreference: 'fast' | 'measured' | 'contemplative';
}

export interface DiversityRules {
  openingVariations: number;
  structuralPatterns: number;
  vocabularyRotation: number;
  conceptualAngles: number;
}

// ==================== PROMPT TYPES ====================

export interface PromptTemplate {
  type: 'system' | 'greeting' | 'follow_up' | 'closing' | 'interpretation';
  name: string;
  template: string;
  variables: PromptVariable[];
  version: number;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  sanitize?: boolean;
}

export interface DynamicPromptElements {
  openingApproach: string;
  analysisStructure: string;
  voicePattern: string;
  vocabularySet: string[];
  rhetoricalDevice: string;
  culturalReferences: string[];
  therapeuticAngle: string;
}

// ==================== INTERPRETATION RESPONSE TYPES ====================

export interface DreamInterpretation {
  dreamId: string;
  interpreterId: InterpreterType;
  
  // Core interpretation content
  dreamTopic: string;
  symbols: string[];
  quickTake: string;
  interpretation: string;
  selfReflection: string;
  
  // Interpreter-specific content
  interpreterCore: InterpreterSpecificCore;
  
  // Quality markers
  authenticityMarkers: AuthenticityMarkers;
  
  // Metadata
  generationMetadata: GenerationMetadata;
  
  // Timestamps
  createdAt: Date;
  processingTime: number;
}

export type InterpreterSpecificCore = 
  | JungianCore 
  | LakshmiCore 
  | FreudianCore 
  | NeuroscientificCore;

export interface JungianCore {
  type: 'jungian';
  dreamWork: string;
  archetypalDynamics: {
    primaryArchetype: string;
    archetypalTension: string;
    individuationGuidance: string;
  };
  shadowElements: string;
  compensatoryFunction: string;
  individuationInsight: string;
}

export interface LakshmiCore {
  type: 'spiritual';
  soulMessage: string;
  karmicInsights: {
    karmicPattern: string;
    lifeLessons: string;
    dharmicGuidance: string;
  };
  energyAnalysis: string;
  spiritualGuidance: string;
  divineConnection: string;
}

export interface FreudianCore {
  type: 'freudian';
  unconsciousContent: string;
  wishFulfillment: {
    manifestWish: string;
    latentContent: string;
    defenseMechanisms: string;
  };
  symbolismAnalysis: string;
  childhoodConnections: string;
  psychodynamicInsight: string;
}

export interface NeuroscientificCore {
  type: 'neuroscientific';
  brainActivity: string;
  cognitiveProcessing: {
    memoryConsolidation: string;
    emotionalRegulation: string;
    neuralNetworkActivity: string;
  };
  sleepStageContext: string;
  adaptiveFunction: string;
  neurologicalInsight: string;
}

export interface AuthenticityMarkers {
  personalEngagement: number;
  vocabularyAuthenticity: number;
  conceptualDepth: number;
  therapeuticValue: number;
}

export interface GenerationMetadata {
  dynamicElements: string[];
  repetitionGuards: string[];
  knowledgeSourcesUsed: string[];
  contextFactors: string[];
  confidenceScore: number;
}

// ==================== CONVERSATION TYPES ====================

export interface ConversationContext extends DreamContext {
  conversationId?: string;
  sessionId: string;
  userName?: string;
  dreamInterpretation?: string;
  dreamSymbols?: string[];
  conversationHistory?: ConversationTurn[];
}

export interface ConversationTurn {
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConversationSession {
  id: string;
  conversationId: string;
  agentId: string;
  interpreterId: InterpreterType;
  status: 'initializing' | 'active' | 'paused' | 'ended' | 'error';
  startedAt: Date;
  endedAt?: Date;
  context: ConversationContext;
}

// ==================== VALIDATION TYPES ====================

export interface ValidationResult<T = any> {
  isValid: boolean;
  score: number;
  data?: T;
  issues?: ValidationIssue[];
  suggestions?: string[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  field?: string;
  message: string;
  code?: string;
}

// ==================== ERROR TYPES ====================

export class DreamInterpretationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DreamInterpretationError';
  }
}

export class ConversationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ConversationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public validationIssues: ValidationIssue[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}