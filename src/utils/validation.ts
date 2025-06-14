import { z } from 'zod';

// Base validation schemas
export const InterpreterTypeSchema = z.enum(['jung', 'freud', 'neuroscientist', 'astrologist']);

export const AnalysisDepthSchema = z.enum(['initial', 'deep', 'transformative']).optional();

// UserContext validation schema
export const UserContextSchema = z.object({
  age: z.number().min(1).max(120, 'Age must be between 1 and 120'),
  gender: z.string().optional(),
  currentLifeSituation: z.string().max(500, 'Life situation description too long').optional(),
  emotionalState: z.string().max(200, 'Emotional state description too long').optional(),
  recurringSymbols: z.array(z.string().max(100)).max(20, 'Too many recurring symbols').optional(),
  recentMajorEvents: z.array(z.string().max(200)).max(10, 'Too many recent events').optional(),
  lifePhase: z.string().optional()
}).strict();

// DreamHistory validation schema
export const DreamHistorySchema = z.object({
  dreamId: z.string().uuid('Invalid dream ID format'),
  transcript: z.string().min(10, 'Dream transcript too short').max(10000, 'Dream transcript too long'),
  interpretationDate: z.string().datetime('Invalid date format'),
  keySymbols: z.array(z.string().max(100)).max(50).optional(),
  themes: z.array(z.string().max(100)).max(20).optional()
}).strict();

// Special prompts validation
export const SpecialPromptsSchema = z.object({
  synchronicity: z.string().max(1000, 'Synchronicity description too long').optional(),
  isNightmare: z.boolean().optional(),
  customContext: z.string().max(1000, 'Custom context too long').optional()
}).strict().optional();

// InterpretationRequest validation schema
export const InterpretationRequestSchema = z.object({
  dreamId: z.string().uuid('Invalid dream ID format'),
  dreamTranscription: z.string()
    .min(10, 'Dream transcription must be at least 10 characters')
    .max(50000, 'Dream transcription too long (max 50,000 characters)'),
  interpreterType: InterpreterTypeSchema,
  userContext: UserContextSchema.optional(),
  previousDreams: z.array(DreamHistorySchema).max(10, 'Too many previous dreams').optional(),
  analysisDepth: AnalysisDepthSchema,
  specialPrompts: SpecialPromptsSchema
}).strict();

// TokenUsage validation schema
export const TokenUsageSchema = z.object({
  promptTokens: z.number().min(0),
  completionTokens: z.number().min(0),
  totalTokens: z.number().min(0),
  cost: z.number().min(0).optional()
}).strict();

// CostSummary validation schema
export const CostSummarySchema = z.object({
  totalCost: z.number().min(0),
  totalRequests: z.number().min(0),
  recentEntries: z.array(z.object({
    timestamp: z.string().datetime(),
    model: z.string(),
    cost: z.number().min(0),
    tokens: z.number().min(0)
  })).max(100)
}).strict();

// Symbol analysis schemas
export const SymbolAnalysisSchema = z.object({
  symbol: z.string().min(1).max(100),
  personalMeaning: z.string().max(500),
  culturalMeaning: z.string().max(500),
  archetypalMeaning: z.string().max(500)
}).strict();

export const FreudianSymbolSchema = z.object({
  symbol: z.string().min(1).max(100),
  symbolicMeaning: z.string().max(500),
  psychoanalyticInterpretation: z.string().max(500)
}).strict();

export const PlanetaryInfluenceSchema = z.object({
  planet: z.string().min(1).max(50),
  influence: z.string().max(300),
  symbolism: z.string().max(300)
}).strict();

// JungianInsights validation schema
export const JungianInsightsSchema = z.object({
  type: z.literal('jungian'),
  coreMessage: z.string().min(10).max(2000),
  phenomenologicalOpening: z.string().min(10).max(1000),
  symbols: z.array(SymbolAnalysisSchema).max(20),
  shadowAspects: z.array(z.string().max(300)).max(10).optional(),
  compensatoryFunction: z.string().min(10).max(1000),
  individuationGuidance: z.string().min(10).max(1500),
  activeImaginationExercise: z.string().max(1000).optional(),
  reflectiveQuestions: z.array(z.string().min(5).max(300)).min(1).max(10),
  isBigDream: z.boolean(),
  lifePhaseGuidance: z.string().max(800).optional(),
  animaAnimusContent: z.string().max(800).optional(),
  synchronicityConnection: z.string().max(500).optional()
}).strict();

// FreudianInsights validation schema
export const FreudianInsightsSchema = z.object({
  type: z.literal('freudian'),
  coreMessage: z.string().min(10).max(2000),
  unconsciousDesires: z.array(z.string().max(400)).max(10),
  symbolicAnalysis: z.array(FreudianSymbolSchema).max(15),
  childhoodConnections: z.array(z.string().max(400)).max(8).optional(),
  repressionIndicators: z.array(z.string().max(400)).max(8).optional(),
  reflectiveQuestions: z.array(z.string().min(5).max(300)).min(1).max(8)
}).strict();

// NeuroscientistInsights validation schema
export const NeuroscientistInsightsSchema = z.object({
  type: z.literal('neuroscientist'),
  coreMessage: z.string().min(10).max(2000),
  sleepStageAnalysis: z.string().min(10).max(800),
  memoryConsolidation: z.array(z.string().max(400)).max(8),
  neurobiologicalProcesses: z.array(z.string().max(400)).max(10),
  brainRegionsInvolved: z.array(z.string().max(200)).max(12),
  cognitiveFunction: z.string().min(10).max(800),
  reflectiveQuestions: z.array(z.string().min(5).max(300)).min(1).max(6)
}).strict();

// AstrologistInsights validation schema
export const AstrologistInsightsSchema = z.object({
  type: z.literal('astrologist'),
  coreMessage: z.string().min(10).max(2000),
  planetaryInfluences: z.array(PlanetaryInfluenceSchema).max(12),
  zodiacConnections: z.array(z.string().max(300)).max(12).optional(),
  cosmicTiming: z.string().max(500).optional(),
  spiritualInsights: z.array(z.string().max(400)).max(8),
  reflectiveQuestions: z.array(z.string().min(5).max(300)).min(1).max(6)
}).strict();

// Union schema for all insight types
export const InterpretationInsightsSchema = z.union([
  JungianInsightsSchema,
  FreudianInsightsSchema,
  NeuroscientistInsightsSchema,
  AstrologistInsightsSchema
]);

// InterpretationResponse validation schema
export const InterpretationResponseSchema = z.object({
  success: z.boolean(),
  dreamId: z.string().uuid(),
  interpretation: InterpretationInsightsSchema.optional(),
  aiResponse: z.string().optional(), // Raw AI response for debugging
  metadata: z.object({
    interpreterType: InterpreterTypeSchema,
    modelUsed: z.string().min(1),
    processedAt: z.string().datetime(),
    tokenUsage: TokenUsageSchema.optional(),
    costSummary: CostSummarySchema.optional(),
    analysisDepth: z.enum(['initial', 'deep', 'transformative']),
    duration: z.number().min(0)
  }).strict().optional(),
  error: z.string().optional()
}).strict();

// Validation helper functions
export function validateInterpretationRequest(data: unknown): z.infer<typeof InterpretationRequestSchema> {
  return InterpretationRequestSchema.parse(data);
}

export function validateInterpretationResponse(data: unknown): z.infer<typeof InterpretationResponseSchema> {
  return InterpretationResponseSchema.parse(data);
}

export function validateUserContext(data: unknown): z.infer<typeof UserContextSchema> {
  return UserContextSchema.parse(data);
}

// Age-based life phase helper (matching Jungian specification)
export function determineLifePhase(age: number): string {
  if (age < 21) return "Youth - Building ego consciousness";
  if (age < 35) return "Early adulthood - Establishing life structure";
  if (age < 40) return "Approaching midlife - The call to depth";
  if (age < 60) return "Midlife - Confronting unlived life and shadow";
  if (age < 75) return "Later life - Wisdom and life review";
  return "Elder years - Approaching the Self";
}

// Request body size limits (in bytes)
export const VALIDATION_LIMITS = {
  MAX_DREAM_TRANSCRIPTION_LENGTH: 50000, // ~50KB
  MAX_PREVIOUS_DREAMS: 10,
  MAX_RECURRING_SYMBOLS: 20,
  MAX_RECENT_EVENTS: 10,
  MAX_SYMBOLS_PER_INTERPRETATION: 20,
  MAX_REFLECTIVE_QUESTIONS: 10
} as const;

// Error messages for common validation failures
export const VALIDATION_ERRORS = {
  INVALID_DREAM_ID: 'Dream ID must be a valid UUID',
  DREAM_TOO_SHORT: 'Dream transcription must be at least 10 characters',
  DREAM_TOO_LONG: 'Dream transcription exceeds maximum length (50,000 characters)',
  INVALID_INTERPRETER: 'Interpreter type must be one of: jung, freud, neuroscientist, astrologist',
  INVALID_AGE: 'Age must be between 1 and 120',
  TOO_MANY_PREVIOUS_DREAMS: 'Maximum 10 previous dreams allowed',
  CONTEXT_TOO_LONG: 'Context descriptions are too long',
  INVALID_ANALYSIS_DEPTH: 'Analysis depth must be: initial, deep, or transformative'
} as const; 