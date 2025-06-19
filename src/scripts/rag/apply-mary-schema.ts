import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';

async function applyMarySchema() {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  try {
    // First, let's check if the constraint exists
    const { data: _constraints, error: constraintError } = await supabase
      .rpc('get_constraints', { table_name: 'knowledge_base' })
      .single();

    if (constraintError) {
      console.log('Could not fetch constraints, attempting to update constraint...');
    }

    // Drop the existing constraint if it exists
    const dropConstraintSQL = `
      ALTER TABLE knowledge_base 
      DROP CONSTRAINT IF EXISTS valid_interpreter;
    `;

    const { error: dropError } = await supabase.rpc('exec_sql', { 
      sql: dropConstraintSQL 
    });

    if (dropError) {
      console.log('Note: Could not drop constraint (might not exist):', dropError.message);
    }

    // Add the updated constraint
    const addConstraintSQL = `
      ALTER TABLE knowledge_base 
      ADD CONSTRAINT valid_interpreter CHECK (
        interpreter_type IN ('jung', 'freud', 'mary', 'universal')
      );
    `;

    const { error: addError } = await supabase.rpc('exec_sql', { 
      sql: addConstraintSQL 
    });

    if (addError) {
      // If direct SQL execution fails, let's try a different approach
      console.log('Direct SQL execution not available. Please run this SQL manually:');
      console.log('\n--- SQL to execute ---');
      console.log(dropConstraintSQL);
      console.log(addConstraintSQL);
      console.log('--- End SQL ---\n');
      
      console.log('Alternatively, you can run the full schema file:');
      console.log('src/scripts/sql/01-knowledge-base-schema.sql');
      
      return;
    }

    console.log('✅ Successfully updated knowledge_base constraint to include "mary"');

  } catch (error) {
    console.error('Error updating schema:', error);
    console.log('\nPlease ensure the knowledge_base table constraint includes "mary".');
    console.log('You may need to run the SQL schema file manually through your database interface.');
  }
}

// Run the schema update
if (require.main === module) {
  applyMarySchema()
    .then(() => {
      console.log('Schema update process complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}