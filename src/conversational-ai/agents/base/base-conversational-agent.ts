import { BaseDreamInterpreter } from '../../../dream-interpretation/interpreters/base/base-interpreter';
import { InterpreterConfig } from '../../../dream-interpretation/interpreters/base/interpreter-interface';
import { ConversationContext, ConversationMessage } from '../../types/conversation.types';
import { ElevenLabsService } from '../../services/elevenlabs.service';
import { logger } from '../../../utils/logger';

export interface ConversationalAgentConfig extends InterpreterConfig {
  elevenLabsAgentId: string;
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
  };
  conversationStyle: {
    maxContextMessages: number;
    summaryThreshold: number;
    responseStyle: 'detailed' | 'concise' | 'adaptive';
  };
}

export abstract class BaseConversationalAgent extends BaseDreamInterpreter {
  protected elevenLabsAgentId: string;
  protected voiceSettings: any;
  protected conversationStyle: any;
  protected elevenLabsService: ElevenLabsService | null = null;

  constructor(config: ConversationalAgentConfig) {
    super(config);
    this.elevenLabsAgentId = config.elevenLabsAgentId;
    this.voiceSettings = config.voiceSettings;
    this.conversationStyle = config.conversationStyle;
  }

  /**
   * Initialize ElevenLabs connection for conversation
   */
  async initializeConversation(conversationId: string, context?: ConversationContext): Promise<ElevenLabsService> {
    try {
      this.elevenLabsService = new ElevenLabsService({
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        agentId: this.elevenLabsAgentId,
        voiceSettings: this.voiceSettings
      });

      await this.elevenLabsService.connect(conversationId);
      
      // Send initial conversation configuration if context provided
      if (context) {
        const config = this.buildConversationConfig(context);
        this.elevenLabsService.sendConversationConfig(config);
      }
      
      return this.elevenLabsService;
    } catch (error) {
      logger.error('Failed to initialize conversation:', error);
      throw error;
    }
  }

  /**
   * Build ElevenLabs conversation configuration
   */
  protected buildConversationConfig(context: ConversationContext): any {
    const systemPrompt = this.buildConversationPrompt(context);
    const firstMessage = this.getConversationStarter(context);
    
    return {
      agent: {
        prompt: {
          prompt: systemPrompt
        },
        first_message: firstMessage,
        language: 'en'
      },
      tts: {
        voice_id: this.voiceSettings?.voiceId || this.elevenLabsAgentId
      },
      custom_llm_extra_body: {
        temperature: 0.8,
        max_tokens: 500
      }
    };
  }

  /**
   * Build conversation prompt with dream interpretation context
   */
  buildConversationPrompt(context: ConversationContext): string {
    const basePrompt = this.getConversationSystemPrompt();
    
    // Add dream context
    const dreamContext = `
Dream Content: ${context.dreamContent}

Interpretation Summary:
${context.interpretation?.quickTake || 'No interpretation available'}

Key Symbols: ${context.interpretation?.symbols?.join(', ') || 'None identified'}

Relevant Knowledge:
${context.relevantKnowledge.map(k => `- ${k.content} (${k.source})`).join('\n')}
`;

    // Add conversation history if available
    const historyContext = context.previousMessages ? 
      this.formatConversationHistory(context.previousMessages) : '';

    return `${basePrompt}\n\n${dreamContext}\n\n${historyContext}`;
  }

  /**
   * Format conversation history for context
   */
  protected formatConversationHistory(messages: ConversationMessage[]): string {
    // Take only recent messages based on configuration
    const recentMessages = messages.slice(-this.conversationStyle.maxContextMessages);
    
    return `Previous Conversation:
${recentMessages.map(m => `${m.role === 'user' ? 'User' : this.personality.name}: ${m.content}`).join('\n')}`;
  }

  /**
   * Get conversation-specific system prompt
   */
  protected getConversationSystemPrompt(): string {
    return `You are ${this.personality.name}, ${this.personality.description}. 
${this.personality.voiceSignature}

You are now in a live conversation with someone who has shared their dream with you. You have already provided an interpretation, and now you're engaging in a deeper dialogue to help them explore the meaning and significance of their dream.

Your conversational style should be:
- ${this.personality.communicationStyle}
- Maintain your unique perspective and expertise
- Be responsive to the person's emotional state
- Ask thoughtful questions to deepen understanding
- Reference specific elements from their dream and your interpretation
- Keep responses conversational and natural for voice interaction

Important: This is a voice conversation, so keep your responses suitable for spoken dialogue. Avoid overly long monologues and encourage interactive discussion.`;
  }

  /**
   * Handle conversation turn - to be implemented by specific agents
   */
  abstract async handleConversationTurn(
    userInput: string,
    context: ConversationContext
  ): Promise<string>;

  /**
   * Generate follow-up questions based on interpretation
   */
  abstract generateFollowUpQuestions(context: ConversationContext): string[];

  /**
   * Get conversation starter for this interpreter
   */
  abstract getConversationStarter(context: ConversationContext): string;

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.elevenLabsService) {
      await this.elevenLabsService.disconnect();
      this.elevenLabsService = null;
    }
  }
}