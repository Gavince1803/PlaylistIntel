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
    
    const { name, description, trackUris } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Playlist name is required' }, { status: 400 });
    }
    
    const spotifyService = new SpotifyService(session.accessToken);
    
    // Get current user ID
    const userId = await spotifyService.getCurrentUserId();
    
    // Create playlist
    const playlistId = await spotifyService.createPlaylist(userId, name, description);
    
    // Add tracks if provided
    if (trackUris && Array.isArray(trackUris) && trackUris.length > 0) {
      await spotifyService.addTracksToPlaylist(playlistId, trackUris);
    }
    
    return NextResponse.json({ 
      success: true, 
      playlistId,
      message: `Playlist "${name}" created successfully`,
      tracksAdded: trackUris ? trackUris.length : 0
    });
  } catch (error: any) {
    console.error('Error creating playlist:', error);
    return NextResponse.json({ 
      error: 'Failed to create playlist',
      details: error.message 
    }, { status: 500 });
  }
} 