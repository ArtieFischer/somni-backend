# Debug Text Rendering Error in React Native

The error is pointing to line 281 (`<VStack space="xl">`) but the actual issue is likely somewhere inside the VStack. 

## Common Culprits

### 1. Check for Comments
```tsx
// ❌ Wrong - Comments can cause this error
<VStack>
  {/* This is fine */}
  // This will cause an error
  Some text
</VStack>
```

### 2. Check Conditional Rendering
Look for any place where you might have:
```tsx
// ❌ Wrong
{someCondition && 'Loading...'}
{error && error.message}
{count > 0 && `Found ${count} items`}

// ✅ Correct
{someCondition && <Text>Loading...</Text>}
{error && <Text>{error.message}</Text>}
{count > 0 && <Text>Found {count} items</Text>}
```

### 3. Check the DreamThemes Component
Make sure your theme component wraps ALL text:

```tsx
// In your DreamThemes component, check for:
if (themes.length === 0) {
  return null; // This is fine
  // OR
  return <Text>No themes detected</Text>; // Make sure it's wrapped
}
```

### 4. Debug Strategy

Add console.logs to isolate the issue:

```tsx
const renderOverview = () => {
  console.log('=== RENDER OVERVIEW START ===');
  
  return (
    <VStack space="xl">
      {console.log('Before image check')}
      {dream.image_url && (
        <Box borderRadius="$lg">
          {/* image content */}
        </Box>
      )}
      
      {console.log('Before themes check')}
      {dream.embedding_status === 'completed' && (
        <DreamThemes dreamId={dream.id} />
      )}
      
      {console.log('=== RENDER OVERVIEW END ===')}
    </VStack>
  );
};
```

### 5. Temporary Fix to Isolate

Comment out sections to find the problem:

```tsx
const renderOverview = () => (
  <VStack space="xl">
    {/* Comment out everything first */}
    <Text>Test</Text>
    
    {/* Then uncomment one by one */}
    {/* {dream.image_url && (...)} */}
    {/* {dream.embedding_status === 'completed' && (...)} */}
  </VStack>
);
```

### 6. Check After Line 281

The error stack shows line 281, but the issue might be right after. Check:
- Line 282-290 for any bare text
- Any string interpolation without <Text>
- Any number or boolean values rendered directly

### 7. Common React Native Gotchas

```tsx
// Numbers need Text too!
{dream.rating} // ❌ Wrong
<Text>{dream.rating}</Text> // ✅ Correct

// Booleans shouldn't render
{dream.isPublic} // ❌ Wrong (will show true/false)
{dream.isPublic && <Text>Public</Text>} // ✅ Correct

// Empty strings
{dream.description || ''} // ❌ Wrong if empty
<Text>{dream.description || ''}</Text> // ✅ Correct
```

## Quick Solution

Wrap the entire content in a try-catch with Text:

```tsx
const renderOverview = () => {
  try {
    return (
      <VStack space="xl">
        {/* Your content */}
      </VStack>
    );
  } catch (error) {
    return <Text>Error rendering overview</Text>;
  }
};
```

Look for any place where you're rendering:
- Strings directly
- Numbers directly  
- Template literals without <Text>
- Error messages
- Loading states
- Empty states

The error is definitely inside the VStack on line 281 or shortly after!