import SpotifyWebApi from 'spotify-web-api-node';

// Rate limiting utility
class RateLimiter {
  private lastCall = 0;
  private minInterval = 300; // Increased to 300ms between calls to be more conservative
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 3;
  private globalErrorCount = 0;
  private maxGlobalErrors = 10;

  async waitForNextCall() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    // Add exponential backoff if we've had consecutive errors
    const backoffMultiplier = Math.min(2 ** this.consecutiveErrors, 16);
    const adjustedInterval = this.minInterval * backoffMultiplier;
    
    if (timeSinceLastCall < adjustedInterval) {
      await new Promise(resolve => setTimeout(resolve, adjustedInterval - timeSinceLastCall));
    }
    
    this.lastCall = Date.now();
  }

  recordError() {
    this.consecutiveErrors = Math.min(this.consecutiveErrors + 1, this.maxConsecutiveErrors);
    this.globalErrorCount = Math.min(this.globalErrorCount + 1, this.maxGlobalErrors);
    
    // If we've had too many global errors, increase the base interval
    if (this.globalErrorCount > 5) {
      this.minInterval = Math.min(this.minInterval * 1.5, 1000);
    }
  }

  recordSuccess() {
    this.consecutiveErrors = 0;
    // Gradually decrease the interval back to normal
    if (this.globalErrorCount > 0) {
      this.globalErrorCount = Math.max(this.globalErrorCount - 1, 0);
      if (this.globalErrorCount <= 3) {
        this.minInterval = Math.max(this.minInterval * 0.9, 300);
      }
    }
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

  // Helper method to make rate-limited API calls
  private async makeApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    await this.rateLimiter.waitForNextCall();
    
    try {
      const result = await apiCall();
      this.rateLimiter.recordSuccess();
      return result;
    } catch (error: any) {
      this.rateLimiter.recordError();
      
      if (error.statusCode === 429) {
        // Rate limit exceeded, wait longer and retry with exponential backoff
        const retryDelay = Math.min(2000 * (2 ** this.rateLimiter['consecutiveErrors']), 10000);
        console.log(`Rate limit exceeded, waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        await this.rateLimiter.waitForNextCall();
        return await apiCall();
      } else if (error.statusCode === 403) {
        // Forbidden - likely due to development mode restrictions or permission issues
        console.log('403 Forbidden - This may be due to Spotify app being in Development Mode or permission issues');
        // Don't throw error for 403, just return empty result to avoid breaking the app
        return [] as T;
      } else if (error.statusCode === 401) {
        // Unauthorized - token may be invalid
        console.log('401 Unauthorized - Token may be invalid or expired');
        throw new Error('Authentication failed. Please log in again.');
      }
      
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
          
          if (tracks.length < limit) {
            console.log(`🛑 Batch ${batchCount}: Received fewer tracks than limit (${tracks.length} < ${limit}), breaking loop`);
            break;
          }
        } catch (error) {
          console.error(`❌ Batch ${batchCount}: Error fetching tracks at offset ${offset}:`, error);
          throw error;
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

// Circuit breaker state
let isRateLimited = false;
let rateLimitResetTime = 0;
const RATE_LIMIT_COOLDOWN = 60 * 60 * 1000; // 1 hour in milliseconds

// Check if we're currently rate limited
export function isCurrentlyRateLimited(): boolean {
  if (!isRateLimited) return false;
  
  // Check if cooldown period has passed
  if (Date.now() > rateLimitResetTime) {
    isRateLimited = false;
    rateLimitResetTime = 0;
    return false;
  }
  
  return true;
}

// Mark as rate limited
function markAsRateLimited(): void {
  isRateLimited = true;
  rateLimitResetTime = Date.now() + RATE_LIMIT_COOLDOWN;
  console.warn('🚨 Rate limiting detected - using cached data for 1 hour');
}

// Local cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Get cached data if available and not expired
function getCachedData(key: string): any | null {
  const cached = apiCache.get(key);
  if (!cached) return null;
  
  if (Date.now() > cached.timestamp + cached.ttl) {
    apiCache.delete(key);
    return null;
  }
  
  return cached.data;
}

// Set data in cache
function setCachedData(key: string, data: any, ttl: number = CACHE_TTL): void {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

// Enhanced fetch with circuit breaker and cache
async function fetchWithCircuitBreakerAndCache(url: string, options: RequestInit = {}, cacheKey?: string) {
  // Check cache first if we have a cache key
  if (cacheKey) {
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('📦 Using cached data for:', cacheKey);
      return { ok: true, json: () => Promise.resolve(cachedData) };
    }
  }

  // If rate limited, throw error to trigger cache fallback
  if (isCurrentlyRateLimited()) {
    throw new Error('RATE_LIMITED');
  }

  try {
    const response = await fetch(url, options);
    
    // Check for rate limiting
    if (response.status === 429) {
      markAsRateLimited();
      throw new Error('RATE_LIMITED');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Cache successful responses
    if (cacheKey && response.status === 200) {
      const responseClone = response.clone();
      try {
        const data = await responseClone.json();
        setCachedData(cacheKey, data);
      } catch (e) {
        // Ignore cache errors
      }
    }
    
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMITED') {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 