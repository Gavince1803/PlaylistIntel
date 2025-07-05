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
        owner: playlist.owner,
        collaborative: playlist.collaborative,
        public: playlist.public,
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
      const response = await this.api.createPlaylist(userId, {
        name,
        description,
        public: false
      });
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
}

export default spotifyApi; 