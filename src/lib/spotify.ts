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

  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    try {
      const response = await this.api.getPlaylistTracks(playlistId, {
        limit: 100,
        fields: 'items(track(id,name,artists,album,duration_ms,uri))'
      });
      
      return response.body.items
        .filter(item => item.track)
        .map(item => ({
          id: item.track!.id,
          name: item.track!.name,
          artists: item.track!.artists,
          album: item.track!.album,
          duration_ms: item.track!.duration_ms,
          uri: item.track!.uri
        }));
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      throw error;
    }
  }

  async createPlaylist(userId: string, name: string, description?: string): Promise<string> {
    try {
      const response = await (this.api.createPlaylist as any)(userId, name, {
        description,
        public: false
      }) as { body: { id: string } };
      return response.body.id;
    } catch (error) {
      console.error('Error creating playlist:', error);
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
        console.log('Requesting audio features for track IDs:', chunk);
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
        } catch (err: any) {
          console.error('Spotify API error in getAudioFeaturesForTracks:', err && (err.body || err.message || err));
          throw err;
        }
      }

      return allFeatures;
    } catch (error) {
      console.error('Error fetching audio features:', error);
      throw error;
    }
  }
}

export default spotifyApi; 