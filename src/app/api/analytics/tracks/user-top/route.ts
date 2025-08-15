import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('time_range') || 'medium_term'; // short_term, medium_term, long_term

    console.log(`📊 User Top Tracks: Fetching for time range: ${timeRange}`);

    // Get user's top tracks from Spotify (real data, not estimates)
    const topTracksResponse = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      }
    );

    if (!topTracksResponse.ok) {
      if (topTracksResponse.status === 429) {
        console.warn('Rate limit hit while fetching top tracks, waiting and retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Retry once
        const retryResponse = await fetch(
          `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`
            }
          }
        );
        
        if (!retryResponse.ok) {
          throw new Error(`Failed to fetch top tracks: ${retryResponse.status}`);
        }
        
        const retryData = await retryResponse.json();
        return NextResponse.json({ tracks: retryData.items || [] });
      }
      
      throw new Error(`Failed to fetch top tracks: ${topTracksResponse.status}`);
    }

    const topTracksData = await topTracksResponse.json();
    const tracks = topTracksData.items || [];

    console.log(`📊 User Top Tracks: Successfully fetched ${tracks.length} tracks`);

    // Enrich tracks with additional data
    const enrichedTracks = tracks.map((track: any, index: number) => ({
      id: track.id,
      name: track.name,
      artists: track.artists,
      album: track.album,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      external_urls: track.external_urls,
      rank: index + 1,
      // Add time range context
      timeRange: timeRange,
      // Calculate estimated play count based on rank and popularity
      estimatedPlays: Math.max(1, Math.round((51 - (index + 1)) * (track.popularity / 100) * 2))
    }));

    return NextResponse.json({
      tracks: enrichedTracks,
      timeRange: timeRange,
      total: tracks.length
    });

  } catch (error) {
    console.error('User Top Tracks API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch user top tracks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
