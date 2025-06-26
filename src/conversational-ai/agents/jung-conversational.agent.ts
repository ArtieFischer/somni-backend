import { BaseConversationalAgent, ConversationalAgentConfig } from './base/base-conversational-agent';
import { ConversationContext } from '../types/conversation.types';
import { jungConversationalPrompts } from '../prompts/jung.prompts';
// Import existing Jung interpreter for consistency
import { JungDreamInterpreter } from '../../../dream-interpretation/interpreters/jung/jung-interpreter';

export class JungConversationalAgent extends BaseConversationalAgent {
  private jungInterpreter: JungDreamInterpreter;

  constructor() {
    // Get personality and metadata from existing Jung interpreter
    const jungInterpreter = new JungDreamInterpreter();
    
    const config: ConversationalAgentConfig = {
      type: jungInterpreter.type,
      metadata: jungInterpreter.metadata,
      personality: {
        ...jungInterpreter.personality,
        communicationStyle: 'Thoughtful and probing, using Socratic questioning to guide self-discovery'
      },
      elevenLabsAgentId: process.env.ELEVENLABS_AGENT_ID_JUNG || '',
      voiceSettings: {
        stability: 0.8,
        similarityBoost: 0.75,
        style: 0.5
      },
      conversationStyle: {
        maxContextMessages: 10,
        summaryThreshold: 20,
        responseStyle: 'detailed'
      }
    };
    
    super(config);
    this.jungInterpreter = jungInterpreter;
  }

  /**
   * Handle a conversation turn
   */
  async handleConversationTurn(
    userInput: string,
    context: ConversationContext
  ): Promise<string> {
    // Build prompt with conversation context
    const systemPrompt = this.buildConversationPrompt(context);
    
    // Add Jung-specific conversational elements based on personality traits
    const jungianContext = `
Remember to maintain your characteristic voice that blends:
- Deep psychological insight with accessible explanation
- Personal symbolism with collective/archetypal themes  
- Scientific observation with intuitive understanding
- References to your theoretical framework when relevant

Key elements to explore in conversation:
- Draw connections to archetypal patterns when relevant
- Explore the compensatory function of dream elements
- Guide toward individuation and self-realization
- Use active imagination techniques when appropriate
- Reference the collective unconscious when universal themes emerge
- Connect symbols to both personal and universal meanings
- Maintain hope while acknowledging psychological challenges

Use a MAXIMUM of 4 Jungian technical terms per response (choose from: anima/animus, Self, shadow, complex, individuation, archetype, collective unconscious, persona).`;

    const fullPrompt = `${systemPrompt}\n\n${jungianContext}`;

    // In MVP, we'll use the OpenRouter service directly
    // In production, this would go through ElevenLabs
    const response = await this.openrouter.generateCompletion(
      [
        {
          role: 'system',
          content: fullPrompt
        },
        {
          role: 'user',
          content: userInput
        }
      ],
      {
        temperature: 0.8,
        maxTokens: 500, // Keep responses conversational
        interpreterType: this.type
      }
    );

    return response.content;
  }

  /**
   * Generate follow-up questions
   */
  generateFollowUpQuestions(context: ConversationContext): string[] {
    const questions: string[] = [];
    
    if (context.interpretation?.symbols && context.interpretation.symbols.length > 0) {
      const primarySymbol = context.interpretation.symbols[0];
      questions.push(
        `What personal associations do you have with ${primarySymbol}?`,
        `Have you encountered ${primarySymbol} in other dreams or life experiences?`
      );
    }

    // Add archetype-specific questions
    const archetypes = ['shadow', 'anima/animus', 'self', 'hero', 'wise old man/woman'];
    questions.push(
      'What aspects of yourself might the dream figures represent?',
      'Do you see any recurring patterns from your waking life reflected in this dream?',
      'What emotions arose during the dream, and what might they be compensating for?'
    );

    return questions.slice(0, 3); // Return top 3 questions
  }

  /**
   * Get conversation starter
   */
  getConversationStarter(context: ConversationContext): string {
    const starters = jungConversationalPrompts.conversationStarters;
    const interpretation = context.interpretation;
    
    if (interpretation?.symbols && interpretation.symbols.length > 0) {
      return starters.symbolFocused.replace('{{symbol}}', interpretation.symbols[0]);
    }
    
    return starters.general;
  }

  // Required abstract methods from base interpreter
  protected getRelevancePrompt(): string {
    return ''; // Not used in conversational mode
  }

  protected getInterpretationPrompt(): string {
    return ''; // Not used in conversational mode
  }

  protected getFormattingPrompt(): string {
    return ''; // Not used in conversational mode
  }

  protected validateInterpreterSpecific(): string[] {
    return []; // Not used in conversational mode
  }

  getCoreStructure(): any {
    return {}; // Not used in conversational mode
  }
}