// Check which port the server is running on
const http = require('http');

console.log('🔍 Checking server ports...\n');

const ports = [3000, 3001, 5000, 8000, 8080, 8081];
let foundPort = null;

ports.forEach(port => {
  http.get(`http://localhost:${port}/`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.service === 'somni-backend') {
          console.log(`✅ Found Somni backend on port ${port}!`);
          console.log('   Response:', JSON.stringify(json, null, 2));
          foundPort = port;
        } else {
          console.log(`ℹ️  Port ${port}: Different service`);
        }
      } catch (e) {
        console.log(`ℹ️  Port ${port}: Non-JSON response`);
      }
    });
  }).on('error', (err) => {
    // Port not in use or connection refused
  });
});

setTimeout(() => {
  if (!foundPort) {
    console.log('\n❌ Somni backend not found on common ports');
    console.log('\nPlease check:');
    console.log('1. Is the server running? (npm run dev:ws)');
    console.log('2. Check the console output for the actual port');
    console.log('3. Check your .env file for PORT setting');
  }
}, 2000);