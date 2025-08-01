import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';
import { SpotifyService } from '@/lib/spotify';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spotifyService = new SpotifyService(session.accessToken);

    // Get ALL user's playlists using pagination
    const getAllPlaylists = async () => {
      const allPlaylists = [];
      let offset = 0;
      const limit = 50;
      
      while (true) {
        const playlistsResponse = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        });

        if (!playlistsResponse.ok) {
          throw new Error('Failed to fetch playlists');
        }

        const playlistsData = await playlistsResponse.json();
        const playlists = playlistsData.items;
        
        if (playlists.length === 0) {
          break; // No more playlists
        }
        
        allPlaylists.push(...playlists);
        offset += limit;
        
        if (playlists.length < limit) {
          break; // Last batch
        }
      }
      
      return allPlaylists;
    };

    const playlists = await getAllPlaylists();
    console.log(`📊 Genres API: Fetched ${playlists.length} total playlists`);

    // Get tracks from all playlists
    const allTracks: any[] = [];
    
    for (const playlist of playlists) {
      try {
        const tracks = await spotifyService.getAllPlaylistTracks(playlist.id, 2000);
        allTracks.push(...tracks.map(track => ({
          ...track,
          playlistName: playlist.name,
          playlistId: playlist.id
        })));
      } catch (error) {
        console.warn(`Failed to fetch tracks for playlist ${playlist.id}:`, error);
      }
    }

    console.log(`📊 Genres API: Total tracks collected: ${allTracks.length}`);

    // Get unique artist IDs
    const artistIds = Array.from(new Set(allTracks.flatMap(track => track.artists.map((a: any) => a.id))));
    
    // Fetch artist details and genres
    const artists = await spotifyService.getArtists(artistIds);
    const artistGenres: Record<string, string[]> = {};
    artists.forEach(artist => {
      artistGenres[artist.id] = artist.genres;
    });

    // Group tracks by genre
    const genreTracks: Record<string, any[]> = {};
    
    allTracks.forEach(track => {
      const trackGenres = track.artists.flatMap((artist: any) => artistGenres[artist.id] || []);
      
      trackGenres.forEach(genre => {
        if (!genreTracks[genre]) {
          genreTracks[genre] = [];
        }
        genreTracks[genre].push(track);
      });
    });

    // Convert to array format with counts
    const genresWithTracks = Object.entries(genreTracks).map(([genre, tracks]) => ({
      genre,
      trackCount: tracks.length,
      tracks: tracks.slice(0, 50) // Limit to 50 tracks per genre for performance
    }));

    // Sort by track count (descending)
    genresWithTracks.sort((a, b) => b.trackCount - a.trackCount);

    console.log(`📊 Genres API: Found ${genresWithTracks.length} unique genres`);

    return NextResponse.json({
      genres: genresWithTracks,
      totalGenres: genresWithTracks.length,
      totalTracks: allTracks.length
    });

  } catch (error) {
    console.error('Genres API error:', error);
    return NextResponse.json({ error: 'Failed to fetch genres data' }, { status: 500 });
  }
} 