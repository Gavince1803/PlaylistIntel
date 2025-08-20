import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/authOptions';
import { SpotifyService } from '@/lib/spotify';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create SpotifyService instance with the user's access token
    const spotifyService = new SpotifyService(session.accessToken);

    console.log('📊 Most Listened Playlists: Starting analysis...');

    // Get user playlists using the new service method (much more conservative limit)
    const playlists = await spotifyService.getAllUserPlaylists(20);
    console.log(`📊 Most Listened: Fetched ${playlists.length} playlists`);
    
    if (playlists.length === 0) {
      return NextResponse.json({ playlists: [] });
    }

    // Get user's top tracks to calculate more realistic play counts
    let topTracks: any[] = [];
    try {
      const topTracksResponse = await fetch(
        `https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        }
      );
      
      if (topTracksResponse.ok) {
        const topTracksData = await topTracksResponse.json();
        topTracks = topTracksData.items || [];
        console.log(`📊 Most Listened: Fetched ${topTracks.length} top tracks for play count calculation`);
      }
    } catch (error) {
      console.warn('Failed to fetch top tracks for play count calculation:', error);
    }

    // Get playlist details with better metrics and realistic play counts
    const playlistsWithDetails = await Promise.all(
      playlists.map(async (playlist: any, index: number) => {
        try {
          console.log(`📊 Processing playlist ${index + 1}/${playlists.length}: ${playlist.name}`);
          
          // Get playlist tracks using the service method (much more conservative limit)
          const tracks = await spotifyService.getAllPlaylistTracks(playlist.id, 50);
          const trackCount = tracks.length;

          // Calculate realistic play count based on:
          // 1. How many top tracks are in this playlist
          // 2. Track count (more tracks = more variety = likely more listened)
          // 3. Follower count and other factors
          const topTracksInPlaylist = topTracks.filter(topTrack => 
            tracks.some(playlistTrack => playlistTrack.id === topTrack.id)
          ).length;

          // Base play count: if playlist has top tracks, it's been listened to more
          let basePlayCount = 0;
          if (topTracksInPlaylist > 0) {
            // Each top track in playlist adds realistic plays
            basePlayCount = topTracksInPlaylist * 8; // 8 plays per top track
          }

          // Add plays based on track count (more tracks = more variety = more listens)
          const trackCountPlays = Math.min(15, Math.floor(trackCount / 10)); // Max 15 plays from track count

          // Add small bonus for followers and other factors
          const followerBonus = Math.min(5, Math.floor((playlist.followers?.total || 0) / 100));
          const activityBonus = (playlist.collaborative ? 3 : 0) + (playlist.public ? 2 : 0);

          // Calculate total realistic plays
          const totalPlays = Math.max(1, basePlayCount + trackCountPlays + followerBonus + activityBonus);

          // Calculate popularity score for ranking
          const popularityScore = (
            (trackCount * 0.3) + // Track count weight (30%)
            ((playlist.followers?.total || 0) * 0.25) + // Follower count weight (25%)
            (playlist.collaborative ? 15 : 0) + // Collaborative bonus
            (playlist.public ? 8 : 0) + // Public bonus
            (playlist.description ? 5 : 0) + // Has description bonus
            (playlist.images && playlist.images.length > 0 ? 3 : 0) + // Has images bonus
            Math.min(20, Math.max(0, (new Date().getTime() - new Date(playlist.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))) // Recency bonus (max 20 points)
          );

          return {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            images: playlist.images,
            owner: playlist.owner,
            public: playlist.public,
            collaborative: playlist.collaborative,
            trackCount,
            followers: playlist.followers?.total || 0,
            createdAt: playlist.created_at,
            popularityScore: Math.round(popularityScore),
            // Realistic play count based on actual usage patterns
            plays: totalPlays,
            // Add image field for compatibility
            image: playlist.images && playlist.images.length > 0 ? playlist.images[0].url : null,
            // Additional info for debugging
            topTracksInPlaylist,
            trackCountPlays,
            followerBonus,
            activityBonus
          };
        } catch (error) {
          console.warn(`Failed to get details for playlist ${playlist.id}:`, error);
          return null;
        }
      })
    );

    // Filter out failed playlists and sort by popularity
    const validPlaylists = playlistsWithDetails
      .filter(Boolean)
      .sort((a, b) => {
        if (!a || !b) return 0;
        return b.popularityScore - a.popularityScore;
      })
      .slice(0, 10); // Top 10

    console.log(`📊 Most Listened: Processed ${validPlaylists.length} playlists`);

    return NextResponse.json({
      playlists: validPlaylists,
      note: "Play counts are calculated based on how many of your top tracks appear in each playlist, track count, and other factors"
    });

  } catch (error) {
    console.error('Most Listened Playlists API error:', error);
    return NextResponse.json({ error: 'Failed to fetch most listened playlists' }, { status: 500 });
  }
}
