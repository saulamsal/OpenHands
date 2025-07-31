#!/bin/bash

echo "Starting OpenHands Frontend in SaaS mode..."

# Change to frontend directory
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Set environment variables for SaaS mode
export VITE_BACKEND_HOST="127.0.0.1:3001"
export VITE_MOCK_API=false
export VITE_FRONTEND_PORT=3000

# Start the frontend
echo "Starting frontend on port 3000..."
echo "Connecting to SaaS backend at http://localhost:3001"
npm run dev