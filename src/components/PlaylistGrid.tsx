'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from './Toast';

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string; width?: number; height?: number }>;
  tracks: {
    total: number;
  };
  owner: {
    display_name: string;
    id: string;
  };
  collaborative: boolean;
  public: boolean;
  snapshot_id: string;
}

export default function PlaylistGrid() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken) {
      fetchPlaylists();
    }
  }, [session]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/playlists?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }
      
      const data = await response.json();
      setPlaylists(data.playlists || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <section className="p-6" aria-label="Your playlists">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#232323] rounded-2xl shadow-lg border border-[#282828] overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-700"></div>
              <div className="p-5 space-y-3">
                <div className="h-6 bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="p-6" aria-label="Your playlists">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Error loading playlists</h3>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={fetchPlaylists}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-6 py-2 rounded-full font-semibold transition-colors shadow-md"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="p-6" aria-label="Your playlists">
      {/* Filters and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <select className="px-3 py-2 border border-[#282828] rounded-lg bg-[#232323] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954] font-sans">
            <option>All Playlists</option>
            <option>Mixed Playlists</option>
            <option>Regular Playlists</option>
          </select>
          <select className="px-3 py-2 border border-[#282828] rounded-lg bg-[#232323] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954] font-sans">
            <option>Recently Added</option>
            <option>Name A-Z</option>
            <option>Most Songs</option>
            <option>Longest Duration</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-full" aria-label="List view">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-full" aria-label="Grid view">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Playlist grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {playlists.map((playlist) => (
          <article
            key={playlist.id}
            className="bg-[#232323] rounded-2xl shadow-lg border border-[#282828] overflow-hidden hover:shadow-2xl transition-shadow group cursor-pointer focus-within:ring-2 focus-within:ring-[#1DB954] outline-none"
            tabIndex={0}
            aria-label={`Playlist: ${playlist.name}`}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                // TODO: handle playlist card action
              }
            }}
          >
            {/* Playlist image */}
            <div className="relative aspect-square bg-gray-800">
              {playlist.images && playlist.images.length > 0 ? (
                <img
                  src={playlist.images[0].url}
                  alt={playlist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <button className="opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-200 w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg" aria-label="Play playlist">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              {playlist.collaborative && (
                <div className="absolute top-2 right-2 bg-[#1DB954] text-white text-xs px-2 py-1 rounded-full font-medium shadow">
                  Mixed
                </div>
              )}
            </div>

            {/* Playlist info */}
            <div className="p-5">
              <h3 className="font-bold text-white text-lg mb-1 truncate font-sans">
                {playlist.name}
              </h3>
              <p className="text-gray-300 text-sm mb-3 line-clamp-2 font-sans">
                {playlist.description || 'No description'}
              </p>
              
              <div className="flex items-center justify-between text-sm text-gray-400 font-sans">
                <span>{playlist.tracks.total} songs</span>
                <span>{playlist.owner.display_name}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#282828]">
                <button className="text-[#1DB954] hover:text-white text-sm font-semibold font-sans transition-colors" aria-label="Create from this playlist">
                  Create From This
                </button>
                <div className="flex items-center space-x-2">
                  <button className="p-1 text-gray-400 hover:text-white hover:bg-[#282828] rounded-full" aria-label="Like playlist">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  <button className="p-1 text-gray-400 hover:text-white hover:bg-[#282828] rounded-full" aria-label="More options">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Empty state */}
      {playlists.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-sans">
            No playlists found
          </h3>
          <p className="text-gray-400 mb-6 font-sans">
            You don't have any playlists yet. Create your first playlist on Spotify!
          </p>
        </div>
      )}
    </section>
  );
} 