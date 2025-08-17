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
    const useFullPagination = searchParams.get('full') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('Fetching playlists from Spotify:', { useFullPagination, limit, offset });
    const spotifyService = new SpotifyService(session.accessToken);
    
    let playlists;
    try {
      if (useFullPagination) {
        // Get ALL playlists using pagination
        playlists = await spotifyService.getAllUserPlaylists(1000);
        console.log('Fetched ALL playlists using pagination:', playlists.length);
      } else {
        // Get paginated playlists (for backward compatibility)
        playlists = await spotifyService.getUserPlaylists(limit, offset);
        console.log('Fetched paginated playlists:', playlists.length);
      }
      
      console.log('First playlist sample:', playlists[0] ? {
        id: playlists[0].id,
        name: playlists[0].name,
        tracks: playlists[0].tracks.total,
        hasImages: playlists[0].images && playlists[0].images.length > 0
      } : 'No playlists');
    } catch (error: any) {
      console.error('Error in getUserPlaylists:', error && (error.body || error.message || error));
      
      // Handle specific error types with better messages
      if (error.statusCode === 403 || error.message?.includes('Access forbidden')) {
        console.log('🚫 403 Forbidden error detected');
        return NextResponse.json(
          { 
            error: 'Access forbidden', 
            message: 'Your Spotify app is in Development Mode. This means only test users can access it. To fix this: 1) Go to Spotify Developer Dashboard, 2) Add your email as a test user, or 3) Switch to Production Mode (requires business verification).',
            code: 'FORBIDDEN',
            solution: 'Add test users or switch to Production Mode in Spotify Developer Dashboard'
          },
          { status: 403 }
        );
      } else if (error.statusCode === 401 || error.message?.includes('Authentication failed')) {
        console.log('🔐 401 Authentication error detected');
        return NextResponse.json(
          { 
            error: 'Authentication failed', 
            message: 'Your Spotify session has expired. Please log in again.',
            code: 'AUTH_FAILED',
            solution: 'Refresh the page and sign in again'
          },
          { status: 401 }
        );
      } else if (error.statusCode === 429 || error.message?.includes('rate limit')) {
        console.log('⏰ 429 Rate limit error detected');
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded', 
            message: 'Spotify API rate limit exceeded. The app will automatically retry with delays. Please wait a moment.',
            code: 'RATE_LIMIT',
            solution: 'Wait a few minutes for rate limits to reset, or refresh the page'
          },
          { status: 429 }
        );
      }
      
      // Log unknown errors for debugging
      console.log('❌ Unknown error type:', {
        statusCode: error.statusCode,
        message: error.message,
        body: error.body
      });
      
      throw error;
    }

    return NextResponse.json({ playlists });
  } catch (error: any) {
    console.error('Error fetching playlists:', error && (error.stack || error.message || error));
    return NextResponse.json(
      { error: 'Failed to fetch playlists', details: error && (error.stack || error.message || error) },
      { status: 500 }
    );
  }
} 