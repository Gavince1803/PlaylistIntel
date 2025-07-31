# Troubleshooting Guide

## 403 Forbidden Errors

### Problem
You're seeing `403 Forbidden` errors when trying to log in with different Spotify accounts.

### Cause
Your Spotify app is in **Development Mode**. In Development Mode, only users who are explicitly added as "test users" can access the app.

### Solution
You have two options:

#### Option 1: Add Test Users (Recommended for Development)
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Go to "Users and Access" section
4. Add the email addresses of users who should be able to access the app
5. Users will receive an email invitation to join

#### Option 2: Switch to Production Mode
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Go to "App Settings"
4. Change "App Mode" from "Development" to "Production"
5. Fill out the required information for production approval

**Note**: Production mode requires additional verification from Spotify and may take time to approve.

## 429 Rate Limit Exceeded Errors

### Problem
You're seeing `429 Rate Limit Exceeded` errors when making API calls.

### Cause
Spotify has rate limits on their API. The app is making too many requests too quickly.

### Solution
The app now includes:
- **Automatic rate limiting**: Minimum 150ms between API calls
- **Exponential backoff**: Increases delay when errors occur
- **Automatic retries**: Retries rate limit errors up to 3 times
- **Better error handling**: Shows user-friendly error messages

### What's Been Improved
1. **Rate Limiter**: Increased minimum interval between calls
2. **Error Recovery**: Automatic retry with exponential backoff
3. **User Feedback**: Clear error messages and retry buttons
4. **API Error Handling**: Better handling of 403, 401, and 429 errors

## Current Status
- ✅ Rate limiting implemented
- ✅ Error handling improved
- ✅ Retry mechanism added
- ✅ User-friendly error messages
- ⚠️ 403 errors require manual fix (add test users or switch to production)

## Next Steps
1. **For immediate testing**: Add your email as a test user in the Spotify Developer Dashboard
2. **For production**: Consider switching to Production Mode
3. **Monitor logs**: Check if rate limiting is working properly

## Testing the Fixes
1. Try logging in with a test user account
2. Check if the retry mechanism works for rate limit errors
3. Verify that error messages are clear and helpful
4. Test the "Try Again" button in error states 