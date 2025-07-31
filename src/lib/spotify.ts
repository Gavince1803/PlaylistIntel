import SpotifyWebApi from 'spotify-web-api-node';

// Rate limiting utility
class RateLimiter {
  private lastCall = 0;
  private minInterval = 150; // Increased to 150ms between calls
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 3;

  async waitForNextCall() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    // Add exponential backoff if we've had consecutive errors
    const backoffMultiplier = Math.min(2 ** this.consecutiveErrors, 8);
    const adjustedInterval = this.minInterval * backoffMultiplier;
    
    if (timeSinceLastCall < adjustedInterval) {
      await new Promise(resolve => setTimeout(resolve, adjustedInterval - timeSinceLastCall));
    }
    
    this.lastCall = Date.now();
  }

  recordError() {
    this.consecutiveErrors = Math.min(this.consecutiveErrors + 1, this.maxConsecutiveErrors);
  }

  recordSuccess() {
    this.consecutiveErrors = 0;
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
        // Forbidden - likely due to development mode restrictions
        console.log('403 Forbidden - This may be due to Spotify app being in Development Mode');
        console.log('To fix this:');
        console.log('1. Go to Spotify Developer Dashboard');
        console.log('2. Add the user email as a test user, OR');
        console.log('3. Switch the app to Production Mode');
        throw new Error('Access forbidden. Please check Spotify app settings or contact support.');
      } else if (error.statusCode === 401) {
        // Unauthorized - token may be invalid
        console.log('401 Unauthorized - Token may be invalid or expired');
        throw new Error('Authentication failed. Please log in again.');
      }
      
      throw error;
    }
  }

  async getUserPlaylists(limit = 50, offset = 0): Promise<SpotifyPlaylist[]> {
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
      const response = await this.makeApiCall(() => 
        this.api.getPlaylistTracks(playlistId, { limit, offset })
      );
      
      return response.body.items
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
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      throw error;
    }
  }

  // New method to get ALL tracks from a playlist using pagination
  async getAllPlaylistTracks(playlistId: string, maxTracks = 1000): Promise<SpotifyTrack[]> {
    try {
      const allTracks: SpotifyTrack[] = [];
      let offset = 0;
      const limit = 100;

      while (allTracks.length < maxTracks) {
        const tracks = await this.getPlaylistTracks(playlistId, limit, offset);
        
        if (tracks.length === 0) break;
        
        allTracks.push(...tracks);
        offset += limit;
        
        if (tracks.length < limit) break;
      }

      return allTracks.slice(0, maxTracks);
    } catch (error) {
      console.error('Error fetching all playlist tracks:', error);
      throw error;
    }
  }

  async createPlaylist(userId: string, name: string, description?: string): Promise<string> {
    try {
      const response = await this.makeApiCall(() => 
        this.api.createPlaylist(name, {
          description,
          public: false
        })
      );
      
      return response.body.id;
    } catch (error) {
      console.error('Error creating playlist:', error);
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