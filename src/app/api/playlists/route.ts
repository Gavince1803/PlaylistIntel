import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { SpotifyService } from '@/lib/spotify';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const spotifyService = new SpotifyService(session.accessToken);
    const playlists = await spotifyService.getUserPlaylists(limit, offset);

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
} 