import { supabaseService } from '../../services/supabase';
import { 
  ConversationSession, 
  ConversationMessage, 
  ConversationContext,
  ConversationConfig 
} from '../types/conversation.types';
import { logger } from '../../utils/logger';

class ConversationService {
  /**
   * Create a new conversation session
   */
  async createConversation(config: ConversationConfig): Promise<ConversationSession> {
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from('conversations')
        .insert({
          user_id: config.userId,
          dream_id: config.dreamId,
          interpreter_id: config.interpreterId,
          status: 'active',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
        dreamId: data.dream_id,
        interpreterId: data.interpreter_id,
        startedAt: new Date(data.started_at),
        status: data.status
      };
    } catch (error) {
      logger.error('Failed to create conversation:', error);
      throw error;
    }
  }

  /**
   * Find or create a conversation for a dream/interpreter combination
   */
  async findOrCreateConversation(config: ConversationConfig): Promise<ConversationSession> {
    try {
      logger.info('Finding or creating conversation', {
        userId: config.userId,
        dreamId: config.dreamId,
        interpreterId: config.interpreterId
      });
      
      // Debug: Check all conversations for this user
      const { data: allUserConvos } = await supabaseService.getServiceClient()
        .from('conversations')
        .select('id, user_id, dream_id, interpreter_id, status')
        .eq('user_id', config.userId)
        .limit(5);
        
      logger.info('All user conversations', {
        count: allUserConvos?.length || 0,
        conversations: allUserConvos
      });
      
      // First, try to find an existing conversation
      const { data: existing, error: findError } = await supabaseService.getServiceClient()
        .from('conversations')
        .select('*')
        .eq('user_id', config.userId)
        .eq('dream_id', config.dreamId)
        .eq('interpreter_id', config.interpreterId)
        .order('started_at', { ascending: false })
        .limit(1);

      logger.info('Query result', {
        foundRows: existing?.length || 0,
        error: findError?.message || null
      });

      // Check if we found any conversations (existing will be an array)
      if (!findError && existing && existing.length > 0) {
        const conversation = existing[0];
        logger.info('Found existing conversation', {
          conversationId: conversation.id,
          dreamId: config.dreamId,
          interpreterId: config.interpreterId,
          status: conversation.status,
          messageCount: await this.getConversationMessages(conversation.id).then(msgs => msgs.length)
        });
        
        // Update status to active if it was ended
        if (conversation.status === 'ended') {
          const { error: updateError } = await supabaseService.getServiceClient()
            .from('conversations')
            .update({ 
              status: 'active',
              resumed_at: new Date().toISOString()
            })
            .eq('id', conversation.id);
            
          if (updateError) {
            logger.error('Failed to update conversation status:', updateError);
          }
        }
        
        return {
          id: conversation.id,
          userId: conversation.user_id,
          dreamId: conversation.dream_id,
          interpreterId: conversation.interpreter_id,
          elevenLabsSessionId: conversation.elevenlabs_session_id,
          startedAt: new Date(conversation.started_at),
          endedAt: conversation.ended_at ? new Date(conversation.ended_at) : undefined,
          status: 'active'
        };
      }

      // No existing conversation found, create a new one
      logger.info('Creating new conversation', {
        dreamId: config.dreamId,
        interpreterId: config.interpreterId
      });
      
      return this.createConversation(config);
    } catch (error) {
      logger.error('Failed to find or create conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<ConversationSession | null> {
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return {
        id: data.id,
        userId: data.user_id,
        dreamId: data.dream_id,
        interpreterId: data.interpreter_id,
        elevenLabsSessionId: data.elevenlabs_session_id,
        startedAt: new Date(data.started_at),
        endedAt: data.ended_at ? new Date(data.ended_at) : undefined,
        status: data.status
      };
    } catch (error) {
      logger.error('Failed to get conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation context including interpretation and messages
   */
  async getConversationContext(conversationId: string): Promise<ConversationContext> {
    try {
      // Get conversation details
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Get dream interpretation
      const { data: interpretation, error: interpError } = await supabaseService.getServiceClient()
        .from('interpretations')
        .select('*')
        .eq('dream_id', conversation.dreamId)
        .eq('interpreter_type', conversation.interpreterId)
        .single();

      if (interpError && interpError.code !== 'PGRST116') {
        throw interpError;
      }

      // Get dream content
      const { data: dream, error: dreamError } = await supabaseService.getServiceClient()
        .from('dreams')
        .select('raw_transcript')
        .eq('id', conversation.dreamId)
        .single();

      if (dreamError) throw dreamError;

      // Get previous messages
      const messages = await this.getConversationMessages(conversationId);

      // Get relevant knowledge fragments (from interpretation)
      let relevantKnowledge: any[] = [];
      if (interpretation?.full_response) {
        // full_response might already be an object if stored as JSONB
        const fullResponse = typeof interpretation.full_response === 'string' 
          ? JSON.parse(interpretation.full_response)
          : interpretation.full_response;
          
        if (fullResponse?.stageMetadata?.relevanceAssessment?.relevantFragments) {
          relevantKnowledge = fullResponse.stageMetadata.relevanceAssessment.relevantFragments;
        }
      }

      return {
        interpretation: interpretation ? {
          id: interpretation.id,
          dreamId: interpretation.dream_id,
          interpreterType: interpretation.interpreter_type,
          interpretation: interpretation.interpretation_summary, // Main interpretation text
          interpretationSummary: interpretation.interpretation_summary,
          quickTake: interpretation.quick_take,
          symbols: interpretation.symbols || [],
          themes: this.extractThemesFromFullResponse(interpretation.full_response),
          emotions: this.extractEmotionsFromFullResponse(interpretation.full_response),
          questions: this.extractQuestionsFromFullResponse(interpretation.full_response),
          additionalInsights: this.extractInsightsFromFullResponse(interpretation.full_response),
          interpretationCore: interpretation.primary_insight || interpretation.quick_take,
          emotionalTone: this.extractEmotionalToneFromFullResponse(interpretation.full_response, interpretation.emotional_tone),
          fullResponse: interpretation.full_response
        } : undefined,
        relevantKnowledge: relevantKnowledge.map((k: any) => ({
          content: k.content,
          source: k.metadata?.source || 'Unknown',
          relevance: k.relevance || 0.5
        })),
        dreamContent: dream.raw_transcript,
        previousMessages: messages
      };
    } catch (error) {
      logger.error('Failed to get conversation context:', error);
      throw error;
    }
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        role: msg.role || (msg.sender === 'user' ? 'user' : 'assistant'),  // Use role if exists, fallback to sender mapping
        content: msg.content,
        audioUrl: msg.audio_url,
        timestamp: new Date(msg.created_at)
      }));
    } catch (error) {
      logger.error('Failed to get conversation messages:', error);
      throw error;
    }
  }

  /**
   * Save a message
   */
  async saveMessage(message: Omit<ConversationMessage, 'id' | 'timestamp'> & { elevenLabsMetadata?: any }): Promise<ConversationMessage> {
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from('messages')
        .insert({
          conversation_id: message.conversationId,
          sender: message.role === 'user' ? 'user' : 'interpreter',  // Map role to sender
          role: message.role,  // Also include role column
          content: message.content,
          audio_url: message.audioUrl,
          elevenlabs_metadata: message.elevenLabsMetadata || null
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        conversationId: data.conversation_id,
        role: data.role || (data.sender === 'user' ? 'user' : 'assistant'),  // Use role if exists, fallback to sender mapping
        content: data.content,
        audioUrl: data.audio_url,
        timestamp: new Date(data.created_at)
      };
    } catch (error) {
      logger.error('Failed to save message:', error);
      throw error;
    }
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId: string): Promise<void> {
    try {
      const { error } = await supabaseService.getServiceClient()
        .from('conversations')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to end conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(conversationId: string): Promise<{
    duration: number;
    messageCount: number;
  }> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const messages = await this.getConversationMessages(conversationId);

      const duration = conversation.endedAt 
        ? (conversation.endedAt.getTime() - conversation.startedAt.getTime()) / 1000
        : (Date.now() - conversation.startedAt.getTime()) / 1000;

      return {
        duration: Math.round(duration),
        messageCount: messages.length
      };
    } catch (error) {
      logger.error('Failed to get conversation stats:', error);
      throw error;
    }
  }

  /**
   * Update ElevenLabs session ID
   */
  async updateElevenLabsSessionId(conversationId: string, sessionId: string): Promise<void> {
    try {
      const { error } = await supabaseService.getServiceClient()
        .from('conversations')
        .update({ elevenlabs_session_id: sessionId })
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to update ElevenLabs session ID:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Failed to get user profile:', error);
      throw error;
    }
  }

  /**
   * Extract themes from full_response JSONB
   */
  private extractThemesFromFullResponse(fullResponse: any): string[] {
    if (!fullResponse) return [];
    
    const response = typeof fullResponse === 'string' 
      ? JSON.parse(fullResponse) 
      : fullResponse;
    
    // Try different possible locations for themes
    return response?.themes || 
           response?.interpretation?.themes || 
           response?.stageMetadata?.themeIdentification?.themes ||
           [];
  }

  /**
   * Extract emotions from full_response JSONB
   */
  private extractEmotionsFromFullResponse(fullResponse: any): string[] {
    if (!fullResponse) return [];
    
    const response = typeof fullResponse === 'string' 
      ? JSON.parse(fullResponse) 
      : fullResponse;
    
    // Extract emotions from various possible locations
    const emotions = [];
    
    if (response?.emotions) {
      emotions.push(...response.emotions);
    }
    
    if (response?.emotionalTone) {
      emotions.push(response.emotionalTone);
    }
    
    if (response?.stageMetadata?.emotionalAnalysis?.emotions) {
      emotions.push(...response.stageMetadata.emotionalAnalysis.emotions);
    }
    
    return [...new Set(emotions)]; // Remove duplicates
  }

  /**
   * Extract questions from full_response JSONB
   */
  private extractQuestionsFromFullResponse(fullResponse: any): string[] {
    if (!fullResponse) return [];
    
    const response = typeof fullResponse === 'string' 
      ? JSON.parse(fullResponse) 
      : fullResponse;
    
    return response?.questions || 
           response?.followUpQuestions ||
           response?.guidingQuestions ||
           [];
  }

  /**
   * Extract additional insights from full_response JSONB
   */
  private extractInsightsFromFullResponse(fullResponse: any): string[] {
    if (!fullResponse) return [];
    
    const response = typeof fullResponse === 'string' 
      ? JSON.parse(fullResponse) 
      : fullResponse;
    
    const insights = [];
    
    if (response?.additionalInsights) {
      insights.push(...(Array.isArray(response.additionalInsights) 
        ? response.additionalInsights 
        : [response.additionalInsights]));
    }
    
    if (response?.keyInsights) {
      insights.push(...(Array.isArray(response.keyInsights) 
        ? response.keyInsights 
        : [response.keyInsights]));
    }
    
    return insights;
  }

  /**
   * Extract emotional tone from full_response JSONB or emotional_tone column
   */
  private extractEmotionalToneFromFullResponse(fullResponse: any, emotionalToneColumn?: any): string | any {
    // First check if we have emotional_tone column data
    if (emotionalToneColumn) {
      // If it's already an object with primary field, return as is
      if (typeof emotionalToneColumn === 'object' && emotionalToneColumn.primary) {
        return emotionalToneColumn;
      }
      // If it's a string, return it
      if (typeof emotionalToneColumn === 'string') {
        return emotionalToneColumn;
      }
    }
    
    // Otherwise extract from full_response
    if (!fullResponse) return 'neutral';
    
    const response = typeof fullResponse === 'string' 
      ? JSON.parse(fullResponse) 
      : fullResponse;
    
    return response?.emotionalTone?.primary || 
           response?.emotionalTone ||
           response?.stageMetadata?.emotionalAnalysis?.primaryTone ||
           'neutral';
  }

  /**
   * Update conversation with additional fields
   */
  async updateConversation(conversationId: string, updates: {
    elevenlabs_agent_id?: string;
    elevenlabs_session_id?: string;
    implementation_type?: 'websocket' | 'elevenlabs';
    status?: string;
    last_message_at?: Date;
    resumed_at?: Date;
    message_count?: number;
  }): Promise<void> {
    try {
      const updateData: any = {};
      
      if (updates.elevenlabs_agent_id) {
        updateData.elevenlabs_agent_id = updates.elevenlabs_agent_id;
      }
      if (updates.elevenlabs_session_id) {
        updateData.elevenlabs_session_id = updates.elevenlabs_session_id;
      }
      if (updates.implementation_type) {
        updateData.implementation_type = updates.implementation_type;
      }
      if (updates.status) {
        updateData.status = updates.status;
      }
      if (updates.last_message_at) {
        updateData.last_message_at = updates.last_message_at.toISOString();
      }
      if (updates.resumed_at) {
        updateData.resumed_at = updates.resumed_at.toISOString();
      }
      if (updates.message_count !== undefined) {
        updateData.message_count = updates.message_count;
      }
      
      const { error } = await supabaseService.getServiceClient()
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to update conversation:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService();