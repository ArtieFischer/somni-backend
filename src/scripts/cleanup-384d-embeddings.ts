#!/usr/bin/env node
/**
 * Cleanup script for old 384D theme embedding files
 * This script removes or archives files related to the old embedding system
 */

import * as fs from 'fs';
import * as path from 'path';

const filesToDelete = [
  // Edge function directory that uses old MiniLM model
  'supabase/functions/embed-themes',
  
  // Old test files
  'test-local-embeddings.ts',
  'supabase/scripts/test-theme-similarity.ts',
  
  // Old seeding scripts (replaced by BGE versions)
  'supabase/scripts/seed-themes.ts',
  'supabase/scripts/seed-themes-admin.ts',
  
  // Old SQL verification scripts
  'supabase/scripts/check-theme-embeddings.sql',
  'supabase/scripts/verify-embeddings.sql',
  
  // Old migration function (already replaced)
  'supabase/migrations/004_create_update_theme_embedding_function.sql',
];

const filesToArchive = [
  // Keep these for reference but move to archive
  'src/services/embeddings.service.ts', // Still used by other services
  'CLEANUP_384_EMBEDDINGS.md', // Documentation of cleanup
];

const filesToUpdate = [
  // These files need manual review and updates
  {
    file: 'src/services/rag.service.ts',
    note: 'Uses embeddingsService - may need to switch to bgeEmbeddingsService for themes'
  },
  {
    file: 'src/services/hybrid-rag.service.ts',
    note: 'Check if theme embeddings are used here'
  },
  {
    file: 'src/routes/embeddings.ts',
    note: 'Review endpoints for theme embedding generation'
  },
  {
    file: 'supabase/types/database.types.ts',
    note: 'Regenerate after migration: npm run supabase:types'
  }
];

async function cleanup() {
  console.log('🧹 Starting cleanup of 384D theme embedding files...\n');

  // Create archive directory
  const archiveDir = path.join(process.cwd(), 'archive/384d-embeddings');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
    console.log(`📁 Created archive directory: ${archiveDir}\n`);
  }

  // Delete files
  console.log('🗑️  Deleting obsolete files:');
  for (const file of filesToDelete) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        // Check if it's a directory
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
          console.log(`   ✅ Deleted directory: ${file}`);
        } else {
          fs.unlinkSync(filePath);
          console.log(`   ✅ Deleted: ${file}`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to delete: ${file} - ${error.message}`);
      }
    } else {
      console.log(`   ⚠️  Not found: ${file}`);
    }
  }

  // Archive files
  console.log('\n📦 Archiving files for reference:');
  for (const file of filesToArchive) {
    const sourcePath = path.join(process.cwd(), file);
    const destPath = path.join(archiveDir, path.basename(file));
    
    if (fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`   ✅ Archived: ${file}`);
      } catch (error) {
        console.log(`   ❌ Failed to archive: ${file} - ${error.message}`);
      }
    } else {
      console.log(`   ⚠️  Not found: ${file}`);
    }
  }

  // List files that need manual updates
  console.log('\n📝 Files that need manual review:');
  for (const item of filesToUpdate) {
    const filePath = path.join(process.cwd(), item.file);
    if (fs.existsSync(filePath)) {
      console.log(`   📄 ${item.file}`);
      console.log(`      Note: ${item.note}`);
    }
  }

  // Create a summary report
  const report = `# 384D Embeddings Cleanup Report
Generated: ${new Date().toISOString()}

## Deleted Files
${filesToDelete.map(f => `- ${f}`).join('\n')}

## Archived Files
${filesToArchive.map(f => `- ${f} -> archive/384d-embeddings/${path.basename(f)}`).join('\n')}

## Files Requiring Manual Review
${filesToUpdate.map(item => `- ${item.file}\n  - ${item.note}`).join('\n')}

## Next Steps
1. Run database migration: \`supabase/migrations/20240101000002_clean_and_prepare_bge.sql\`
2. Regenerate types: \`npm run supabase:types\`
3. Review and update the files listed above
4. Test the BGE-M3 theme embeddings with the test script
`;

  fs.writeFileSync(path.join(archiveDir, 'cleanup-report.md'), report);
  console.log(`\n📄 Cleanup report saved to: ${path.join(archiveDir, 'cleanup-report.md')}`);

  console.log('\n✅ Cleanup completed!');
  console.log('\n⚠️  Important: Remember to:');
  console.log('   1. Review the files that need manual updates');
  console.log('   2. Run the database migration if not already done');
  console.log('   3. Regenerate TypeScript types');
  console.log('   4. Test the new BGE-M3 theme system');
}

// Add confirmation prompt
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  This script will delete and archive files related to the old 384D theme embeddings.');
console.log('   Make sure you have committed your changes to git first!\n');

rl.question('Do you want to proceed? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    cleanup().catch(console.error).finally(() => {
      rl.close();
    });
  } else {
    console.log('Cleanup cancelled.');
    rl.close();
  }
});