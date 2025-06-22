import * as fs from 'fs';
import * as path from 'path';
import { BookPreprocessor } from './core/preprocessor';
import { SmartChunker } from './core/chunker';
import { ContentClassifier } from './core/classifier';
import { embeddingsService } from '../../services/embeddings.service';

async function testIngestionPipeline() {
  console.log('🧪 Testing Knowledge Base Ingestion Pipeline\n');
  
  // Test 1: Book Preprocessor
  console.log('1️⃣ Testing Book Preprocessor...');
  const preprocessor = new BookPreprocessor();
  
  // Create a test file
  const testContent = `
Chapter 1: Introduction to Dreams

Dreams have fascinated humanity since ancient times. In this chapter, we explore the fundamental principles of dream analysis according to Carl Jung's theoretical framework.

The archetype of the shadow represents the unconscious aspects of our personality. When we dream of dark figures or unknown persons, we may be encountering our shadow self.

Chapter 2: Symbols and Their Meanings

Water in dreams often symbolizes emotions and the unconscious mind. A calm lake might represent peace, while turbulent seas could signify emotional turmoil.

The symbol of the snake has multiple interpretations. It can represent transformation, healing (as in the medical caduceus), or dangerous unconscious forces.`;

  const testPath = path.join(process.cwd(), 'test-jung-book.txt');
  await fs.promises.writeFile(testPath, testContent);
  
  try {
    const result = await preprocessor.preprocessBook(testPath, 'jung');
    console.log('✓ Preprocessor result:');
    console.log(`  Title: ${result.metadata.title}`);
    console.log(`  Author: ${result.metadata.author}`);
    console.log(`  Chapters: ${result.chapters.length}`);
    result.chapters.forEach(ch => {
      console.log(`    - ${ch.title} (${ch.content.length} chars)`);
    });
  } catch (error) {
    console.error('✗ Preprocessor failed:', error);
  }
  
  // Test 2: Smart Chunker
  console.log('\n2️⃣ Testing Smart Chunker...');
  const chunker = new SmartChunker();
  
  const chunks = chunker.chunkText(
    testContent,
    'Test Book',
    'Chapter 1',
    1,
    { targetSize: 200, overlapSize: 50 }
  );
  
  console.log(`✓ Created ${chunks.length} chunks`);
  const stats = chunker.analyzeChunks(chunks);
  console.log(`  Average size: ${stats.avgChunkSize} chars`);
  console.log(`  Size range: ${stats.minChunkSize}-${stats.maxChunkSize} chars`);
  
  // Test 3: Content Classifier
  console.log('\n3️⃣ Testing Content Classifier...');
  const classifier = new ContentClassifier();
  
  const sampleTexts = [
    { 
      text: "The archetype of the shadow represents unconscious aspects of personality.",
      expected: "theory"
    },
    {
      text: "Patient X dreamt of falling from a tall building, which symbolizes loss of control.",
      expected: "case_study"
    },
    {
      text: "To practice active imagination, first find a quiet space and close your eyes.",
      expected: "technique"
    }
  ];
  
  sampleTexts.forEach(sample => {
    const result = classifier.classifyContent(sample.text);
    const match = result.primaryType === sample.expected ? '✓' : '✗';
    console.log(`${match} "${sample.text.substring(0, 50)}..."`);
    console.log(`  Type: ${result.primaryType} (confidence: ${result.confidence})`);
    console.log(`  Topics: ${result.topics.join(', ') || 'none'}`);
  });
  
  // Test 4: Embeddings
  console.log('\n4️⃣ Testing Embeddings Service...');
  try {
    const testText = "Dreams are the royal road to the unconscious.";
    const embedding = await embeddingsService.generateEmbedding(testText);
    console.log(`✓ Generated embedding with ${embedding.length} dimensions`);
    
    // Check embedding properties
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    console.log(`  Norm: ${norm.toFixed(4)} (should be close to 1.0)`);
    console.log(`  Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
  } catch (error) {
    console.error('✗ Embedding generation failed:', error);
  }
  
  // Test 5: Full Pipeline on Sample
  console.log('\n5️⃣ Testing Full Pipeline...');
  try {
    const { chapters } = await preprocessor.preprocessBook(testPath, 'jung');
    const firstChapter = chapters[0];
    
    const chapterChunks = chunker.chunkText(
      firstChapter.content,
      'Test Book',
      firstChapter.title,
      1
    );
    
    console.log(`Processing ${chapterChunks.length} chunks...`);
    
    for (let i = 0; i < Math.min(3, chapterChunks.length); i++) {
      const chunk = chapterChunks[i];
      const classification = classifier.classifyContent(chunk.content);
      const embedding = await embeddingsService.generateEmbedding(chunk.content);
      
      console.log(`\n  Chunk ${i + 1}:`);
      console.log(`    Content: "${chunk.content.substring(0, 60)}..."`);
      console.log(`    Type: ${classification.primaryType}`);
      console.log(`    Topics: ${classification.topics.join(', ') || 'none'}`);
      console.log(`    Embedding: ${embedding.length}d vector`);
    }
    
    console.log('\n✓ Full pipeline test completed successfully!');
  } catch (error) {
    console.error('✗ Full pipeline test failed:', error);
  }
  
  // Cleanup
  await fs.promises.unlink(testPath).catch(() => {});
  await embeddingsService.cleanup();
  
  console.log('\n✅ All tests completed!');
}

// Run tests
testIngestionPipeline().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});