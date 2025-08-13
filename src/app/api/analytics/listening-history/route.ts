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
    const limit = parseInt(searchParams.get('limit') || '50');
    const maxLimit = Math.min(limit, 50); // Spotify API max is 50

    console.log(`📊 Listening History: Fetching last ${maxLimit} played tracks`);

    // Get user's recently played tracks (real data)
    const recentlyPlayedResponse = await fetch(
      `https://api.spotify.com/v1/me/player/recently-played?limit=${maxLimit}`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      }
    );

    if (!recentlyPlayedResponse.ok) {
      if (recentlyPlayedResponse.status === 429) {
        console.warn('Rate limit hit while fetching listening history, waiting and retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Retry once
        const retryResponse = await fetch(
          `https://api.spotify.com/v1/me/player/recently-played?limit=${maxLimit}`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`
            }
          }
        );
        
        if (!retryResponse.ok) {
          throw new Error(`Failed to fetch listening history: ${retryResponse.status}`);
        }
        
        const retryData = await retryResponse.json();
        return NextResponse.json({ 
          tracks: retryData.items || [],
          total: retryData.items?.length || 0
        });
      }
      
      throw new Error(`Failed to fetch listening history: ${recentlyPlayedResponse.status}`);
    }

    const listeningHistoryData = await recentlyPlayedResponse.json();
    const tracks = listeningHistoryData.items || [];

    console.log(`📊 Listening History: Successfully fetched ${tracks.length} tracks`);

    // Process and enrich the listening history
    const enrichedHistory = tracks.map((item: any, index: number) => {
      const track = item.track;
      const playedAt = new Date(item.played_at);
      const now = new Date();
      const timeAgo = Math.floor((now.getTime() - playedAt.getTime()) / (1000 * 60)); // minutes ago

      return {
        id: track.id,
        name: track.name,
        artists: track.artists,
        album: track.album,
        duration_ms: track.duration_ms,
        popularity: track.popularity,
        external_urls: track.external_urls,
        playedAt: item.played_at,
        timeAgo: timeAgo,
        timeAgoFormatted: formatTimeAgo(timeAgo),
        rank: index + 1
      };
    });

    // Group tracks by time periods for insights
    const timeGroups = {
      lastHour: enrichedHistory.filter((track: any) => track.timeAgo < 60).length,
      lastDay: enrichedHistory.filter((track: any) => track.timeAgo < 1440).length, // 24 hours
      lastWeek: enrichedHistory.filter((track: any) => track.timeAgo < 10080).length, // 7 days
      older: enrichedHistory.filter((track: any) => track.timeAgo >= 10080).length
    };

    // Get unique artists from recent history
    const uniqueArtists = Array.from(new Set(
      enrichedHistory.flatMap((track: any) => track.artists.map((artist: any) => artist.name))
    ));

    // Get unique albums from recent history
    const uniqueAlbums = Array.from(new Set(
      enrichedHistory.map((track: any) => track.album.name)
    ));

    return NextResponse.json({
      tracks: enrichedHistory,
      total: tracks.length,
      timeGroups,
      uniqueArtists: uniqueArtists.length,
      uniqueAlbums: uniqueAlbums.length,
      listeningInsights: {
        mostActivePeriod: getMostActivePeriod(timeGroups),
        averageTracksPerDay: Math.round(tracks.length / 7), // Assuming 7 days of history
        diversity: {
          artists: uniqueArtists.length,
          albums: uniqueAlbums.length,
          genres: 'Not available' // Spotify doesn't provide this in recently played
        }
      }
    });

  } catch (error) {
    console.error('Listening History API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch listening history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to format time ago
function formatTimeAgo(minutes: number): string {
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

// Helper function to determine most active listening period
function getMostActivePeriod(timeGroups: any): string {
  const { lastHour, lastDay, lastWeek, older } = timeGroups;
  
  if (lastHour > lastDay * 0.3) return 'Very recent (last hour)';
  if (lastDay > lastWeek * 0.4) return 'Recent (last day)';
  if (lastWeek > older * 0.6) return 'This week';
  return 'Spread out over time';
}
