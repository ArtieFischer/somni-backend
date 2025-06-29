# Frontend Implementation Ticket: Dream Sharing Feature

## Overview
Implement the dream sharing functionality that allows users to share their dreams publicly with the Somni community. Users can choose to share dreams either anonymously or with their name visible, and can stop sharing at any time.

## User Stories
1. As a user, I want to share my dream publicly so others can read it
2. As a user, I want to choose whether to share anonymously or with my name
3. As a user, I want to stop sharing my dream at any time
4. As a user, I want to browse all publicly shared dreams from the community

## API Endpoints

### 1. Share a Dream
**Endpoint:** `POST /api/v1/dreams/:dreamId/share`  
**Authentication:** Required (Bearer token)  
**Description:** Share a dream with the community

**Request Payload:**
```typescript
{
  "isAnonymous": boolean,        // Required: true = anonymous, false = show name
  "displayName": string | null   // Optional: custom display name (only used if not anonymous)
}
```

**Example Request:**
```bash
curl -X POST https://api.somni.com/api/v1/dreams/123e4567-e89b-12d3-a456-426614174000/share \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isAnonymous": false,
    "displayName": "Dream Explorer"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "shareId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Dream shared successfully"
}
```

**Error Response (400):**
```json
{
  "error": "Dream not found or access denied"
}
```

### 2. Stop Sharing a Dream
**Endpoint:** `DELETE /api/v1/dreams/:dreamId/share`  
**Authentication:** Required (Bearer token)  
**Description:** Remove a dream from public sharing

**Example Request:**
```bash
curl -X DELETE https://api.somni.com/api/v1/dreams/123e4567-e89b-12d3-a456-426614174000/share \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Dream unshared successfully"
}
```

### 3. Update Sharing Settings
**Endpoint:** `PATCH /api/v1/dreams/:dreamId/share`  
**Authentication:** Required (Bearer token)  
**Description:** Change sharing settings (e.g., switch between anonymous and named)

**Request Payload:**
```typescript
{
  "isAnonymous": boolean,        // Required
  "displayName": string | null   // Optional
}
```

**Example Request:**
```bash
curl -X PATCH https://api.somni.com/api/v1/dreams/123e4567-e89b-12d3-a456-426614174000/share \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isAnonymous": true,
    "displayName": null
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "shareId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Sharing settings updated successfully"
}
```

### 4. Get Sharing Status for a Dream
**Endpoint:** `GET /api/v1/dreams/:dreamId/share/status`  
**Authentication:** Required (Bearer token)  
**Description:** Check if a specific dream is currently shared

**Example Request:**
```bash
curl -X GET https://api.somni.com/api/v1/dreams/123e4567-e89b-12d3-a456-426614174000/share/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response (200):**
```json
{
  "success": true,
  "isShared": true,
  "shareDetails": {
    "isAnonymous": false,
    "displayName": "Dream Explorer",
    "sharedAt": "2025-06-29T14:30:00.000Z"
  }
}
```

**Response when not shared:**
```json
{
  "success": true,
  "isShared": false
}
```

### 5. Get All Public Shared Dreams
**Endpoint:** `GET /api/v1/shared-dreams`  
**Authentication:** NOT REQUIRED (Public endpoint)  
**Description:** Fetch all publicly shared dreams from the community

**Query Parameters:**
- `limit` (optional): Number of dreams to return (1-100, default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```bash
curl -X GET "https://api.somni.com/api/v1/shared-dreams?limit=20&offset=0"
```

**Success Response (200):**
```json
{
  "success": true,
  "dreams": [
    {
      "share_id": "550e8400-e29b-41d4-a716-446655440000",
      "dream_id": "123e4567-e89b-12d3-a456-426614174000",
      "dream_title": "Flying Over the Ocean",
      "dream_transcript": "I was soaring above crystal blue waters...",
      "dream_created_at": "2025-06-28T10:15:00.000Z",
      "mood": 5,              // 1-5 scale
      "clarity": 92,          // 1-100 scale
      "is_anonymous": false,
      "display_name": "Dream Explorer",  // null if anonymous
      "shared_at": "2025-06-29T14:30:00.000Z",
      "themes": [
        {
          "code": "flying",
          "label": "Flying"
        },
        {
          "code": "water",
          "label": "Water"
        }
      ]
    },
    {
      "share_id": "660e8400-e29b-41d4-a716-446655440001",
      "dream_id": "223e4567-e89b-12d3-a456-426614174001",
      "dream_title": "Lost in a Maze",
      "dream_transcript": "I found myself in an endless labyrinth...",
      "dream_created_at": "2025-06-27T22:45:00.000Z",
      "mood": 3,
      "clarity": 78,
      "is_anonymous": true,
      "display_name": null,   // Always null when anonymous
      "shared_at": "2025-06-29T08:20:00.000Z",
      "themes": [
        {
          "code": "lost",
          "label": "Being Lost"
        }
      ]
    }
  ],
  "total": 2
}
```

## TypeScript Interfaces

```typescript
interface ShareDreamRequest {
  isAnonymous: boolean;
  displayName?: string | null;
}

interface ShareDreamResponse {
  success: boolean;
  shareId: string;
  message?: string;
  error?: string;
}

interface SharedDreamStatus {
  success: boolean;
  isShared: boolean;
  shareDetails?: {
    isAnonymous: boolean;
    displayName: string | null;
    sharedAt: string;
  };
}

interface PublicSharedDream {
  share_id: string;
  dream_id: string;
  dream_title: string | null;
  dream_transcript: string | null;
  dream_created_at: string;
  mood: number | null;
  clarity: number | null;
  is_anonymous: boolean;
  display_name: string | null;
  shared_at: string;
  themes: Array<{
    code: string;
    label: string;
  }>;
}

interface GetSharedDreamsResponse {
  success: boolean;
  dreams: PublicSharedDream[];
  total: number;
  error?: string;
}
```

## UI/UX Requirements

### 1. Dream Detail View
- Add a "Share" button/toggle on each dream detail page
- Show current sharing status (shared/not shared)
- If shared, show whether it's anonymous or with name
- Allow quick toggle between anonymous and named sharing

### 2. Sharing Modal/Dialog
When user clicks share:
- Show options: "Share with my name" or "Share anonymously"
- Optional: Allow custom display name input
- Include disclaimer about public visibility
- Confirm button to share

### 3. Public Dreams Feed
Create a new section/page for browsing shared dreams:
- List view of all shared dreams
- Show dream title, excerpt of transcript, mood, clarity
- Display author name or "Anonymous"
- Show sharing date and themes
- Implement pagination (load more / infinite scroll)
- Consider adding search/filter functionality

### 4. Privacy Indicators
- Clearly mark dreams that are shared in the user's dream list
- Use icons/badges to indicate sharing status
- Different visual for anonymous vs named sharing

## Implementation Notes

### State Management
- Track sharing status for each dream in the user's dream list
- Cache public dreams feed data
- Update local state optimistically when sharing/unsharing

### Error Handling
- Handle network errors gracefully
- Show appropriate messages for:
  - Dream not found
  - Unauthorized access
  - Server errors
- Implement retry logic for failed requests

### Performance Considerations
- Implement pagination for the public feed
- Consider virtual scrolling for large lists
- Cache sharing status to minimize API calls
- Debounce rapid share/unshare toggles

### Security & Privacy
- Never expose user IDs in the UI for anonymous shares
- Validate that users can only share their own dreams
- Clear any cached user data when switching to anonymous

### Real-time Updates (Optional Enhancement)
- Subscribe to Supabase realtime for the `shared_dreams` table
- Update the public feed when new dreams are shared
- Remove dreams from feed when unshared
- Show live count of shared dreams

## Testing Checklist
- [ ] User can share a dream with their name
- [ ] User can share a dream anonymously
- [ ] User can switch between anonymous and named sharing
- [ ] User can unshare a dream
- [ ] Public feed loads without authentication
- [ ] Pagination works correctly
- [ ] Anonymous dreams don't show any user information
- [ ] Error states are handled gracefully
- [ ] Sharing status persists after refresh
- [ ] Can't share/unshare other users' dreams

## Acceptance Criteria
1. Users can successfully share and unshare their dreams
2. Anonymous sharing completely hides user identity
3. Public feed is accessible without login
4. All API endpoints return expected responses
5. UI clearly indicates sharing status
6. No performance degradation with many shared dreams
7. Proper error handling for all edge cases

## Questions for Design/Product
1. Should we limit how many dreams a user can share?
2. Do we want to add reporting functionality for inappropriate content?
3. Should shared dreams be searchable by content/themes?
4. Do we want to track view counts or engagement metrics?
5. Should users be notified when someone interacts with their shared dream?