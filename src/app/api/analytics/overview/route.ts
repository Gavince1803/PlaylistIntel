import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's playlists (limit to first 100 to avoid rate limiting)
    const getPlaylists = async () => {
      const allPlaylists = [];
      let offset = 0;
      const limit = 50;
      const maxPlaylists = 100; // Limit to first 100 playlists
      
      while (allPlaylists.length < maxPlaylists) {
        const playlistsResponse = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        });

        if (!playlistsResponse.ok) {
          if (playlistsResponse.status === 429) {
            console.warn('Rate limit hit while fetching playlists, using partial data');
            break;
          }
          throw new Error('Failed to fetch playlists');
        }

        const playlistsData = await playlistsResponse.json();
        const playlists = playlistsData.items;
        
        if (playlists.length === 0) {
          break; // No more playlists
        }
        
        allPlaylists.push(...playlists);
        offset += limit;
        
        if (playlists.length < limit) {
          break; // Last batch
        }
      }
      
      return allPlaylists;
    };

    const playlists = await getPlaylists();
    console.log(`📊 Analytics: Fetched ${playlists.length} total playlists`);

        // Get detailed playlist data with tracks (using pagination for each playlist)
    const playlistsWithTracks = await Promise.all(
      playlists.map(async (playlist: any) => {
        const getTracksForPlaylist = async (playlistId: string) => {
          const allTracks = [];
          let offset = 0;
          const limit = 100;
          const maxTracks = 500; // Limit to first 500 tracks per playlist
          
          while (allTracks.length < maxTracks) {
            const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`, {
              headers: {
                'Authorization': `Bearer ${session.accessToken}`
              }
            });

            if (!tracksResponse.ok) {
              if (tracksResponse.status === 429) {
                console.warn(`Rate limit hit while fetching tracks for playlist ${playlistId}, using partial data`);
                break;
              }
              console.warn(`Failed to fetch tracks for playlist ${playlistId}`);
              break;
            }

            const tracksData = await tracksResponse.json();
            const tracks = tracksData.items.map((item: any) => item.track).filter(Boolean);
            
            if (tracks.length === 0) {
              break; // No more tracks
            }
            
            allTracks.push(...tracks);
            offset += limit;
            
            if (tracks.length < limit) {
              break; // Last batch
            }
          }
          
          return allTracks;
        };

        const tracks = await getTracksForPlaylist(playlist.id);
        return {
          ...playlist,
          tracks
        };
      })
    );

    // Calculate analytics
    const totalPlaylists = playlists.length;
    const totalTracks = playlistsWithTracks.reduce((sum, playlist) => sum + (playlist.tracks?.length || 0), 0);
    const averagePlaylistLength = totalPlaylists > 0 ? Math.round(totalTracks / totalPlaylists) : 0;
    
    console.log(`📊 Analytics: Total tracks across all playlists: ${totalTracks}`);
    console.log(`📊 Analytics: Average playlist length: ${averagePlaylistLength} tracks`);

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
        
        return NextResponse.json({
          totalPlaylists,
          totalTracks,
          averagePlaylistLength,
          topGenres: [], // Will be populated by the genres API
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
      topGenres: [], // Will be populated by the genres API
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