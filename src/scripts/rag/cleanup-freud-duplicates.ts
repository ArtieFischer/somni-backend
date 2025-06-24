import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function cleanupFreudDuplicates() {
  console.log('Starting cleanup of duplicate Freud fragment-theme entries...');
  
  try {
    // Get all Freud fragments
    const { data: fragments, error: fragmentsError } = await supabase
      .from('knowledge_fragments')
      .select('id')
      .eq('interpreter', 'freud')
      .order('id');
    
    if (fragmentsError) throw fragmentsError;
    console.log(`Found ${fragments?.length || 0} Freud fragments`);
    
    let totalDuplicates = 0;
    let processedFragments = 0;
    
    // Process each fragment to find and remove duplicates
    for (const fragment of fragments || []) {
      // Get all theme associations for this fragment
      const { data: themes, error: themesError } = await supabase
        .from('fragment_themes')
        .select('id, theme_code, similarity, created_at')
        .eq('fragment_id', fragment.id)
        .order('theme_code')
        .order('created_at');
      
      if (themesError) throw themesError;
      
      if (!themes || themes.length === 0) continue;
      
      // Group by theme_code to find duplicates
      const themeGroups = new Map<string, typeof themes>();
      
      for (const theme of themes) {
        if (!themeGroups.has(theme.theme_code)) {
          themeGroups.set(theme.theme_code, []);
        }
        themeGroups.get(theme.theme_code)!.push(theme);
      }
      
      // Remove duplicates, keeping the one with highest similarity or earliest created_at
      for (const [themeCode, themeList] of themeGroups) {
        if (themeList.length > 1) {
          // Sort by similarity (descending) then by created_at (ascending)
          themeList.sort((a, b) => {
            if (a.similarity !== b.similarity) {
              return b.similarity - a.similarity;
            }
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
          
          // Keep the first one, delete the rest
          const toDelete = themeList.slice(1).map(t => t.id);
          
          if (toDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('fragment_themes')
              .delete()
              .in('id', toDelete);
            
            if (deleteError) {
              console.error(`Error deleting duplicates for fragment ${fragment.id}:`, deleteError);
            } else {
              totalDuplicates += toDelete.length;
              console.log(`Removed ${toDelete.length} duplicates for fragment ${fragment.id}, theme ${themeCode}`);
            }
          }
        }
      }
      
      processedFragments++;
      if (processedFragments % 100 === 0) {
        console.log(`Processed ${processedFragments}/${fragments.length} fragments...`);
      }
    }
    
    console.log(`\nCleanup complete!`);
    console.log(`Total duplicates removed: ${totalDuplicates}`);
    console.log(`Fragments processed: ${processedFragments}`);
    
  } catch (error) {
    console.error('Error in cleanupFreudDuplicates:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  cleanupFreudDuplicates()
    .then(() => {
      console.log('Freud duplicates cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { cleanupFreudDuplicates };