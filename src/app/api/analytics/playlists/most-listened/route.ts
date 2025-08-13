import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's playlists
    const getPlaylists = async () => {
      const allPlaylists = [];
      let offset = 0;
      const limit = 50;
      const maxPlaylists = 200; // Limit to avoid rate limits
      
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
    console.log(`📊 Most Listened: Fetched ${playlists.length} playlists`);
    
    if (playlists.length === 0) {
      return NextResponse.json({ playlists: [] });
    }

    // Get playlist details with follower count and track count as proxy for popularity
    const playlistsWithDetails = await Promise.all(
      playlists.map(async (playlist: any) => {
        try {
          // Get playlist tracks count
          const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}?fields=tracks.total`, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`
            }
          });

          let trackCount = 0;
          if (tracksResponse.ok) {
            const playlistData = await tracksResponse.json();
            trackCount = playlistData.tracks?.total || 0;
          }

          // Use a combination of factors to estimate "listening popularity":
          // 1. Track count (more tracks = more variety = likely more listened)
          // 2. Follower count (more followers = more popular)
          // 3. Whether it's collaborative or public
          // 4. Creation date (newer playlists might be more active)
          
          const popularityScore = (
            (trackCount * 0.4) + // Track count weight
            ((playlist.followers?.total || 0) * 0.3) + // Follower count weight
            (playlist.collaborative ? 20 : 0) + // Collaborative bonus
            (playlist.public ? 10 : 0) + // Public bonus
            (new Date().getTime() - new Date(playlist.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30) // Recency bonus (months)
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
            estimatedListens: Math.round(popularityScore * 0.8) // Convert score to estimated listen count
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
      playlists: validPlaylists
    });

  } catch (error) {
    console.error('Most Listened Playlists API error:', error);
    return NextResponse.json({ error: 'Failed to fetch most listened playlists' }, { status: 500 });
  }
}
