# GitHub OAuth Setup for Development

## Important: Update Your GitHub OAuth App

Since the frontend is now running on port 3002, you need to update your GitHub OAuth app settings:

1. Go to https://github.com/settings/developers
2. Click on your OAuth App
3. Update the Authorization callback URL to:
   ```
   http://localhost:3000/api/auth/github/callback
   ```
   (Note: The backend is on port 3000, not the frontend port)

## Current Configuration

- Frontend: http://localhost:3002
- Backend: http://localhost:3000
- GitHub OAuth Callback: http://localhost:3000/api/auth/github/callback

The backend will automatically redirect to the correct frontend port after successful authentication.