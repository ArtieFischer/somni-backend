# Dream Sharing Feature

## Overview
The dream sharing feature allows users to share their dreams publicly with the Somni community. Users can choose to share dreams either anonymously or with their name visible.

## Database Schema

### Main Table: `shared_dreams`
- Stores the sharing status and settings for each shared dream
- Links dreams to their sharing configuration
- Tracks when dreams were shared and last updated

See detailed documentation: [shared_dreams table](../tables/shared_dreams.md)

## API Endpoints

### 1. Share a Dream
**POST** `/api/v1/dreams/:dreamId/share`

Request body:
```json
{
  "isAnonymous": false,
  "displayName": "John Doe" // optional custom display name
}
```

Response:
```json
{
  "success": true,
  "shareId": "uuid",
  "message": "Dream shared successfully"
}
```

### 2. Stop Sharing a Dream
**DELETE** `/api/v1/dreams/:dreamId/share`

Response:
```json
{
  "success": true,
  "message": "Dream unshared successfully"
}
```

### 3. Update Sharing Settings
**PATCH** `/api/v1/dreams/:dreamId/share`

Request body:
```json
{
  "isAnonymous": true,
  "displayName": null
}
```

### 4. Get Sharing Status
**GET** `/api/v1/dreams/:dreamId/share/status`

Response:
```json
{
  "success": true,
  "isShared": true,
  "shareDetails": {
    "isAnonymous": false,
    "displayName": "John Doe",
    "sharedAt": "2025-06-29T12:00:00Z"
  }
}
```

### 5. Get Public Shared Dreams
**GET** `/api/v1/shared-dreams?limit=50&offset=0`

No authentication required - public endpoint

Response:
```json
{
  "success": true,
  "dreams": [
    {
      "share_id": "uuid",
      "dream_id": "uuid",
      "dream_title": "Flying over mountains",
      "dream_transcript": "I was flying...",
      "dream_created_at": "2025-06-28T10:00:00Z",
      "mood": 4,
      "clarity": 85,
      "is_anonymous": false,
      "display_name": "John Doe",
      "shared_at": "2025-06-29T12:00:00Z",
      "themes": [
        {
          "code": "flying",
          "label": "Flying"
        }
      ]
    }
  ],
  "total": 150
}
```

## Security & Privacy

### Row Level Security (RLS)
1. **Public Read Access**: Anyone can view active shared dreams
2. **Owner Control**: Users can only share/unshare their own dreams
3. **Service Role**: Backend has full access for administrative tasks

### Privacy Features
- **Anonymous Sharing**: When `is_anonymous = true`, user identity is hidden
- **Display Name Override**: Users can provide custom display names
- **Instant Unshare**: Users can stop sharing at any time by setting `is_active = false`

## Implementation Details

### Service Layer
Located at: `src/services/dream-sharing.service.ts`

Key methods:
- `shareDream()` - Share a dream with specified settings
- `unshareDream()` - Stop sharing a dream
- `getDreamSharingStatus()` - Check if a dream is shared
- `getPublicSharedDreams()` - Fetch all public dreams
- `updateDreamSharing()` - Update sharing settings

### Database Functions
- `share_dream()` - Handles insert/update with conflict resolution
- `unshare_dream()` - Sets is_active to false
- `get_public_shared_dreams()` - Returns enriched dream data with themes

### Real-time Updates
The `shared_dreams` table is added to Supabase realtime subscriptions, allowing:
- Live updates when new dreams are shared
- Instant removal when dreams are unshared
- Real-time changes to sharing settings

## Usage Guidelines

### For Frontend Implementation
1. Check sharing status when displaying a dream
2. Show share/unshare button based on current status
3. Allow toggling between anonymous and named sharing
4. Display public feed using the shared dreams endpoint

### Best Practices
1. Always validate user ownership before sharing operations
2. Cache sharing status to reduce database queries
3. Use pagination for the public dreams feed
4. Consider implementing search/filter for shared dreams

## Future Enhancements
- Add sharing statistics (view count, likes)
- Implement dream collections/categories
- Add social features (comments, reactions)
- Enable sharing to specific groups
- Add content moderation for public dreams