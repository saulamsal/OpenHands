#!/usr/bin/env python3
"""Test script to verify authentication protection is working."""

import os
import requests
import sys

# Set environment to use database backend
os.environ['STORAGE_BACKEND'] = 'database'

# Base URL for the API
BASE_URL = "http://localhost:3000"

# Test endpoints that should require authentication
PROTECTED_ENDPOINTS = [
    "/api/options/config",
    "/api/options/models", 
    "/api/options/agents",
    "/api/options/security-analyzers",
    "/api/settings",
]

print("Testing API Authentication Protection")
print("=" * 50)
print(f"Base URL: {BASE_URL}")
print(f"Storage Backend: {os.environ.get('STORAGE_BACKEND', 'file')}")
print()

# Test without authentication
print("Testing without authentication (should fail with 401):")
print("-" * 50)

for endpoint in PROTECTED_ENDPOINTS:
    url = f"{BASE_URL}{endpoint}"
    try:
        response = requests.get(url)
        status_code = response.status_code
        
        if status_code == 401:
            print(f"✓ {endpoint}: {status_code} Unauthorized (Expected)")
        else:
            print(f"✗ {endpoint}: {status_code} - SECURITY ISSUE: Endpoint is not protected!")
            if response.headers.get('content-type', '').startswith('application/json'):
                print(f"  Response: {response.json()}")
    except Exception as e:
        print(f"✗ {endpoint}: Error - {e}")

print()

# Test with invalid token
print("Testing with invalid JWT token (should fail with 401):")
print("-" * 50)

headers = {"Authorization": "Bearer invalid_token_12345"}

for endpoint in PROTECTED_ENDPOINTS:
    url = f"{BASE_URL}{endpoint}"
    try:
        response = requests.get(url, headers=headers)
        status_code = response.status_code
        
        if status_code == 401:
            print(f"✓ {endpoint}: {status_code} Unauthorized (Expected)")
        else:
            print(f"✗ {endpoint}: {status_code} - SECURITY ISSUE: Invalid token accepted!")
    except Exception as e:
        print(f"✗ {endpoint}: Error - {e}")

print()
print("Authentication protection test completed.")