# Fix ScrollView Text Rendering Error

## The Issue
The error "Text strings must be rendered within a <Text> component" is caused by the ScrollView component having `flex={1}` as a prop.

## The Fix

Replace this:
```tsx
<ScrollView 
  flex={1} 
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
>
```

With this:
```tsx
<ScrollView 
  style={{ flex: 1 }}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
>
```

## Why This Happens
In React Native:
- `ScrollView` doesn't accept `flex` as a direct prop
- Style properties must be passed in the `style` prop as an object
- When React Native sees `flex={1}`, it tries to render it as a child, causing the text error

## Complete Fix for Your Component

Around line 636 in your `DreamDetailScreen.tsx`, change:

```tsx
<ScrollView 
  flex={1} 
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
>
  {renderContent()}
  
  {/* Somni branding for screenshots */}
  {activeTab === 'overview' && (
    // ... rest of your code
  )}
</ScrollView>
```

To:

```tsx
<ScrollView 
  style={{ flex: 1 }}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
>
  {renderContent()}
  
  {/* Somni branding for screenshots */}
  {activeTab === 'overview' && (
    // ... rest of your code
  )}
</ScrollView>
```

## Additional Notes
This is a common mistake when mixing Gluestack UI components (which accept props like `flex={1}`) with native React Native components (which require `style={{ flex: 1 }}`).

Always remember:
- Gluestack components: `flex={1}`, `bg="$primary"`, etc.
- React Native components: `style={{ flex: 1, backgroundColor: 'blue' }}`