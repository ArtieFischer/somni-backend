# 🚀 PRODUCTION IMPLEMENTATION GUIDE

**Target**: Production-ready Jung & Lakshmi conversational agents  
**Timeline**: 3 weeks to enterprise-grade deployment  
**Focus**: Maintainable, scalable, and bulletproof implementation  

---

## 🎯 **IMPLEMENTATION STRATEGY**

### Architecture Decision Record (ADR)

**ADR-001: Configuration-Driven Interpreter System**
- **Decision**: Store all interpreter personalities in database, not hardcoded
- **Rationale**: Easy to modify prompts, add new interpreters, A/B test personalities
- **Impact**: Requires additional database tables but enables runtime configuration

**ADR-002: Event-Driven Conversation Architecture**
- **Decision**: Use event bus for all conversation state changes
- **Rationale**: Enables real-time updates, analytics, and future integrations
- **Impact**: More complex but highly scalable and observable

**ADR-003: Circuit Breaker for ElevenLabs Integration**
- **Decision**: Implement circuit breaker pattern for all external API calls
- **Rationale**: Prevents cascade failures when ElevenLabs has issues
- **Impact**: Additional complexity but essential for production reliability

---

## 📊 **DATABASE SCHEMA ENHANCEMENTS**

### New Tables for Enterprise Architecture

```sql
-- Enhanced interpreter configuration system
CREATE TABLE interpreter_configs (
  id text PRIMARY KEY,
  name text NOT NULL,
  full_name text NOT NULL,
  description text NOT NULL,
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Detailed personality configuration
CREATE TABLE interpreter_personalities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  interpreter_id text REFERENCES interpreter_configs(id),
  approach text NOT NULL,
  traits jsonb DEFAULT '[]',
  conversation_style jsonb NOT NULL,
  expertise jsonb DEFAULT '[]',
  response_patterns jsonb DEFAULT '[]',
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Voice configuration management
CREATE TABLE interpreter_voices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  interpreter_id text REFERENCES interpreter_configs(id),
  voice_id text, -- ElevenLabs voice ID
  voice_description text, -- For dynamic voice generation
  stability numeric(3,2) DEFAULT 0.8,
  similarity_boost numeric(3,2) DEFAULT 0.7,
  style numeric(3,2) DEFAULT 0.3,
  speaking_rate numeric(3,2) DEFAULT 0.9,
  use_speaker_boost boolean DEFAULT true,
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Dynamic prompt templates
CREATE TABLE interpreter_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  interpreter_id text REFERENCES interpreter_configs(id),
  type text NOT NULL, -- 'system', 'greeting', 'follow_up', 'closing'
  name text NOT NULL,
  template text NOT NULL,
  variables jsonb DEFAULT '{}', -- Template variable definitions
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(interpreter_id, type, name, version)
);

-- Conversation sessions with detailed tracking
CREATE TABLE conversation_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id),
  elevenlabs_conversation_id text,
  signed_url_expires_at timestamptz,
  session_start_time timestamptz DEFAULT now(),
  session_end_time timestamptz,
  session_status text DEFAULT 'active', -- 'active', 'paused', 'ended', 'error'
  connection_count integer DEFAULT 0,
  last_activity_at timestamptz DEFAULT now(),
  session_metadata jsonb DEFAULT '{}',
  error_log jsonb DEFAULT '[]'
);

-- Agent performance metrics
CREATE TABLE agent_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL, -- ElevenLabs agent ID
  interpreter_id text REFERENCES interpreter_configs(id),
  conversation_id uuid REFERENCES conversations(id),
  metric_type text NOT NULL, -- 'response_time', 'user_satisfaction', 'completion_rate'
  metric_value numeric,
  metadata jsonb DEFAULT '{}',
  recorded_at timestamptz DEFAULT now()
);

-- Conversation analytics
CREATE TABLE conversation_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id),
  user_id uuid REFERENCES profiles(user_id),
  interpreter_id text REFERENCES interpreter_configs(id),
  session_duration_seconds integer,
  message_count integer,
  user_satisfaction_score numeric(2,1), -- 1.0 to 5.0
  completion_reason text, -- 'natural_end', 'user_ended', 'timeout', 'error'
  topics_discussed jsonb DEFAULT '[]',
  sentiment_analysis jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Event log for debugging and analytics
CREATE TABLE system_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  entity_type text, -- 'conversation', 'agent', 'user'
  entity_id text,
  event_data jsonb NOT NULL,
  user_id uuid REFERENCES profiles(user_id),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_interpreter_personalities_interpreter ON interpreter_personalities(interpreter_id);
CREATE INDEX idx_interpreter_voices_interpreter ON interpreter_voices(interpreter_id);
CREATE INDEX idx_interpreter_prompts_interpreter_type ON interpreter_prompts(interpreter_id, type);
CREATE INDEX idx_conversation_sessions_conversation ON conversation_sessions(conversation_id);
CREATE INDEX idx_agent_metrics_agent_time ON agent_metrics(agent_id, recorded_at);
CREATE INDEX idx_conversation_analytics_user_time ON conversation_analytics(user_id, created_at);
CREATE INDEX idx_system_events_type_time ON system_events(event_type, created_at);

-- RLS policies
ALTER TABLE interpreter_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpreter_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpreter_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpreter_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Public read access for interpreter configs
CREATE POLICY interpreter_configs_public_read ON interpreter_configs FOR SELECT USING (true);
CREATE POLICY interpreter_personalities_public_read ON interpreter_personalities FOR SELECT USING (true);
CREATE POLICY interpreter_voices_public_read ON interpreter_voices FOR SELECT USING (true);
CREATE POLICY interpreter_prompts_public_read ON interpreter_prompts FOR SELECT USING (true);

-- User-scoped access for conversation data
CREATE POLICY conversation_sessions_user_access ON conversation_sessions 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_sessions.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- Service role access for all tables
CREATE POLICY interpreter_configs_service_role ON interpreter_configs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY interpreter_personalities_service_role ON interpreter_personalities FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY interpreter_voices_service_role ON interpreter_voices FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY interpreter_prompts_service_role ON interpreter_prompts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY conversation_sessions_service_role ON conversation_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY agent_metrics_service_role ON agent_metrics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY conversation_analytics_service_role ON conversation_analytics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY system_events_service_role ON system_events FOR ALL USING (auth.role() = 'service_role');
```

### Data Seeding for Jung & Lakshmi

```sql
-- Jung configuration
INSERT INTO interpreter_configs (id, name, full_name, description) VALUES 
('carl', 'Carl', 'Dr. Carl Gustav Jung', 'Renowned psychiatrist and psychoanalyst, founder of analytical psychology');

INSERT INTO interpreter_personalities (interpreter_id, approach, traits, conversation_style, expertise, response_patterns) VALUES 
('carl', 'jungian', 
  '["wise", "introspective", "philosophical", "empathetic", "archetypal-thinking", "symbolic-minded", "patient"]',
  '{
    "greeting": "thoughtful_welcome",
    "questioning_style": "socratic", 
    "response_length": "moderate",
    "emotional_tone": "warm",
    "language_complexity": "sophisticated",
    "pacing_preference": "contemplative"
  }',
  '["collective_unconscious", "archetypes", "individuation", "shadow_work", "anima_animus", "dream_symbolism"]',
  '[
    {"trigger": "dream_symbol_mentioned", "response": "explore_personal_association"},
    {"trigger": "emotional_reaction", "response": "gentle_inquiry"}
  ]'
);

INSERT INTO interpreter_voices (interpreter_id, voice_description, stability, similarity_boost, style, speaking_rate) VALUES 
('carl', 'A wise, thoughtful male voice with deep, calming tones and measured pace, conveying wisdom and empathy', 0.85, 0.75, 0.3, 0.85);

-- Lakshmi configuration  
INSERT INTO interpreter_configs (id, name, full_name, description) VALUES 
('lakshmi', 'Lakshmi', 'Lakshmi Devi', 'Divine feminine wisdom keeper, interpreter of dreams through spiritual and karmic perspectives');

INSERT INTO interpreter_personalities (interpreter_id, approach, traits, conversation_style, expertise, response_patterns) VALUES 
('lakshmi', 'spiritual',
  '["compassionate", "intuitive", "nurturing", "wise", "spiritually-attuned", "peaceful", "mystical"]',
  '{
    "greeting": "blessing_welcome",
    "questioning_style": "compassionate",
    "response_length": "moderate", 
    "emotional_tone": "mystical",
    "language_complexity": "moderate",
    "pacing_preference": "measured"
  }',
  '["karma_dharma", "spiritual_growth", "chakra_energy", "past_life_patterns", "soul_lessons", "divine_feminine"]',
  '[
    {"trigger": "spiritual_seeking", "response": "gentle_guidance"},
    {"trigger": "life_challenge", "response": "karmic_perspective"}
  ]'
);

INSERT INTO interpreter_voices (interpreter_id, voice_description, stability, similarity_boost, style, speaking_rate) VALUES 
('lakshmi', 'A gentle, nurturing female voice with spiritual warmth and calming presence, conveying divine feminine wisdom', 0.9, 0.8, 0.4, 0.8);
```

---

## 🏗️ **CORE SERVICE IMPLEMENTATIONS**

### 1. Enhanced Configuration Service

```typescript
// src/services/ConfigurationService.ts
import { CacheService } from './CacheService';
import { Database } from '../types/database';

export interface InterpreterConfig {
  id: string;
  name: string;
  fullName: string;
  description: string;
  personality: InterpreterPersonality;
  voice: VoiceConfig;
  prompts: PromptTemplate[];
  isActive: boolean;
  version: number;
}

export class ConfigurationService {
  constructor(
    private db: Database,
    private cache: CacheService
  ) {}

  async getInterpreterConfig(interpreterId: string): Promise<InterpreterConfig> {
    const cacheKey = `interpreter_config:${interpreterId}`;
    
    // Try cache first
    let config = await this.cache.get<InterpreterConfig>(cacheKey);
    if (config) return config;

    // Fetch from database with all related data
    const { data, error } = await this.db
      .from('interpreter_configs')
      .select(`
        *,
        personality:interpreter_personalities!inner(*),
        voice:interpreter_voices!inner(*),
        prompts:interpreter_prompts!inner(*)
      `)
      .eq('id', interpreterId)
      .eq('is_active', true)
      .single();

    if (error) throw new Error(`Failed to load interpreter config: ${error.message}`);
    if (!data) throw new Error(`Interpreter not found: ${interpreterId}`);

    config = this.mapDatabaseToConfig(data);
    
    // Cache for 1 hour
    await this.cache.set(cacheKey, config, 3600);
    
    return config;
  }

  async getAllActiveInterpreters(): Promise<InterpreterConfig[]> {
    const cacheKey = 'active_interpreters';
    
    let configs = await this.cache.get<InterpreterConfig[]>(cacheKey);
    if (configs) return configs;

    const { data, error } = await this.db
      .from('interpreter_configs')
      .select(`
        *,
        personality:interpreter_personalities!inner(*),
        voice:interpreter_voices!inner(*),
        prompts:interpreter_prompts!inner(*)
      `)
      .eq('is_active', true)
      .order('name');

    if (error) throw new Error(`Failed to load interpreters: ${error.message}`);

    configs = data.map(this.mapDatabaseToConfig);
    
    // Cache for 30 minutes
    await this.cache.set(cacheKey, configs, 1800);
    
    return configs;
  }

  async updateInterpreterConfig(
    interpreterId: string, 
    updates: Partial<InterpreterConfig>
  ): Promise<void> {
    await this.db.transaction(async (trx) => {
      // Update main config
      if (updates.name || updates.fullName || updates.description) {
        await trx
          .from('interpreter_configs')
          .update({
            name: updates.name,
            full_name: updates.fullName,
            description: updates.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', interpreterId);
      }

      // Update personality if provided
      if (updates.personality) {
        await trx
          .from('interpreter_personalities')
          .update({
            ...updates.personality,
            updated_at: new Date().toISOString()
          })
          .eq('interpreter_id', interpreterId)
          .eq('is_active', true);
      }

      // Update voice if provided
      if (updates.voice) {
        await trx
          .from('interpreter_voices')
          .update({
            ...updates.voice,
            updated_at: new Date().toISOString()
          })
          .eq('interpreter_id', interpreterId)
          .eq('is_active', true);
      }
    });

    // Invalidate cache
    await this.cache.delete(`interpreter_config:${interpreterId}`);
    await this.cache.delete('active_interpreters');
  }

  private mapDatabaseToConfig(data: any): InterpreterConfig {
    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      personality: data.personality,
      voice: data.voice,
      prompts: data.prompts,
      isActive: data.is_active,
      version: data.version
    };
  }
}
```

### 2. Production-Grade Agent Factory

```typescript
// src/services/AgentFactory.ts
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { ConfigurationService } from './ConfigurationService';
import { TemplateEngine } from './TemplateEngine';
import { MetricsService } from './MetricsService';
import { CircuitBreaker } from './CircuitBreaker';

export class AgentFactory {
  private voiceCache = new Map<string, string>();
  private agentCache = new Map<string, { agentId: string; expires: Date }>();

  constructor(
    private elevenLabsClient: ElevenLabsClient,
    private configService: ConfigurationService,
    private templateEngine: TemplateEngine,
    private metrics: MetricsService,
    private circuitBreaker: CircuitBreaker
  ) {}

  async createOrGetAgent(
    interpreterId: string,
    context: ConversationContext,
    options: AgentOptions = {}
  ): Promise<AgentCreationResult> {
    const startTime = Date.now();

    return await this.circuitBreaker.execute(async () => {
      try {
        // Check cache first (agents expire after 1 hour)
        const cacheKey = this.buildCacheKey(interpreterId, context);
        const cached = this.agentCache.get(cacheKey);
        
        if (cached && cached.expires > new Date()) {
          this.metrics.recordAgentCacheHit(interpreterId);
          return {
            agentId: cached.agentId,
            fromCache: true,
            creationTime: 0
          };
        }

        // Get interpreter configuration
        const config = await this.configService.getInterpreterConfig(interpreterId);
        
        // Ensure voice exists
        const voiceId = await this.ensureVoiceExists(config.voice, interpreterId);
        
        // Build dynamic prompt
        const systemPrompt = await this.buildSystemPrompt(config, context);
        const greetingMessage = await this.buildGreetingMessage(config, context);

        // Create ElevenLabs agent
        const agent = await this.elevenLabsClient.conversationalAi.agents.create({
          name: `${config.fullName} - Session ${context.sessionId}`,
          conversationConfig: {
            agent: {
              prompt: { prompt: systemPrompt },
              firstMessage: greetingMessage,
              language: options.language || 'en'
            },
            tts: {
              voiceId,
              stability: config.voice.stability,
              similarityBoost: config.voice.similarityBoost,
              style: config.voice.style,
              useSpeakerBoost: config.voice.useSpeakerBoost
            },
            llm: {
              model: options.model || 'gpt-4o',
              temperature: this.calculateTemperature(config),
              maxTokens: config.personality.conversationStyle.responseLength === 'brief' ? 150 :
                        config.personality.conversationStyle.responseLength === 'detailed' ? 400 : 250
            }
          }
        });

        // Cache the agent (1 hour expiry)
        this.agentCache.set(cacheKey, {
          agentId: agent.agent_id,
          expires: new Date(Date.now() + 3600000) // 1 hour
        });

        const creationTime = Date.now() - startTime;
        
        // Record metrics
        this.metrics.recordAgentCreation({
          interpreterId,
          agentId: agent.agent_id,
          creationTime,
          success: true,
          voiceId,
          fromCache: false
        });

        return {
          agentId: agent.agent_id,
          fromCache: false,
          creationTime,
          voiceId
        };

      } catch (error) {
        const creationTime = Date.now() - startTime;
        
        this.metrics.recordAgentCreation({
          interpreterId,
          creationTime,
          success: false,
          error: error.message
        });

        throw new AgentCreationError(
          `Failed to create agent for ${interpreterId}: ${error.message}`,
          error
        );
      }
    });
  }

  private async ensureVoiceExists(voiceConfig: VoiceConfig, interpreterId: string): Promise<string> {
    // If we have a pre-selected voice ID, use it
    if (voiceConfig.voiceId) {
      return voiceConfig.voiceId;
    }

    // Check cache for generated voice
    const cacheKey = `voice:${interpreterId}`;
    const cachedVoiceId = this.voiceCache.get(cacheKey);
    if (cachedVoiceId) return cachedVoiceId;

    // Create voice from description
    if (voiceConfig.voiceDescription) {
      const voicePreview = await this.elevenLabsClient.textToVoice.createPreviews({
        voiceDescription: voiceConfig.voiceDescription,
        text: "Hello, I'm here to guide you through your dreams and their deeper meanings."
      });

      const voice = await this.elevenLabsClient.textToVoice.createVoiceFromPreview({
        voiceName: `${interpreterId}_voice_${Date.now()}`,
        voiceDescription: voiceConfig.voiceDescription,
        generatedVoiceId: voicePreview.previews[0].generatedVoiceId
      });

      // Cache the voice ID
      this.voiceCache.set(cacheKey, voice.voice_id);
      return voice.voice_id;
    }

    // Fallback to default voice
    return '21m00Tcm4TlvDq8ikWAM';
  }

  private async buildSystemPrompt(
    config: InterpreterConfig,
    context: ConversationContext
  ): Promise<string> {
    const systemPromptTemplate = config.prompts.find(p => p.type === 'system')?.template;
    if (!systemPromptTemplate) {
      throw new Error(`No system prompt template found for ${config.id}`);
    }

    return await this.templateEngine.render(systemPromptTemplate, {
      ...context,
      interpreter: config,
      current_date: new Date().toISOString(),
      max_turn_length: this.calculateMaxTurnLength(config),
      conversation_guidelines: this.buildConversationGuidelines(config)
    });
  }

  private async buildGreetingMessage(
    config: InterpreterConfig,
    context: ConversationContext
  ): Promise<string> {
    const greetingTemplate = config.prompts.find(p => p.type === 'greeting')?.template;
    if (!greetingTemplate) {
      return `Hello ${context.userName}, I'm ${config.name}. How can I help you explore your dreams today?`;
    }

    return await this.templateEngine.render(greetingTemplate, context);
  }

  private buildCacheKey(interpreterId: string, context: ConversationContext): string {
    // Cache key includes interpreter and key context elements
    // This allows personalized agents while still enabling some caching
    return `agent:${interpreterId}:${context.userId}:${context.dreamId || 'general'}`;
  }

  private calculateTemperature(config: InterpreterConfig): number {
    // Adjust temperature based on interpreter personality
    switch (config.personality.approach) {
      case 'jungian': return 0.7; // Thoughtful, creative
      case 'spiritual': return 0.6; // Gentle, consistent
      case 'freudian': return 0.8; // More analytical variety
      case 'cognitive': return 0.5; // More consistent, scientific
      default: return 0.7;
    }
  }

  private calculateMaxTurnLength(config: InterpreterConfig): number {
    switch (config.personality.conversationStyle.responseLength) {
      case 'brief': return 80;
      case 'detailed': return 200;
      case 'moderate': 
      default: return 120;
    }
  }

  private buildConversationGuidelines(config: InterpreterConfig): string {
    const style = config.personality.conversationStyle;
    return `
CONVERSATION GUIDELINES FOR ${config.fullName.toUpperCase()}:
- Response Length: ${style.responseLength} (max ${this.calculateMaxTurnLength(config)} words)
- Questioning Style: ${style.questioningStyle}
- Emotional Tone: ${style.emotionalTone}
- Pacing: ${style.pacingPreference}
- Language Complexity: ${style.languageComplexity}
- Key Expertise: ${config.personality.expertise.join(', ')}
`;
  }

  async cleanupAgent(agentId: string): Promise<void> {
    try {
      await this.elevenLabsClient.conversationalAi.agents.delete(agentId);
      
      // Remove from cache
      for (const [key, value] of this.agentCache.entries()) {
        if (value.agentId === agentId) {
          this.agentCache.delete(key);
          break;
        }
      }
      
      this.metrics.recordAgentCleanup(agentId, true);
    } catch (error) {
      this.metrics.recordAgentCleanup(agentId, false, error.message);
      // Don't throw - cleanup is best effort
      console.warn(`Failed to cleanup agent ${agentId}:`, error.message);
    }
  }

  getStats(): AgentFactoryStats {
    return {
      cachedAgents: this.agentCache.size,
      cachedVoices: this.voiceCache.size,
      circuitBreakerState: this.circuitBreaker.getState()
    };
  }
}

// Types
export interface AgentCreationResult {
  agentId: string;
  fromCache: boolean;
  creationTime: number;
  voiceId?: string;
}

export interface AgentOptions {
  language?: string;
  model?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface AgentFactoryStats {
  cachedAgents: number;
  cachedVoices: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
}

export class AgentCreationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'AgentCreationError';
  }
}
```

### 3. Template Engine for Dynamic Prompts

```typescript
// src/services/TemplateEngine.ts
export class TemplateEngine {
  private static readonly VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;
  private static readonly MAX_RECURSION_DEPTH = 3;

  async render(template: string, context: Record<string, any>): Promise<string> {
    let result = template;
    let depth = 0;

    // Support nested template resolution
    while (depth < TemplateEngine.MAX_RECURSION_DEPTH && TemplateEngine.VARIABLE_PATTERN.test(result)) {
      result = this.processTemplate(result, context);
      depth++;
    }

    return this.sanitizeOutput(result);
  }

  private processTemplate(template: string, context: Record<string, any>): string {
    return template.replace(TemplateEngine.VARIABLE_PATTERN, (match, variablePath) => {
      const value = this.getNestedValue(context, variablePath.trim());
      return this.formatValue(value);
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private sanitizeOutput(output: string): string {
    // Remove any potential injection attempts
    return output
      .replace(/[<>]/g, '') // Remove HTML-like tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  // Helper method for common formatting
  formatConversationContext(context: ConversationContext): Record<string, any> {
    return {
      ...context,
      formatted_date: new Date(context.interpretationDate || Date.now()).toLocaleDateString(),
      symbols_list: context.dreamSymbols?.join(', ') || 'various symbols',
      interpretation_summary: this.summarizeInterpretation(context.dreamInterpretation),
      user_name_safe: this.sanitizeName(context.userName)
    };
  }

  private summarizeInterpretation(interpretation?: string): string {
    if (!interpretation) return 'a meaningful dream interpretation';
    
    // Truncate long interpretations to key points
    if (interpretation.length > 300) {
      return interpretation.substring(0, 300).split('.')[0] + '...';
    }
    
    return interpretation;
  }

  private sanitizeName(name?: string): string {
    if (!name) return 'friend';
    
    // Remove any non-alphabetic characters except spaces and hyphens
    return name.replace(/[^a-zA-Z\s-]/g, '').trim() || 'friend';
  }
}
```

---

## 🔄 **CONVERSATION ORCHESTRATION**

### Production Conversation Manager

```typescript
// src/services/ConversationManager.ts
import { EventEmitter } from 'events';
import { AgentFactory } from './AgentFactory';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { MetricsService } from './MetricsService';
import { CircuitBreaker } from './CircuitBreaker';

export class ConversationManager extends EventEmitter {
  private activeConversations = new Map<string, ConversationSession>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private agentFactory: AgentFactory,
    private conversationRepo: ConversationRepository,
    private metrics: MetricsService,
    private circuitBreaker: CircuitBreaker
  ) {
    super();
    this.startCleanupProcess();
  }

  async startConversation(request: StartConversationRequest): Promise<ConversationResponse> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Create database record first (fail fast if DB issues)
      const conversation = await this.conversationRepo.create({
        id: conversationId,
        userId: request.userId,
        interpreterId: request.interpreterId,
        dreamId: request.dreamId,
        status: 'initializing',
        metadata: request.metadata || {}
      });

      // Build conversation context
      const context = await this.buildConversationContext(request);

      // Create ElevenLabs agent
      const agentResult = await this.agentFactory.createOrGetAgent(
        request.interpreterId,
        context,
        request.agentOptions
      );

      // Get signed URL for WebSocket
      const signedUrl = await this.circuitBreaker.execute(async () => {
        return await this.elevenLabsClient.conversationalAi.conversations.getSignedUrl({
          agentId: agentResult.agentId
        });
      });

      // Create conversation session
      const session = new ConversationSession({
        conversationId,
        agentId: agentResult.agentId,
        interpreterId: request.interpreterId,
        userId: request.userId,
        context,
        signedUrl: signedUrl.signed_url,
        startTime: new Date()
      });

      // Store active session
      this.activeConversations.set(conversationId, session);

      // Update database with session details
      await this.conversationRepo.update(conversationId, {
        status: 'active',
        elevenLabsAgentId: agentResult.agentId,
        startedAt: new Date(),
        sessionMetadata: {
          agentCreationTime: agentResult.creationTime,
          fromCache: agentResult.fromCache,
          voiceId: agentResult.voiceId
        }
      });

      // Record metrics
      this.metrics.recordConversationStart({
        conversationId,
        interpreterId: request.interpreterId,
        userId: request.userId,
        agentCreationTime: agentResult.creationTime
      });

      // Emit event
      this.emit('conversationStarted', {
        conversationId,
        userId: request.userId,
        interpreterId: request.interpreterId,
        agentId: agentResult.agentId
      });

      return {
        conversationId,
        signedUrl: signedUrl.signed_url,
        agentId: agentResult.agentId,
        interpreterName: context.interpreterName,
        expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
      };

    } catch (error) {
      // Cleanup on failure
      await this.conversationRepo.update(conversationId, {
        status: 'failed',
        endedAt: new Date(),
        errorMessage: error.message
      });

      this.metrics.recordConversationError({
        conversationId,
        error: error.message,
        phase: 'startup'
      });

      throw new ConversationError(`Failed to start conversation: ${error.message}`, error);
    }
  }

  async handleWebSocketConnection(
    conversationId: string,
    elevenLabsConversationId: string
  ): Promise<void> {
    const session = this.activeConversations.get(conversationId);
    if (!session) {
      throw new Error(`Conversation session not found: ${conversationId}`);
    }

    // Update session with ElevenLabs conversation ID
    session.setElevenLabsConversationId(elevenLabsConversationId);

    // Update database
    await this.conversationRepo.update(conversationId, {
      elevenLabsConversationId,
      lastActivityAt: new Date()
    });

    this.emit('webSocketConnected', { conversationId, elevenLabsConversationId });
  }

  async handleMessage(conversationId: string, message: ConversationMessage): Promise<void> {
    const session = this.activeConversations.get(conversationId);
    if (!session) {
      console.warn(`Received message for unknown conversation: ${conversationId}`);
      return;
    }

    try {
      // Store message asynchronously (non-blocking)
      this.storeMessageAsync(conversationId, message);

      // Update session activity
      session.recordActivity();

      // Update conversation last activity
      this.conversationRepo.updateActivity(conversationId).catch(error => {
        console.error('Failed to update conversation activity:', error);
      });

      // Record metrics
      this.metrics.recordMessage({
        conversationId,
        messageType: message.sender,
        contentLength: message.content.length,
        timestamp: new Date()
      });

      // Emit event for real-time features
      this.emit('messageReceived', {
        conversationId,
        message,
        sessionActive: session.isActive()
      });

    } catch (error) {
      console.error(`Error handling message for conversation ${conversationId}:`, error);
      this.emit('messageError', { conversationId, error: error.message });
    }
  }

  async endConversation(
    conversationId: string,
    reason: ConversationEndReason,
    summary?: string
  ): Promise<void> {
    const session = this.activeConversations.get(conversationId);
    if (!session) {
      console.warn(`Attempted to end unknown conversation: ${conversationId}`);
      return;
    }

    try {
      // Get conversation metrics
      const metrics = session.getMetrics();
      
      // Generate summary if not provided
      const finalSummary = summary || await this.generateConversationSummary(conversationId);

      // Update database
      await this.conversationRepo.update(conversationId, {
        status: 'completed',
        endedAt: new Date(),
        endReason: reason,
        summary: finalSummary,
        metrics: metrics
      });

      // Cleanup ElevenLabs agent
      if (session.agentId) {
        this.agentFactory.cleanupAgent(session.agentId).catch(error => {
          console.warn(`Failed to cleanup agent ${session.agentId}:`, error);
        });
      }

      // Remove from active sessions
      this.activeConversations.delete(conversationId);

      // Record final metrics
      this.metrics.recordConversationEnd({
        conversationId,
        reason,
        duration: metrics.durationSeconds,
        messageCount: metrics.messageCount,
        userSatisfaction: metrics.userSatisfaction
      });

      // Emit event
      this.emit('conversationEnded', {
        conversationId,
        reason,
        summary: finalSummary,
        metrics
      });

    } catch (error) {
      console.error(`Error ending conversation ${conversationId}:`, error);
      
      // Still remove from active sessions even if cleanup fails
      this.activeConversations.delete(conversationId);
      
      this.emit('conversationEndError', { conversationId, error: error.message });
    }
  }

  // Async message storage (non-blocking)
  private async storeMessageAsync(conversationId: string, message: ConversationMessage): Promise<void> {
    try {
      await this.messageRepo.store({
        conversationId,
        sender: message.sender,
        content: message.content,
        timestamp: message.timestamp || new Date(),
        metadata: message.metadata || {}
      });
    } catch (error) {
      console.error(`Failed to store message for conversation ${conversationId}:`, error);
      
      // Emit event for monitoring
      this.emit('messageStoreError', {
        conversationId,
        message,
        error: error.message
      });
    }
  }

  private async generateConversationSummary(conversationId: string): Promise<string> {
    try {
      const messages = await this.messageRepo.getByConversationId(conversationId);
      
      if (messages.length === 0) {
        return 'Brief conversation with no messages';
      }

      const userMessages = messages.filter(m => m.sender === 'user').length;
      const interpreterMessages = messages.filter(m => m.sender === 'interpreter').length;
      
      return `Conversation with ${messages.length} total messages (${userMessages} from user, ${interpreterMessages} from interpreter)`;
      
    } catch (error) {
      console.error(`Failed to generate summary for conversation ${conversationId}:`, error);
      return 'Conversation completed';
    }
  }

  private startCleanupProcess(): void {
    // Cleanup inactive conversations every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConversations();
    }, 5 * 60 * 1000);
  }

  private async cleanupInactiveConversations(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [conversationId, session] of this.activeConversations.entries()) {
      const inactiveTime = now.getTime() - session.lastActivityTime.getTime();
      
      if (inactiveTime > inactiveThreshold) {
        console.log(`Cleaning up inactive conversation: ${conversationId}`);
        await this.endConversation(conversationId, 'timeout', 'Conversation timed out due to inactivity');
      }
    }
  }

  getActiveConversationCount(): number {
    return this.activeConversations.size;
  }

  isConversationActive(conversationId: string): boolean {
    return this.activeConversations.has(conversationId);
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // End all active conversations
    for (const conversationId of this.activeConversations.keys()) {
      this.endConversation(conversationId, 'system_shutdown').catch(error => {
        console.error(`Failed to cleanup conversation ${conversationId} during shutdown:`, error);
      });
    }
  }
}

// Types
export interface StartConversationRequest {
  userId: string;
  interpreterId: string;
  dreamId?: string;
  metadata?: Record<string, any>;
  agentOptions?: AgentOptions;
}

export interface ConversationResponse {
  conversationId: string;
  signedUrl: string;
  agentId: string;
  interpreterName: string;
  expiresAt: Date;
}

export type ConversationEndReason = 'user_ended' | 'timeout' | 'error' | 'system_shutdown' | 'agent_ended';

export class ConversationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ConversationError';
  }
}
```

---

## ⚡ **PERFORMANCE OPTIMIZATIONS**

### Circuit Breaker Implementation

```typescript
// src/services/CircuitBreaker.ts
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime?: Date;
  private successCount = 0;

  constructor(
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      timeout: 60000, // 1 minute
      retryTimeout: 30000 // 30 seconds
    }
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new CircuitBreakerOpenError('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = undefined;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= 3) { // 3 successful calls to close
        this.state = 'closed';
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'open';
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.options.retryTimeout;
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  timeout: number;
  retryTimeout: number;
}

interface CircuitBreakerStats {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  successCount: number;
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
```

---

## 📊 **MONITORING & OBSERVABILITY**

### Production Metrics Service

```typescript
// src/services/MetricsService.ts
export class MetricsService {
  constructor(
    private metricsDb: Database,
    private realTimeMetrics?: RealTimeMetricsClient
  ) {}

  async recordAgentCreation(metrics: AgentCreationMetrics): Promise<void> {
    const data = {
      agent_id: metrics.agentId,
      interpreter_id: metrics.interpreterId,
      metric_type: 'agent_creation',
      metric_value: metrics.creationTime,
      metadata: {
        success: metrics.success,
        from_cache: metrics.fromCache,
        voice_id: metrics.voiceId,
        error: metrics.error
      },
      recorded_at: new Date().toISOString()
    };

    // Store in database
    await this.metricsDb.from('agent_metrics').insert(data);

    // Send to real-time metrics if available
    if (this.realTimeMetrics) {
      this.realTimeMetrics.gauge('agent_creation_time', metrics.creationTime, {
        interpreter: metrics.interpreterId,
        success: metrics.success.toString()
      });
    }
  }

  async recordConversationMetrics(conversationId: string): Promise<ConversationMetricsSnapshot> {
    // Get conversation data
    const conversation = await this.metricsDb
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    const messages = await this.metricsDb
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId);

    const sessionData = await this.metricsDb
      .from('conversation_sessions')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    // Calculate metrics
    const metrics: ConversationMetricsSnapshot = {
      conversationId,
      duration: this.calculateDuration(conversation.started_at, conversation.ended_at),
      messageCount: messages.length,
      userMessageCount: messages.filter(m => m.sender === 'user').length,
      interpreterMessageCount: messages.filter(m => m.sender === 'interpreter').length,
      averageMessageLength: this.calculateAverageMessageLength(messages),
      responseTime: this.calculateAverageResponseTime(messages),
      userEngagement: this.calculateEngagementScore(messages),
      conversationFlow: this.analyzeConversationFlow(messages),
      technicalMetrics: {
        connectionTime: sessionData?.session_start_time,
        disconnectionCount: sessionData?.connection_count || 0,
        errorCount: sessionData?.error_log?.length || 0
      }
    };

    // Store analytics
    await this.metricsDb.from('conversation_analytics').insert({
      conversation_id: conversationId,
      user_id: conversation.user_id,
      interpreter_id: conversation.interpreter_id,
      session_duration_seconds: metrics.duration,
      message_count: metrics.messageCount,
      user_satisfaction_score: metrics.userEngagement,
      completion_reason: conversation.end_reason,
      topics_discussed: metrics.conversationFlow.topics,
      sentiment_analysis: metrics.conversationFlow.sentiment
    });

    return metrics;
  }

  async getInterpreterPerformance(interpreterId: string, timeRange: TimeRange): Promise<InterpreterPerformanceReport> {
    const { data: conversationMetrics } = await this.metricsDb
      .from('conversation_analytics')
      .select('*')
      .eq('interpreter_id', interpreterId)
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString());

    const { data: agentMetrics } = await this.metricsDb
      .from('agent_metrics')
      .select('*')
      .eq('interpreter_id', interpreterId)
      .gte('recorded_at', timeRange.start.toISOString())
      .lte('recorded_at', timeRange.end.toISOString());

    return this.calculatePerformanceReport(interpreterId, conversationMetrics, agentMetrics);
  }

  async getDashboardData(): Promise<SystemDashboardData> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get active conversations
    const { data: activeConversations } = await this.metricsDb
      .from('conversations')
      .select('id, interpreter_id, started_at')
      .eq('status', 'active');

    // Get recent metrics
    const { data: recentMetrics } = await this.metricsDb
      .from('conversation_analytics')
      .select('*')
      .gte('created_at', last24Hours.toISOString())
      .order('created_at', { ascending: false });

    // Get agent performance
    const { data: agentPerformance } = await this.metricsDb
      .from('agent_metrics')
      .select('interpreter_id, metric_type, metric_value, metadata')
      .gte('recorded_at', last24Hours.toISOString());

    return {
      activeConversations: activeConversations?.length || 0,
      last24Hours: {
        totalConversations: recentMetrics?.length || 0,
        averageDuration: this.calculateAverageDuration(recentMetrics || []),
        averageSatisfaction: this.calculateAverageSatisfaction(recentMetrics || []),
        errorRate: this.calculateErrorRate(agentPerformance || [])
      },
      interpreterBreakdown: this.calculateInterpreterBreakdown(recentMetrics || []),
      systemHealth: await this.getSystemHealth()
    };
  }

  private calculateDuration(startTime: string, endTime?: string): number {
    if (!endTime) return 0;
    return Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
  }

  private calculateAverageMessageLength(messages: any[]): number {
    if (messages.length === 0) return 0;
    const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.round(totalLength / messages.length);
  }

  private calculateAverageResponseTime(messages: any[]): number {
    const responseTimes: number[] = [];
    
    for (let i = 1; i < messages.length; i++) {
      const prevMsg = messages[i - 1];
      const currentMsg = messages[i];
      
      if (prevMsg.sender === 'user' && currentMsg.sender === 'interpreter') {
        const responseTime = new Date(currentMsg.created_at).getTime() - new Date(prevMsg.created_at).getTime();
        responseTimes.push(responseTime);
      }
    }

    if (responseTimes.length === 0) return 0;
    return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
  }

  private calculateEngagementScore(messages: any[]): number {
    // Simple engagement scoring based on message patterns
    const userMessages = messages.filter(m => m.sender === 'user');
    const interpreterMessages = messages.filter(m => m.sender === 'interpreter');
    
    if (userMessages.length === 0) return 0;
    
    // Factors: message ratio, conversation length, response patterns
    const messageRatio = Math.min(interpreterMessages.length / userMessages.length, 2);
    const lengthScore = Math.min(messages.length / 10, 1); // Normalize to conversation length
    const participationScore = userMessages.length > 3 ? 1 : userMessages.length / 3;
    
    return Math.round((messageRatio * 0.4 + lengthScore * 0.3 + participationScore * 0.3) * 5 * 10) / 10;
  }

  private analyzeConversationFlow(messages: any[]): ConversationFlowAnalysis {
    // Simple topic and sentiment analysis
    const topics = this.extractTopics(messages);
    const sentiment = this.analyzeSentiment(messages);
    
    return {
      topics,
      sentiment,
      turnTaking: this.analyzeTurnTaking(messages),
      conversationProgression: this.analyzeProgression(messages)
    };
  }

  private extractTopics(messages: any[]): string[] {
    // Simple keyword extraction for MVP
    const commonTopics = [
      'dreams', 'symbols', 'archetypes', 'unconscious', 'shadow',
      'spiritual', 'karma', 'growth', 'meditation', 'chakras'
    ];
    
    const conversationText = messages.map(m => m.content.toLowerCase()).join(' ');
    return commonTopics.filter(topic => conversationText.includes(topic));
  }

  private analyzeSentiment(messages: any[]): SentimentAnalysis {
    // Simple sentiment analysis for MVP
    const positiveWords = ['good', 'great', 'wonderful', 'helpful', 'insightful', 'peaceful'];
    const negativeWords = ['bad', 'confused', 'frustrated', 'difficult', 'unclear'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      positiveWords.forEach(word => {
        if (content.includes(word)) positiveScore++;
      });
      negativeWords.forEach(word => {
        if (content.includes(word)) negativeScore++;
      });
    });
    
    const total = positiveScore + negativeScore;
    return {
      overall: total === 0 ? 'neutral' : positiveScore > negativeScore ? 'positive' : 'negative',
      confidence: total > 0 ? Math.abs(positiveScore - negativeScore) / total : 0
    };
  }
}

// Types for metrics
export interface ConversationMetricsSnapshot {
  conversationId: string;
  duration: number;
  messageCount: number;
  userMessageCount: number;
  interpreterMessageCount: number;
  averageMessageLength: number;
  responseTime: number;
  userEngagement: number;
  conversationFlow: ConversationFlowAnalysis;
  technicalMetrics: TechnicalMetrics;
}

export interface ConversationFlowAnalysis {
  topics: string[];
  sentiment: SentimentAnalysis;
  turnTaking: TurnTakingAnalysis;
  conversationProgression: ProgressionAnalysis;
}

export interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral';
  confidence: number;
}
```

---

## 🔐 **SECURITY ENHANCEMENTS**

### Secure Configuration and Input Validation

```typescript
// src/security/InputValidator.ts
export class InputValidator {
  private static readonly MAX_NAME_LENGTH = 50;
  private static readonly MAX_MESSAGE_LENGTH = 2000;
  private static readonly MAX_CONTEXT_LENGTH = 5000;
  
  static validateUserInput(input: string, type: 'name' | 'message' | 'context'): string {
    if (!input || typeof input !== 'string') {
      throw new ValidationError('Input must be a non-empty string');
    }

    // Remove potential injection attempts
    let sanitized = input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/\{\{[^}]*\}\}/g, '') // Remove template literals
      .trim();

    // Length validation
    let maxLength: number;
    switch (type) {
      case 'name': maxLength = this.MAX_NAME_LENGTH; break;
      case 'message': maxLength = this.MAX_MESSAGE_LENGTH; break;
      case 'context': maxLength = this.MAX_CONTEXT_LENGTH; break;
    }

    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  static validateConversationContext(context: ConversationContext): ConversationContext {
    return {
      ...context,
      userName: this.validateUserInput(context.userName || '', 'name'),
      dreamInterpretation: context.dreamInterpretation 
        ? this.validateUserInput(context.dreamInterpretation, 'context')
        : undefined,
      dreamSymbols: context.dreamSymbols?.map(symbol => 
        this.validateUserInput(symbol, 'name')
      ).filter(Boolean),
      interpretationDate: context.interpretationDate || new Date().toISOString()
    };
  }

  static validateInterpreterAccess(
    interpreterId: string, 
    allowedInterpreters: string[]
  ): void {
    if (!allowedInterpreters.includes(interpreterId)) {
      throw new SecurityError(`Access denied to interpreter: ${interpreterId}`);
    }
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}
```

This enterprise architecture provides a robust, maintainable, and scalable foundation for implementing Jung and Lakshmi as conversational agents. The configuration-driven approach makes it easy to add new interpreters or modify existing personalities without code changes.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze current architecture for scalability and maintainability", "status": "completed", "priority": "high", "id": "arch1"}, {"content": "Design enterprise-grade conversational AI architecture", "status": "completed", "priority": "high", "id": "arch2"}, {"content": "Create Jung and Lakshmi agent configurations", "status": "completed", "priority": "high", "id": "arch3"}, {"content": "Design modular interpreter system for easy scaling", "status": "completed", "priority": "medium", "id": "arch4"}, {"content": "Document best practices for maintainable AI integrations", "status": "completed", "priority": "medium", "id": "arch5"}]