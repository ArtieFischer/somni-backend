# Shared Dreams Table

## Overview
The `shared_dreams` table manages the public sharing functionality for dreams, allowing users to share their dreams either anonymously or with their name visible to other users.

## Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier for the share |
| dream_id | uuid | NOT NULL, FK(dreams) | Reference to the shared dream |
| user_id | uuid | NOT NULL, FK(auth.users) | Dream owner |
| is_anonymous | boolean | NOT NULL DEFAULT false | Whether to hide user identity |
| display_name | text | | Custom display name when not anonymous |
| is_active | boolean | NOT NULL DEFAULT true | Whether sharing is currently active |
| shared_at | timestamptz | NOT NULL DEFAULT now() | When the dream was first shared |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last update timestamp |

## Unique Constraints
- `(dream_id, user_id)` - Ensures a dream can only be shared once per user

## Indexes
- `idx_shared_dreams_dream_id` - Quick lookup by dream
- `idx_shared_dreams_user_id` - User's shared dreams
- `idx_shared_dreams_active` - Active shares only (partial index)
- `idx_shared_dreams_shared_at` - Chronological ordering of active shares

## Relationships
- **Belongs to**: 
  - `dreams` (via dream_id)
  - `auth.users` (via user_id)

## Triggers
- `update_shared_dreams_updated_at` - Updates `updated_at` timestamp

## RLS Policies
- **Anyone can view active shared dreams** - Public read access for active shares
- **Users can share their own dreams** - Users can only share dreams they own
- **Users can update their own shared dreams** - Full control over own shares
- **Users can delete their own shared dreams** - Can remove own shares
- **Service role has full access** - Backend operations

## Functions

### share_dream
Shares a dream with specified privacy settings.

```sql
SELECT share_dream(
  p_dream_id := 'dream-uuid',
  p_is_anonymous := false,
  p_display_name := 'Optional Custom Name'
);
```

### unshare_dream
Stops sharing a dream (sets is_active to false).

```sql
SELECT unshare_dream('dream-uuid');
```

### get_public_shared_dreams
Retrieves all publicly shared dreams with details.

```sql
SELECT * FROM get_public_shared_dreams(
  limit_count := 50,
  offset_count := 0
);
```

Returns:
- `share_id` - Share record ID
- `dream_id` - Dream ID
- `dream_title` - Dream title
- `dream_transcript` - Full transcript
- `dream_created_at` - When dream was created
- `mood` - Dream mood rating
- `clarity` - Dream clarity rating
- `is_anonymous` - Anonymous flag
- `display_name` - User display name (NULL if anonymous)
- `shared_at` - When shared
- `themes` - JSON array of dream themes

## Usage Examples

### Share a dream publicly with your name
```sql
SELECT share_dream('dream-uuid', false, 'John Doe');
```

### Share a dream anonymously
```sql
SELECT share_dream('dream-uuid', true);
```

### Stop sharing a dream
```sql
SELECT unshare_dream('dream-uuid');
```

### Get recent shared dreams
```sql
SELECT * FROM get_public_shared_dreams(20, 0);
```

### Check if a dream is shared
```sql
SELECT is_active 
FROM shared_dreams 
WHERE dream_id = 'dream-uuid' 
  AND user_id = auth.uid();
```

## Privacy Considerations

1. **Anonymous Sharing**: When `is_anonymous = true`, the `display_name` is hidden in public queries
2. **User Control**: Users can toggle sharing on/off at any time
3. **Data Exposure**: Shared dreams expose transcript, mood, clarity, and themes
4. **No Cross-Reference**: Anonymous shares cannot be linked back to users

## Performance Notes

1. The `get_public_shared_dreams` function uses efficient joins and aggregation
2. Partial indexes on `is_active` reduce index size
3. Real-time subscriptions enabled for live updates
4. Consider pagination for large result sets

## Migration Notes

This table was added in migration `20250629_dream_sharing.sql` to support the dream sharing feature.