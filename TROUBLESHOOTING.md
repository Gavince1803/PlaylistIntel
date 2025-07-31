# Troubleshooting Guide

This document outlines common issues and their solutions for the PlaylistIntel application.

## 403 Forbidden Errors

**Problem**: You see "403 Forbidden" errors when trying to access playlists.

**Cause**: This typically occurs when your Spotify app is in "Development Mode" and the user account is not added as a test user.

**Solutions**:
1. **Add test users** (Recommended for development):
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Select your app
   - Go to "Users and Access" section
   - Add the user's email address as a test user
   - The user will need to log out and log back in

2. **Switch to Production Mode** (For public apps):
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Select your app
   - Go to "Settings"
   - Change "App Mode" from "Development" to "Production"
   - Note: This requires approval from Spotify

**Current Status**: ✅ **RESOLVED** - The application now provides clear error messages and guidance when this occurs.

## 429 Rate Limit Exceeded Errors

**Problem**: You see "429 API rate limit exceeded" errors when making requests.

**Cause**: Spotify's API has rate limits to prevent abuse. The application was making too many requests too quickly.

**Solutions**:
1. **Automatic Rate Limiting**: The application now includes built-in rate limiting with exponential backoff
2. **Automatic Retries**: Failed requests are automatically retried with increasing delays
3. **Better Error Handling**: User-friendly error messages with retry options

**Current Status**: ✅ **RESOLVED** - The application now handles rate limiting gracefully with automatic retries and user-friendly error messages.

## Missing Playlists

**Problem**: Some public playlists that you know exist are not appearing in the application.

**Cause**: The application was only fetching the first 50 playlists from Spotify due to API pagination limits.

**Solutions**:
1. **Automatic Pagination**: The application now automatically fetches ALL playlists from your Spotify account
2. **Loading Indicators**: Shows progress while fetching additional playlists
3. **Playlist Count Display**: Shows how many playlists were loaded

**Current Status**: ✅ **RESOLVED** - The application now fetches all playlists automatically with proper pagination.

## Next Steps

If you encounter any other issues not covered in this guide, please:

1. Check the browser console for error messages
2. Check the application logs for detailed error information
3. Ensure your Spotify app settings are correctly configured
4. Contact support with specific error messages and steps to reproduce the issue

## Technical Details

### Rate Limiting Implementation
- Minimum interval between API calls: 150ms
- Exponential backoff for consecutive errors
- Automatic retry for 429 errors with increasing delays
- Maximum retry attempts: 3

### Playlist Pagination
- Fetches playlists in batches of 50
- Automatically continues until all playlists are loaded
- Shows loading indicator during pagination
- Displays total playlist count when complete

### Error Handling
- Specific error messages for different HTTP status codes
- User-friendly error descriptions
- Retry mechanisms for transient errors
- Graceful degradation when services are unavailable 