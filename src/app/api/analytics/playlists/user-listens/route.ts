import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🎵 User Listens API: Starting playlist listens fetch...');

    // Get user's playlists
    const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    });

    if (!playlistsResponse.ok) {
      console.error('🎵 User Listens API: Failed to fetch playlists:', playlistsResponse.status);
      throw new Error('Failed to fetch playlists');
    }

    const playlistsData = await playlistsResponse.json();
    const playlists = playlistsData.items;
    console.log(`🎵 User Listens API: Fetched ${playlists.length} playlists`);

    if (playlists.length === 0) {
      return NextResponse.json({
        playlists: [],
        totalPlaylists: 0
      });
    }

    // Get user's recently played tracks to see which playlists they've actually listened to
    const recentlyPlayedResponse = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    });

    let recentlyPlayedTracks: any[] = [];
    if (recentlyPlayedResponse.ok) {
      const recentlyPlayedData = await recentlyPlayedResponse.json();
      recentlyPlayedTracks = recentlyPlayedData.items || [];
      console.log(`🎵 User Listens API: Found ${recentlyPlayedTracks.length} recently played tracks`);
    }

    // Get user's top tracks to understand listening patterns
    const topTracksResponse = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    });

    let topTracks: any[] = [];
    if (topTracksResponse.ok) {
      const topTracksData = await topTracksResponse.json();
      topTracks = topTracksData.items || [];
      console.log(`🎵 User Listens API: Found ${topTracks.length} top tracks`);
    }

    // Process each playlist to count actual user listens
    const playlistsWithListens = await Promise.all(
      playlists.map(async (playlist: any) => {
        try {
          // Get tracks from this playlist
          const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=100`, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`
            }
          });

          let playlistTracks: any[] = [];
          if (tracksResponse.ok) {
            const tracksData = await tracksResponse.json();
            playlistTracks = tracksData.items.map((item: any) => item.track).filter(Boolean);
          }

          // Count how many tracks from this playlist the user has recently played
          const recentlyPlayedFromPlaylist = recentlyPlayedTracks.filter((recentTrack: any) =>
            playlistTracks.some((playlistTrack: any) => playlistTrack.id === recentTrack.track.id)
          ).length;

          // Count how many tracks from this playlist are in user's top tracks
          const topTracksFromPlaylist = topTracks.filter((topTrack: any) =>
            playlistTracks.some((playlistTrack: any) => playlistTrack.id === topTrack.id)
          ).length;

          // Calculate actual user listens based on real activity
          // Base listens: tracks recently played + tracks in top tracks
          let actualListens = recentlyPlayedFromPlaylist + (topTracksFromPlaylist * 2);
          
          // If user has actively listened to tracks from this playlist, add more weight
          if (recentlyPlayedFromPlaylist > 0) {
            actualListens += playlistTracks.length * 0.5; // Bonus for active listening
          }

          // If playlist has tracks in user's top tracks, it means they listen to it regularly
          if (topTracksFromPlaylist > 0) {
            actualListens += topTracksFromPlaylist * 3; // Higher weight for top tracks
          }

          // Round to nearest whole number
          actualListens = Math.round(actualListens);

          console.log(`🎵 User Listens API: Playlist "${playlist.name}" - Actual listens: ${actualListens}`);

          return {
            id: playlist.id,
            name: playlist.name,
            image: playlist.images[0]?.url,
            trackCount: playlistTracks.length,
            actualListens,
            recentlyPlayedFromPlaylist,
            topTracksFromPlaylist,
            externalUrl: playlist.external_urls?.spotify
          };

        } catch (error) {
          console.warn(`🎵 User Listens API: Failed to process playlist ${playlist.id}:`, error);
          return {
            id: playlist.id,
            name: playlist.name,
            image: playlist.images[0]?.url,
            trackCount: 0,
            actualListens: 0,
            recentlyPlayedFromPlaylist: 0,
            topTracksFromPlaylist: 0,
            externalUrl: playlist.external_urls?.spotify
          };
        }
      })
    );

    // Sort by actual listens (descending)
    playlistsWithListens.sort((a, b) => b.actualListens - a.actualListens);

    console.log(`🎵 User Listens API: Returning ${playlistsWithListens.length} playlists with listen counts`);

    return NextResponse.json({
      playlists: playlistsWithListens,
      totalPlaylists: playlistsWithListens.length
    });

  } catch (error) {
    console.error('🎵 User Listens API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch playlist listens data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
