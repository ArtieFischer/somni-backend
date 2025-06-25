# Debugging "Failed to Fetch Themes" on Frontend

## Common Reasons and Solutions

### 1. **Authentication Headers Missing**
The backend requires both JWT token and API secret.

**Check in browser DevTools Network tab:**
```javascript
// Required headers
{
  'Authorization': 'Bearer <supabase-jwt-token>',
  'X-API-Secret': '<your-api-secret>'
}
```

**Fix:**
```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/dream-embeddings/themes/${dreamId}`,
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'X-API-Secret': process.env.NEXT_PUBLIC_API_SECRET!,
      'Content-Type': 'application/json',
    },
  }
);
```

### 2. **Environment Variables Not Set**
Check your `.env.local`:
```bash
NEXT_PUBLIC_BACKEND_URL=https://somni-backend-production.up.railway.app
NEXT_PUBLIC_API_SECRET=your-actual-secret-here
```

**Debug:**
```typescript
console.log('Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
console.log('API Secret exists:', !!process.env.NEXT_PUBLIC_API_SECRET);
```

### 3. **CORS Issues**
Backend might be blocking frontend origin.

**Check backend CORS config** (`src/server.ts`):
```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
  credentials: true,
}));
```

### 4. **Dream Ownership Issue**
User might not own the dream they're trying to fetch themes for.

**Debug SQL:**
```sql
-- Check dream ownership
SELECT id, user_id, embedding_status 
FROM dreams 
WHERE id = 'your-dream-id';
```

### 5. **No Themes Extracted**
Dream might not have any themes (similarity too low).

**Check in database:**
```sql
-- Check if themes exist
SELECT * FROM dream_themes 
WHERE dream_id = 'your-dream-id';
```

### 6. **Wrong Dream ID Format**
Ensure dreamId is a valid UUID.

**Validate:**
```typescript
const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dreamId);
```

## Quick Debug Script

Add this to your component to debug:

```typescript
const debugFetchThemes = async (dreamId: string) => {
  console.log('=== Debug Theme Fetch ===');
  console.log('Dream ID:', dreamId);
  console.log('Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
  console.log('API Secret exists:', !!process.env.NEXT_PUBLIC_API_SECRET);
  
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Session exists:', !!session);
  console.log('Access token exists:', !!session?.access_token);
  
  try {
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/dream-embeddings/themes/${dreamId}`;
    console.log('Request URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'X-API-Secret': process.env.NEXT_PUBLIC_API_SECRET!,
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const text = await response.text();
    console.log('Response body:', text);
    
    if (!response.ok) {
      console.error('Request failed:', response.status, text);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
};
```

## Using Supabase Directly (Alternative)

If the API isn't working, try querying Supabase directly:

```typescript
const fetchThemesDirectly = async (dreamId: string) => {
  // First check if user owns the dream
  const { data: dream } = await supabase
    .from('dreams')
    .select('id, user_id')
    .eq('id', dreamId)
    .single();
  
  if (!dream) {
    throw new Error('Dream not found');
  }
  
  // Then get themes using the RPC function
  const { data, error } = await supabase
    .rpc('get_dream_themes', {
      p_dream_id: dreamId,
      p_min_similarity: 0.5
    });
  
  if (error) throw error;
  return data;
};
```

## Common Error Messages and Meanings

- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User doesn't own the dream
- **404 Not Found**: Dream doesn't exist or wrong endpoint
- **500 Internal Server Error**: Backend error (check logs)
- **CORS error**: Frontend domain not allowed by backend

## Test with cURL

Test if the endpoint works at all:

```bash
curl -X GET \
  "https://somni-backend-production.up.railway.app/api/v1/dream-embeddings/themes/YOUR_DREAM_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-API-Secret: YOUR_API_SECRET"
```

Let me know what error you're seeing in the browser console/network tab!