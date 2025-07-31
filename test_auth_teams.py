#!/usr/bin/env python3
"""Test authentication and teams endpoint."""

import requests

# Base URL
BASE_URL = "http://localhost:3000"

# Test credentials
email = "test@example.com"
password = "testpassword123"

# Create a session to persist cookies
session = requests.Session()

print("1. Testing login...")
login_data = {
    "username": email,  # FastAPI-Users expects "username" field
    "password": password
}
login_response = session.post(
    f"{BASE_URL}/api/auth/jwt/login",
    data=login_data,
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
print(f"Login response: {login_response.status_code}")
print(f"Cookies after login: {session.cookies.get_dict()}")

if login_response.status_code == 200:
    print("\n2. Testing /api/auth/users/me endpoint...")
    me_response = session.get(f"{BASE_URL}/api/auth/users/me")
    print(f"Me response: {me_response.status_code}")
    if me_response.status_code == 200:
        print(f"User data: {me_response.json()}")
    else:
        print(f"Me error: {me_response.text}")
    
    print("\n3. Testing /api/teams/ endpoint...")
    teams_response = session.get(f"{BASE_URL}/api/teams/")
    print(f"Teams response: {teams_response.status_code}")
    if teams_response.status_code == 200:
        print(f"Teams data: {teams_response.json()}")
    else:
        print(f"Teams error: {teams_response.text}")
else:
    print(f"Login failed: {login_response.text}")