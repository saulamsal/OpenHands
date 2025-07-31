#!/bin/bash

# Base URL
BASE_URL="http://localhost:3000"

# Test registration
EMAIL="test@example.com"
PASSWORD="testpassword123"
NAME="Test User"

echo "Testing registration..."
REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"$NAME\"}" \
  "$BASE_URL/api/auth/register-with-team" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$REGISTER_RESPONSE" | sed 's/HTTP_STATUS:.*//')

echo "Registration response status: $HTTP_STATUS"
echo "Registration response body: $BODY"