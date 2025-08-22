import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ 
        error: 'No session or access token',
        hasSession: !!session,
        hasAccessToken: !!session?.accessToken
      }, { status: 401 });
    }

    console.log('🔍 Spotify Debug: Starting diagnostic...');
    
    // Test 1: Basic user info
    let userInfo = null;
    try {
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (userResponse.ok) {
        userInfo = await userResponse.json();
        console.log('✅ Spotify Debug: User info successful');
      } else {
        console.log('❌ Spotify Debug: User info failed:', userResponse.status, userResponse.statusText);
      }
    } catch (error) {
      console.log('❌ Spotify Debug: User info error:', error);
    }

    // Test 2: Simple playlist fetch
    let playlistTest = null;
    try {
      const playlistResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=5', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (playlistResponse.ok) {
        const playlistData = await playlistResponse.json();
        playlistTest = {
          total: playlistData.total,
          items: playlistData.items.length,
          firstPlaylist: playlistData.items[0]?.name || 'None'
        };
        console.log('✅ Spotify Debug: Playlist test successful');
      } else {
        console.log('❌ Spotify Debug: Playlist test failed:', playlistResponse.status, playlistResponse.statusText);
        const errorText = await playlistResponse.text();
        console.log('❌ Spotify Debug: Playlist error details:', errorText);
      }
    } catch (error) {
      console.log('❌ Spotify Debug: Playlist test error:', error);
    }

    // Test 3: Top tracks
    let topTracksTest = null;
    try {
      const topTracksResponse = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=5', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (topTracksResponse.ok) {
        const topTracksData = await topTracksResponse.json();
        topTracksTest = {
          total: topTracksData.total,
          items: topTracksData.items.length,
          firstTrack: topTracksData.items[0]?.name || 'None'
        };
        console.log('✅ Spotify Debug: Top tracks test successful');
      } else {
        console.log('❌ Spotify Debug: Top tracks test failed:', topTracksResponse.status, topTracksResponse.statusText);
        const errorText = await topTracksResponse.text();
        console.log('❌ Spotify Debug: Top tracks error details:', errorText);
      }
    } catch (error) {
      console.log('❌ Spotify Debug: Top tracks test error:', error);
    }

    // Test 4: Check token validity
    const tokenInfo = {
      hasToken: !!session.accessToken,
      tokenLength: session.accessToken?.length || 0,
      tokenStart: session.accessToken?.substring(0, 10) + '...' || 'None',
      expiresAt: session.expiresAt,
      currentTime: Date.now()
    };

    console.log('🔍 Spotify Debug: Diagnostic complete');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tokenInfo,
      tests: {
        userInfo: userInfo ? 'SUCCESS' : 'FAILED',
        playlists: playlistTest ? 'SUCCESS' : 'FAILED',
        topTracks: topTracksTest ? 'SUCCESS' : 'FAILED'
      },
      results: {
        userInfo,
        playlistTest,
        topTracksTest
      },
      recommendations: [
        'Check if your Spotify app is in Development Mode',
        'Verify you are added as a test user if in Development Mode',
        'Check app permissions in Spotify Developer Dashboard',
        'Verify environment variables are correct'
      ]
    });

  } catch (error) {
    console.error('❌ Spotify Debug: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
