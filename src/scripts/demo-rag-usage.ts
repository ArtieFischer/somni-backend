/**
 * Demo: How to Use RAG-Enhanced Jung Interpreter
 * 
 * This shows how the RAG integration works in your actual application
 */

console.log(`
🎯 RAG Integration Usage Guide
==============================

1️⃣  AUTOMATIC USAGE (Recommended)
   When ENABLE_RAG=true in your .env, the system automatically:
   - Uses JungianRAGPromptBuilder instead of regular JungianPromptBuilder
   - Searches Jung's texts for relevant passages
   - Enriches interpretations with actual Jung quotes

   Example API call:
   POST /api/v1/interpretation/interpret
   {
     "dreamId": "123",
     "interpreterType": "jung",
     "dreamTranscription": "I dreamed about my shadow...",
     "analysisDepth": "deep"
   }

2️⃣  TEST THE RAG SYSTEM
   npm run test-rag          # Check if knowledge base is working
   npm run compare-rag       # Compare with/without RAG

3️⃣  MONITOR RAG USAGE
   Check your server logs for:
   "Retrieved 7 relevant passages for Jung interpretation"

4️⃣  CUSTOMIZE RAG BEHAVIOR
   Edit src/prompts/interpreters/jung/builder-with-rag.ts:
   - maxResults: 7         (more = richer context)
   - similarityThreshold: 0.65  (lower = more inclusive)
   - includeSymbols: true  (extract symbol meanings)

5️⃣  ADD MORE JUNG TEXTS
   npm run ingest-jung-stream /path/to/more/texts

6️⃣  EXTEND TO OTHER INTERPRETERS
   1. Ingest Freud texts:
      - Set interpreter_type: 'freud' in ingestion script
      - Run: npm run ingest-jung-stream /path/to/freud/texts
   
   2. Create FreudianRAGPromptBuilder
   3. Update factory to use it when ENABLE_RAG_FREUD=true

📊 CURRENT STATUS:
   - Jung: ✅ RAG Ready (if you ingested texts)
   - Freud: ⏳ Ready for texts
   - Neuroscientist: ⏳ Ready for papers
   
🚀 Your Jung interpreter now references actual Jung writings!
`);