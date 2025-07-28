import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { SpotifyService } from '@/lib/spotify';
import { authOptions } from '../../auth/authOptions';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación del usuario
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const spotifyService = new SpotifyService(session.accessToken);
    const tracks = await spotifyService.searchTracks(query, limit);

    return NextResponse.json({ tracks });
  } catch (error: any) {
    console.error('Error searching tracks:', error);
    return NextResponse.json({ 
      error: 'Failed to search tracks',
      details: error.message 
    }, { status: 500 });
  }
} 