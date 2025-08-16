'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from './Toast';
import LoadingSpinner from './LoadingSpinner';
import PlaylistGenresModal from './PlaylistGenresModal';

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
  const [showGenresModal, setShowGenresModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mixed' | 'regular' | 'favorites'>('all');
  const [likedPlaylists, setLikedPlaylists] = useState<Set<string>>(new Set());
  const [checkingLikes, setCheckingLikes] = useState(false);

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
      
      const response = await fetch(`/api/playlists?limit=10&offset=${offset}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403) {
          const errorMessage = '🚫 Access Forbidden: Your Spotify app is in Development Mode. Only test users can access it. To fix this: 1) Go to Spotify Developer Dashboard, 2) Add your email as a test user, or 3) Switch to Production Mode (requires business verification).';
          setError(errorMessage);
          showToast('Development Mode restriction detected', 'error');
          
          // Dispatch custom event for RateLimitStatus component
          window.dispatchEvent(new CustomEvent('forbidden-error', { 
            detail: { statusCode: 403, message: errorMessage } 
          }));
        } else if (response.status === 401) {
          const errorMessage = '🔐 Authentication Failed: Your Spotify session has expired. Please refresh the page and sign in again.';
          setError(errorMessage);
          showToast('Session expired - please sign in again', 'error');
          
          // Dispatch custom event for RateLimitStatus component
          window.dispatchEvent(new CustomEvent('auth-error', { 
            detail: { statusCode: 401, message: errorMessage } 
          }));
        } else if (response.status === 429 && !isRetry && retryCount < 3) {
          setRetryCount(prev => prev + 1);
          const retryDelay = 2000 * (retryCount + 1);
          showToast(`Rate limit exceeded. Retrying in ${retryDelay/1000}s...`, 'info');
          
          // Dispatch custom event for RateLimitStatus component
          window.dispatchEvent(new CustomEvent('rate-limit-error', { 
            detail: { statusCode: 429, message: 'Rate limit exceeded' } 
          }));
          
          setTimeout(() => fetchPlaylists(true, offset, existingPlaylists), retryDelay);
          return;
        } else if (response.status === 429) {
          const errorMessage = '⏰ Rate Limit Exceeded: Spotify API rate limit exceeded. The app will automatically retry with delays. Please wait a moment or refresh the page.';
          setError(errorMessage);
          showToast('Rate limit exceeded - waiting for reset', 'info');
          
          // Dispatch custom event for RateLimitStatus component
          window.dispatchEvent(new CustomEvent('rate-limit-error', { 
            detail: { statusCode: 429, message: 'Rate limit exceeded' } 
          }));
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
    // Prevent multiple simultaneous calls
    if (checkingLikes) return;
    
    try {
      setCheckingLikes(true);
      
      // Process playlists in smaller batches to avoid overwhelming the API
      const batchSize = 5;
      const results: Array<{ id: string; isLiked: boolean }> = [];
      
      for (let i = 0; i < playlists.length; i += batchSize) {
        const batch = playlists.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (playlist) => {
          try {
            const response = await fetch(`/api/playlists/${playlist.id}/like`);
            if (response.ok) {
              const data = await response.json();
              return { id: playlist.id, isLiked: data.isLiked };
            }
            // Handle specific error statuses silently
            if (response.status === 403 || response.status === 401 || response.status === 429) {
              console.warn(`Skipping like check for playlist ${playlist.id}: ${response.status}`);
              return { id: playlist.id, isLiked: false };
            }
            return { id: playlist.id, isLiked: false };
          } catch (error) {
            console.warn(`Error checking like status for playlist ${playlist.id}:`, error);
            return { id: playlist.id, isLiked: false };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add a small delay between batches to be more respectful to the API
        if (i + batchSize < playlists.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      const likedIds = results.filter(r => r.isLiked).map(r => r.id);
      setLikedPlaylists(new Set(likedIds));
    } catch (error) {
      console.error('Error checking like statuses:', error);
      // Don't show error to user for like status checks
    } finally {
      setCheckingLikes(false);
    }
  };

  // Check like statuses when playlists load, but only if we haven't checked recently
  useEffect(() => {
    if (playlists.length > 0 && !loading && !checkingLikes) {
      // Add a small delay to avoid overwhelming the API
      const timer = setTimeout(() => {
        checkLikeStatuses();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [playlists, loading]);

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
        let errorMessage = `Failed to ${action} playlist`;
        
        if (response.status === 403) {
          errorMessage = 'Cannot modify this playlist. It may be collaborative or private.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication required. Please refresh the page.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        }
        
        throw new Error(errorMessage);
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to update playlist like status';
      showToast(errorMessage, 'error');
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
        window.location.href = `/analytics/playlist/${selectedPlaylist.id}`;
        break;
      case 'genres':
        setShowGenresModal(true);
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
    const isRateLimitError = error.includes('429') || error.includes('rate limit');
    const isPermissionError = error.includes('403') || error.includes('permission');
    const isAuthError = error.includes('401') || error.includes('unauthorized');
    
    return (
      <div className="text-center py-8 px-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isRateLimitError ? 'bg-orange-500/20' : 
          isPermissionError ? 'bg-yellow-500/20' : 
          isAuthError ? 'bg-red-500/20' : 'bg-red-500/20'
        }`}>
          {isRateLimitError ? (
            <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : isPermissionError ? (
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        
        <h3 className="text-lg font-bold text-white mb-2">
          {isRateLimitError ? 'Rate Limit Exceeded' :
           isPermissionError ? 'Permission Denied' :
           isAuthError ? 'Authentication Error' :
           'Error loading playlists'}
        </h3>
        
        <p className="text-gray-400 mb-4 text-sm max-w-sm mx-auto">
          {isRateLimitError ? 
            'Spotify API rate limit exceeded. Please wait a moment and try again.' :
           isPermissionError ? 
            'Some playlists may not be accessible due to privacy settings. This is normal for collaborative playlists.' :
           isAuthError ? 
            'Authentication failed. Please refresh the page and try again.' :
           error}
        </p>
        
        <div className="flex gap-2 justify-center">
          <button 
            onClick={handleRetry}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-4 py-2 rounded-xl font-semibold transition-all duration-200 shadow-lg text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
          
          {isRateLimitError && (
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#2a2a2a] hover:bg-[#333333] text-white px-4 py-2 rounded-xl font-semibold transition-all duration-200 border border-[#282828] text-sm"
            >
              Refresh Page
            </button>
          )}
        </div>
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

        {/* Ultra Modern Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
              typeFilter === 'all' 
                ? 'bg-gradient-to-r from-[#1DB954] via-[#1ed760] to-[#1DB954] text-white shadow-lg shadow-[#1DB954]/30 transform scale-105' 
                : 'bg-gradient-to-r from-[#2a2a2a] to-[#333333] text-gray-300 border border-[#404040] hover:bg-gradient-to-r hover:from-[#333333] hover:to-[#404040] hover:border-[#1DB954]/50 hover:shadow-lg hover:shadow-[#1DB954]/10 backdrop-blur-sm'
            }`}
            onClick={() => setTypeFilter('all')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="font-bold">All</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {playlists.length}
            </span>
          </button>
          
          <button
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
              typeFilter === 'mixed' 
                ? 'bg-gradient-to-r from-[#FF6B35] via-[#FF8C42] to-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/30 transform scale-105' 
                : 'bg-gradient-to-r from-[#2a2a2a] to-[#333333] text-gray-300 border border-[#404040] hover:bg-gradient-to-r hover:from-[#333333] hover:to-[#404040] hover:border-[#FF6B35]/50 hover:shadow-lg hover:shadow-[#FF6B35]/10 backdrop-blur-sm'
            }`}
            onClick={() => setTypeFilter('mixed')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="font-bold">Mixed</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {playlists.filter(p => p.collaborative || p.name.toLowerCase().includes('mix')).length}
            </span>
          </button>
          
          <button
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
              typeFilter === 'regular' 
                ? 'bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#6366F1] text-white shadow-lg shadow-[#6366F1]/30 transform scale-105' 
                : 'bg-gradient-to-r from-[#2a2a2a] to-[#333333] text-gray-300 border border-[#404040] hover:bg-gradient-to-r hover:from-[#333333] hover:to-[#404040] hover:border-[#6366F1]/50 hover:shadow-lg hover:shadow-[#6366F1]/10 backdrop-blur-sm'
            }`}
            onClick={() => setTypeFilter('regular')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="font-bold">Regular</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {playlists.filter(p => !p.collaborative && !p.name.toLowerCase().includes('mix')).length}
            </span>
          </button>
          
          <button
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
              typeFilter === 'favorites' 
                ? 'bg-gradient-to-r from-[#EC4899] via-[#F472B6] to-[#EC4899] text-white shadow-lg shadow-[#EC4899]/30 transform scale-105' 
                : 'bg-gradient-to-r from-[#2a2a2a] to-[#333333] text-gray-300 border border-[#404040] hover:bg-gradient-to-r hover:from-[#333333] hover:to-[#404040] hover:border-[#EC4899]/50 hover:shadow-lg hover:shadow-[#EC4899]/10 backdrop-blur-sm'
            }`}
            onClick={() => setTypeFilter('favorites')}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="font-bold">Favorites</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {likedPlaylists.size}
            </span>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
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

      {/* Genres Modal */}
      {selectedPlaylist && (
        <PlaylistGenresModal
          isOpen={showGenresModal}
          onClose={() => setShowGenresModal(false)}
          playlistId={selectedPlaylist.id}
          playlistName={selectedPlaylist.name}
        />
      )}
    </>
  );
} 