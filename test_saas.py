#!/usr/bin/env python3
"""Test script for OpenHands SaaS functionality."""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:3001"
EMAIL = f"test_{datetime.now().timestamp()}@example.com"
PASSWORD = "testpassword123"


def test_registration():
    """Test user registration with personal team creation."""
    print("Testing registration...")
    response = requests.post(
        f"{BASE_URL}/api/auth/register-with-team",
        json={"email": EMAIL, "password": PASSWORD}
    )
    print(f"Registration status: {response.status_code}")
    if response.status_code == 200:
        user_data = response.json()
        print(f"User created: {json.dumps(user_data, indent=2)}")
        return True
    else:
        print(f"Registration failed: {response.text}")
        return False


def test_login():
    """Test user login."""
    print("\nTesting login...")
    response = requests.post(
        f"{BASE_URL}/api/auth/jwt/login",
        data={"username": EMAIL, "password": PASSWORD}
    )
    print(f"Login status: {response.status_code}")
    if response.status_code == 200:
        token_data = response.json()
        print(f"Login successful, token received")
        return token_data["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None


def test_protected_endpoints(token):
    """Test protected endpoints."""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test user profile
    print("\nTesting user profile...")
    response = requests.get(f"{BASE_URL}/api/auth/users/me", headers=headers)
    print(f"Profile status: {response.status_code}")
    if response.status_code == 200:
        print(f"User profile: {json.dumps(response.json(), indent=2)}")
    
    # Test teams
    print("\nTesting teams endpoint...")
    response = requests.get(f"{BASE_URL}/api/teams", headers=headers)
    print(f"Teams status: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    print(f"Response content: {response.text}")
    

def test_conversation():
    """Test conversation creation without auth (anonymous mode)."""
    print("\nTesting anonymous conversation creation...")
    response = requests.post(
        f"{BASE_URL}/api/conversation",
        json={"message": "Hello, can you help me?"}
    )
    print(f"Conversation status: {response.status_code}")
    if response.status_code in [200, 201]:
        print(f"Conversation response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Conversation failed: {response.text}")


if __name__ == "__main__":
    print("Testing OpenHands SaaS Implementation")
    print("=" * 50)
    
    # Test registration
    if test_registration():
        # Test login
        token = test_login()
        if token:
            # Test protected endpoints
            test_protected_endpoints(token)
    
    # Test anonymous functionality
    test_conversation()
    
    print("\nTests completed!")