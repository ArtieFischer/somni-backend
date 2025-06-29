import jwt from 'jsonwebtoken';
import { supabaseService } from './supabase';
import { logger } from '../utils/logger';

export interface AgentConfig {
  agentId: string;
  name: string;
  description: string;
  voiceId?: string;
}

export interface SessionTokenData {
  token: string;
  expiresAt: Date;
}

export interface DynamicVariables {
  user_name: string;
  user_profile: string;
  dream_content: string;
  dream_emotions: string[];
  conversation_context: string;
  interpreter_style: string;
  [key: string]: any;
}

export class ElevenLabsSessionService {
  
  /**
   * Get agent configuration for interpreter
   */
  static getAgentConfig(interpreterId: string): AgentConfig {
    const agentConfigs: Record<string, AgentConfig> = {
      jung: {
        agentId: process.env.ELEVENLABS_JUNG_AGENT_ID!,
        name: 'Dr. Carl Jung',
        description: 'Jungian dream analysis specialist',
        voiceId: 'voice-jung-id'
      },
      freud: {
        agentId: process.env.ELEVENLABS_FREUD_AGENT_ID!,
        name: 'Dr. Sigmund Freud', 
        description: 'Freudian psychoanalysis expert',
        voiceId: 'voice-freud-id'
      },
      mary: {
        agentId: process.env.ELEVENLABS_MARY_AGENT_ID!,
        name: 'Mary',
        description: 'Compassionate dream guide',
        voiceId: 'voice-mary-id'
      },
      lakshmi: {
        agentId: process.env.ELEVENLABS_LAKSHMI_AGENT_ID!,
        name: 'Lakshmi',
        description: 'Spiritual wisdom and insight',
        voiceId: 'voice-lakshmi-id'
      }
    };
    
    const config = agentConfigs[interpreterId];
    if (!config) {
      throw new Error(`Unknown interpreter: ${interpreterId}`);
    }
    
    if (!config.agentId) {
      throw new Error(`Agent ID not configured for interpreter: ${interpreterId}`);
    }
    
    return config;
  }
  
  /**
   * Create secure session token
   */
  static async createSessionToken(params: {
    agentId: string;
    userId: string;
    conversationId: string;
    expiresIn: number;
  }): Promise<SessionTokenData> {
    
    const expiresAt = new Date(Date.now() + params.expiresIn * 1000);
    
    // Option 1: Try ElevenLabs signed URL API
    if (process.env.ELEVENLABS_SUPPORTS_SIGNED_URLS === 'true') {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/convai/conversation/signed-url', {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            agent_id: params.agentId,
            expires_in: params.expiresIn
          })
        });
        
        if (response.ok) {
          const data = await response.json() as { signed_url: string };
          logger.info('Created ElevenLabs signed URL', {
            agentId: params.agentId,
            expiresIn: params.expiresIn
          });
          return {
            token: data.signed_url,
            expiresAt
          };
        }
      } catch (error) {
        logger.warn('Failed to create ElevenLabs signed URL, falling back to JWT:', error);
      }
    }
    
    // Option 2: Create JWT token
    const payload = {
      agentId: params.agentId,
      userId: params.userId,
      conversationId: params.conversationId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    };
    
    const token = jwt.sign(
      payload,
      process.env.ELEVENLABS_SESSION_SECRET || process.env.JWT_SECRET!,
      { algorithm: 'HS256' }
    );
    
    logger.info('Created JWT session token', {
      agentId: params.agentId,
      conversationId: params.conversationId
    });
    
    return {
      token,
      expiresAt
    };
  }
  
  /**
   * Generate signed URL for frontend
   */
  static async generateSignedUrl(params: {
    agentId: string;
    sessionToken: string;
    dynamicVariables?: Record<string, any>;
  }): Promise<string> {
    
    // Build WebSocket URL with authentication
    const baseUrl = 'wss://api.elevenlabs.io/v1/convai/conversation';
    
    // Build query parameters
    const urlParams = new URLSearchParams({
      agent_id: params.agentId
    });
    
    // If using signed URL token, add it as authorization
    if (params.sessionToken.startsWith('http')) {
      // Already a signed URL from ElevenLabs
      return params.sessionToken;
    }
    
    // Otherwise, construct URL with agent ID
    // The frontend will need to add the authorization header
    return `${baseUrl}?${urlParams.toString()}`;
  }
  
  /**
   * Build dynamic variables for conversation
   */
  static async buildDynamicVariables(params: {
    context: any;
    userProfile: any;
    dreamId: string;
    interpreterId: string;
  }): Promise<DynamicVariables> {
    
    const { context, userProfile, dreamId, interpreterId } = params;
    
    // Get dream details
    const { data: dream, error } = await supabaseService.getServiceClient()
      .from('dreams')
      .select('raw_transcript, emotions, themes, recorded_at')
      .eq('id', dreamId)
      .single();
    
    if (error) {
      logger.error('Failed to fetch dream details', error);
    }
    
    // Build conversation history summary
    const conversationSummary = context.previousMessages?.length > 0
      ? `Previous conversation with ${context.previousMessages.length} messages.`
      : 'New conversation starting';
    
    // Get last message topic if available
    const lastTopic = context.previousMessages?.length > 0
      ? context.previousMessages[context.previousMessages.length - 1].content.substring(0, 50)
      : 'dream analysis';
    
    // Interpreter-specific prompting
    const interpreterStyles: Record<string, string> = {
      jung: 'Focus on archetypes, collective unconscious, and personal growth insights',
      freud: 'Analyze unconscious desires, childhood experiences, and symbolic meanings',
      mary: 'Provide gentle, nurturing guidance with emotional support',
      lakshmi: 'Offer spiritual wisdom, divine feminine insights, and abundance mindset'
    };
    
    // Extract emotions from dream or interpretation
    const dreamEmotions = dream?.emotions || context.interpretation?.emotions || [];
    
    return {
      user_name: userProfile?.first_name || 'Dreamer',
      user_profile: `${userProfile?.age || 'unknown'} years old, ${userProfile?.location || 'location unknown'}`,
      dream_content: dream?.raw_transcript || context.dreamContent || 'No dream content available',
      dream_emotions: dreamEmotions,
      dream_themes: dream?.themes || context.interpretation?.themes || [],
      dream_date: dream?.recorded_at ? new Date(dream.recorded_at).toLocaleDateString() : 'unknown',
      conversation_context: conversationSummary,
      last_topic: lastTopic,
      interpreter_style: interpreterStyles[interpreterId] || 'Provide thoughtful dream analysis',
      session_type: 'dream_interpretation',
      platform: 'mobile_app',
      is_resumed_conversation: context.previousMessages?.length > 0 ? 'true' : 'false',
      message_count: context.previousMessages?.length || 0,
      interpretation_summary: context.interpretation?.interpretationSummary || '',
      has_interpretation: !!context.interpretation
    };
  }
  
  /**
   * Store session in database
   */
  static async storeSession(params: {
    userId: string;
    conversationId: string;
    agentId: string;
    sessionToken: string;
    expiresAt: Date;
  }) {
    const { data, error } = await supabaseService.getServiceClient()
      .from('elevenlabs_sessions')
      .insert({
        user_id: params.userId,
        conversation_id: params.conversationId,
        agent_id: params.agentId,
        session_token: params.sessionToken,
        expires_at: params.expiresAt.toISOString()
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to store session: ${error.message}`);
    }
    
    logger.info('Session stored', {
      sessionId: data.id,
      conversationId: params.conversationId
    });
    
    return data;
  }
  
  /**
   * Get active session for conversation
   */
  static async getSession(conversationId: string) {
    const { data, error } = await supabaseService.getServiceClient()
      .from('elevenlabs_sessions')
      .select('*')
      .eq('conversation_id', conversationId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get session: ${error.message}`);
    }
    
    return data;
  }
  
  /**
   * Update session with new token
   */
  static async updateSession(sessionId: string, updates: {
    sessionToken: string;
    expiresAt: Date;
  }) {
    const { data, error } = await supabaseService.getServiceClient()
      .from('elevenlabs_sessions')
      .update({
        session_token: updates.sessionToken,
        expires_at: updates.expiresAt.toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }
    
    logger.info('Session updated', {
      sessionId,
      newExpiresAt: updates.expiresAt
    });
    
    return data;
  }
  
  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions() {
    const { data, error } = await supabaseService.getServiceClient()
      .from('elevenlabs_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();
    
    if (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      throw error;
    }
    
    const count = data?.length || 0;
    if (count > 0) {
      logger.info(`Cleaned up ${count} expired sessions`);
    }
    
    return count;
  }
  
  /**
   * Validate session token
   */
  static validateSessionToken(token: string): any {
    try {
      const decoded = jwt.verify(
        token,
        process.env.ELEVENLABS_SESSION_SECRET || process.env.JWT_SECRET!
      );
      return decoded;
    } catch (error) {
      throw new Error('Invalid session token');
    }
  }
}