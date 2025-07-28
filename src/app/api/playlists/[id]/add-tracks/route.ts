import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { SpotifyService } from '@/lib/spotify';
import { authOptions } from '../../../auth/authOptions';

export async function POST(request: NextRequest, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const playlistId = context.params.id;
    const { trackUris } = await request.json();
    
    if (!trackUris || !Array.isArray(trackUris) || trackUris.length === 0) {
      return NextResponse.json({ error: 'trackUris array is required' }, { status: 400 });
    }
    
    const spotifyService = new SpotifyService(session.accessToken);
    
    // Add tracks to the playlist
    await spotifyService.addTracksToPlaylist(playlistId, trackUris);
    
    return NextResponse.json({ 
      success: true, 
      message: `Added ${trackUris.length} track(s) to playlist`,
      addedTracks: trackUris.length
    });
  } catch (error: any) {
    console.error('Error adding tracks to playlist:', error);
    return NextResponse.json({ 
      error: 'Failed to add tracks to playlist',
      details: error.message 
    }, { status: 500 });
  }
} 