# Somni Database Restructure Documentation

## Overview
This document tracks the production-ready database restructuring process for the Somni backend. We are consolidating all Supabase-related files into a single `supabase/` directory and implementing a cleaner, more maintainable database schema.

## Current State Analysis

### Existing Tables
1. **users_profile** - Extended user profile with:
   - Basic info (username, display_name, avatar_url)
   - Subscription status (is_premium)
   - Onboarding status
   - Demographics (sex, date_of_birth, language)
   - Dream interpreter preference
   - Sleep improvement preferences
   - JSON fields for sleep_schedule and lucid_dream_settings

2. **dreams** - Core dream entries with:
   - Transcriptions (raw and refined)
   - Audio storage
   - Sleep phase tracking
   - Mood tracking
   - Vector embeddings for semantic search

3. **dream_interpreters** - Static interpreter profiles
4. **knowledge_base** - RAG knowledge storage
5. **transcription_usage** - Usage tracking

### Issues with Current Structure
- User profile table mixes concerns (demographics, preferences, settings)
- Text-based enums instead of proper PostgreSQL enums
- Inconsistent naming conventions
- Missing proper foreign key relationships for interpreter preference
- No clear separation between user data and app configuration

## New Profiles Table Design

### Key Improvements
1. **Proper PostgreSQL Enums** - Using native enum types for better type safety
2. **Clean Foreign Keys** - Proper relationship to interpreters table
3. **Structured JSON Schema** - Clear documentation of settings field structure
4. **Better Column Organization** - Logical grouping of related fields
5. **Consistent Naming** - Following PostgreSQL conventions

### Migration Strategy
1. Create new `profiles` table with improved schema
2. Migrate data from `users_profile` to `profiles`
3. Update all code references
4. Drop old `users_profile` table
5. Update RLS policies

### Implementation Steps
1. ✅ Analyze current database structure
2. ✅ Create supabase directory structure
3. 🔄 Document new schema design
4. ⏳ Create migration for new profiles table
5. ⏳ Update TypeScript types
6. ⏳ Update service layer code
7. ⏳ Migrate existing data
8. ⏳ Update RLS policies
9. ⏳ Clean up old tables

## New Schema: Profiles Table

```sql
-- Enum for biological sex
CREATE TYPE sex_enum AS ENUM ('male', 'female', 'other', 'unspecified');

-- Main profiles table
CREATE TABLE profiles (
    user_id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    handle             text        NOT NULL UNIQUE,
    username           text,
    sex                sex_enum    NOT NULL DEFAULT 'unspecified',
    birth_date         date,
    avatar_url         text,
    locale             varchar(10) NOT NULL DEFAULT 'en',
    dream_interpreter  uuid REFERENCES interpreters(id),
    is_premium         boolean     NOT NULL DEFAULT false,
    onboarding_complete boolean    NOT NULL DEFAULT false,
    settings           jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);
```

### Settings JSON Structure
```json
{
  "sleep_schedule": {
    "bed": "23:30",
    "wake": "07:00",
    "tz": "Europe/Warsaw"
  },
  "improve_sleep_quality": true,
  "interested_in_lucid_dreaming": false,
  "_v": 1
}
```

### Key Design Decisions
1. **handle vs username**: `handle` is the unique identifier (@handle), while `username` is the display name
2. **locale**: Using RFC 5646 language tags for proper i18n support
3. **settings**: Flexible JSONB field for future expansion without schema changes
4. **birth_date**: Separate date field instead of storing in JSON for better querying
5. **dream_interpreter**: Proper FK to interpreters table instead of text enum

## Fresh Start Implementation

Since we're at MVP stage, we're doing a complete fresh start with a clean database structure.

### Database Reset Steps

1. **Drop all existing tables**
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```

2. **Run the initial schema**
   ```sql
   -- Run migrations/000_initial_schema.sql in Supabase SQL editor
   ```

3. **Verify the setup**
   ```sql
   -- Check all tables
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   
   -- Check interpreters were inserted
   SELECT * FROM interpreters;
   
   -- Check storage buckets
   SELECT * FROM storage.buckets;
   ```

### What Gets Created

1. **Tables**
   - `profiles` - Clean user profile structure
   - `dreams` - Dream entries with all features
   - `interpreters` - The 4 dream interpreters
   - `transcription_usage` - Usage tracking

2. **Storage Buckets**
   - `avatars` - User profile pictures
   - `interpreters` - Interpreter images  
   - `dream-images` - Dream-generated images

3. **Security**
   - RLS policies for all tables
   - Storage policies for all buckets
   - Proper service role access

4. **Features**
   - Realtime enabled on dreams table
   - Vector embeddings for semantic search
   - Automatic updated_at timestamps
   - User creation trigger

## Next Steps
- ✅ Review and approve the new schema
- ✅ Create migration script
- ⏳ Update TypeScript types
- ⏳ Update service layer code
- ⏳ Test in staging environment
- ⏳ Run migration in production
- ⏳ Monitor for issues
- ⏳ Clean up old tables