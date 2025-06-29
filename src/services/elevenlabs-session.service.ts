import jwt from 'jsonwebtoken';
import { supabaseService } from './supabase';
import { logger } from '../utils/logger';
import { config } from '../config';

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
        agentId: config.elevenLabs.agentIds.jung,
        name: 'Dr. Carl Jung',
        description: 'Jungian dream analysis specialist',
        voiceId: 'voice-jung-id'
      },
      freud: {
        agentId: config.elevenLabs.agentIds.freud,
        name: 'Dr. Sigmund Freud', 
        description: 'Freudian psychoanalysis expert',
        voiceId: 'voice-freud-id'
      },
      mary: {
        agentId: config.elevenLabs.agentIds.mary,
        name: 'Mary',
        description: 'Compassionate dream guide',
        voiceId: 'voice-mary-id'
      },
      lakshmi: {
        agentId: config.elevenLabs.agentIds.lakshmi,
        name: 'Lakshmi',
        description: 'Spiritual wisdom and insight',
        voiceId: 'voice-lakshmi-id'
      }
    };
    
    const agentConfig = agentConfigs[interpreterId];
    if (!agentConfig) {
      throw new Error(`Unknown interpreter: ${interpreterId}`);
    }
    
    if (!agentConfig.agentId) {
      throw new Error(`Agent ID not configured for interpreter: ${interpreterId}`);
    }
    
    return agentConfig;
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
    
    // Option 1: Try ElevenLabs signed URL API (always try first)
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/convai/conversation/signed-url', {
        method: 'POST',
        headers: {
          'xi-api-key': config.elevenLabs.apiKey,
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
      } else {
        logger.warn('ElevenLabs signed URL API returned error', {
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (error) {
      logger.warn('Failed to create ElevenLabs signed URL, falling back to JWT:', error);
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
      process.env.ELEVENLABS_SESSION_SECRET || config.jwt.secret,
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
    
    // If using signed URL token from ElevenLabs API, return it directly
    if (params.sessionToken.startsWith('wss://') || params.sessionToken.startsWith('https://')) {
      logger.info('Using ElevenLabs signed URL', {
        agentId: params.agentId,
        urlPreview: params.sessionToken.substring(0, 50) + '...'
      });
      return params.sessionToken;
    }
    
    // For JWT tokens, the @elevenlabs/react SDK expects authorization via headers
    // Return the WebSocket URL and let the frontend handle authentication
    const baseUrl = 'wss://api.elevenlabs.io/v1/convai/conversation';
    
    // Build query parameters with agent ID
    const urlParams = new URLSearchParams({
      agent_id: params.agentId
    });
    
    const signedUrl = `${baseUrl}?${urlParams.toString()}`;
    
    logger.info('Generated WebSocket URL for JWT authentication', {
      agentId: params.agentId,
      hasToken: !!params.sessionToken,
      tokenLength: params.sessionToken.length,
      urlPreview: signedUrl.substring(0, 80) + '...',
      note: 'Frontend should use JWT token in Authorization header'
    });
    
    return signedUrl;
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
    
    // Get dream details - only select existing columns
    const { data: dream, error } = await supabaseService.getServiceClient()
      .from('dreams')
      .select('raw_transcript, created_at, mood, clarity')
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
    
    // Extract emotions from interpretation (already extracted from emotional_tone)
    const dreamEmotions = context.interpretation?.emotions || [];
    
    // Debug user profile structure
    logger.info('User profile data for dynamic variables', {
      hasUserProfile: !!userProfile,
      userProfileKeys: userProfile ? Object.keys(userProfile) : [],
      username: userProfile?.username,
      handle: userProfile?.handle,
      birthDate: userProfile?.birth_date,
      locationCity: userProfile?.location_city,
      locationCountry: userProfile?.location_country,
      profilePreview: userProfile ? JSON.stringify(userProfile).substring(0, 200) : null
    });
    
    // Calculate age from birth_date if available
    const age = userProfile?.birth_date 
      ? Math.floor((Date.now() - new Date(userProfile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;
    
    return {
      user_name: userProfile?.username || userProfile?.handle || 'Dreamer',
      user_profile: `${age || 'unknown'} years old, ${userProfile?.location_city || userProfile?.location_country || 'location unknown'}`,
      dream_content: dream?.raw_transcript || context.dreamContent || 'No dream content available',
      dream_emotions: dreamEmotions,
      dream_themes: context.interpretation?.themes || [],
      dream_date: dream?.created_at ? new Date(dream.created_at).toLocaleDateString() : 'unknown',
      dream_mood: dream?.mood ? `${dream.mood}/10` : 'not specified',
      dream_clarity: dream?.clarity ? `${dream.clarity}/10` : 'not specified',
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
        process.env.ELEVENLABS_SESSION_SECRET || config.jwt.secret
      );
      return decoded;
    } catch (error) {
      throw new Error('Invalid session token');
    }
  }
}