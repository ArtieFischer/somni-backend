import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 500;
const SIMILARITY_THRESHOLD = 0.5;
const MAX_THEMES_PER_FRAGMENT = 10;

async function tagFreudFragmentsSimple() {
  console.log('Starting Freud fragment tagging (simple version)...');
  
  try {
    // Process fragments in batches with pagination
    let processedCount = 0;
    let skippedCount = 0;
    let offset = 0;
    const pageSize = BATCH_SIZE;
    let totalFragments = 0;
    
    // Get total count first
    const { count, error: countError } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter', 'freud')
      .not('embedding', 'is', null);
    
    if (countError) throw countError;
    totalFragments = count || 0;
    console.log(`Total Freud fragments with embeddings: ${totalFragments}`);
    
    if (totalFragments === 0) {
      console.log('No Freud fragments with embeddings found');
      return;
    }
    
    // Process in batches
    while (offset < totalFragments) {
      // Fetch batch from database
      const { data: batch, error: fragmentsError } = await supabase
        .from('knowledge_fragments')
        .select('id, text, embedding')
        .eq('interpreter', 'freud')
        .not('embedding', 'is', null)
        .order('id')
        .range(offset, offset + pageSize - 1);
      
      if (fragmentsError) throw fragmentsError;
      if (!batch || batch.length === 0) break;
      console.log(`\nProcessing batch ${Math.floor(offset / pageSize) + 1}/${Math.ceil(totalFragments / pageSize)}`);
      
      for (const fragment of batch) {
        try {
          // Check if fragment already has themes
          const { data: existingThemes, error: checkError } = await supabase
            .from('fragment_themes')
            .select('id')
            .eq('fragment_id', fragment.id)
            .limit(1);
          
          if (checkError) throw checkError;
          
          if (existingThemes && existingThemes.length > 0) {
            skippedCount++;
            continue;
          }
          
          // Find similar themes using the search_themes function
          const { data: themes, error: themeError } = await supabase
            .rpc('search_themes', {
              query_embedding: fragment.embedding,
              similarity_threshold: SIMILARITY_THRESHOLD,
              max_results: MAX_THEMES_PER_FRAGMENT
            });
          
          if (themeError) {
            console.error(`Error finding themes for fragment ${fragment.id}:`, themeError);
            continue;
          }
          
          if (!themes || themes.length === 0) {
            console.log(`No similar themes found for fragment ${fragment.id}`);
            continue;
          }
          
          // Insert fragment-theme relationships
          const fragmentThemes = themes.map((theme: any) => ({
            fragment_id: fragment.id,
            theme_code: theme.code,
            similarity: theme.similarity
          }));
          
          const { error: insertError } = await supabase
            .from('fragment_themes')
            .insert(fragmentThemes);
          
          if (insertError) {
            console.error(`Error inserting themes for fragment ${fragment.id}:`, insertError);
          } else {
            processedCount++;
            console.log(`Tagged fragment ${fragment.id} with ${themes.length} themes`);
          }
          
        } catch (error) {
          console.error(`Error processing fragment ${fragment.id}:`, error);
        }
      }
      
      console.log(`Batch completed. Processed: ${processedCount}, Skipped: ${skippedCount}`);
      
      offset += pageSize;
      
      // Add delay between batches
      if (offset < totalFragments) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }
    
    console.log(`\nTagging complete!`);
    console.log(`Successfully tagged: ${processedCount} fragments`);
    console.log(`Already tagged (skipped): ${skippedCount} fragments`);
    console.log(`Total processed: ${processedCount + skippedCount}/${fragments.length}`);
    
  } catch (error) {
    console.error('Error in tagFreudFragmentsSimple:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  tagFreudFragmentsSimple()
    .then(() => {
      console.log('Freud fragment tagging (simple) completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { tagFreudFragmentsSimple };