import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { SpotifyService } from '@/lib/spotify';
import { authOptions } from '../../../auth/authOptions';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const playlistId = params.id;
    const spotifyService = new SpotifyService(session.accessToken);
    
    // Fetch tracks for the playlist
    const tracks = await spotifyService.getPlaylistTracks(playlistId);
    
    // Get unique artist IDs
    const artistIds = Array.from(new Set(tracks.flatMap(track => track.artists.map(a => a.id))));
    
    // Fetch artist details and genres using the public method
    const artists = await spotifyService.getArtists(artistIds);
    const artistGenres: Record<string, string[]> = {};
    artists.forEach(artist => {
      artistGenres[artist.id] = artist.genres;
    });
    
    // Fetch audio features using the public method
    const trackIds = tracks.map(track => track.id);
    const audioFeatures = await spotifyService.getAudioFeatures(trackIds);
    const audioFeaturesMap: Record<string, any> = {};
    audioFeatures.forEach(feature => {
      audioFeaturesMap[feature.id] = feature;
    });
    
    // Enrich tracks with genres and audio features
    const enrichedTracks = tracks.map(track => ({
      ...track,
      genres: Array.from(new Set(track.artists.flatMap(a => artistGenres[a.id] || []))),
      audioFeatures: audioFeaturesMap[track.id] || null,
    }));
    
    return NextResponse.json({ tracks: enrichedTracks });
  } catch (error) {
    console.error('Error fetching playlist tracks with enrichment:', error);
    return NextResponse.json({ error: 'Failed to fetch playlist tracks' }, { status: 500 });
  }
} 