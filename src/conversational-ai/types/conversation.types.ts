export interface ConversationConfig {
  dreamId: string;
  interpreterId: 'jung' | 'lakshmi' | 'freud' | 'mary';
  userId: string;
  interpretationData?: any; // Will be properly typed based on existing types
}

export interface ConversationSession {
  id: string;
  userId: string;
  dreamId: string;
  interpreterId: string;
  elevenLabsSessionId?: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'ended' | 'error';
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: Date;
}

export interface ConversationContext {
  interpretation: {
    id: string;
    dreamId: string;
    interpreterType: string;
    interpretation: string;
    interpretationSummary?: string;
    quickTake: string;
    symbols: string[];
    themes: string[];
    emotions: string[];
    questions: string[];
    additionalInsights: string[];
    interpretationCore: string;
    emotionalTone?: string;
    fullResponse?: any; // Contains detailed metadata
  } | undefined;
  relevantKnowledge: Array<{
    content: string;
    source: string;
    relevance: number;
  }>;
  dreamContent: string;
  previousMessages?: ConversationMessage[];
}

export interface StartConversationResponse {
  conversationId: string;
  websocketUrl: string;
  token: string;
}

export interface EndConversationResponse {
  success: boolean;
  duration: number;
  messageCount: number;
}