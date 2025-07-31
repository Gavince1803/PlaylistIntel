# Deploying to Netlify

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
3. **Spotify App**: Your Spotify app should be configured for production

## Step 1: Prepare Your Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Go to "Edit Settings"
4. Add your Netlify domain to the Redirect URIs:
   - `https://your-app-name.netlify.app/api/auth/callback/spotify`
   - Replace `your-app-name` with your actual Netlify app name

## Step 2: Deploy to Netlify

### Option A: Deploy via Netlify UI (Recommended)

1. **Connect to GitHub**:
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Choose "GitHub"
   - Authorize Netlify to access your repositories
   - Select your `spotify-playlist-creator` repository

2. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: `18`

3. **Set Environment Variables**:
   - Go to Site settings > Environment variables
   - Add the following variables:
     ```
     SPOTIFY_CLIENT_ID=your_spotify_client_id
     SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
     NEXTAUTH_URL=https://your-app-name.netlify.app
     NEXTAUTH_SECRET=your_nextauth_secret
     ```

4. **Deploy**:
   - Click "Deploy site"
   - Wait for the build to complete

### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize and Deploy**:
   ```bash
   netlify init
   netlify deploy --prod
   ```

## Step 3: Configure Environment Variables

After deployment, set your environment variables in Netlify:

1. Go to your site dashboard
2. Navigate to Site settings > Environment variables
3. Add these variables:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
NEXTAUTH_URL=https://your-app-name.netlify.app
NEXTAUTH_SECRET=your_nextauth_secret_here
```

## Step 4: Update Spotify App Settings

1. Go back to your Spotify Developer Dashboard
2. Update your app's Redirect URIs to include your Netlify domain
3. Save the changes

## Step 5: Test Your Deployment

1. Visit your Netlify URL
2. Try signing in with Spotify
3. Test the playlist functionality

## Troubleshooting

### Common Issues

1. **Build Fails**:
   - Check that all dependencies are in `package.json`
   - Ensure Node.js version is set to 18
   - Check build logs for specific errors

2. **Authentication Issues**:
   - Verify `NEXTAUTH_URL` matches your Netlify domain
   - Ensure Spotify app redirect URI is correct
   - Check that all environment variables are set

3. **API Errors**:
   - Verify Spotify credentials are correct
   - Check that the Spotify app has the right scopes
   - Ensure CORS headers are properly set

### Environment Variables Checklist

- [ ] `SPOTIFY_CLIENT_ID` - Your Spotify app client ID
- [ ] `SPOTIFY_CLIENT_SECRET` - Your Spotify app client secret
- [ ] `NEXTAUTH_URL` - Your Netlify domain (https://your-app.netlify.app)
- [ ] `NEXTAUTH_SECRET` - A random string for session encryption

### Spotify App Checklist

- [ ] Redirect URI includes your Netlify domain
- [ ] App has the required scopes (user-read-private, playlist-modify-public, etc.)
- [ ] App is not in development mode (if you want public access)

## Custom Domain (Optional)

1. Go to Site settings > Domain management
2. Add your custom domain
3. Update `NEXTAUTH_URL` to use your custom domain
4. Update Spotify app redirect URI to use your custom domain

## Monitoring

- **Build Logs**: Check in the Deploys tab
- **Function Logs**: Available in the Functions tab
- **Analytics**: Available in the Analytics tab

Your app should now be live and accessible to users worldwide! 🚀 