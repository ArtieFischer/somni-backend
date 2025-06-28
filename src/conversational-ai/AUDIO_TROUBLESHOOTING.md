# Audio Recognition Troubleshooting

## Current Status
- ✅ Backend is receiving audio chunks
- ✅ Audio is being forwarded to ElevenLabs
- ✅ ElevenLabs is processing and responding
- ❓ Speech recognition quality seems poor

## Possible Issues

### 1. Audio Format Mismatch
**Expected**: PCM 16-bit, 16kHz, mono WAV
**Check**: Frontend might be sending different format

### 2. Audio Chunk Size
- Current chunk: 13,656 bytes (base64)
- This is ~10KB of raw audio = ~0.3 seconds at 16kHz
- Might be too short for reliable recognition

### 3. Base64 Encoding Issues
- Frontend sends base64 encoded audio
- Backend forwards as base64 to ElevenLabs
- No issues seen in encoding/decoding

### 4. Audio Quality Issues
- Recording quality on mobile
- Background noise
- Microphone sensitivity
- Audio compression

## Debug Steps

1. **Check Transcription Results**
   - Look for "User transcript received" logs
   - See if text is empty or garbled

2. **Verify Audio Format**
   - Frontend should use:
     ```javascript
     {
       android: { 
         extension: '.wav', 
         sampleRate: 16000, 
         numberOfChannels: 1,
         audioEncoder: AudioEncoder.PCM_16BIT
       },
       ios: { 
         extension: '.wav', 
         sampleRate: 16000, 
         numberOfChannels: 1,
         linearPCMBitDepth: 16,
         linearPCMIsBigEndian: false,
         linearPCMIsFloat: false
       }
     }
     ```

3. **Test with Longer Recording**
   - Try recording for 3-5 seconds
   - More audio data = better recognition

4. **Check ElevenLabs Agent Settings**
   - Verify agent is configured for the correct language
   - Check if agent expects specific audio format

## Recommendations

1. **Increase Minimum Recording Time**
   - Don't send chunks shorter than 1 second
   - Buffer more audio before sending

2. **Add Audio Validation**
   - Check audio levels before sending
   - Detect silence and filter it out

3. **Test Direct to ElevenLabs**
   - Use test script to send known good audio
   - Compare recognition results