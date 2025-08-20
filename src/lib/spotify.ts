import SpotifyWebApi from 'spotify-web-api-node';

// Enhanced Rate Limiter with better Spotify API compliance
class RateLimiter {
  private lastCall = 0;
  private minInterval = 800; // Reduced back to 800ms for better performance
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;
  private globalErrorCount = 0;
  private maxGlobalErrors = 15;
  private rateLimitResetTime = 0;
  private currentWindowRequests = 0;
  private maxRequestsPerWindow = 50; // Increased back to 50 for better performance

  async waitForNextCall() {
    const now = Date.now();
    
    // Check if we're in a new rate limit window
    if (now > this.rateLimitResetTime) {
      this.currentWindowRequests = 0;
      this.rateLimitResetTime = now + (60 * 1000); // Reset every minute
    }
    
    // If we're approaching the rate limit, wait longer
    if (this.currentWindowRequests > this.maxRequestsPerWindow * 0.7) {
      const waitTime = Math.max(1500, this.minInterval * 3);
      console.log(`⚠️ Approaching rate limit, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const timeSinceLastCall = now - this.lastCall;
    
    // Add exponential backoff if we've had consecutive errors
    const backoffMultiplier = Math.min(2 ** this.consecutiveErrors, 32);
    const adjustedInterval = this.minInterval * backoffMultiplier;
    
    if (timeSinceLastCall < adjustedInterval) {
      const waitTime = adjustedInterval - timeSinceLastCall;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before next API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCall = Date.now();
    this.currentWindowRequests++;
  }

  recordError(error: any) {
    this.consecutiveErrors = Math.min(this.consecutiveErrors + 1, this.maxConsecutiveErrors);
    this.globalErrorCount = Math.min(this.globalErrorCount + 1, this.maxGlobalErrors);
    
    // Handle specific error types
    if (error.statusCode === 429) {
      // Rate limit exceeded - increase interval significantly
      this.minInterval = Math.min(this.minInterval * 3, 3000);
      console.log(`🚫 Rate limit exceeded, increased interval to ${this.minInterval}ms`);
      
      // If we get rate limited, wait for the reset window
      if (this.rateLimitResetTime < Date.now()) {
        this.rateLimitResetTime = Date.now() + (120 * 1000); // Wait 2 minutes instead of 1
      }
    } else if (error.statusCode === 403) {
      // Forbidden - this might be due to development mode restrictions
      console.log(`🚫 403 Forbidden - possible development mode restriction`);
    }
    
    // If we've had too many global errors, increase the base interval
    if (this.globalErrorCount > 8) {
      this.minInterval = Math.min(this.minInterval * 1.5, 1500);
      console.log(`⚠️ Too many errors, increased base interval to ${this.minInterval}ms`);
    }
  }

  recordSuccess() {
    this.consecutiveErrors = 0;
    
    // Gradually decrease the interval back to normal
    if (this.globalErrorCount > 0) {
      this.globalErrorCount = Math.max(this.globalErrorCount - 1, 0);
      if (this.globalErrorCount <= 5) {
        this.minInterval = Math.max(this.minInterval * 0.95, 500);
      }
    }
  }

  // Get current status for debugging
  getStatus() {
    return {
      minInterval: this.minInterval,
      consecutiveErrors: this.consecutiveErrors,
      globalErrorCount: this.globalErrorCount,
      currentWindowRequests: this.currentWindowRequests,
      rateLimitResetTime: this.rateLimitResetTime
    };
  }
}

const rateLimiter = new RateLimiter();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.NEXTAUTH_URL + '/api/auth/callback/spotify'
});

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string; width?: number; height?: number }>;
  tracks: {
    total: number;
    items: Array<{
      track: {
        id: string;
        name: string;
        artists: Array<{ name: string }>;
        album: { name: string; images: Array<{ url: string }> };
        duration_ms: number;
      };
    }>;
  };
  owner: {
    display_name: string;
    id: string;
  };
  collaborative: boolean;
  public: boolean;
  snapshot_id: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  uri: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  duration_ms: number;
  time_signature: number;
}

export class SpotifyService {
  private api: SpotifyWebApi;
  private rateLimiter: RateLimiter;

  constructor(accessToken?: string) {
    this.api = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.NEXTAUTH_URL + '/api/auth/callback/spotify'
    });
    this.rateLimiter = new RateLimiter();

    if (accessToken) {
      this.api.setAccessToken(accessToken);
    }
  }

  // Enhanced helper method to make rate-limited API calls with better error handling
  private async makeApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    await this.rateLimiter.waitForNextCall();
    
    try {
      const result = await apiCall();
      this.rateLimiter.recordSuccess();
      return result;
    } catch (error: any) {
      this.rateLimiter.recordError(error);
      
      if (error.statusCode === 429) {
        // Rate limit exceeded, wait longer and retry with exponential backoff
        const retryDelay = Math.min(5000 * (2 ** this.rateLimiter['consecutiveErrors']), 20000);
        console.log(`🚫 Rate limit exceeded, waiting ${retryDelay}ms before retry...`);
        
        // Log rate limiter status for debugging
        console.log('📊 Rate limiter status:', this.rateLimiter.getStatus());
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        await this.rateLimiter.waitForNextCall();
        
        // Try one more time after waiting
        try {
          return await apiCall();
        } catch (retryError: any) {
          console.log('❌ Retry failed after rate limit wait');
          throw retryError;
        }
      } else if (error.statusCode === 403) {
        // Forbidden - likely due to development mode restrictions or permission issues
        console.log('🚫 403 Forbidden - This may be due to Spotify app being in Development Mode or permission issues');
        console.log('💡 Solution: Add your email as a test user in Spotify Developer Dashboard or switch to Production Mode');
        
        // For 403 errors, we'll throw a custom error that can be handled by the calling method
        const forbiddenError = new Error('Access forbidden') as any;
        forbiddenError.statusCode = 403;
        forbiddenError.message = 'Access forbidden';
        throw forbiddenError;
      } else if (error.statusCode === 401) {
        // Unauthorized - token may be invalid
        console.log('🔐 401 Unauthorized - Token may be invalid or expired');
        throw new Error('Authentication failed. Please log in again.');
      }
      
      // Log other errors for debugging
      console.log('❌ API call failed with error:', {
        statusCode: error.statusCode,
        message: error.message,
        body: error.body
      });
      
      throw error;
    }
  }

  async getUserPlaylists(limit = 10, offset = 0): Promise<SpotifyPlaylist[]> {
    try {
      const response = await this.makeApiCall(() => 
        this.api.getUserPlaylists({ limit, offset })
      );
      
      return response.body.items.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        images: playlist.images,
        tracks: { total: playlist.tracks.total, items: [] },
        owner: {
          display_name: playlist.owner.display_name ?? "Unknown",
          id: playlist.owner.id
        },
        collaborative: playlist.collaborative,
        public: playlist.public ?? false,
        snapshot_id: playlist.snapshot_id
      }));
    } catch (error) {
      console.error('Error fetching user playlists:', error);
      throw error;
    }
  }

  // New method to get ALL user playlists using pagination
  async getAllUserPlaylists(maxPlaylists = 1000): Promise<SpotifyPlaylist[]> {
    try {
      console.log(`🔄 Starting getAllUserPlaylists with maxPlaylists: ${maxPlaylists}`);
      const allPlaylists: SpotifyPlaylist[] = [];
      let offset = 0;
      const limit = 50; // Spotify's max limit per request
      let batchCount = 0;
      let consecutiveErrors = 0;
      const maxConsecutiveErrors = 3;

      while (allPlaylists.length < maxPlaylists) {
        batchCount++;
        console.log(`📥 Batch ${batchCount}: Fetching playlists with offset: ${offset}, limit: ${limit}, current total: ${allPlaylists.length}`);
        
        try {
          const playlists = await this.getUserPlaylists(limit, offset);
          console.log(`📊 Batch ${batchCount}: Received ${playlists.length} playlists in this batch`);
          
          if (playlists.length === 0) {
            console.log(`🛑 Batch ${batchCount}: No more playlists found, breaking loop`);
            break;
          }
          
          allPlaylists.push(...playlists);
          console.log(`📈 Batch ${batchCount}: Total playlists so far: ${allPlaylists.length}`);
          offset += limit;
          consecutiveErrors = 0; // Reset error counter on success
          
          if (playlists.length < limit) {
            console.log(`🛑 Batch ${batchCount}: Received fewer playlists than limit (${playlists.length} < ${limit}), breaking loop`);
            break;
          }
          
          // Add delay between batches to avoid rate limits
          if (batchCount < Math.ceil(maxPlaylists / limit)) {
            console.log(`⏳ Adding delay between playlist batches to avoid rate limits...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error: any) {
          consecutiveErrors++;
          console.error(`❌ Batch ${batchCount}: Error fetching playlists at offset ${offset}:`, error);
          
          // If we get too many consecutive errors, break to avoid infinite loops
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.warn(`⚠️ Too many consecutive errors (${consecutiveErrors}), stopping playlist fetch`);
            break;
          }
          
          // If it's a 403 error, skip this batch and continue
          if (error.statusCode === 403) {
            console.warn(`🚫 403 Forbidden for playlist batch at offset ${offset}, skipping and continuing...`);
            offset += limit;
            continue;
          }
          
          // For other errors, wait a bit longer before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`✅ getAllUserPlaylists completed. Total playlists fetched: ${allPlaylists.length}`);
      const finalPlaylists = allPlaylists.slice(0, maxPlaylists);
      console.log(`🎯 Final result: ${finalPlaylists.length} playlists (after maxPlaylists limit)`);
      return finalPlaylists;
    } catch (error) {
      console.error('Error fetching all user playlists:', error);
      throw error;
    }
  }

  async getPlaylistTracks(playlistId: string, limit = 100, offset = 0): Promise<SpotifyTrack[]> {
    try {
      console.log(`🎵 getPlaylistTracks called with playlistId: ${playlistId}, limit: ${limit}, offset: ${offset}`);
      
      const response = await this.makeApiCall(() => 
        this.api.getPlaylistTracks(playlistId, { limit, offset })
      );
      
      console.log(`📊 Spotify API returned ${response.body.items.length} items for playlist ${playlistId} at offset ${offset}`);
      
      // Log some details about the response
      if (response.body.items.length > 0) {
        const firstItem = response.body.items[0];
        console.log(`🔍 First item has track: ${firstItem.track ? 'YES' : 'NO'}, track ID: ${firstItem.track?.id || 'N/A'}`);
      }
      
      const filteredTracks = response.body.items
        .filter(item => item.track && item.track.id)
        .map(item => ({
          id: item.track!.id,
          name: item.track!.name,
          artists: item.track!.artists.map(artist => ({ name: artist.name, id: artist.id })),
          album: {
            name: item.track!.album.name,
            images: item.track!.album.images
          },
          duration_ms: item.track!.duration_ms,
          uri: item.track!.uri
        }));
      
      const nullTracks = response.body.items.filter(item => !item.track || !item.track.id).length;
      if (nullTracks > 0) {
        console.log(`⚠️ Found ${nullTracks} null/invalid tracks in response for playlist ${playlistId}`);
      }
      
      console.log(`✅ getPlaylistTracks returning ${filteredTracks.length} valid tracks for playlist ${playlistId}`);
      return filteredTracks;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      throw error;
    }
  }

  // New method to get ALL tracks from a playlist using pagination
  async getAllPlaylistTracks(playlistId: string, maxTracks = 1000): Promise<SpotifyTrack[]> {
    try {
      console.log(`🔄 Starting getAllPlaylistTracks for playlist ${playlistId} with maxTracks: ${maxTracks}`);
      const allTracks: SpotifyTrack[] = [];
      let offset = 0;
      const limit = 100;
      let batchCount = 0;
      let consecutiveErrors = 0;
      const maxConsecutiveErrors = 3;

      while (allTracks.length < maxTracks) {
        batchCount++;
        console.log(`📥 Batch ${batchCount}: Fetching tracks with offset: ${offset}, limit: ${limit}, current total: ${allTracks.length}`);
        
        try {
          const tracks = await this.getPlaylistTracks(playlistId, limit, offset);
          console.log(`📊 Batch ${batchCount}: Received ${tracks.length} tracks in this batch`);
          
          if (tracks.length === 0) {
            console.log(`🛑 Batch ${batchCount}: No more tracks found, breaking loop`);
            break;
          }
          
          allTracks.push(...tracks);
          console.log(`📈 Batch ${batchCount}: Total tracks so far: ${allTracks.length}`);
          offset += limit;
          consecutiveErrors = 0; // Reset error counter on success
          
          if (tracks.length < limit) {
            console.log(`🛑 Batch ${batchCount}: Received fewer tracks than limit (${tracks.length} < ${limit}), breaking loop`);
            break;
          }
          
          // Add delay between batches to avoid rate limits
          if (batchCount < Math.ceil(maxTracks / limit)) {
            console.log(`⏳ Adding delay between track batches to avoid rate limits...`);
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } catch (error: any) {
          consecutiveErrors++;
          console.error(`❌ Batch ${batchCount}: Error fetching tracks at offset ${offset}:`, error);
          
          // If we get too many consecutive errors, break to avoid infinite loops
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.warn(`⚠️ Too many consecutive errors (${consecutiveErrors}), stopping track fetch for playlist ${playlistId}`);
            break;
          }
          
          // If it's a 403 error, this playlist is not accessible, return empty array
          if (error.statusCode === 403) {
            console.warn(`🚫 403 Forbidden for playlist ${playlistId}, returning empty tracks array`);
            return [];
          }
          
          // For other errors, wait a bit longer before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`✅ getAllPlaylistTracks completed for playlist ${playlistId}. Total tracks fetched: ${allTracks.length}`);
      const finalTracks = allTracks.slice(0, maxTracks);
      console.log(`🎯 Final result: ${finalTracks.length} tracks (after maxTracks limit)`);
      return finalTracks;
    } catch (error) {
      console.error('Error fetching all playlist tracks:', error);
      throw error;
    }
  }



  async getCurrentUserId(): Promise<string> {
    try {
      const response = await this.makeApiCall(() => 
        this.api.getMe()
      );
      
      return response.body.id;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      throw error;
    }
  }

  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    try {
      await this.makeApiCall(() => 
        this.api.addTracksToPlaylist(playlistId, trackUris)
      );
    } catch (error) {
      console.error('Error adding tracks to playlist:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<{ id: string; display_name: string; email: string; images: Array<{ url: string }> }> {
    try {
      const response = await this.makeApiCall(() => 
        this.api.getMe()
      );
      
      return {
        id: response.body.id,
        display_name: response.body.display_name || 'Unknown User',
        email: response.body.email || '',
        images: response.body.images || []
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }

  // Helper method to detect if a playlist is mixed (has tracks from different artists)
  async isMixedPlaylist(playlistId: string): Promise<boolean> {
    try {
      const response = await this.makeApiCall(() => 
        this.api.getPlaylist(playlistId)
      );
      
      return response.body.collaborative || 
             response.body.name.toLowerCase().includes('mix') ||
             response.body.name.toLowerCase().includes('playlist');
    } catch (error) {
      console.error('Error checking if playlist is mixed:', error);
      return false;
    }
  }

  // Get playlist information
  async getPlaylist(playlistId: string): Promise<{ name: string; description: string; images: Array<{ url: string }>; owner: { display_name: string } }> {
    try {
      const response = await this.makeApiCall(() => 
        this.api.getPlaylist(playlistId)
      );
      
      return {
        name: response.body.name,
        description: response.body.description || '',
        images: response.body.images || [],
        owner: {
          display_name: response.body.owner.display_name || 'Unknown'
        }
      };
    } catch (error) {
      console.error('Error fetching playlist info:', error);
      throw error;
    }
  }

  async getArtists(artistIds: string[]): Promise<SpotifyArtist[]> {
    try {
      if (artistIds.length === 0) return [];
      
      // Spotify API allows max 50 artists per request
      const chunks = [];
      for (let i = 0; i < artistIds.length; i += 50) {
        chunks.push(artistIds.slice(i, i + 50));
      }

      const allArtists: SpotifyArtist[] = [];
      
      for (const chunk of chunks) {
        try {
          const response = await this.makeApiCall(() => 
            this.api.getArtists(chunk)
          );
          
          const artists = response.body.artists.map(artist => ({
            id: artist.id,
            name: artist.name,
            genres: artist.genres || [],
            popularity: artist.popularity || 0
          }));
          allArtists.push(...artists);
        } catch (err: any) {
          console.error('❌ Spotify API error in getArtists:', err && (err.body || err.message || err));
          console.log('⚠️ Skipping this chunk and continuing...');
        }
      }

      return allArtists;
    } catch (error) {
      console.error('Error fetching artists:', error);
      throw error;
    }
  }

  async getAudioFeatures(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
    try {
      if (trackIds.length === 0) return [];
      
      // Spotify API allows max 100 tracks per request
      const chunks = [];
      for (let i = 0; i < trackIds.length; i += 100) {
        chunks.push(trackIds.slice(i, i + 100));
      }

      const allFeatures: SpotifyAudioFeatures[] = [];
      
      for (const chunk of chunks) {
        try {
          const response = await this.makeApiCall(() => 
            this.api.getAudioFeaturesForTracks(chunk)
          );
          
          const features = response.body.audio_features
            .filter(feature => feature !== null)
            .map(feature => ({
              id: feature!.id,
              danceability: feature!.danceability,
              energy: feature!.energy,
              key: feature!.key,
              loudness: feature!.loudness,
              mode: feature!.mode,
              speechiness: feature!.speechiness,
              acousticness: feature!.acousticness,
              instrumentalness: feature!.instrumentalness,
              liveness: feature!.liveness,
              valence: feature!.valence,
              tempo: feature!.tempo,
              duration_ms: feature!.duration_ms,
              time_signature: feature!.time_signature
            }));
          allFeatures.push(...features);
          console.log(`✅ Successfully fetched audio features for ${features.length} tracks`);
        } catch (err: any) {
          console.error('❌ Spotify API error in getAudioFeaturesForTracks:', err && (err.body || err.message || err));
          // Continue with other chunks instead of failing completely
          console.log('⚠️ Skipping this chunk and continuing...');
        }
      }

      console.log(`✅ Successfully fetched audio features for ${allFeatures.length} tracks`);
      return allFeatures;
    } catch (error) {
      console.error('Error fetching audio features:', error);
      throw error;
    }
  }

  // Method to search for tracks and get their Spotify URIs
  async searchTracks(query: string, limit = 5): Promise<Array<{ id: string; name: string; artist: string; uri: string; external_url: string }>> {
    try {
      console.log(`🔍 Searching for tracks with query: "${query}"`);
      
      const response = await this.makeApiCall(() => 
        this.api.searchTracks(query, { limit })
      );
      
      return response.body.tracks?.items.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0]?.name || 'Unknown Artist',
        uri: track.uri,
        external_url: track.external_urls?.spotify || ''
      })) || [];
    } catch (error) {
      console.error('Error searching tracks:', error);
      throw error;
    }
  }

  // Method to get track details by ID
  async getTrack(trackId: string): Promise<{ id: string; name: string; artist: string; uri: string; external_url: string } | null> {
    try {
      console.log(`🎵 Getting track details for ID: ${trackId}`);
      
      const response = await this.makeApiCall(() => 
        this.api.getTrack(trackId)
      );
      
      const track = response.body;
      
      return {
        id: track.id,
        name: track.name,
        artist: track.artists[0]?.name || 'Unknown Artist',
        uri: track.uri,
        external_url: track.external_urls?.spotify || ''
      };
    } catch (error) {
      console.error('Error getting track:', error);
      return null;
    }
  }
}

export default spotifyApi; 