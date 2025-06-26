# Frontend Implementation Quick Guide

## Two Approaches: Synchronous vs Asynchronous

### Approach 1: Asynchronous Queue (Recommended for Mobile/Web Apps)

This approach allows users to close the app and receive notifications when ready.

#### 1. Queue the Interpretation

```typescript
// services/interpretationService.ts
export const interpretationService = {
  async queueInterpretation(dreamId: string, userId: string, interpreterType: string) {
    const response = await fetch('/api/v1/dreams/interpret-async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ dreamId, userId, interpreterType })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      // Handle immediate errors (dream not found, no transcription)
      throw new Error(result.error);
    }
    
    return {
      jobId: result.jobId,
      status: result.status,
      estimatedWaitTime: result.estimatedWaitTime,
      position: result.position
    };
  },
  
  async checkJobStatus(jobId: string) {
    const response = await fetch(`/api/v1/dreams/interpretation-status/${jobId}`);
    return response.json();
  },
  
  async cancelInterpretation(jobId: string, userId: string) {
    const response = await fetch(`/api/v1/dreams/cancel-interpretation/${jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return response.json();
  }
};
```

#### 2. React Component with Real-time Updates

```tsx
function DreamInterpretation({ dreamId, userId }) {
  const [status, setStatus] = useState('idle');
  const [jobInfo, setJobInfo] = useState(null);
  const [interpretation, setInterpretation] = useState(null);
  const [error, setError] = useState(null);

  // Set up real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel(`dream-${dreamId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interpretations',
          filter: `dream_id=eq.${dreamId}`
        },
        (payload) => {
          // New interpretation arrived!
          setInterpretation(payload.new);
          setStatus('completed');
          
          // Show notification if app is in background
          if (document.hidden) {
            new Notification('Dream Interpretation Ready', {
              body: `Your ${payload.new.interpreter_type} interpretation is ready`,
              icon: '/icon.png'
            });
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [dreamId]);

  const requestInterpretation = async (interpreterType) => {
    try {
      setStatus('queueing');
      setError(null);
      
      const job = await interpretationService.queueInterpretation(
        dreamId, 
        userId, 
        interpreterType
      );
      
      setJobInfo(job);
      setStatus('queued');
      
      // Start polling for status updates (optional)
      if (job.estimatedWaitTime < 30000) { // Poll if less than 30s
        pollJobStatus(job.jobId);
      }
      
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };
  
  const pollJobStatus = async (jobId) => {
    const interval = setInterval(async () => {
      const status = await interpretationService.checkJobStatus(jobId);
      
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(interval);
        
        if (status.status === 'failed') {
          setError(status.error);
          setStatus('error');
        }
        // Success will be handled by real-time subscription
      } else {
        setJobInfo(prev => ({ ...prev, ...status }));
      }
    }, 2000); // Poll every 2 seconds
  };

  const cancelJob = async () => {
    if (jobInfo?.jobId) {
      await interpretationService.cancelInterpretation(jobInfo.jobId, userId);
      setStatus('cancelled');
      setJobInfo(null);
    }
  };

  return (
    <div>
      {status === 'idle' && (
        <InterpreterSelector onSelect={requestInterpretation} />
      )}
      
      {status === 'queueing' && (
        <div>Sending request...</div>
      )}
      
      {status === 'queued' && jobInfo && (
        <div>
          <p>Position in queue: {jobInfo.position}</p>
          <p>Estimated wait: {Math.ceil(jobInfo.estimatedWaitTime / 1000)}s</p>
          <button onClick={cancelJob}>Cancel</button>
        </div>
      )}
      
      {status === 'error' && (
        <div>
          <p>Error: {error}</p>
          <button onClick={() => setStatus('idle')}>Try Again</button>
        </div>
      )}
      
      {status === 'completed' && interpretation && (
        <InterpretationDisplay interpretation={interpretation} />
      )}
    </div>
  );
}
```

#### 3. Handle App Reopening

```tsx
// Check for existing interpretations when app opens
useEffect(() => {
  const checkExistingInterpretations = async () => {
    const { data } = await supabase
      .from('interpretations')
      .select('*')
      .eq('dream_id', dreamId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (data && data.length > 0) {
      setInterpretation(data[0]);
      setStatus('completed');
    }
  };
  
  checkExistingInterpretations();
}, [dreamId]);
```

#### 4. Push Notifications Setup (React Native)

```typescript
import messaging from '@react-native-firebase/messaging';

// Request permission
async function requestNotificationPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED;
  
  if (enabled) {
    const token = await messaging().getToken();
    // Send token to backend to associate with user
    await updateUserPushToken(userId, token);
  }
}

// Handle notifications
messaging().onMessage(async remoteMessage => {
  if (remoteMessage.data?.type === 'interpretation_complete') {
    // Navigate to interpretation
    navigation.navigate('DreamDetail', {
      dreamId: remoteMessage.data.dreamId,
      interpretationId: remoteMessage.data.interpretationId
    });
  }
});
```

### Approach 2: Synchronous (Simple Implementation)

Use this if you want immediate results and don't mind users waiting.

```typescript
// Call the interpretation endpoint
const interpretDream = async (dreamId: string, userId: string, interpreterType: string) => {
  const response = await fetch('/api/v1/dreams/interpret-by-id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Secret': 'your-api-secret' // or Authorization header
    },
    body: JSON.stringify({
      dreamId,
      userId,
      interpreterType // 'jung' | 'lakshmi' | 'freud' | 'mary'
    })
  });
  
  const result = await response.json();
  return result.data.interpretation;
};
```

### 2. Display the Interpretation

```tsx
function InterpretationDisplay({ interpretation }) {
  return (
    <div>
      {/* Header */}
      <h2>{interpretation.dreamTopic}</h2>
      <p>{interpretation.quickTake}</p>
      
      {/* Emotional Tone (if present) */}
      {interpretation.emotionalTone && (
        <div>
          <span>{interpretation.emotionalTone.primary}</span>
          <span>Intensity: {interpretation.emotionalTone.intensity}</span>
        </div>
      )}
      
      {/* Main Interpretation */}
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {interpretation.interpretation}
      </div>
      
      {/* Symbols */}
      <div>
        {interpretation.symbols.map(symbol => (
          <span key={symbol}>{symbol}</span>
        ))}
      </div>
      
      {/* Practical Guidance (if present) */}
      {interpretation.practicalGuidance?.map((guidance, i) => (
        <p key={i}>{guidance}</p>
      ))}
      
      {/* Self Reflection Question */}
      <p>{interpretation.selfReflection}</p>
    </div>
  );
}
```

## Key Fields to Display

### Always Present:
- `interpretation` - Main interpretation text (2-3 paragraphs)
- `dreamTopic` - Short topic/title
- `quickTake` - 2-3 sentence summary
- `symbols` - Array of key symbols
- `selfReflection` - Thought-provoking question

### Often Present:
- `emotionalTone` - `{primary: "nostalgia", secondary: "longing", intensity: 0.8}`
- `practicalGuidance` - Array of actionable suggestions

### Interpreter-Specific:
- `interpretationCore` - Contains interpreter-specific insights
  - Jung: archetypal dynamics, shadow elements
  - Lakshmi: karmic patterns, spiritual guidance
  - Freud: unconscious content, defense mechanisms
  - Mary: brain regions, neuroscientific elements

## Complete Response Structure

```typescript
interface InterpretationResponse {
  // Core fields
  dreamId: string;
  interpreterId: string;
  interpretation: string;        // Main text to display
  dreamTopic: string;           // Title/topic
  quickTake: string;            // Summary
  symbols: string[];            // Key symbols
  selfReflection: string;       // Question for user
  
  // Optional but common
  emotionalTone?: {
    primary: string;
    secondary: string;
    intensity: number;
  };
  practicalGuidance?: string[];
  
  // Interpreter-specific (in interpretationCore)
  interpretationCore?: {
    type: string;
    primaryInsight: string;
    keyPattern: string;
    personalGuidance: string;
    // ... plus interpreter-specific fields
  };
  
  // Metadata
  generationMetadata?: {
    knowledgeFragmentsUsed: number;
    fragmentIdsUsed: string[];
  };
}
```

## Error Handling

```typescript
try {
  const interpretation = await interpretDream(dreamId, userId, 'jung');
  // Success - display interpretation
} catch (error) {
  // Handle errors:
  // - 404: Dream not found
  // - 422: Dream has no transcription
  // - 500: Server error
}
```

## Fetching Saved Interpretations

```typescript
// Using Supabase client
const { data: interpretations } = await supabase
  .from('interpretations')
  .select('*')
  .eq('dream_id', dreamId)
  .order('created_at', { ascending: false });
```

## Tips

1. **Emotional Tone**: Not always present, check before displaying
2. **Line Breaks**: The `interpretation` field contains `\n\n` for paragraphs
3. **Interpreter Names**: Map IDs to display names (jung → "Carl Jung")
4. **Loading State**: Interpretations take 3-10 seconds
5. **Save Status**: Check `metadata.saved` in response to confirm database save

## Comparison: Async Queue vs Synchronous

### Async Queue Benefits
- ✅ User can close app/browser
- ✅ Push notifications when ready
- ✅ Multiple interpretations can queue
- ✅ Better UX for mobile apps
- ✅ Handles network interruptions
- ✅ Can set priority levels
- ✅ Scalable with worker processes

### Synchronous Benefits
- ✅ Simpler implementation
- ✅ Immediate error feedback
- ✅ No additional infrastructure (Redis)
- ✅ Good for web apps where users wait

## Database Schema for Async Approach

```sql
-- Job tracking table
CREATE TABLE interpretation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id TEXT UNIQUE NOT NULL,
  dream_id UUID REFERENCES dreams(id),
  user_id UUID REFERENCES profiles(user_id),
  interpreter_type TEXT,
  status TEXT DEFAULT 'queued', -- queued, processing, completed, failed, cancelled
  priority INTEGER DEFAULT 0,
  interpretation_id UUID REFERENCES interpretations(id),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes for efficient queries
CREATE INDEX idx_jobs_user_status ON interpretation_jobs(user_id, status);
CREATE INDEX idx_jobs_dream ON interpretation_jobs(dream_id);
CREATE INDEX idx_jobs_status_priority ON interpretation_jobs(status, priority DESC);
```

## Error Handling Best Practices

```typescript
// Comprehensive error handling
const handleInterpretationRequest = async (interpreterType: string) => {
  try {
    const result = await interpretationService.queueInterpretation(dreamId, userId, interpreterType);
    // Success
  } catch (error) {
    if (error.message.includes('not found')) {
      // Dream doesn't exist
      showError('This dream no longer exists');
    } else if (error.message.includes('transcription')) {
      // No transcription available
      showError('Please wait for dream transcription to complete');
    } else if (error.message.includes('already exists')) {
      // Interpretation already done
      loadExistingInterpretation();
    } else {
      // Generic error
      showError('Something went wrong. Please try again.');
    }
  }
};
```