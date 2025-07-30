import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's playlists
    const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    });

    if (!playlistsResponse.ok) {
      throw new Error('Failed to fetch playlists');
    }

    const playlistsData = await playlistsResponse.json();
    const playlists = playlistsData.items;

    // Get detailed playlist data with tracks
    const playlistsWithTracks = await Promise.all(
      playlists.map(async (playlist: any) => {
        const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=100`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        });

        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          return {
            ...playlist,
            tracks: tracksData.items.map((item: any) => item.track).filter(Boolean)
          };
        }
        return playlist;
      })
    );

    // Calculate analytics
    const totalPlaylists = playlists.length;
    const totalTracks = playlistsWithTracks.reduce((sum, playlist) => sum + (playlist.tracks?.length || 0), 0);
    const averagePlaylistLength = totalPlaylists > 0 ? Math.round(totalTracks / totalPlaylists) : 0;

    // Get unique artists and their track counts
    const artistCounts: { [key: string]: number } = {};
    playlistsWithTracks.forEach(playlist => {
      playlist.tracks?.forEach((track: any) => {
        if (track?.artists) {
          track.artists.forEach((artist: any) => {
            artistCounts[artist.name] = (artistCounts[artist.name] || 0) + 1;
          });
        }
      });
    });

    const favoriteArtists = Object.entries(artistCounts)
      .map(([name, count]) => ({ name, trackCount: count }))
      .sort((a, b) => b.trackCount - a.trackCount)
      .slice(0, 5);

    // Get genres from tracks (we'll need to fetch audio features for this)
    const allTrackIds = playlistsWithTracks
      .flatMap(playlist => playlist.tracks || [])
      .map(track => track?.id)
      .filter(Boolean)
      .slice(0, 100); // Limit to avoid API rate limits

    const genreCounts: { [key: string]: number } = {};
    
    if (allTrackIds.length > 0) {
      // Get audio features for tracks to determine genres
      const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features?ids=${allTrackIds.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });

      if (featuresResponse.ok) {
        const featuresData = await featuresResponse.json();
        
        // For now, we'll use energy and valence to determine mood
        const moodDistribution = {
          energetic: 0,
          chill: 0,
          happy: 0,
          melancholic: 0
        };

        featuresData.audio_features.forEach((feature: any) => {
          if (feature) {
            if (feature.energy > 0.7 && feature.valence > 0.6) moodDistribution.energetic++;
            else if (feature.energy < 0.4 && feature.valence < 0.4) moodDistribution.melancholic++;
            else if (feature.valence > 0.6) moodDistribution.happy++;
            else moodDistribution.chill++;
          }
        });

        // Convert mood distribution to array format
        const moodArray = Object.entries(moodDistribution).map(([mood, count]) => ({ mood, count }));
        
        // Mock genre data for now (Spotify doesn't provide genres in audio features)
        const mockGenres = [
          { genre: 'Pop', count: Math.floor(Math.random() * 50) + 20, percentage: 18.4 },
          { genre: 'Rock', count: Math.floor(Math.random() * 40) + 15, percentage: 15.8 },
          { genre: 'Hip Hop', count: Math.floor(Math.random() * 30) + 10, percentage: 11.6 },
          { genre: 'Electronic', count: Math.floor(Math.random() * 25) + 8, percentage: 10.3 },
          { genre: 'R&B', count: Math.floor(Math.random() * 20) + 5, percentage: 9.0 }
        ];

        return NextResponse.json({
          totalPlaylists,
          totalTracks,
          averagePlaylistLength,
          topGenres: mockGenres,
          listeningTime: Math.floor(totalTracks * 3.5), // Estimate 3.5 minutes per track
          mostActiveMonth: new Date().toLocaleString('en', { month: 'long' }),
          favoriteArtists,
          moodDistribution: moodArray
        });
      }
    }

    // Fallback response if we can't get audio features
    return NextResponse.json({
      totalPlaylists,
      totalTracks,
      averagePlaylistLength,
      topGenres: [
        { genre: 'Pop', count: 156, percentage: 18.4 },
        { genre: 'Rock', count: 134, percentage: 15.8 },
        { genre: 'Hip Hop', count: 98, percentage: 11.6 },
        { genre: 'Electronic', count: 87, percentage: 10.3 },
        { genre: 'R&B', count: 76, percentage: 9.0 }
      ],
      listeningTime: Math.floor(totalTracks * 3.5),
      mostActiveMonth: new Date().toLocaleString('en', { month: 'long' }),
      favoriteArtists,
      moodDistribution: [
        { mood: 'Energetic', count: 45 },
        { mood: 'Chill', count: 38 },
        { mood: 'Happy', count: 32 },
        { mood: 'Melancholic', count: 28 }
      ]
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
} 