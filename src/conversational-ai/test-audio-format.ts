// /**
//  * Test script to verify audio format from ElevenLabs
//  */

// import { createElevenLabsService } from './services/elevenlabs.service';
// import { logger } from '../utils/logger';

// async function testAudioFormat() {
//   // Use test agent ID
//   const testAgentId = process.env.ELEVENLABS_JUNG_AGENT_ID || 'test-agent';
  
//   const elevenLabsService = createElevenLabsService(testAgentId);
  
//   // Track audio chunks
//   let audioChunkCount = 0;
//   let firstChunkInfo: any = null;
  
//   elevenLabsService.on('audio', (chunk) => {
//     audioChunkCount++;
    
//     if (audioChunkCount === 1) {
//       // Analyze first chunk
//       firstChunkInfo = {
//         isBuffer: Buffer.isBuffer(chunk),
//         length: chunk.length,
//         // Check if it's MP3 by looking for ID3 or FF FB headers
//         possibleMP3: chunk[0] === 0xFF && (chunk[1] & 0xE0) === 0xE0,
//         possibleID3: chunk[0] === 0x49 && chunk[1] === 0x44 && chunk[2] === 0x33,
//         // First few bytes for format detection
//         firstBytes: chunk.slice(0, 10).toString('hex')
//       };
      
//       logger.info('First audio chunk analysis', firstChunkInfo);
//     }
    
//     logger.debug(`Audio chunk ${audioChunkCount}`, {
//       size: chunk.length,
//       type: chunk.constructor.name
//     });
//   });
  
//   elevenLabsService.on('conversation_initiated', (data) => {
//     logger.info('Audio format from initialization', {
//       audioFormat: data.audioFormat
//     });
//   });
  
//   try {
//     // Connect to ElevenLabs
//     await elevenLabsService.connect('test-conversation-id');
    
//     logger.info('Connected to ElevenLabs, waiting for audio format info...');
    
//     // Wait for initialization
//     await new Promise(resolve => setTimeout(resolve, 5000));
    
//     // Send a test message to trigger audio response
//     elevenLabsService.sendUserText('Hello, this is a test.');
    
//     // Wait for audio chunks
//     await new Promise(resolve => setTimeout(resolve, 10000));
    
//     logger.info('Test complete', {
//       totalAudioChunks: audioChunkCount,
//       firstChunkInfo
//     });
    
//   } catch (error) {
//     logger.error('Test failed', error);
//   } finally {
//     await elevenLabsService.disconnect();
//   }
// }

// // Run test if called directly
// if (require.main === module) {
//   testAudioFormat().catch(console.error);
// }