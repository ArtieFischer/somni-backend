import * as fs from 'fs';
import * as path from 'path';

// Import the processor from the main script
import { FreudTextProcessor } from './ingest-freud-texts';

// Main execution
if (require.main === module) {
  const filename = process.argv[2];
  
  if (!filename) {
    console.error('Please provide a filename');
    console.error('Usage: npm run ingest-freud-single <filename>');
    console.error('Example: npm run ingest-freud-single introductory-lectures-dreams.txt');
    process.exit(1);
  }

  const processor = new FreudTextProcessor();
  const freudTextsPath = path.join(__dirname, '../../RAG-data/freud');
  const filePath = path.join(freudTextsPath, filename);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Processing single file: ${filename}`);
  
  // Create temporary folder with just this file
  const tempDir = path.join(__dirname, '../../temp-freud-ingest');
  fs.mkdirSync(tempDir, { recursive: true });
  fs.copyFileSync(filePath, path.join(tempDir, filename));
  
  processor.processFreudTexts(tempDir)
    .then(() => {
      // Cleanup temp directory
      fs.rmSync(tempDir, { recursive: true });
      console.log(`✅ Successfully ingested ${filename}!`);
      process.exit(0);
    })
    .catch(error => {
      // Cleanup temp directory on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
      console.error('❌ Failed to ingest text:', error);
      process.exit(1);
    });
}