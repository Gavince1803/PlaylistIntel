import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/authOptions';

// Utility function to fetch with retry and rate limit handling
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limited - wait longer and retry
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        console.log(`🎵 Rate limited, waiting ${waitTime}ms before retry ${attempt}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`🎵 Fetch attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🎵 User Listens API: Starting playlist listens fetch...');

    // Get user's playlists (limit to first 20 for performance)
    const playlistsResponse = await fetchWithRetry('https://api.spotify.com/v1/me/playlists?limit=20', {
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

    // Try to get user's recently played tracks (limit to 20 for performance)
    let recentlyPlayedTracks: any[] = [];
    try {
      const recentlyPlayedResponse = await fetchWithRetry('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });

      if (recentlyPlayedResponse.ok) {
        const recentlyPlayedData = await recentlyPlayedResponse.json();
        recentlyPlayedTracks = recentlyPlayedData.items || [];
        console.log(`🎵 User Listens API: Found ${recentlyPlayedTracks.length} recently played tracks`);
      }
    } catch (error) {
      console.warn('🎵 User Listens API: Failed to fetch recently played tracks, continuing with basic data');
    }

    // Try to get user's top tracks (limit to 20 for performance)
    let topTracks: any[] = [];
    try {
      const topTracksResponse = await fetchWithRetry('https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=medium_term', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });

      if (topTracksResponse.ok) {
        const topTracksData = await topTracksResponse.json();
        topTracks = topTracksData.items || [];
        console.log(`🎵 User Listens API: Found ${topTracks.length} top tracks`);
      }
    } catch (error) {
      console.warn('🎵 User Listens API: Failed to fetch top tracks, continuing with basic data');
    }

    // Process only first 10 playlists to avoid rate limits
    const playlistsToProcess = playlists.slice(0, 10);
    const playlistsWithListens = [];

    for (const playlist of playlistsToProcess) {
      try {
        console.log(`🎵 User Listens API: Processing playlist: ${playlist.name}`);
        
        // Get tracks from this playlist (limit to 50 tracks)
        let playlistTracks: any[] = [];
        
        // Fetch playlist tracks
        try {
          const tracksResponse = await fetchWithRetry(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=10`, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`
            }
          });

          if (!tracksResponse.ok) {
            if (tracksResponse.status === 403) {
              console.warn(`🎵 User Listens API: 403 Forbidden for playlist "${playlist.name}" - skipping`);
              // Skip this playlist if we don't have permission
              continue;
            }
            console.warn(`🎵 User Listens API: Failed to fetch tracks for playlist "${playlist.name}" - status: ${tracksResponse.status}`);
            // Continue with basic data
          } else {
            const tracksData = await tracksResponse.json();
            playlistTracks = tracksData.items.map((item: any) => item.track).filter((track: any) => track);
          }
        } catch (error) {
          console.warn(`🎵 User Listens API: Error fetching tracks for playlist "${playlist.name}":`, error);
          // Continue with basic data
        }

        // Count how many tracks from this playlist the user has recently played
        const recentlyPlayedFromPlaylist = recentlyPlayedTracks.filter((recentTrack: any) =>
          playlistTracks.some((playlistTrack: any) => playlistTrack.id === recentTrack.track.id)
        ).length;

        // Count how many tracks from this playlist are in user's top tracks
        const topTracksFromPlaylist = topTracks.filter((topTrack: any) =>
          playlistTracks.some((playlistTrack: any) => playlistTrack.id === topTrack.id)
        ).length;

        // Simplified calculation: focus on actual user activity
        let actualListens = 0;
        
        // Base listens from recently played tracks
        actualListens += recentlyPlayedFromPlaylist * 2;
        
        // Additional listens from top tracks (indicates regular listening)
        actualListens += topTracksFromPlaylist * 3;
        
        // If user has any activity with this playlist, add a base score
        if (recentlyPlayedFromPlaylist > 0 || topTracksFromPlaylist > 0) {
          actualListens += 5; // Base score for active playlists
        }

        // Fallback: if we couldn't get detailed data, provide a basic score based on playlist properties
        if (actualListens === 0 && playlistTracks.length > 0) {
          actualListens = Math.max(1, Math.floor(playlistTracks.length / 10)); // At least 1 listen per 10 tracks
        }

        const playlistWithListens = {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          image: playlist.images && playlist.images.length > 0 && playlist.images[0]?.url ? playlist.images[0].url : null,
          trackCount: playlistTracks.length,
          actualListens,
          recentlyPlayedFromPlaylist,
          topTracksFromPlaylist,
          owner: playlist.owner,
          public: playlist.public,
          collaborative: playlist.collaborative,
          followers: playlist.followers?.total || 0,
          createdAt: playlist.created_at
        };

        playlistsWithListens.push(playlistWithListens);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.warn(`🎵 User Listens API: Failed to process playlist ${playlist.id}:`, error);
        // Add playlist with basic data if processing fails
        playlistsWithListens.push({
          id: playlist.id,
          name: playlist.name,
          image: playlist.images[0]?.url,
          trackCount: 0,
          actualListens: 1, // Give at least 1 listen
          recentlyPlayedFromPlaylist: 0,
          topTracksFromPlaylist: 0,
          externalUrl: playlist.external_urls?.spotify
        });
      }
    }

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
