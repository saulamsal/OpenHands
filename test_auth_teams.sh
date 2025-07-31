#!/bin/bash

# Base URL
BASE_URL="http://localhost:3000"

# Test credentials
EMAIL="test@example.com"
PASSWORD="testpassword123"

echo "1. Testing login..."
# Login and save cookies
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$EMAIL&password=$PASSWORD" \
  "$BASE_URL/api/auth/jwt/login" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
echo "Login response status: $HTTP_STATUS"

if [ "$HTTP_STATUS" == "200" ]; then
    echo "Login successful!"
    echo "Cookies:"
    cat cookies.txt | grep -v "^#"
    
    echo -e "\n2. Testing /api/auth/users/me endpoint..."
    ME_RESPONSE=$(curl -s -b cookies.txt \
      "$BASE_URL/api/auth/users/me" \
      -w "\nHTTP_STATUS:%{http_code}")
    
    ME_STATUS=$(echo "$ME_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
    ME_BODY=$(echo "$ME_RESPONSE" | sed 's/HTTP_STATUS:.*//')
    echo "Me response status: $ME_STATUS"
    echo "Me response body: $ME_BODY"
    
    echo -e "\n3. Testing /api/teams/ endpoint..."
    TEAMS_RESPONSE=$(curl -s -b cookies.txt \
      "$BASE_URL/api/teams/" \
      -w "\nHTTP_STATUS:%{http_code}")
    
    TEAMS_STATUS=$(echo "$TEAMS_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
    TEAMS_BODY=$(echo "$TEAMS_RESPONSE" | sed 's/HTTP_STATUS:.*//')
    echo "Teams response status: $TEAMS_STATUS"
    echo "Teams response body: $TEAMS_BODY"
else
    echo "Login failed!"
    LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed 's/HTTP_STATUS:.*//')
    echo "Login error: $LOGIN_BODY"
fi

# Clean up
rm -f cookies.txt