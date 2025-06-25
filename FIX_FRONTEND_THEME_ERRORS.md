# Fix Frontend Theme Errors

## Issue 1: Authentication Error (401)

The backend is receiving the token but not recognizing it as a user token. The issue is in the backend auth middleware.

### Backend Fix

Check `/src/middleware/auth.ts`. The `authenticateRequest` middleware is checking for user token, but the endpoint needs to handle it properly:

```typescript
// In src/routes/dreamEmbedding.ts, the route uses:
router.get('/themes/:dreamId', authenticateRequest, async (req: Request, res: Response) => {
```

The error "Unauthorized - User token required" suggests the middleware is not properly extracting the user from the token.

### Quick Fix - Use Supabase Directly

Since you're already using Supabase auth on the frontend, query Supabase directly instead of the backend API:

```typescript
// In your useDreamThemes hook, replace the fetch with:
const fetchThemes = async () => {
  setLoading(true);
  setError(null);

  try {
    // Direct Supabase query
    const { data, error: supabaseError } = await supabase
      .rpc('get_dream_themes', {
        p_dream_id: dreamId,
        p_min_similarity: 0.5
      });

    if (supabaseError) throw supabaseError;
    
    setThemes(data || []);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load themes');
  } finally {
    setLoading(false);
  }
};
```

## Issue 2: Text Rendering Error

In React Native (which you're using for mobile), all text must be wrapped in `<Text>` components.

### Find the Error

Look at line 281 in `DreamDetailScreen.tsx`. There's likely bare text somewhere. Common causes:

```tsx
// ❌ Wrong - bare text
<VStack>
  Some text here
</VStack>

// ✅ Correct - wrapped in Text
<VStack>
  <Text>Some text here</Text>
</VStack>
```

### Common Places to Check

1. **Conditional rendering**:
```tsx
// ❌ Wrong
{condition && 'Some text'}

// ✅ Correct
{condition && <Text>Some text</Text>}
```

2. **Array mapping**:
```tsx
// ❌ Wrong
{items.map(item => item.name)}

// ✅ Correct
{items.map(item => <Text key={item.id}>{item.name}</Text>)}
```

3. **Theme display component**:
```tsx
// For themes, make sure all text is wrapped:
{themes.map((theme) => (
  <Box key={theme.code}>
    <Text>{theme.name}</Text>
    <Text>{Math.round(theme.similarity * 100)}%</Text>
  </Box>
))}
```

## Complete Working Example for Mobile

Here's a complete theme component for React Native:

```tsx
import { Box, VStack, HStack, Text, Spinner } from '@gluestack-ui/components';
import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';

interface Theme {
  code: string;
  name: string;
  description: string;
  similarity: number;
}

export function DreamThemes({ dreamId }: { dreamId: string }) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchThemes();
  }, [dreamId]);

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_dream_themes', {
          p_dream_id: dreamId,
          p_min_similarity: 0.5
        });

      if (error) throw error;
      setThemes(data || []);
    } catch (err) {
      console.error('Error fetching themes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box p="$4">
        <Spinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="$4">
        <Text color="$red500">Failed to load themes</Text>
      </Box>
    );
  }

  if (themes.length === 0) {
    return (
      <Box p="$4">
        <Text color="$gray500">No themes detected</Text>
      </Box>
    );
  }

  return (
    <VStack space="md" p="$4">
      <Text fontSize="$lg" fontWeight="$semibold">Themes</Text>
      <HStack flexWrap="wrap" space="sm">
        {themes.map((theme) => (
          <Box
            key={theme.code}
            bg="$indigo100"
            px="$3"
            py="$1"
            borderRadius="$full"
            mb="$2"
          >
            <HStack space="xs" alignItems="center">
              <Text color="$indigo800" fontSize="$sm">
                {theme.name}
              </Text>
              <Text color="$indigo600" fontSize="$xs">
                {Math.round(theme.similarity * 100)}%
              </Text>
            </HStack>
          </Box>
        ))}
      </HStack>
    </VStack>
  );
}
```

## Integration in DreamDetailScreen

Add this to your overview section:

```tsx
const renderOverview = () => (
  <VStack space="xl">
    {/* ... other content ... */}
    
    {/* Add themes section */}
    {dream.embedding_status === 'completed' && (
      <DreamThemes dreamId={dream.id} />
    )}
    
    {dream.embedding_status === 'pending' && (
      <Box p="$4">
        <Text color="$gray500">Analyzing dream themes...</Text>
      </Box>
    )}
  </VStack>
);
```

This approach:
1. Uses Supabase directly (avoiding auth issues)
2. Properly wraps all text in `<Text>` components
3. Handles loading and error states
4. Works with React Native/Gluestack UI