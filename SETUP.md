# PlaylistIntel - Setup Guide

## Current Issues & Solutions

### 1. Environment Variables Missing
The application is failing because of missing environment variables. The errors show:
- `client_id is required` - Missing Spotify API credentials
- `NEXTAUTH_URL` warning - Missing NextAuth URL
- `NO_SECRET` warning - Missing NextAuth secret

### 2. Rate Limiting Issues
The app is experiencing 429 (Rate Limit Exceeded) errors due to too many API calls.

### 3. 403 Forbidden Errors
Some API calls are returning 403 errors due to Spotify app permissions.

## How to Fix

### 1. Create Environment File
Create a `.env.local` file in the root directory with the following content:

```env
# Spotify API Configuration
# Get these from https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### 2. Get Spotify API Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the app details:
   - App name: "PlaylistIntel"
   - App description: "Analyze and discover insights from your Spotify playlists"
   - Redirect URI: `http://localhost:3000/api/auth/callback/spotify`
   - Website: `http://localhost:3000`
5. Click "Save"
6. Copy the `Client ID` and `Client Secret`

### 3. Generate NextAuth Secret
Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

### 4. Update .env.local
Replace the placeholder values in your `.env.local` file with the actual credentials.

### 5. Restart the Development Server
```bash
npm run dev
```

## What Each Variable Does

- **SPOTIFY_CLIENT_ID**: Your Spotify app's client ID for API authentication
- **SPOTIFY_CLIENT_SECRET**: Your Spotify app's client secret for API authentication  
- **NEXTAUTH_URL**: The base URL of your application (for development: http://localhost:3000)
- **NEXTAUTH_SECRET**: A random string used to encrypt NextAuth sessions and tokens

## Recent Improvements Made

### Rate Limiting Improvements
- Increased base interval between API calls from 150ms to 300ms
- Added exponential backoff for consecutive errors
- Implemented batch processing for like status checks
- Added delays between API call batches

### Error Handling Improvements
- 403 errors now return empty results instead of throwing errors
- Better handling of 429 rate limit errors with retry logic
- Silent handling of background API calls to reduce user-facing errors

### Debug Mode Disabled
- Disabled NextAuth debug mode to reduce console logging
- This will significantly reduce the "DEBUG_ENABLED" warnings

## Troubleshooting

### If you still get errors after setting up the environment variables:

1. Make sure the `.env.local` file is in the root directory
2. Restart the development server completely
3. Clear your browser cache and cookies
4. Check that your Spotify app is properly configured

### For 403 Forbidden errors:
- Make sure your Spotify app is in "Development Mode" and your email is added as a test user
- Or switch your app to "Production Mode" in the Spotify Developer Dashboard

### For 429 Rate Limit errors:
- The app now has improved rate limiting, but if you still see these errors, wait a few minutes before trying again
- The app will automatically retry with exponential backoff

### For authentication issues:
- Make sure you're logged into the correct Spotify account
- Try logging out and logging back in
- Check that your Spotify app has the correct redirect URI

## Production Deployment

For production deployment (like Netlify), make sure to:
1. Set the environment variables in your hosting platform
2. Update `NEXTAUTH_URL` to your production domain
3. Use a different `NEXTAUTH_SECRET` for production
4. Set your Spotify app's redirect URI to your production domain 