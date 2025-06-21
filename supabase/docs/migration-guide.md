# Migration Guide: Fresh Start

## Overview

This guide helps you transition from the old database structure to the new comprehensive schema.

## Steps for Fresh Start

### 1. Backup Current Data (if needed)
If you have any data you want to preserve, export it first:
```sql
-- Export users
COPY (SELECT * FROM users_profile) TO '/tmp/users_backup.csv' CSV HEADER;

-- Export dreams
COPY (SELECT * FROM dreams) TO '/tmp/dreams_backup.csv' CSV HEADER;
```

### 2. Clear Everything
```sql
-- Drop all tables and start fresh
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### 3. Run New Schema
Execute the contents of `migrations/000_initial_schema.sql` in your Supabase SQL editor.

### 4. Deploy Edge Functions
```bash
# Deploy embedding functions
supabase functions deploy embed-dream
supabase functions deploy embed-themes
supabase functions deploy dreams-transcribe-init
```

### 5. Initialize Theme Embeddings
Create a script to populate your themes:
```javascript
const themes = [
  { code: 'falling', label: 'Falling', description: 'Dreams about falling or losing control' },
  { code: 'flying', label: 'Flying', description: 'Dreams about flying or floating' },
  { code: 'being_chased', label: 'Being Chased', description: 'Dreams about being pursued' },
  // ... add all your themes
];

// Call the embed-themes edge function
const response = await fetch('https://your-project.supabase.co/functions/v1/embed-themes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ themes })
});
```

### 6. Update Application Code

#### Update imports:
```typescript
// Old
import { DreamRecord } from './types';

// New
import { Dream, Profile, Theme } from '@/supabase/types/database.types';
```

#### Update table references:
- `users_profile` → `profiles`
- `id` (in users) → `user_id`
- `username` → `handle` (for unique identifier)
- `display_name` → `username` (for display)

#### Update embedding dimensions:
- Old: 1536 (OpenAI)
- New: 384 (MiniLM)

### 7. Update Environment Variables
Ensure these are set for edge functions:
```env
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## Key Changes

### 1. User Profiles
- Added location tracking with privacy controls
- Added `handle` as unique identifier
- Settings now in structured JSON

### 2. Dreams
- Removed image columns (now in dream_images table)
- Added location for heatmap
- Changed embedding size to 384

### 3. New Tables
- `dream_images` - Multiple images per dream
- `themes` & `dream_themes` - Structured theme system
- `interpretations` - Separate interpretation storage
- `conversations` & `messages` - Future chat feature

### 4. Embeddings
- Now using MiniLM (384-dim) via edge functions
- No external API costs
- Faster processing

## Testing Checklist

After migration, test:
- [ ] User registration creates profile
- [ ] Dream creation works
- [ ] Embeddings are generated
- [ ] Themes are extracted
- [ ] Images can be uploaded
- [ ] Real-time updates work
- [ ] RLS policies are correct

## Rollback Plan

If issues occur:
1. Keep backup of old schema
2. Can recreate old tables alongside new ones
3. Run both schemas in parallel during transition

## Support

For issues:
1. Check Supabase logs
2. Verify edge function deployment
3. Check RLS policies
4. Ensure all extensions are enabled (postgis, vector)