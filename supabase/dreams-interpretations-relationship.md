# Dreams & Interpretations Relationship Documentation

## Overview
This document explains the relationship between dreams and their interpretations in the Somni backend system.

## Database Schema Relationships

```
dreams (1) -----> (n) interpretations
  |                        |
  |                        v
  |                   interpreters (n)
  |
  v
users/profiles
```

## Key Points

### 1. One Dream, Multiple Interpretations
- Each dream can have multiple interpretations from different interpreters
- A dream can be re-interpreted by the same interpreter (versioning)
- Unique constraint: `(dream_id, interpreter_type, version)`

### 2. Data Flow

```
1. Audio Recording → Transcription Service
                        ↓
2. dreams table (transcription stored)
                        ↓
3. Dream Interpretation Service
                        ↓
4. interpretations table (interpretation stored)
```

### 3. Current Backend Issue

**Problem**: The backend successfully generates interpretations but doesn't save them to the database.

**Location**: `src/dream-interpretation/api/dream-interpretation.controller.ts`

**What happens now**:
```typescript
// Interpretation is generated
const result = await interpreterService.interpret(requestData);

// Response is sent to client
res.json({ success: true, data: result.data });

// ❌ MISSING: Save to database
```

**What should happen**:
```typescript
// Interpretation is generated
const result = await interpreterService.interpret(requestData);

// ✅ Save to database
await saveInterpretationToDatabase(result.data);

// Response is sent to client
res.json({ success: true, data: result.data });
```

## Required Code Changes

### 1. Add Import
```typescript
import { supabaseService } from '../../services/supabase';
```

### 2. Add Save Function
```typescript
async function saveInterpretationToDatabase(
  dreamId: string,
  userId: string,
  interpreterType: string,
  interpretationData: any
) {
  const { data, error } = await supabaseService
    .getServiceClient()
    .from('interpretations')
    .insert({
      dream_id: dreamId,
      user_id: userId,
      interpreter_type: interpreterType,
      interpretation_summary: interpretationData.condensedInterpretation || '',
      full_response: interpretationData,
      dream_topic: interpretationData.dreamTopic || '',
      quick_take: interpretationData.quickTake || '',
      symbols: interpretationData.symbols || [],
      emotional_tone: interpretationData.emotionalTone || null,
      primary_insight: interpretationData.primaryInsight || null,
      key_pattern: interpretationData.keyPattern || null,
      knowledge_fragments_used: interpretationData.knowledgeFragmentsUsed || 0,
      total_fragments_retrieved: interpretationData.totalFragmentsRetrieved || 0,
      fragment_ids_used: interpretationData.fragmentIdsUsed || [],
      processing_time_ms: interpretationData.processingTimeMs || null,
      model_used: interpretationData.modelUsed || 'gpt-4o'
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to save interpretation', { error, dreamId, interpreterType });
    // Handle unique constraint violation
    if (error.code === '23505') {
      // Update existing interpretation
      const { data: updated, error: updateError } = await supabaseService
        .getServiceClient()
        .from('interpretations')
        .update({
          interpretation_summary: interpretationData.condensedInterpretation || '',
          full_response: interpretationData,
          updated_at: new Date().toISOString()
        })
        .eq('dream_id', dreamId)
        .eq('interpreter_type', interpreterType)
        .eq('version', 1)
        .select()
        .single();
    }
  }

  return { data, error };
}
```

### 3. Update Controller Method
In the `interpretDreamById` method, after successful interpretation:

```typescript
if (result.success && result.data) {
  // Save to database
  const { data: savedInterpretation, error: saveError } = 
    await saveInterpretationToDatabase(
      requestData.dreamId,
      userId,
      requestData.interpreterType,
      result.data
    );

  if (saveError) {
    logger.error('Failed to save interpretation', { saveError });
  }

  // Continue with response...
  res.status(200).json({
    success: true,
    data: {
      interpretation: result.data,
      // ... rest of response
    }
  });
}
```

## Testing the Fix

1. Generate a new interpretation through the API
2. Check the database:
```sql
SELECT * FROM interpretations 
WHERE dream_id = 'your-dream-id'
ORDER BY created_at DESC;
```

3. Verify all fields are populated correctly

## Future Improvements

1. **Batch Interpretations**: Allow requesting multiple interpreters at once
2. **Interpretation Comparison**: Add endpoints to compare interpretations
3. **Favorites**: Allow users to mark favorite interpretations
4. **Sharing**: Generate shareable links for interpretations
5. **Export**: Allow exporting interpretations as PDF/image