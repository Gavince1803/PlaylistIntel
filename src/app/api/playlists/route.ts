import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { SpotifyService } from '@/lib/spotify';
import { authOptions } from '../auth/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', JSON.stringify(session));
    
    if (!session?.accessToken) {
      console.warn('No access token in session:', session);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('Fetching playlists from Spotify with limit:', limit, 'offset:', offset);
    const spotifyService = new SpotifyService(session.accessToken);
    const playlists = await spotifyService.getUserPlaylists(limit, offset);
    console.log('Fetched playlists:', playlists.length);

    return NextResponse.json({ playlists });
  } catch (error: any) {
    console.error('Error fetching playlists:', error && (error.stack || error.message || error));
    return NextResponse.json(
      { error: 'Failed to fetch playlists', details: error && (error.stack || error.message || error) },
      { status: 500 }
    );
  }
} 