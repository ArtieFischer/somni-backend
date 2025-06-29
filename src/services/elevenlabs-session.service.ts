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
  max_turn_length: number;
  dreamContent: string;
  dreamSymbols: string;
  age: number;
  recurringThemes: string;
  emotionalToneprimary: string;
  emotionalToneintensity: number;
  clarity: number;
  mood: number;
  quickTake: string;
  interpretationSummary: string;
  previousMessages: string;
  dream_topic: string;
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
   * Create secure session token with dynamic variables
   */
  static async createSessionToken(params: {
    agentId: string;
    userId: string;
    conversationId: string;
    expiresIn: number;
    dynamicVariables?: Record<string, any>;
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
    
    // Option 2: Create JWT token with dynamic variables
    const payload = {
      agentId: params.agentId,
      userId: params.userId,
      conversationId: params.conversationId,
      dynamicVariables: params.dynamicVariables || {},
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
    
    // Get interpretation details to extract all needed fields
    const { data: interpretation, error: interpError } = await supabaseService.getServiceClient()
      .from('interpretations')
      .select('*')
      .eq('dream_id', dreamId)
      .eq('interpreter_type', interpreterId)
      .single();
    
    if (interpError && interpError.code !== 'PGRST116') {
      logger.error('Failed to fetch interpretation details', interpError);
    }
    
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
    
    // Extract all required variables
    const userName = userProfile?.username || userProfile?.handle || 'Friend';
    const dreamContent = dream?.raw_transcript || context.dreamContent || 'No dream content available';
    
    // Extract symbols - join array to string if needed
    const dreamSymbols = interpretation?.symbols || context.interpretation?.symbols || [];
    const dreamSymbolsString = Array.isArray(dreamSymbols) ? dreamSymbols.join(', ') : dreamSymbols;
    
    // Extract themes - join array to string if needed
    const recurringThemes = context.interpretation?.themes || 
                           this.extractThemesFromInterpretation(interpretation) || 
                           ["growth", "transformation", "relationships"];
    const recurringThemesString = Array.isArray(recurringThemes) ? recurringThemes.join(', ') : recurringThemes;
    
    // Extract emotional tone details
    const emotionalToneData = interpretation?.emotional_tone || context.interpretation?.emotionalTone;
    let emotionalTonePrimary = 'neutral';
    let emotionalToneIntensity = 0.5;
    
    if (emotionalToneData) {
      if (typeof emotionalToneData === 'object' && emotionalToneData.primary) {
        emotionalTonePrimary = emotionalToneData.primary;
        emotionalToneIntensity = emotionalToneData.intensity || 0.5;
      } else if (typeof emotionalToneData === 'string') {
        emotionalTonePrimary = emotionalToneData;
      }
    }
    
    // Extract other fields from interpretation
    const clarity = dream?.clarity || 70;
    const mood = dream?.mood || 5;
    const quickTake = interpretation?.quick_take || context.interpretation?.quickTake || '';
    const interpretationSummary = interpretation?.interpretation_summary || context.interpretation?.interpretationSummary || '';
    const dreamTopic = interpretation?.dream_topic || 'general';
    
    // Build previousMessages string (empty for now as requested)
    const previousMessages = '';
    
    const dynamicVariables = {
      // All required fields
      user_name: userName,
      max_turn_length: 90,
      dreamContent: dreamContent,
      dreamSymbols: dreamSymbolsString,
      age: age || 25,
      recurringThemes: recurringThemesString,
      emotionalToneprimary: emotionalTonePrimary,
      emotionalToneintensity: emotionalToneIntensity,
      clarity: clarity,
      mood: mood,
      quickTake: quickTake,
      interpretationSummary: interpretationSummary,
      previousMessages: previousMessages,
      dream_topic: dreamTopic
    };
    
    // Log the final dynamic variables
    logger.info('Built dynamic variables for ElevenLabs', {
      dreamId: dreamId,
      interpreterId: interpreterId,
      dynamicVariables: dynamicVariables
    });
    
    return dynamicVariables;
  }
  
  /**
   * Helper method to extract themes from interpretation
   */
  private static extractThemesFromInterpretation(interpretation: any): string[] {
    if (!interpretation?.full_response) return [];
    
    const fullResponse = typeof interpretation.full_response === 'string' 
      ? JSON.parse(interpretation.full_response) 
      : interpretation.full_response;
    
    // Try different possible locations for themes
    return fullResponse?.themes || 
           fullResponse?.interpretation?.themes || 
           fullResponse?.stageMetadata?.themeIdentification?.themes ||
           [];
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
   * Initialize conversation with dynamic variables by sending WebSocket message to ElevenLabs
   */
  static async initializeConversationWithDynamicVariables(params: {
    agentId: string;
    dynamicVariables: Record<string, any>;
  }): Promise<boolean> {
    try {
      // Import WebSocket dynamically to avoid issues
      const { WebSocket } = await import('ws');
      
      // Create WebSocket connection to ElevenLabs
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${params.agentId}`;
      const ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${config.elevenLabs.apiKey}`
        }
      });
      
      return new Promise((resolve, reject) => {
        ws.on('open', () => {
          logger.info('Connected to ElevenLabs WebSocket for conversation initialization');
          
          // Send conversation initiation message with dynamic variables
          const initMessage = {
            type: 'conversation_initiation_client_data',
            dynamic_variables: params.dynamicVariables,
            conversation_config_override: {
              agent: {
                first_message: `Hello ${params.dynamicVariables.user_name || 'there'}, I'm here to help you explore your dream. Tell me about it, and we can delve into its meanings together.`
              }
            }
          };
          
          ws.send(JSON.stringify(initMessage));
          logger.info('Sent conversation initiation with dynamic variables to ElevenLabs', {
            agentId: params.agentId,
            variableKeys: Object.keys(params.dynamicVariables),
            user_name: params.dynamicVariables.user_name
          });
          
          // Close connection after sending initialization
          setTimeout(() => {
            ws.close();
            resolve(true);
          }, 1000);
        });
        
        ws.on('error', (error) => {
          logger.error('Failed to initialize conversation with ElevenLabs:', error);
          reject(error);
        });
        
        ws.on('close', () => {
          logger.info('ElevenLabs WebSocket connection closed after initialization');
        });
      });
      
    } catch (error) {
      logger.error('Failed to initialize conversation with dynamic variables:', error);
      return false;
    }
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