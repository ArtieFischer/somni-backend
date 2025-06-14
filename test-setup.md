# Quick Testing Guide for Somni Backend

## 🚀 Fast Setup & Testing (5 minutes)

### Step 1: Environment Setup

```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your real values
nano .env  # or use your preferred editor
```

**Required values to replace in `.env`:**

```bash
ELEVENLABS_API_KEY=sk-your-real-elevenlabs-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-real-service-role-key
API_SECRET_KEY=generate-a-secure-32-char-string-here
```

### Step 2: Start the Server

```bash
# Install dependencies (if not done already)
npm install

# Start in development mode
npm run dev
```

You should see:

```
✅ Somni Backend Service started on port 3000
```

### Step 3: Quick Health Check

```bash
# Test basic health endpoint
curl http://localhost:3000/health

# Expected response:
{
  "status": "operational",
  "service": "somni-backend",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 1.234
}
```

### Step 4: Test Detailed Health Check

```bash
# Test with external service checks
curl "http://localhost:3000/health?detailed=true"

# This will test ElevenLabs and Supabase connectivity
```

### Step 5: Test Authentication (Optional)

```bash
# Test API secret validation
curl -X POST http://localhost:3000/api/v1/transcription/transcribe \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Expected: 401 Unauthorized (API secret required)
```

## 🧪 Full Integration Test

### Test with Mock Audio Data

```bash
# Create a test script
cat > test-transcription.js << 'EOF'
const fetch = require('node-fetch');

async function testTranscription() {
  // Mock base64 audio data (tiny WAV file)
  const mockAudioBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

  const response = await fetch('http://localhost:3000/api/v1/transcription/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Secret': 'development-secret-key-32-characters-minimum-length',
      'X-Supabase-Token': 'mock-jwt-token-for-testing'
    },
    body: JSON.stringify({
      dreamId: '123e4567-e89b-12d3-a456-426614174000',
      audioBase64: mockAudioBase64,
      duration: 1.0,
      options: { languageCode: null }
    })
  });

  console.log('Status:', response.status);
  console.log('Response:', await response.text());
}

testTranscription().catch(console.error);
EOF

# Run the test
node test-transcription.js
```

## 🔧 Troubleshooting

### Common Issues:

1. **"ElevenLabs API key is required"**

   - Check your `.env` file has the correct `ELEVENLABS_API_KEY`
   - Verify the API key is valid in ElevenLabs dashboard

2. **"Invalid Supabase URL"**

   - Ensure `SUPABASE_URL` is in format: `https://your-project.supabase.co`
   - Check Supabase project settings for correct URL

3. **Port already in use**

   ```bash
   # Change port in .env
   PORT=3001
   ```

4. **Authentication errors**
   - Verify `API_SECRET_KEY` is at least 32 characters
   - For testing, use the development key from the example

### Quick Fixes:

```bash
# Reset and restart
rm .env
cp env.example .env
# Edit .env with your values
npm run dev
```

## 🚀 Deploy to Railway (2 minutes)

1. **Push to GitHub:**

   ```bash
   git add .
   git commit -m "Add Somni Backend Service"
   git push origin main
   ```

2. **Deploy on Railway:**

   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Add environment variables from your `.env`
   - Deploy automatically

3. **Test deployed service:**
   ```bash
   curl https://your-app.railway.app/health
   ```

## ✅ Success Indicators

- ✅ Server starts without errors
- ✅ Health check returns "operational"
- ✅ Detailed health check shows ElevenLabs and Supabase status
- ✅ Authentication properly rejects unauthorized requests
- ✅ Ready for integration with your Edge Function

**Next:** Update your Supabase Edge Function to call this backend instead of the mock setTimeout!
