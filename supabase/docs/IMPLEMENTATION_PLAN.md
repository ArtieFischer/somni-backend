# Implementation Plan - Step by Step

## Phase 1: Database Setup (Backend First) 🗄️

### Step 1: Backup Current Data (Optional)
If you have any test data you want to keep:
```sql
-- In Supabase SQL Editor
-- Export any data you want to keep
SELECT * FROM dreams;
SELECT * FROM auth.users;
```

### Step 2: Drop Everything and Start Fresh ⚠️
```sql
-- In Supabase SQL Editor
-- This will DELETE EVERYTHING - make sure you're ready!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Step 3: Run the New Schema
1. Go to Supabase SQL Editor
2. Copy entire contents of `supabase/migrations/000_initial_schema.sql`
3. Paste and run it
4. You should see all tables created successfully

### Step 4: Verify Schema Creation
```sql
-- Check all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should see:
-- conversations, dream_images, dream_themes, dreams, 
-- interpretations, interpreters, knowledge_base, 
-- messages, profiles, themes, transcription_usage

-- Check interpreters were inserted
SELECT * FROM interpreters;
-- Should see Carl, Sigmund, Lakshmi, Mary

-- Check storage buckets
SELECT * FROM storage.buckets;
-- Should see avatars, interpreters, dream-images
```

## Phase 2: Deploy Edge Functions 🚀

### Step 5: Deploy Edge Functions
```bash
# In your backend directory
cd /Users/gole/Desktop/somni/somni-backend/somni-backend

# Deploy each function
supabase functions deploy embed-dream --project-ref your-project-ref
supabase functions deploy embed-themes --project-ref your-project-ref
supabase functions deploy dreams-transcribe-init --project-ref your-project-ref
```

### Step 6: Test Edge Functions
```bash
# Test embed-themes function with a simple theme
curl -X POST https://your-project.supabase.co/functions/v1/embed-themes \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"themes": [{"code": "test", "label": "Test Theme"}]}'
```

### Step 7: Seed Dream Themes
```bash
# First, update the script with your Supabase credentials
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# Run the seeding script
npx ts-node supabase/scripts/seed-themes.ts
```

### Step 8: Verify Themes
```sql
-- Check themes were created with embeddings
SELECT code, label, 
       CASE WHEN embedding IS NOT NULL THEN 'Yes' ELSE 'No' END as has_embedding
FROM themes
ORDER BY code;
```

## Phase 3: Frontend Adjustments 🎨

### Step 9: Update Onboarding Process
The onboarding now needs to handle:
1. **Location permission** (new step)
2. **Profile creation** with new fields

#### New Onboarding Flow:
1. Email/Password → Creates auth.users entry
2. Basic Info (handle, username, sex, birth_date)
3. **NEW: Location Step**
   - Option A: Share precise location (GPS)
   - Option B: Select country/city from dropdown
   - Option C: Skip (privacy-first)
4. Dream Interpreter Selection
5. Sleep improvement questions
6. Complete → Set `onboarding_complete = true`

### Step 10: Frontend Changes Needed

#### A. Update User Types
```typescript
// types/user.ts
interface UserProfile {
  user_id: string;
  handle: string;  // NEW: unique @username
  username: string | null;  // display name
  sex: 'male' | 'female' | 'other' | 'unspecified';
  birth_date: string | null;
  avatar_url: string | null;
  locale: string;
  dream_interpreter: string | null;
  is_premium: boolean;
  onboarding_complete: boolean;
  
  // NEW location fields
  location?: { lat: number; lng: number };
  location_accuracy: 'none' | 'country' | 'city' | 'exact';
  location_country?: string;
  location_city?: string;
  
  settings: {
    location_sharing: 'none' | 'country' | 'city' | 'exact';
    sleep_schedule?: any;
    improve_sleep_quality?: boolean;
    interested_in_lucid_dreaming?: boolean;
  };
}
```

#### B. Add Location Step Component
```typescript
// components/onboarding/LocationStep.tsx
// - Request location permission
// - Fallback to country/city selection
// - Privacy-first with skip option
```

#### C. Update Profile Creation
```typescript
// When creating profile after auth signup
const { error } = await supabase
  .from('profiles')
  .insert({
    user_id: user.id,
    handle: handle, // Must be unique!
    username: displayName,
    sex: sex,
    birth_date: birthDate,
    locale: navigator.language || 'en',
    settings: {
      location_sharing: locationPreference,
      // ... other settings
    }
  });
```

#### D. Update Dream Creation
```typescript
// When creating a dream, include location if permitted
const dreamData = {
  user_id: user.id,
  raw_transcript: transcript,
  location: userAllowsLocation ? currentLocation : null,
  location_accuracy: locationAccuracy,
  // ... other fields
};
```

## Phase 4: Backend Service Updates 🔧

### Step 11: Update Backend Services
1. Update `SupabaseService` to use new tables
2. Add methods for profile management
3. Update dream creation to call embed-dream function

### Step 12: Test Everything
1. Create a new user account
2. Go through updated onboarding
3. Create a dream
4. Verify:
   - Profile created correctly
   - Dream saved with location (if permitted)
   - Embedding generated
   - Themes extracted

## Order of Implementation 📋

### Do This Order:
1. **First**: Database migration (Steps 1-4) ✅
2. **Second**: Deploy edge functions (Steps 5-6) ✅
3. **Third**: Seed themes (Steps 7-8) ✅
4. **Fourth**: Update frontend onboarding (Steps 9-10) 🔄
5. **Last**: Test full flow (Step 12) 🧪

### Why This Order:
- Backend must be ready before frontend changes
- Edge functions needed for theme seeding
- Themes must exist before dreams can use them
- Frontend changes last to avoid breaking current users

## Quick Start Commands 🚀

```bash
# 1. Reset database (in Supabase SQL editor)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

# 2. Run migration (paste 000_initial_schema.sql in SQL editor)

# 3. Deploy functions
supabase functions deploy embed-dream --project-ref YOUR_REF
supabase functions deploy embed-themes --project-ref YOUR_REF

# 4. Seed themes
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
npx ts-node supabase/scripts/seed-themes.ts
```

## Need Help? 🤔

Common issues:
- **PostGIS not enabled**: Make sure CREATE EXTENSION postgis runs
- **Edge functions fail**: Check service role key is set
- **Themes not seeding**: Verify edge function deployed correctly
- **Auth issues**: Make sure RLS policies are created

Start with Phase 1 and let me know when you've reset the database!