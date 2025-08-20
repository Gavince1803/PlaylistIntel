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

    console.log('📊 Most Played Tracks: Starting analysis...');

    // Get user playlists using the new service method (much more conservative limit)
    const playlists = await spotifyService.getAllUserPlaylists(20);
    console.log(`📊 Most Played Tracks: Fetched ${playlists.length} playlists`);
    
    if (playlists.length === 0) {
      return NextResponse.json({ tracks: [] });
    }

    // Get all tracks from all playlists with better rate limiting
    const allTracks: { [key: string]: any } = {};
    let processedPlaylists = 0;
    
    for (const playlist of playlists) {
      try {
        console.log(`📊 Processing playlist ${processedPlaylists + 1}/${playlists.length}: ${playlist.name}`);
        
        // Use the service method that handles rate limiting (much more conservative limit)
        const tracks = await spotifyService.getAllPlaylistTracks(playlist.id, 50);
        
        tracks.forEach((track: any) => {
          if (track?.id) {
            if (allTracks[track.id]) {
              // Track already exists, increment count and add playlist info
              allTracks[track.id].playCount++;
              allTracks[track.id].playlists.push({
                id: playlist.id,
                name: playlist.name
              });
            } else {
              // New track
              allTracks[track.id] = {
                id: track.id,
                name: track.name,
                artists: track.artists,
                album: track.album,
                duration_ms: track.duration_ms,
                popularity: track.popularity,
                playCount: 1,
                playlists: [{
                  id: playlist.id,
                  name: playlist.name
                }],
                external_urls: track.external_urls
              };
            }
          }
        });
        
        processedPlaylists++;
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`Failed to get tracks for playlist ${playlist.id}:`, error);
        processedPlaylists++;
      }
    }

    console.log(`📊 Most Played Tracks: Processed ${processedPlaylists} playlists, found ${Object.keys(allTracks).length} unique tracks`);

    // Convert to array and sort by play count (frequency across playlists)
    const tracksArray = Object.values(allTracks)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 25) // Top 25
      .map((track, index) => ({
        ...track,
        rank: index + 1,
        // Calculate more realistic estimated plays based on frequency and popularity
        // This represents how often the track appears across playlists, not actual listening
        estimatedPlays: Math.max(1, Math.round(
          // Base: frequency across playlists (more playlists = higher plays)
          track.playCount * 2 +
          // Small popularity bonus (max 10 additional plays)
          Math.min(10, (track.popularity / 100) * 10) +
          // Rank bonus: top tracks get slight boost
          Math.max(0, (25 - index) * 0.5)
        ))
      }));

    console.log(`📊 Most Played Tracks: Returning top ${tracksArray.length} tracks`);

    return NextResponse.json({
      tracks: tracksArray,
      note: "Play counts represent how many playlists each track appears in, not actual Spotify listening data"
    });

  } catch (error) {
    console.error('Most Played Tracks API error:', error);
    return NextResponse.json({ error: 'Failed to fetch most played tracks' }, { status: 500 });
  }
}
