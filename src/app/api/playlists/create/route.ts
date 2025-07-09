import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { SpotifyService } from '@/lib/spotify';
import { authOptions } from '../../auth/authOptions';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      sourcePlaylistId, 
      name, 
      description, 
      filters 
    }: {
      sourcePlaylistId: string;
      name: string;
      description?: string;
      filters: {
        genres?: string[];
        minEnergy?: number;
        maxEnergy?: number;
        minDanceability?: number;
        maxDanceability?: number;
        minValence?: number;
        maxValence?: number;
        minTempo?: number;
        maxTempo?: number;
        acousticness?: 'acoustic' | 'electronic' | 'any';
        instrumentalness?: 'instrumental' | 'vocal' | 'any';
      };
    } = body;

    if (!sourcePlaylistId || !name) {
      return NextResponse.json({ error: 'Source playlist ID and name are required' }, { status: 400 });
    }

    const spotifyService = new SpotifyService(session.accessToken);
    
    // Get current user to create playlist
    const user = await spotifyService.getCurrentUser();
    
    // Fetch source playlist tracks with enrichment
    const tracks = await spotifyService.getPlaylistTracks(sourcePlaylistId);
    
    // Get unique artist IDs and fetch artist details
    const artistIds = Array.from(new Set(tracks.flatMap(track => track.artists.map(a => a.id))));
    const artists = await spotifyService.getArtists(artistIds);
    const artistGenres: Record<string, string[]> = {};
    artists.forEach(artist => {
      artistGenres[artist.id] = artist.genres;
    });
    
    // Fetch audio features
    const trackIds = tracks.map(track => track.id);
    const uniqueTrackIds = Array.from(new Set(trackIds));
    console.log('Track IDs for audio features:', uniqueTrackIds);
    let audioFeatures;
    try {
      audioFeatures = await spotifyService.getAudioFeatures(uniqueTrackIds);
    } catch (err: any) {
      console.error('Error from getAudioFeatures:', err && (err.body || err.message || err));
      throw err;
    }
    const audioFeaturesMap: Record<string, any> = {};
    audioFeatures.forEach(feature => {
      audioFeaturesMap[feature.id] = feature;
    });
    
    // Filter tracks based on criteria
    const filteredTracks = tracks.filter(track => {
      const trackGenres = Array.from(new Set(track.artists.flatMap(a => artistGenres[a.id] || [])));
      const features = audioFeaturesMap[track.id];
      
      if (!features) return false;
      
      // Genre filter
      if (filters.genres && filters.genres.length > 0) {
        const hasMatchingGenre = filters.genres.some(genre => 
          trackGenres.some(trackGenre => 
            trackGenre.toLowerCase().includes(genre.toLowerCase())
          )
        );
        if (!hasMatchingGenre) return false;
      }
      
      // Energy filter
      if (filters.minEnergy !== undefined && features.energy < filters.minEnergy) return false;
      if (filters.maxEnergy !== undefined && features.energy > filters.maxEnergy) return false;
      
      // Danceability filter
      if (filters.minDanceability !== undefined && features.danceability < filters.minDanceability) return false;
      if (filters.maxDanceability !== undefined && features.danceability > filters.maxDanceability) return false;
      
      // Valence (mood) filter
      if (filters.minValence !== undefined && features.valence < filters.minValence) return false;
      if (filters.maxValence !== undefined && features.valence > filters.maxValence) return false;
      
      // Tempo filter
      if (filters.minTempo !== undefined && features.tempo < filters.minTempo) return false;
      if (filters.maxTempo !== undefined && features.tempo > filters.maxTempo) return false;
      
      // Acousticness filter
      if (filters.acousticness === 'acoustic' && features.acousticness < 0.5) return false;
      if (filters.acousticness === 'electronic' && features.acousticness > 0.5) return false;
      
      // Instrumentalness filter
      if (filters.instrumentalness === 'instrumental' && features.instrumentalness < 0.5) return false;
      if (filters.instrumentalness === 'vocal' && features.instrumentalness > 0.5) return false;
      
      return true;
    });
    
    if (filteredTracks.length === 0) {
      return NextResponse.json({ 
        error: 'No tracks match the specified filters' 
      }, { status: 400 });
    }
    
    // Create new playlist
    const playlistId = await spotifyService.createPlaylist(user.id, name, description);
    
    // Add filtered tracks to the new playlist
    const trackUris = filteredTracks.map(track => track.uri);
    await spotifyService.addTracksToPlaylist(playlistId, trackUris);
    
    return NextResponse.json({ 
      success: true, 
      playlistId,
      trackCount: filteredTracks.length,
      originalTrackCount: tracks.length
    });
    
  } catch (error: any) {
    console.error('Error creating filtered playlist:', error && (error.body || error.message || error));
    return NextResponse.json({ error: 'Failed to create playlist', details: error && (error.body || error.message || error) }, { status: 500 });
  }
} 