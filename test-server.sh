#!/bin/bash
# Start the server and test it

echo "Starting server..."
npm run dev &
SERVER_PID=$!

echo "Waiting for server to start..."
sleep 10

echo "Testing interpreters endpoint..."
curl -s http://localhost:3000/api/v1/interpreters | jq .

echo "Server PID: $SERVER_PID"
echo "Server is running. Press Ctrl+C to stop."

# Keep script running
wait $SERVER_PID