import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/authOptions';
import { SpotifyService } from '@/lib/spotify';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ genre: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { genre } = await params;
    const decodedGenre = decodeURIComponent(genre);
    
    console.log(`🎵 Genre Tracks API: Fetching tracks for genre: ${decodedGenre}`);

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

    // Get unique artist IDs
    const artistIds = Array.from(new Set(allTracks.flatMap(track => track.artists.map((a: any) => a.id))));
    
    // Fetch artist details and genres
    const artists = await spotifyService.getArtists(artistIds);
    const artistGenres: Record<string, string[]> = {};
    artists.forEach(artist => {
      artistGenres[artist.id] = artist.genres;
    });

    // Filter tracks by the specific genre
    const genreTracks = allTracks.filter(track => {
      const trackGenres = track.artists.flatMap((artist: any) => artistGenres[artist.id] || []);
      return trackGenres.includes(decodedGenre);
    });

    console.log(`🎵 Genre Tracks API: Found ${genreTracks.length} tracks for genre "${decodedGenre}"`);

    // Remove duplicates based on track ID
    const uniqueTracks = genreTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    );

    // Sort by popularity (if available) or alphabetically
    uniqueTracks.sort((a, b) => {
      // First sort by playlist name, then by track name
      if (a.playlistName !== b.playlistName) {
        return a.playlistName.localeCompare(b.playlistName);
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      genre: decodedGenre,
      tracks: uniqueTracks,
      totalTracks: uniqueTracks.length,
      playlists: Array.from(new Set(uniqueTracks.map(track => track.playlistName)))
    });

  } catch (error) {
    console.error('Genre Tracks API error:', error);
    return NextResponse.json({ error: 'Failed to fetch genre tracks' }, { status: 500 });
  }
} 