import SpotifyProvider from 'next-auth/providers/spotify';

async function refreshAccessToken(token: any) {
  try {
    const url = 'https://accounts.spotify.com/api/token';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    });
    const refreshedTokens = await response.json();
    if (!response.ok) throw refreshedTokens;
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const authOptions = {
  debug: false, // Disable debug mode to reduce logging
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'user-read-private user-read-email user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-library-read user-top-read'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }: any) {
      console.log('🔄 JWT callback triggered:', {
        hasAccount: !!account,
        hasToken: !!token,
        tokenExpiresAt: token.expiresAt,
        currentTime: Math.floor(Date.now() / 1000)
      });

      // Initial sign in
      if (account) {
        console.log('✅ Initial sign in - setting up token');
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at, // in seconds since epoch
        };
      }
      
      // If token is still valid, return it
      if (token.expiresAt && Date.now() / 1000 < token.expiresAt) {
        console.log('✅ Token still valid');
        return token;
      }
      
      // Token expired, refresh it
      console.log('🔄 Token expired, refreshing...');
      return await refreshAccessToken(token);
    },
    async session({ session, token }: any) {
      console.log('🔄 Session callback triggered:', {
        hasToken: !!token,
        hasAccessToken: !!token.accessToken,
        tokenError: token.error
      });

      session.accessToken = token.accessToken;
      session.error = token.error;
      
      // Remove the problematic Spotify API call that was causing 403 errors
      // The access token will be validated when making actual API calls
      
      console.log('📤 Returning session:', {
        hasUser: !!session.user,
        hasAccessToken: !!session.accessToken,
        error: session.error
      });
      
      return session;
    }
  }
}; 