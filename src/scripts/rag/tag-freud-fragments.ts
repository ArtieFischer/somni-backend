import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

async function tagFreudFragments() {
  console.log('Starting Freud fragment tagging...');
  
  try {
    // Get total Freud fragments
    const { count: totalFragments, error: countError } = await supabase
      .from('knowledge_fragments')
      .select('*', { count: 'exact', head: true })
      .eq('interpreter', 'freud');
    
    if (countError) throw countError;
    console.log(`Total Freud fragments: ${totalFragments}`);
    
    // Get all Freud fragments with embeddings (paginated to handle > 1000)
    let allFragments: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: fragments, error: fragmentsError } = await supabase
        .from('knowledge_fragments')
        .select('id, text, embedding')
        .eq('interpreter', 'freud')
        .not('embedding', 'is', null)
        .order('id')
        .range(offset, offset + pageSize - 1);
      
      if (fragmentsError) throw fragmentsError;
      
      if (!fragments || fragments.length === 0) {
        break;
      }
      
      allFragments = allFragments.concat(fragments);
      console.log(`Fetched ${fragments.length} fragments (total: ${allFragments.length})`);
      
      if (fragments.length < pageSize) {
        break;
      }
      
      offset += pageSize;
    }
    
    if (allFragments.length === 0) {
      console.log('No Freud fragments with embeddings found');
      return;
    }
    
    console.log(`Found ${allFragments.length} Freud fragments with embeddings`);
    const fragments = allFragments;
    
    // Check which fragments are already tagged
    const fragmentIds = fragments.map(f => f.id);
    const taggedFragmentIds = new Set<number>();
    
    // Process in chunks to avoid URI too large error
    const chunkSize = 100;
    for (let i = 0; i < fragmentIds.length; i += chunkSize) {
      const chunk = fragmentIds.slice(i, i + chunkSize);
      const { data: existingTags, error: tagsError } = await supabase
        .from('fragment_themes')
        .select('fragment_id')
        .in('fragment_id', chunk);
      
      if (tagsError) throw tagsError;
      
      if (existingTags) {
        existingTags.forEach(tag => taggedFragmentIds.add(tag.fragment_id));
      }
    }
    
    // Filter to only untagged fragments
    const untaggedFragments = fragments.filter(f => !taggedFragmentIds.has(f.id));
    console.log(`Found ${taggedFragmentIds.size} already tagged fragments`);
    console.log(`Will process ${untaggedFragments.length} untagged fragments`);
    
    if (untaggedFragments.length === 0) {
      console.log('All fragments are already tagged!');
      return;
    }
    
    // Process fragments in batches
    let processedCount = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < untaggedFragments.length; i += BATCH_SIZE) {
      const batch = untaggedFragments.slice(i, i + BATCH_SIZE);
      const batchStartTime = Date.now();
      
      console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(untaggedFragments.length / BATCH_SIZE)}`);
      
      for (const fragment of batch) {
        try {
          // Use the RPC function to get top themes for this fragment
          const { data: themes, error: themeError } = await supabase
            .rpc('get_top_n_themes_for_fragment', {
              p_fragment_id: fragment.id,
              p_top_n: 10
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
            theme_code: theme.theme_code,
            similarity: theme.similarity
          }));
          
          const { error: insertError } = await supabase
            .from('fragment_themes')
            .insert(fragmentThemes);
          
          if (insertError) {
            console.error(`Error inserting themes for fragment ${fragment.id}:`, insertError);
          } else {
            processedCount++;
          }
          
        } catch (error) {
          console.error(`Error processing fragment ${fragment.id}:`, error);
        }
      }
      
      // Calculate and display progress
      const batchTime = Date.now() - batchStartTime;
      const totalTime = Date.now() - startTime;
      const avgTimePerFragment = totalTime / (i + batch.length);
      const remainingFragments = untaggedFragments.length - (i + batch.length);
      const estimatedTimeRemaining = remainingFragments * avgTimePerFragment;
      
      console.log(`Batch completed in ${(batchTime / 1000).toFixed(1)}s`);
      console.log(`Progress: ${i + batch.length}/${untaggedFragments.length} fragments`);
      console.log(`Estimated time remaining: ${(estimatedTimeRemaining / 1000 / 60).toFixed(1)} minutes`);
      
      // Add delay between batches
      if (i + BATCH_SIZE < untaggedFragments.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }
    
    console.log(`\nTagging complete! Successfully tagged ${processedCount} fragments`);
    const totalTimeMinutes = (Date.now() - startTime) / 1000 / 60;
    console.log(`Total time: ${totalTimeMinutes.toFixed(1)} minutes`);
    
  } catch (error) {
    console.error('Error in tagFreudFragments:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  tagFreudFragments()
    .then(() => {
      console.log('Freud fragment tagging completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { tagFreudFragments };