# Migrations Applied to Production

## Date: June 29, 2025

### 1. Fixed ElevenLabs Sessions Permissions

**File:** `20250629_fix_elevenlabs_permissions.sql`

**Issues Fixed:**
- Permission denied error when inserting into `elevenlabs_sessions` table
- Missing RLS policy check for INSERT operations

**Changes Applied:**
```sql
-- Fix ElevenLabs sessions INSERT policy
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.elevenlabs_sessions;

CREATE POLICY "Users can insert own sessions" ON public.elevenlabs_sessions
FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

-- Ensure proper permissions on dreams table
GRANT SELECT ON public.dreams TO authenticated;

-- Also ensure RLS is enabled on elevenlabs_sessions table
ALTER TABLE public.elevenlabs_sessions ENABLE ROW LEVEL SECURITY;
```

### 2. Shared Dreams Table (If Applied)

**File:** `20250629_shared_dreams.sql`

**Purpose:** Create table for dream sharing functionality

**Changes:**
```sql
-- Create shared_dreams table
CREATE TABLE IF NOT EXISTS public.shared_dreams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    share_id TEXT UNIQUE NOT NULL,
    dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_anonymous BOOLEAN DEFAULT false,
    display_name TEXT,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unshared_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_shared_dreams_share_id ON public.shared_dreams(share_id);
CREATE INDEX idx_shared_dreams_dream_id ON public.shared_dreams(dream_id);
CREATE INDEX idx_shared_dreams_user_id ON public.shared_dreams(user_id);
CREATE INDEX idx_shared_dreams_active ON public.shared_dreams(is_active, shared_at DESC);

-- Enable RLS
ALTER TABLE public.shared_dreams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own shared dreams" ON public.shared_dreams
FOR ALL TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active shared dreams" ON public.shared_dreams
FOR SELECT TO public
USING (is_active = true);
```

## Notes

1. **Emotions Field:** 
   - Initially thought to add `emotions` column to `dreams` table
   - Not needed - emotions are properly extracted from `interpretations.emotional_tone` JSONB field
   - The `emotional_tone` structure: `{primary: "anxiety", secondary: "fear", intensity: 0.8}`

2. **Server Configuration Fixed:**
   - Added ElevenLabs router registration to `server-with-websocket.ts`
   - Added missing environment variables to config validation

3. **Current Status:**
   - ✅ ElevenLabs conversation initialization working
   - ✅ Proper permissions on all tables
   - ✅ Emotions correctly extracted from interpretations
   - ✅ Dream sharing endpoints available

## Environment Variables Required

Make sure these are set in Railway:
- `JWT_SECRET`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID_JUNG`
- `ELEVENLABS_AGENT_ID_FREUD`
- `ELEVENLABS_AGENT_ID_LAKSHMI`
- `ELEVENLABS_AGENT_ID_MARY`