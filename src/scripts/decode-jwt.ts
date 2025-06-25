import { config } from '../config';

function decodeJWT(token: string) {
  try {
    // Split the JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode the payload (second part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    return payload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

console.log('Checking JWT roles...\n');

// Check service role key
console.log('Service Role Key:');
const servicePayload = decodeJWT(config.supabase.serviceRoleKey);
if (servicePayload) {
  console.log('- Role:', servicePayload.role);
  console.log('- Issuer:', servicePayload.iss);
  console.log('- Audience:', servicePayload.aud);
  console.log('- Expires:', new Date(servicePayload.exp * 1000).toISOString());
  console.log('- Full payload:', JSON.stringify(servicePayload, null, 2));
}

console.log('\n' + '-'.repeat(50) + '\n');

// Check anon key
console.log('Anon Key:');
const anonPayload = decodeJWT(config.supabase.anonKey);
if (anonPayload) {
  console.log('- Role:', anonPayload.role);
  console.log('- Issuer:', anonPayload.iss);
  console.log('- Audience:', anonPayload.aud);
  console.log('- Expires:', new Date(anonPayload.exp * 1000).toISOString());
  console.log('- Full payload:', JSON.stringify(anonPayload, null, 2));
}