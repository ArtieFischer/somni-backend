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
          interpretation: interpretation.interpretation,
          quickTake: interpretation.quick_take,
          symbols: interpretation.symbols,
          themes: interpretation.themes,
          emotions: interpretation.emotions,
          questions: interpretation.questions,
          additionalInsights: interpretation.additional_insights,
          interpretationCore: interpretation.interpretation_core
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
        role: msg.sender === 'user' ? 'user' : 'assistant',  // Map sender to role
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
  async saveMessage(message: Omit<ConversationMessage, 'id' | 'timestamp'>): Promise<ConversationMessage> {
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from('messages')
        .insert({
          conversation_id: message.conversationId,
          sender: message.role === 'user' ? 'user' : 'interpreter',  // Map role to sender
          content: message.content,
          audio_url: message.audioUrl
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        conversationId: data.conversation_id,
        role: data.sender === 'user' ? 'user' : 'assistant',  // Map sender to role
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
}

// Export singleton instance
export const conversationService = new ConversationService();