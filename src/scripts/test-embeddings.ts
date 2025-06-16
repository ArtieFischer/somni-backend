import { embeddingsService } from '../services/embeddings.service';

async function testEmbeddings() {
  console.log('Testing embeddings service...');
  
  try {
    console.log('Generating embedding for test text...');
    const startTime = Date.now();
    
    const embedding = await embeddingsService.generateEmbedding(
      'This is a test of the Jung dream interpretation system'
    );
    
    const endTime = Date.now();
    
    console.log('✅ Success!');
    console.log(`Embedding dimension: ${embedding.length}`);
    console.log(`Time taken: ${endTime - startTime}ms`);
    console.log(`First 5 values: ${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

testEmbeddings();