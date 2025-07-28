import SpotifyWebApi from 'spotify-web-api-node';

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

  constructor(accessToken?: string) {
    this.api = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.NEXTAUTH_URL + '/api/auth/callback/spotify'
    });

    if (accessToken) {
      this.api.setAccessToken(accessToken);
    }
  }

  async getUserPlaylists(limit = 50, offset = 0): Promise<SpotifyPlaylist[]> {
    try {
      const response = await this.api.getUserPlaylists({ limit, offset });
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
      // Log the access token used for getPlaylistTracks
      // @ts-ignore
      console.log('getPlaylistTracks: Access Token Excerpt:', this.api.getAccessToken()?.slice(0, 10));
      const response = await this.api.getPlaylistTracks(playlistId, {
        limit,
        offset,
        fields: 'items(track(id,name,artists(id,name),album(name,images),duration_ms,uri))'
      });
      
      return response.body.items
        .filter(item => item.track)
        .map(item => ({
          id: item.track!.id,
          name: item.track!.name,
          artists: item.track!.artists.map(artist => ({
            id: artist.id,
            name: artist.name
          })),
          album: {
            name: item.track!.album.name,
            images: item.track!.album.images || []
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
      console.log(`🎵 Fetching ALL tracks from playlist: ${playlistId} (max: ${maxTracks})`);
      
      const allTracks: SpotifyTrack[] = [];
      let offset = 0;
      const limit = 100; // Spotify's max per request
      
      while (allTracks.length < maxTracks) {
        console.log(`📄 Fetching tracks ${offset + 1}-${offset + limit}...`);
        
        const tracks = await this.getPlaylistTracks(playlistId, limit, offset);
        
        if (tracks.length === 0) {
          console.log('✅ No more tracks to fetch');
          break;
        }
        
        allTracks.push(...tracks);
        offset += limit;
        
        // Add a small delay to avoid rate limiting
        if (tracks.length === limit) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ Successfully fetched ${allTracks.length} tracks total`);
      return allTracks;
    } catch (error) {
      console.error('Error fetching all playlist tracks:', error);
      throw error;
    }
  }

  async createPlaylist(userId: string, name: string, description?: string): Promise<string> {
    try {
      console.log(`Creating playlist: ${name} for user: ${userId}`);
      
      // Log the access token to verify it's valid
      const accessToken = this.api.getAccessToken();
      console.log('Access token available:', !!accessToken);
      
      // Try multiple approaches to create playlist
      let response;
      let error;
      
      // Approach 1: Try the standard method
      try {
        response = await (this.api as any).createPlaylist(userId, name, {
          description: description || '',
          public: false
        });
        console.log('Approach 1 successful');
      } catch (err1) {
        console.log('Approach 1 failed:', err1);
        error = err1;
        
        // Approach 2: Try with different parameter structure
        try {
          response = await (this.api as any).createPlaylist(userId, {
            name: name,
            description: description || '',
            public: false
          });
          console.log('Approach 2 successful');
        } catch (err2) {
          console.log('Approach 2 failed:', err2);
          error = err2;
          
          // Approach 3: Try direct API call
          try {
            const url = `https://api.spotify.com/v1/users/${userId}/playlists`;
            const apiResponse = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: name,
                description: description || '',
                public: false
              })
            });
            
            if (!apiResponse.ok) {
              const errorData = await apiResponse.json();
              throw new Error(`Spotify API error: ${errorData.error?.message || apiResponse.statusText}`);
            }
            
            const data = await apiResponse.json();
            response = { body: data };
            console.log('Approach 3 (direct API) successful');
          } catch (err3) {
            console.log('Approach 3 failed:', err3);
            error = err3;
          }
        }
      }
      
      console.log('Final response received:', !!response);
      console.log('Response type:', typeof response);
      
      // Handle the response properly with more detailed logging
      if (!response) {
        const errorMessage = error && typeof error === 'object' && 'message' in error 
          ? (error as any).message 
          : 'Unknown error';
        throw new Error(`No response received from Spotify API. Last error: ${errorMessage}`);
      }
      
      if (!response.body) {
        console.error('Response structure:', JSON.stringify(response, null, 2));
        throw new Error('Invalid response structure from Spotify API');
      }
      
      const playlistId = response.body.id;
      if (!playlistId) {
        console.error('Response body:', JSON.stringify(response.body, null, 2));
        throw new Error('Failed to create playlist: No ID returned');
      }
      
      console.log('Playlist created successfully:', playlistId);
      return playlistId;
    } catch (error) {
      console.error('Error creating playlist:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async getCurrentUserId(): Promise<string> {
    try {
      const response = await this.api.getMe();
      return response.body.id;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      throw error;
    }
  }

  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    try {
      await this.api.addTracksToPlaylist(playlistId, trackUris);
    } catch (error) {
      console.error('Error adding tracks to playlist:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<{ id: string; display_name: string; email: string; images: Array<{ url: string }> }> {
    try {
      // Log the access token used for getCurrentUser
      // @ts-ignore
      console.log('getCurrentUser: Access Token Excerpt:', this.api.getAccessToken()?.slice(0, 10));
      const response = await this.api.getMe();
      return {
        id: response.body.id,
        display_name: response.body.display_name || '',
        email: response.body.email || '',
        images: response.body.images || []
      };
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }

  // Helper method to detect if a playlist is mixed (has tracks from different artists)
  async isMixedPlaylist(playlistId: string): Promise<boolean> {
    try {
      const tracks = await this.getPlaylistTracks(playlistId);
      if (tracks.length < 2) return false;

      const firstArtist = tracks[0].artists[0]?.name;
      return tracks.some(track => track.artists[0]?.name !== firstArtist);
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
        const response = await this.api.getArtists(chunk);
        const artists = response.body.artists.map(artist => ({
          id: artist.id,
          name: artist.name,
          genres: artist.genres || [],
          popularity: artist.popularity || 0
        }));
        allArtists.push(...artists);
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
        // Log chunk size, sample track ID, and access token excerpt
        // @ts-ignore
        console.log(`getAudioFeaturesForTracks: chunk size: ${chunk.length}, sample track ID: ${chunk[0]}, access token: ${this.api.getAccessToken()?.slice(0, 10)}`);
        try {
          const response = await this.api.getAudioFeaturesForTracks(chunk);
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
          console.log(`Successfully fetched features for ${features.length} tracks`);
        } catch (err: any) {
          console.error('Spotify API error in getAudioFeaturesForTracks:', err && (err.body || err.message || err));
          // Continue with other chunks instead of failing completely
          console.log('Skipping this chunk and continuing...');
        }
      }

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
      
      const response = await this.api.searchTracks(query, { limit });
      
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
      
      const response = await this.api.getTrack(trackId);
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