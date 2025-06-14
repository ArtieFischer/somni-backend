#!/usr/bin/env node

const crypto = require('crypto');

console.log('🔑 Generating secure API secret key...\n');

const apiKey = crypto.randomBytes(32).toString('hex');

console.log('Generated API Secret Key:');
console.log(apiKey);
console.log('\n📋 Copy this to your .env file:');
console.log(`API_SECRET_KEY=${apiKey}`);
console.log('\n✅ This key is cryptographically secure and ready for production use.'); 