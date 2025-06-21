# Code Migration Checklist

## Changes Made

### ✅ Fixed: Image Handling
**File**: `src/services/supabase.ts`
- Updated `updateDreamImage` method to use new `dream_images` table
- Now properly inserts images into separate table instead of updating dreams table

### ✅ Fixed: TypeScript Types
**File**: `src/types/index.ts`
- Removed `image_url` and `image_prompt` from `DreamRecord` interface
- Added comment about new types location

### ✅ Fixed: SQL Path Reference
**File**: `src/scripts/rag/apply-mary-schema.ts`
- Updated reference to point to new schema location

## Remaining Considerations

### 1. Profile Table Usage
The codebase doesn't seem to use the `profiles` table directly. Current code only references:
- `auth.users` for authentication
- `dreams` table for dream data

Consider implementing profile-related features:
- User profile management
- Location preferences
- Dream interpreter selection

### 2. Type Migration
Currently using local `DreamRecord` interface. Consider migrating to comprehensive types:
```typescript
// Old
import { DreamRecord } from './types';

// New
import { Dream, Profile, Theme } from '@/supabase/types/database.types';
```

### 3. New Features to Implement
Based on new schema, you can now implement:
- **Multiple images per dream**: Update UI to handle dream_images table
- **Theme extraction**: Use embed-dream edge function
- **Location tracking**: Add location to dream creation
- **Interpretations**: Store in separate table instead of inline

### 4. Service Updates Needed
The `SupabaseService` class could be extended with:
```typescript
// Get all images for a dream
async getDreamImages(dreamId: string): Promise<DreamImage[]>

// Get user profile
async getUserProfile(userId: string): Promise<Profile>

// Update user location preferences
async updateUserLocation(userId: string, location: LocationData)

// Get dream themes
async getDreamThemes(dreamId: string): Promise<DreamTheme[]>
```

### 5. Edge Function Integration
Update dream creation flow to call edge functions:
```typescript
// After creating dream
await fetch(`${SUPABASE_URL}/functions/v1/embed-dream`, {
  method: 'POST',
  headers: { /* auth */ },
  body: JSON.stringify({ 
    dream_id: dreamId,
    transcript: rawTranscript,
    extract_themes: true 
  })
});
```

## No Other Old References Found
- ✅ No references to "users_profile" table
- ✅ No references to 1536-dim embeddings
- ✅ No references to old column names
- ✅ All imports use correct paths