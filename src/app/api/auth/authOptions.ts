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
  debug: true,
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-library-read user-top-read'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }: any) {
      // Initial sign in
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at, // in seconds since epoch
        };
      }
      // If token is still valid, return it
      if (token.expiresAt && Date.now() / 1000 < token.expiresAt) {
        return token;
      }
      // Token expired, refresh it
      return await refreshAccessToken(token);
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      // Obtener el tipo de cuenta (product) desde Spotify
      try {
        if (token.accessToken) {
          console.log('🔍 Fetching user info from Spotify...');
          const res = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${token.accessToken}` }
          });
          
          console.log('📊 Spotify API response status:', res.status);
          
          if (res.ok) {
            const data = await res.json();
            console.log('✅ User data received:', {
              name: data.display_name,
              email: data.email,
              product: data.product,
              id: data.id
            });
            session.user.product = data.product;
          } else if (res.status === 403) {
            // Token no válido, limpiar
            console.log('❌ Token no válido (403), limpiando sesión');
            session.error = 'TokenInvalid';
            session.accessToken = null;
          } else {
            console.log('⚠️ Unexpected response status:', res.status);
            const errorText = await res.text();
            console.log('Error response:', errorText);
          }
        } else {
          console.log('⚠️ No access token available');
        }
      } catch (e) {
        console.error('❌ Error fetching user info:', e);
        session.error = 'FetchError';
      }
      return session;
    }
  }
}; 