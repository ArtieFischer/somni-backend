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
      neuroscientist: process.env['ENABLE_RAG_NEUROSCIENTIST'] === 'true'
    }
  },
  
  // Other feature flags can be added here
  debug: {
    showDebateProcess: process.env['SHOW_DEBATE_PROCESS'] === 'true'
  }
};