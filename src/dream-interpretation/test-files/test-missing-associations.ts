import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkFragmentThemeAssociations() {
  const client = await pool.connect();
  
  try {
    console.log('Checking fragment-theme associations for lakshmi and mary...\n');
    
    // Get all fragments for lakshmi and mary
    const fragmentsQuery = `
      SELECT 
        kf.id,
        kf.interpreter_slug,
        kf.title,
        kf.created_at
      FROM knowledge_fragments kf
      WHERE kf.interpreter_slug IN ('lakshmi', 'mary')
      ORDER BY kf.interpreter_slug, kf.created_at DESC
    `;
    
    const fragmentsResult = await client.query(fragmentsQuery);
    console.log(`Total fragments found: ${fragmentsResult.rows.length}`);
    console.log(`- lakshmi fragments: ${fragmentsResult.rows.filter(f => f.interpreter_slug === 'lakshmi').length}`);
    console.log(`- mary fragments: ${fragmentsResult.rows.filter(f => f.interpreter_slug === 'mary').length}\n`);
    
    // Get all fragment IDs
    const fragmentIds = fragmentsResult.rows.map(f => f.id);
    
    if (fragmentIds.length === 0) {
      console.log('No fragments found for lakshmi or mary!');
      return;
    }
    
    // Check if these fragments have ANY theme associations
    const associationsQuery = `
      SELECT 
        ft.fragment_id,
        ft.theme_id,
        ft.similarity_score,
        t.name as theme_name,
        kf.interpreter_slug,
        kf.title as fragment_title
      FROM fragment_themes ft
      JOIN themes t ON ft.theme_id = t.id
      JOIN knowledge_fragments kf ON ft.fragment_id = kf.id
      WHERE ft.fragment_id = ANY($1::uuid[])
      ORDER BY kf.interpreter_slug, ft.similarity_score DESC
    `;
    
    const associationsResult = await client.query(associationsQuery, [fragmentIds]);
    
    console.log(`\nTotal theme associations found: ${associationsResult.rows.length}`);
    
    if (associationsResult.rows.length === 0) {
      console.log('\n❌ NO THEME ASSOCIATIONS FOUND for any lakshmi or mary fragments!');
      console.log('This confirms that fragments were never processed for theme associations.\n');
      
      // Show some sample fragment IDs that should have associations
      console.log('Sample fragment IDs that are missing associations:');
      fragmentsResult.rows.slice(0, 5).forEach(f => {
        console.log(`- ${f.interpreter_slug}: ${f.id} (${f.title})`);
      });
    } else {
      // Group by interpreter
      const lakshmiAssociations = associationsResult.rows.filter(a => a.interpreter_slug === 'lakshmi');
      const maryAssociations = associationsResult.rows.filter(a => a.interpreter_slug === 'mary');
      
      console.log(`\n✓ Found associations:`);
      console.log(`- lakshmi: ${lakshmiAssociations.length} associations`);
      console.log(`- mary: ${maryAssociations.length} associations`);
      
      // Show sample associations
      console.log('\nSample associations:');
      
      if (lakshmiAssociations.length > 0) {
        console.log('\nlakshmi:');
        lakshmiAssociations.slice(0, 3).forEach(a => {
          console.log(`  - Fragment: "${a.fragment_title}" → Theme: "${a.theme_name}" (score: ${a.similarity_score.toFixed(4)})`);
        });
      }
      
      if (maryAssociations.length > 0) {
        console.log('\nmary:');
        maryAssociations.slice(0, 3).forEach(a => {
          console.log(`  - Fragment: "${a.fragment_title}" → Theme: "${a.theme_name}" (score: ${a.similarity_score.toFixed(4)})`);
        });
      }
    }
    
    // Check if there are any fragments without associations
    const fragmentsWithAssociations = new Set(associationsResult.rows.map(a => a.fragment_id));
    const fragmentsWithoutAssociations = fragmentsResult.rows.filter(f => !fragmentsWithAssociations.has(f.id));
    
    if (fragmentsWithoutAssociations.length > 0) {
      console.log(`\n⚠️  Fragments without any theme associations: ${fragmentsWithoutAssociations.length}`);
      console.log('\nBreakdown by interpreter:');
      
      const lakshmiMissing = fragmentsWithoutAssociations.filter(f => f.interpreter_slug === 'lakshmi');
      const maryMissing = fragmentsWithoutAssociations.filter(f => f.interpreter_slug === 'mary');
      
      console.log(`- lakshmi: ${lakshmiMissing.length} fragments without associations`);
      console.log(`- mary: ${maryMissing.length} fragments without associations`);
      
      if (lakshmiMissing.length > 0) {
        console.log('\nSample lakshmi fragments missing associations:');
        lakshmiMissing.slice(0, 3).forEach(f => {
          console.log(`  - ${f.id}: "${f.title}"`);
        });
      }
      
      if (maryMissing.length > 0) {
        console.log('\nSample mary fragments missing associations:');
        maryMissing.slice(0, 3).forEach(f => {
          console.log(`  - ${f.id}: "${f.title}"`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error checking fragment-theme associations:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkFragmentThemeAssociations().catch(console.error);