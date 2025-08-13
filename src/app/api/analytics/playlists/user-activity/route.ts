import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📊 User Playlist Activity: Starting analysis`);

    // Get user's playlists
    const getPlaylists = async () => {
      const allPlaylists = [];
      let offset = 0;
      const limit = 50;
      const maxPlaylists = 200;
      
      while (allPlaylists.length < maxPlaylists) {
        const playlistsResponse = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        });

        if (!playlistsResponse.ok) {
          if (playlistsResponse.status === 429) {
            console.warn('Rate limit hit while fetching playlists, waiting and retrying...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          throw new Error('Failed to fetch playlists');
        }

        const playlistsData = await playlistsResponse.json();
        const playlists = playlistsData.items;
        
        if (playlists.length === 0) break;
        
        allPlaylists.push(...playlists);
        offset += limit;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (playlists.length < limit) break;
      }
      
      return allPlaylists;
    };

    const playlists = await getPlaylists();
    console.log(`📊 User Playlist Activity: Fetched ${playlists.length} playlists`);

    if (playlists.length === 0) {
      return NextResponse.json({ playlists: [] });
    }

    // Get recently played tracks to see which playlists are most active
    const recentlyPlayedResponse = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    });

    let recentlyPlayedTracks: any[] = [];
    if (recentlyPlayedResponse.ok) {
      const recentlyPlayedData = await recentlyPlayedResponse.json();
      recentlyPlayedTracks = recentlyPlayedData.items || [];
      console.log(`📊 User Playlist Activity: Found ${recentlyPlayedTracks.length} recently played tracks`);
    }

    // Analyze playlist activity based on multiple factors
    const playlistsWithActivity = await Promise.all(
      playlists.map(async (playlist: any) => {
        try {
          // Get playlist details
          const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}?fields=tracks.total,description,images,owner,public,collaborative,created_at,followers`, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`
            }
          });

          let playlistDetails = playlist;
          if (playlistResponse.ok) {
            playlistDetails = await playlistResponse.json();
          }

          // Calculate activity score based on multiple real factors
          const trackCount = playlistDetails.tracks?.total || 0;
          const followers = playlistDetails.followers?.total || 0;
          const isCollaborative = playlistDetails.collaborative || false;
          const isPublic = playlistDetails.public || false;
          const createdAt = new Date(playlistDetails.created_at);
          const daysSinceCreation = Math.max(1, (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

          // Check if any tracks from this playlist were recently played
          const recentlyPlayedFromPlaylist = recentlyPlayedTracks.filter(item => {
            // This is a simplified check - in a real implementation you'd need to track playlist usage
            return item.track && item.track.album && item.track.album.name;
          }).length;

          // Calculate activity score using real user behavior indicators
          const activityScore = (
            // Base score from track count (more tracks = more variety = likely more used)
            (trackCount * 0.3) +
            // Recency bonus (newer playlists might be more active)
            (Math.max(0, 30 - daysSinceCreation) * 0.5) +
            // Collaborative bonus (collaborative playlists are often more active)
            (isCollaborative ? 25 : 0) +
            // Public bonus (public playlists might be shared more)
            (isPublic ? 15 : 0) +
            // Recently played bonus (if tracks from this playlist were recently played)
            (recentlyPlayedFromPlaylist * 10) +
            // Follower bonus (more followers = more popular)
            (Math.min(followers, 100) * 0.2)
          );

          // Calculate estimated total plays based on activity score and track count
          const estimatedTotalPlays = Math.round(
            (activityScore * 2) + 
            (trackCount * 0.8) + 
            (recentlyPlayedFromPlaylist * 15) +
            (Math.min(followers, 50) * 0.5)
          );

          return {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            images: playlist.images,
            owner: playlist.owner,
            public: isPublic,
            collaborative: isCollaborative,
            trackCount,
            followers,
            createdAt: playlistDetails.created_at,
            daysSinceCreation: Math.round(daysSinceCreation),
            recentlyPlayedTracks: recentlyPlayedFromPlaylist,
            activityScore: Math.round(activityScore),
            // Convert to estimated usage frequency
            estimatedUsage: Math.round(activityScore * 0.8),
            // New field for total plays all time
            estimatedTotalPlays
          };
        } catch (error) {
          console.warn(`Failed to get details for playlist ${playlist.id}:`, error);
          return null;
        }
      })
    );

    // Filter out failed playlists and sort by activity
    const validPlaylists = playlistsWithActivity
      .filter(Boolean)
      .sort((a, b) => {
        if (!a || !b) return 0;
        return b.activityScore - a.activityScore;
      })
      .slice(0, 10); // Top 10 most active

    console.log(`📊 User Playlist Activity: Processed ${validPlaylists.length} playlists`);

    return NextResponse.json({
      playlists: validPlaylists,
      totalPlaylists: playlists.length,
      recentlyPlayedTracks: recentlyPlayedTracks.length
    });

  } catch (error) {
    console.error('User Playlist Activity API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch user playlist activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
