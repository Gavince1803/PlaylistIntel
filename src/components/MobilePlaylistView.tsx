'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from './Toast';
import LoadingSpinner from './LoadingSpinner';

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string; width?: number; height?: number }>;
  tracks: {
    total: number;
    items: Array<{ id: string; name: string; artist: string; duration: number }>;
    duration_ms: number;
  };
  owner: {
    display_name: string;
    id: string;
  };
  collaborative: boolean;
  public: boolean;
  snapshot_id: string;
}

export default function MobilePlaylistView() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mixed' | 'regular' | 'favorites'>('all');
  const [likedPlaylists, setLikedPlaylists] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (session?.accessToken) {
      fetchPlaylists();
    }
  }, [session]);

  const fetchPlaylists = async (isRetry = false, offset = 0, existingPlaylists: SpotifyPlaylist[] = []) => {
    try {
      if (offset === 0) {
        setLoading(true);
        setError(null);
      }
      
      const response = await fetch(`/api/playlists?limit=50&offset=${offset}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403) {
          setError('Access forbidden. Your Spotify app is in Development Mode. Please add your email as a test user or contact support.');
          showToast('Access forbidden. Check Spotify app settings.', 'error');
        } else if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
          showToast('Please log in again.', 'error');
        } else if (response.status === 429 && !isRetry && retryCount < 3) {
          setRetryCount(prev => prev + 1);
          showToast('Rate limit exceeded. Retrying...', 'info');
          setTimeout(() => fetchPlaylists(true, offset, existingPlaylists), 2000 * (retryCount + 1));
          return;
        } else if (response.status === 429) {
          setError('Too many requests. Please try again in a few moments.');
          showToast('Rate limit exceeded. Please wait a moment.', 'error');
        } else {
          const errorMessage = errorData.message || 'Failed to fetch playlists';
          setError(errorMessage);
          showToast(errorMessage, 'error');
        }
        return;
      }
      
      const data = await response.json();
      const newPlaylists = data.playlists || [];
      const allPlaylists = [...existingPlaylists, ...newPlaylists];
      
      // If we got less than 50 playlists, we've reached the end
      if (newPlaylists.length < 50) {
        setPlaylists(allPlaylists);
        setRetryCount(0);
      } else {
        // Fetch more playlists recursively
        await fetchPlaylists(isRetry, offset + 50, allPlaylists);
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchPlaylists();
  };

  // Check like status for all playlists
  const checkLikeStatuses = async () => {
    try {
      const promises = playlists.map(async (playlist) => {
        const response = await fetch(`/api/playlists/${playlist.id}/like`);
        if (response.ok) {
          const data = await response.json();
          return { id: playlist.id, isLiked: data.isLiked };
        }
        return { id: playlist.id, isLiked: false };
      });

      const results = await Promise.all(promises);
      const likedIds = results.filter(r => r.isLiked).map(r => r.id);
      setLikedPlaylists(new Set(likedIds));
    } catch (error) {
      console.error('Error checking like statuses:', error);
    }
  };

  // Check like statuses when playlists load
  useEffect(() => {
    if (playlists.length > 0) {
      checkLikeStatuses();
    }
  }, [playlists]);

  // Like/Unlike functionality
  const handleLikePlaylist = async (playlistId: string) => {
    try {
      const isCurrentlyLiked = likedPlaylists.has(playlistId);
      const action = isCurrentlyLiked ? 'unlike' : 'like';
      
      const response = await fetch(`/api/playlists/${playlistId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} playlist`);
      }

      if (isCurrentlyLiked) {
        setLikedPlaylists(prev => {
          const newSet = new Set(prev);
          newSet.delete(playlistId);
          return newSet;
        });
        showToast('Playlist removed from favorites', 'success');
      } else {
        setLikedPlaylists(prev => new Set([...prev, playlistId]));
        showToast('Playlist added to favorites', 'success');
      }
    } catch (error) {
      console.error('Error liking playlist:', error);
      showToast('Failed to update playlist like status', 'error');
    }
  };

  const handlePlaylistClick = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    setShowActions(true);
  };

  const handleAction = (action: string) => {
    if (!selectedPlaylist) return;
    
    setShowActions(false);
    
    switch (action) {
      case 'analyze':
        showToast('Opening analysis...', 'info');
        window.location.href = `/analysis/playlist/${selectedPlaylist.id}`;
        break;
      case 'genres':
        showToast('Loading genres...', 'info');
        // TODO: Implement genre view
        break;
      case 'favorite':
        handleLikePlaylist(selectedPlaylist.id);
        break;
    }
  };

  // Filter playlists
  const filteredPlaylists = playlists.filter(p => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.owner.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Type filter
    let matchesType = true;
    if (typeFilter === 'mixed') {
      matchesType = p.collaborative || p.name.toLowerCase().includes('mix');
    } else if (typeFilter === 'regular') {
      matchesType = !p.collaborative && !p.name.toLowerCase().includes('mix');
    } else if (typeFilter === 'favorites') {
      matchesType = likedPlaylists.has(p.id);
    }
    return matchesType;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 p-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-[#2a2a2a] rounded-lg p-2 animate-pulse">
            <div className="w-full aspect-square bg-[#404040] rounded-md mb-2"></div>
            <div className="h-3 bg-[#404040] rounded mb-1"></div>
            <div className="h-2 bg-[#404040] rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Error loading playlists</h3>
        <p className="text-gray-400 mb-4 text-sm">{error}</p>
        <button 
          onClick={handleRetry}
          className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-4 py-2 rounded-full font-semibold transition-colors shadow-md text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-[#282828] rounded-lg bg-[#232323] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent transition-all duration-200 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Results count */}
        {searchQuery && (
          <p className="text-xs text-gray-400 px-1">
            Found {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}

        {/* Filter buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
              typeFilter === 'all' 
                ? 'bg-[#1DB954] text-white' 
                : 'bg-[#2a2a2a] text-gray-300 border border-[#282828] hover:bg-[#282828]'
            }`}
            onClick={() => setTypeFilter('all')}
          >
            All ({playlists.length})
          </button>
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
              typeFilter === 'mixed' 
                ? 'bg-[#1DB954] text-white' 
                : 'bg-[#2a2a2a] text-gray-300 border border-[#282828] hover:bg-[#282828]'
            }`}
            onClick={() => setTypeFilter('mixed')}
          >
            Mixed ({playlists.filter(p => p.collaborative || p.name.toLowerCase().includes('mix')).length})
          </button>
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
              typeFilter === 'regular' 
                ? 'bg-[#1DB954] text-white' 
                : 'bg-[#2a2a2a] text-gray-300 border border-[#282828] hover:bg-[#282828]'
            }`}
            onClick={() => setTypeFilter('regular')}
          >
            Regular ({playlists.filter(p => !p.collaborative && !p.name.toLowerCase().includes('mix')).length})
          </button>
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
              typeFilter === 'favorites' 
                ? 'bg-[#1DB954] text-white' 
                : 'bg-[#2a2a2a] text-gray-300 border border-[#282828] hover:bg-[#282828]'
            }`}
            onClick={() => setTypeFilter('favorites')}
          >
            ❤️ Fav ({likedPlaylists.size})
          </button>
        </div>
      </div>

      {/* Compact Playlist Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 p-4">
        {filteredPlaylists.map((playlist) => (
          <div 
            key={playlist.id}
            className="relative bg-[#2a2a2a] rounded-lg p-2 cursor-pointer hover:bg-[#333333] transition-colors group"
            onClick={() => handlePlaylistClick(playlist)}
          >
            {/* Playlist Image */}
            <div className="relative mb-2">
              <div className="w-full aspect-square rounded-md overflow-hidden bg-[#404040]">
                {playlist.images && playlist.images.length > 0 && typeof playlist.images[0].url === 'string' && playlist.images[0].url ? (
                  <img 
                    src={`/api/proxy/image?url=${encodeURIComponent(playlist.images[0].url)}`}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/globe.svg";
                      e.currentTarget.style.opacity = "0.6";
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[#1DB954] text-lg">🎵</span>
                  </div>
                )}
              </div>
              
              {/* Track count badge */}
              <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                {playlist.tracks.total}
              </div>

              {/* Like indicator */}
              {likedPlaylists.has(playlist.id) && (
                <div className="absolute top-0.5 left-0.5">
                  <span className="text-[#1DB954] text-xs">❤️</span>
                </div>
              )}
            </div>

            {/* Playlist Info */}
            <div className="space-y-0.5">
              <h3 className="text-white font-medium text-xs truncate leading-tight">
                {playlist.name}
              </h3>
              <p className="text-gray-400 text-[10px] truncate leading-tight">
                {playlist.owner.display_name}
              </p>
            </div>

            {/* Collaborative indicator */}
            {playlist.collaborative && (
              <div className="absolute top-1 right-1">
                <span className="text-[#1DB954] text-xs">👥</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredPlaylists.length === 0 && !loading && (
        <div className="text-center py-8 px-4">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No playlists found</h3>
          <p className="text-gray-400 text-sm">
            {searchQuery ? `No playlists match "${searchQuery}"` : 'You don\'t have any playlists yet.'}
          </p>
        </div>
      )}

      {/* Actions Modal */}
      {showActions && selectedPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowActions(false)}
          />
          
          {/* Actions Menu */}
          <div className="relative bg-[#232323] rounded-xl shadow-2xl border border-[#282828] w-full max-w-sm">
            {/* Header */}
            <div className="p-4 border-b border-[#282828]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#404040] flex-shrink-0">
                  {selectedPlaylist.images && selectedPlaylist.images.length > 0 && typeof selectedPlaylist.images[0].url === 'string' && selectedPlaylist.images[0].url ? (
                    <img 
                      src={`/api/proxy/image?url=${encodeURIComponent(selectedPlaylist.images[0].url)}`}
                      alt={selectedPlaylist.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/globe.svg";
                        e.currentTarget.style.opacity = "0.6";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[#1DB954] text-xl">🎵</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-semibold text-lg truncate">
                    {selectedPlaylist.name}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {selectedPlaylist.tracks.total} tracks • {selectedPlaylist.owner.display_name}
                  </p>
                  {selectedPlaylist.description && (
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                      {selectedPlaylist.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={() => handleAction('analyze')}
                className="w-full flex items-center gap-3 p-3 text-left text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Analyze Playlist</p>
                  <p className="text-gray-400 text-xs">Get musical insights and trends</p>
                </div>
              </button>

              <button
                onClick={() => handleAction('genres')}
                className="w-full flex items-center gap-3 p-3 text-left text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">View Genres</p>
                  <p className="text-gray-400 text-xs">See genre breakdown and distribution</p>
                </div>
              </button>

              <button
                onClick={() => handleAction('favorite')}
                className="w-full flex items-center gap-3 p-3 text-left text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">
                    {likedPlaylists.has(selectedPlaylist.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {likedPlaylists.has(selectedPlaylist.id) ? 'Remove from your favorites' : 'Save to your favorites'}
                  </p>
                </div>
              </button>
            </div>

            {/* Cancel Button */}
            <div className="p-3 border-t border-[#282828]">
              <button
                onClick={() => setShowActions(false)}
                className="w-full py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 