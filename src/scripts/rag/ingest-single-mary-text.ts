import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { embeddingsService } from '../../services/embeddings.service';

/**
 * Ingest a single neuroscience text file for Mary
 * Useful for testing or adding individual texts
 */
async function ingestSingleText(filename: string) {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  const filePath = path.join(__dirname, '../../../rag-data/neurocognitive', filename);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Processing ${filename}...`);
  
  const text = fs.readFileSync(filePath, 'utf-8');
  
  // Simple chunking for single file
  const chunkSize = 1500;
  const overlap = 200;
  const chunks: string[] = [];
  
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    const chunk = text.slice(i, i + chunkSize);
    if (chunk.trim().length > 100) {
      chunks.push(chunk.trim());
    }
  }
  
  console.log(`Created ${chunks.length} chunks`);
  
  // Process chunks
  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await embeddingsService.generateEmbedding(chunks[i]!);
      
      const { error } = await supabase
        .from('documents')
        .insert({
          content: chunks[i],
          embedding,
          metadata: {
            source: filename.replace('.txt', '').replace(/-/g, ' '),
            topic: 'neuroscience',
            subtopic: ['general'],
            chunkIndex: i,
            totalChunks: chunks.length
          }
        });
      
      if (error) throw error;
      
      if ((i + 1) % 10 === 0) {
        console.log(`Processed ${i + 1}/${chunks.length} chunks`);
      }
      
    } catch (error) {
      console.error(`Error processing chunk ${i}:`, error);
    }
  }
  
  console.log(`✅ Successfully ingested ${filename}`);
}

// Execute if run directly
if (require.main === module) {
  const filename = process.argv[2];
  
  if (!filename) {
    console.error('Usage: npm run script src/scripts/rag/ingest-single-mary-text.ts <filename>');
    console.error('Example: npm run script src/scripts/rag/ingest-single-mary-text.ts The-Committee-of-Sleep.txt');
    process.exit(1);
  }
  
  ingestSingleText(filename)
    .then(() => {
      console.log('✅ Ingestion complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}