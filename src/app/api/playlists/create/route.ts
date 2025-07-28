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
    
    // Create playlist with better error handling
    let playlistId;
    try {
      playlistId = await spotifyService.createPlaylist(userId, name, description);
      
      if (!playlistId) {
        throw new Error('No playlist ID returned from Spotify API');
      }
      
      console.log('Playlist created successfully with ID:', playlistId);
    } catch (createError: any) {
      console.error('Error in createPlaylist:', createError);
      
      // Return a more detailed error response
      return NextResponse.json({ 
        error: 'Failed to create playlist',
        details: createError.message,
        suggestion: 'Please try again or create the playlist manually in Spotify'
      }, { status: 500 });
    }
    
    // Add tracks if provided
    if (trackUris && Array.isArray(trackUris) && trackUris.length > 0) {
      try {
        await spotifyService.addTracksToPlaylist(playlistId, trackUris);
        console.log(`Added ${trackUris.length} tracks to playlist`);
      } catch (addError: any) {
        console.error('Error adding tracks to playlist:', addError);
        // Continue even if adding tracks fails - playlist was created successfully
      }
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