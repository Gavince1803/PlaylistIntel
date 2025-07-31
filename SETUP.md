# PlaylistIntel - Setup Guide

## Current Issue
The application is failing because of missing environment variables. The errors show:
- `client_id is required` - Missing Spotify API credentials
- `NEXTAUTH_URL` warning - Missing NextAuth URL
- `NO_SECRET` warning - Missing NextAuth secret

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
   - App description: "Create playlists from mixed collections"
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

## Troubleshooting

If you still get errors after setting up the environment variables:

1. Make sure the `.env.local` file is in the root directory
2. Restart the development server completely
3. Check that your Spotify app has the correct redirect URI
4. Verify that all environment variables are properly set

## Next Steps

Once the environment variables are configured:
1. The app should start without errors
2. You'll be able to sign in with Spotify
3. The playlist fetching functionality will work
4. You can create new playlists from your mixed collections 