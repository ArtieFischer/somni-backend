/**
 * Feature flags for the application
 */
export const features = {
  // RAG (Retrieval-Augmented Generation) features
  rag: {
    enabled: process.env['ENABLE_RAG'] === 'true' || false,
    interpreters: {
      jung: process.env['ENABLE_RAG_JUNG'] !== 'false', // Default true if RAG is enabled
      freud: process.env['ENABLE_RAG_FREUD'] === 'true',
      mary: process.env['ENABLE_RAG_MARY'] === 'true'
    }
  },
  
  // Dream title generation
  titleGeneration: {
    enabled: process.env['ENABLE_TITLE_GENERATION'] !== 'false', // Default true
    model: process.env['TITLE_GENERATION_MODEL'] || 'meta-llama/llama-4-scout:free',
    maxTokens: parseInt(process.env['TITLE_GENERATION_MAX_TOKENS'] || '20'),
    temperature: parseFloat(process.env['TITLE_GENERATION_TEMPERATURE'] || '0.7')
  },
  
  // Other feature flags can be added here
  debug: {
    showDebateProcess: process.env['SHOW_DEBATE_PROCESS'] === 'true'
  }
};