import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's playlists first
    const getPlaylists = async () => {
      const allPlaylists = [];
      let offset = 0;
      const limit = 50;
      const maxPlaylists = 100; // Limit to avoid rate limits
      
      while (allPlaylists.length < maxPlaylists) {
        const playlistsResponse = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        });

        if (!playlistsResponse.ok) {
          if (playlistsResponse.status === 429) {
            console.warn('Rate limit hit while fetching playlists, waiting and retrying...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          throw new Error('Failed to fetch playlists');
        }

        const playlistsData = await playlistsResponse.json();
        const playlists = playlistsData.items;
        
        if (playlists.length === 0) break;
        
        allPlaylists.push(...playlists);
        offset += limit;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (playlists.length < limit) break;
      }
      
      return allPlaylists;
    };

    const playlists = await getPlaylists();
    console.log(`📊 Most Played Tracks: Fetched ${playlists.length} playlists`);
    
    if (playlists.length === 0) {
      return NextResponse.json({ tracks: [] });
    }

    // Get all tracks from all playlists
    const allTracks: { [key: string]: any } = {};
    
    for (const playlist of playlists) {
      try {
        const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=100`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        });

        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          const tracks = tracksData.items.map((item: any) => item.track).filter(Boolean);
          
          tracks.forEach((track: any) => {
            if (track?.id) {
              if (allTracks[track.id]) {
                // Track already exists, increment count
                allTracks[track.id].playCount++;
                allTracks[track.id].playlists.push(playlist.id);
              } else {
                // New track
                allTracks[track.id] = {
                  id: track.id,
                  name: track.name,
                  artists: track.artists,
                  album: track.album,
                  duration_ms: track.duration_ms,
                  popularity: track.popularity,
                  playCount: 1,
                  playlists: [playlist.id],
                  external_urls: track.external_urls
                };
              }
            }
          });
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.warn(`Failed to get tracks for playlist ${playlist.id}:`, error);
      }
    }

    // Convert to array and sort by play count
    const tracksArray = Object.values(allTracks)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 25); // Top 25

    console.log(`📊 Most Played Tracks: Found ${tracksArray.length} unique tracks`);

    return NextResponse.json({
      tracks: tracksArray
    });

  } catch (error) {
    console.error('Most Played Tracks API error:', error);
    return NextResponse.json({ error: 'Failed to fetch most played tracks' }, { status: 500 });
  }
}
