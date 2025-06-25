import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  logger.info('Starting migrations...');
  
  // Create a Supabase client with service role key
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const migrationsDir = path.join(__dirname, '../../supabase/migrations');
  
  try {
    // Get all SQL files from migrations directory
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order

    logger.info(`Found ${files.length} migration files`);

    for (const file of files) {
      if (file === 'DROP_EVERYTHING.sql') {
        logger.info(`Skipping dangerous migration: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      logger.info(`Running migration: ${file}`);
      
      try {
        // Execute the migration
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
          logger.error(`Error running migration ${file}:`, error);
          throw error;
        }
        
        logger.info(`Successfully ran migration: ${file}`);
      } catch (error) {
        logger.error(`Failed to run migration ${file}:`, error);
        throw error;
      }
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations().catch(error => {
  logger.error('Unexpected error:', error);
  process.exit(1);
});