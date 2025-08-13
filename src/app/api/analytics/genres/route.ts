import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🎵 Genres API: Starting genres fetch...');

    // Get user's playlists (limit to first 50 for performance)
    const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    });

    if (!playlistsResponse.ok) {
      console.error('🎵 Genres API: Failed to fetch playlists:', playlistsResponse.status);
      throw new Error('Failed to fetch playlists');
    }

    const playlistsData = await playlistsResponse.json();
    const playlists = playlistsData.items;
    console.log(`🎵 Genres API: Fetched ${playlists.length} playlists`);

    if (playlists.length === 0) {
      return NextResponse.json({
        genres: [],
        totalGenres: 0,
        totalTracks: 0
      });
    }

    // Get tracks from first 5 playlists to avoid rate limits
    const allTracks: any[] = [];
    const playlistsToProcess = playlists.slice(0, 5);
    
    for (const playlist of playlistsToProcess) {
      try {
        console.log(`🎵 Genres API: Processing playlist: ${playlist.name}`);
        
        const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=100`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        });

        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          const tracks = tracksData.items.map((item: any) => item.track).filter(Boolean);
          
          allTracks.push(...tracks.map(track => ({
            ...track,
            playlistName: playlist.name,
            playlistId: playlist.id
          })));
          
          console.log(`🎵 Genres API: Added ${tracks.length} tracks from ${playlist.name}`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`🎵 Genres API: Failed to fetch tracks for playlist ${playlist.id}:`, error);
      }
    }

    console.log(`🎵 Genres API: Total tracks collected: ${allTracks.length}`);

    if (allTracks.length === 0) {
      return NextResponse.json({
        genres: [],
        totalGenres: 0,
        totalTracks: 0
      });
    }

    // Get unique artist IDs
    const artistIds = Array.from(new Set(allTracks.flatMap(track => track.artists.map((a: any) => a.id))));
    console.log(`🎵 Genres API: Found ${artistIds.length} unique artists`);

    if (artistIds.length === 0) {
      return NextResponse.json({
        genres: [],
        totalGenres: 0,
        totalTracks: allTracks.length
      });
    }

    // Fetch artist details and genres (limit to first 20 artists to avoid rate limits)
    const artistsToFetch = artistIds.slice(0, 20);
    const artistsResponse = await fetch(`https://api.spotify.com/v1/artists?ids=${artistsToFetch.join(',')}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    });

    if (!artistsResponse.ok) {
      console.error('🎵 Genres API: Failed to fetch artists:', artistsResponse.status);
      throw new Error('Failed to fetch artists');
    }

    const artistsData = await artistsResponse.json();
    const artists = artistsData.artists;
    console.log(`🎵 Genres API: Successfully fetched ${artists.length} artists`);

    // Create artist-genre mapping
    const artistGenres: Record<string, string[]> = {};
    artists.forEach(artist => {
      if (artist && artist.genres) {
        artistGenres[artist.id] = artist.genres;
      }
    });

    // Group tracks by genre
    const genreTracks: Record<string, any[]> = {};
    
    allTracks.forEach(track => {
      const trackGenres = track.artists.flatMap((artist: any) => artistGenres[artist.id] || []);
      
      trackGenres.forEach((genre: string) => {
        if (genre && genre.trim()) {
          if (!genreTracks[genre]) {
            genreTracks[genre] = [];
          }
          genreTracks[genre].push(track);
        }
      });
    });

    console.log(`🎵 Genres API: Found ${Object.keys(genreTracks).length} unique genres`);

    // Convert to array format with counts
    const genresWithTracks = Object.entries(genreTracks).map(([genre, tracks]) => ({
      genre,
      trackCount: tracks.length,
      tracks: tracks.slice(0, 20) // Limit tracks per genre
    }));

    // Sort by track count (descending)
    genresWithTracks.sort((a, b) => b.trackCount - a.trackCount);

    console.log(`🎵 Genres API: Returning ${genresWithTracks.length} genres`);

    return NextResponse.json({
      genres: genresWithTracks,
      totalGenres: genresWithTracks.length,
      totalTracks: allTracks.length
    });

  } catch (error) {
    console.error('🎵 Genres API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch genres data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 