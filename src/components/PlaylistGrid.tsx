'use client';

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from './Toast';
import Modal from './Modal';

import MusicalProfile from './MusicalProfile';

// Rate limiting hook
function useRateLimitHandler() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState(0);

  const handleRateLimit = useCallback(() => {
    setIsRateLimited(true);
    const resetTime = Date.now() + (60 * 60 * 1000); // 1 hour
    setRateLimitResetTime(resetTime);
    
    // Reset after 1 hour
    setTimeout(() => {
      setIsRateLimited(false);
      setRateLimitResetTime(0);
    }, 60 * 60 * 1000);
  }, []);

  const checkRateLimit = useCallback(() => {
    if (isRateLimited && Date.now() > rateLimitResetTime) {
      setIsRateLimited(false);
      setRateLimitResetTime(0);
    }
    return isRateLimited;
  }, [isRateLimited, rateLimitResetTime]);

  return { isRateLimited, handleRateLimit, checkRateLimit };
}

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

interface PlaylistGridProps {
  playlists?: SpotifyPlaylist[];
  customTitle?: string | null;
  viewMode?: 'grid' | 'compact';
}

function PlaylistContextMenu({ onEdit, onDelete, onShare, onClose, anchorRef }: any) {
  // Close on click outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose, anchorRef]);

  return (
    <div className="absolute right-2 top-10 z-20 bg-[#232323] border border-[#282828] rounded-lg shadow-lg py-2 w-40 animate-fade-in-down">
      <button className="w-full text-left px-4 py-2 hover:bg-[#1DB954]/20 text-white" onClick={onEdit}>Edit</button>
      <button className="w-full text-left px-4 py-2 hover:bg-red-600/20 text-red-400" onClick={onDelete}>Delete</button>
      <button className="w-full text-left px-4 py-2 hover:bg-[#1DB954]/20 text-white" onClick={onShare}>Share</button>
    </div>
  );
}

export default function PlaylistGrid({ playlists: propPlaylists, customTitle, viewMode: propViewMode }: PlaylistGridProps) {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { isRateLimited, handleRateLimit, checkRateLimit } = useRateLimitHandler();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>(propPlaylists || []);
  const [loading, setLoading] = useState(!propPlaylists);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuButtonRefs = useRef<{ [id: string]: HTMLButtonElement | null }>({});
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPlaylist, setEditPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePlaylist, setDeletePlaylist] = useState<SpotifyPlaylist | null>(null);
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePlaylist, setSharePlaylist] = useState<SpotifyPlaylist | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'mixed' | 'regular' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'tracks' | 'duration'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(propViewMode === 'compact' ? 'list' : 'grid');
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [genresModalOpen, setGenresModalOpen] = useState(false);
  const [genresModalData, setGenresModalData] = useState<{playlistName: string, genres: Record<string, number>} | null>(null);
  const [musicalProfileOpen, setMusicalProfileOpen] = useState(false);
  const [selectedPlaylistForAnalysis, setSelectedPlaylistForAnalysis] = useState<string | null>(null);
  const [likedPlaylists, setLikedPlaylists] = useState<Set<string>>(new Set());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePlaylists, setHasMorePlaylists] = useState(true);

  useEffect(() => {
    if (!propPlaylists && session?.accessToken) {
      fetchPlaylists();
    } else if (propPlaylists) {
      setPlaylists(propPlaylists);
      setLoading(false);
    }
  }, [session, propPlaylists]);

  const fetchPlaylists = async (isRetry = false, offset = 0, existingPlaylists: SpotifyPlaylist[] = []) => {
    try {
      if (offset === 0) {
        setLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }
      
      const response = await fetch(`/api/playlists?limit=10&offset=${offset}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403) {
          setError('Access forbidden. Your Spotify app is in Development Mode. Please add your email as a test user or contact support.');
          showToast('Access forbidden. Check Spotify app settings.', 'error');
        } else if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
          showToast('Please log in again.', 'error');
        } else if (response.status === 429) {
          // Handle rate limiting
          handleRateLimit();
          if (!isRetry && retryCount < 2) {
            // Retry rate limit errors up to 2 times with longer delays
            setRetryCount(prev => prev + 1);
            const delay = 5000 * (retryCount + 1); // 5s, 10s delays
            showToast(`Rate limit exceeded. Retrying in ${delay/1000}s...`, 'info');
            setTimeout(() => fetchPlaylists(true, offset, existingPlaylists), delay);
            return;
          } else {
            setError('Rate limit exceeded. Using cached data if available. Please wait 1 hour before trying again.');
            showToast('Rate limit exceeded. Using cached data.', 'info');
            // Don't return here, let it continue to show cached data
          }
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
      
      // If we got less than 10 playlists, we've reached the end
      if (newPlaylists.length < 10) {
        setHasMorePlaylists(false);
        setPlaylists(allPlaylists);
        setRetryCount(0); // Reset retry count on success
      } else {
        // Fetch more playlists recursively
        await fetchPlaylists(isRetry, offset + 10, allPlaylists);
        return; // Don't set playlists here as we're still fetching
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchPlaylists();
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

  function getBadges(playlist: SpotifyPlaylist) {
    const badges = [];
    if (playlist.public) badges.push({ label: 'Public', color: 'bg-blue-600', icon: 'M12 4v16m8-8H4' });
    else badges.push({ label: 'Private', color: 'bg-gray-600', icon: 'M12 4v16m8-8H4' });
    if (playlist.collaborative) badges.push({ label: 'Collaborative', color: 'bg-purple-600', icon: 'M17 8l4 4m0 0l-4 4m4-4H3' });
    if (playlist.name.toLowerCase().includes('mix') || playlist.collaborative) badges.push({ label: 'Mixed', color: 'bg-orange-500', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' });
    return badges;
  }

  // Edit logic
  const handleEdit = useCallback((playlist: SpotifyPlaylist) => {
    setEditPlaylist(playlist);
    setEditName(playlist.name);
    setEditDesc(playlist.description);
    setEditModalOpen(true);
    setMenuOpenId(null);
  }, []);
  const handleEditSave = async () => {
    if (editPlaylist) {
      try {
        const response = await fetch(`/api/playlists/${editPlaylist.id}/edit`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: editName,
            description: editDesc,
            public: editPlaylist.public
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update playlist');
        }

        // Update local state
        setPlaylists(prev => prev.map(p => p.id === editPlaylist.id ? { ...p, name: editName, description: editDesc } : p));
        setEditModalOpen(false);
        showToast('Playlist updated successfully!', 'success');
      } catch (error) {
        console.error('Error updating playlist:', error);
        showToast('Failed to update playlist', 'error');
      }
    }
  };

  // Delete logic
  const handleDelete = useCallback((playlist: SpotifyPlaylist) => {
    setDeletePlaylist(playlist);
    setDeleteConfirmOpen(true);
    setMenuOpenId(null);
  }, []);
  const handleDeleteConfirm = async () => {
    if (deletePlaylist) {
      try {
        const response = await fetch(`/api/playlists/${deletePlaylist.id}/delete`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete playlist');
        }

        // Update local state
        setPlaylists(prev => prev.filter(p => p.id !== deletePlaylist.id));
        setDeleteConfirmOpen(false);
        showToast('Playlist removed from your library', 'success');
      } catch (error) {
        console.error('Error deleting playlist:', error);
        showToast('Failed to remove playlist', 'error');
      }
    }
  };

  // Share logic
  const handleShare = useCallback((playlist: SpotifyPlaylist) => {
    setSharePlaylist(playlist);
    setShareModalOpen(true);
    setMenuOpenId(null);
  }, []);

  // Selection logic
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const deselectAll = () => setSelectedIds([]);

  // Bulk delete/share handlers
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

      // Update local state
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

  const handleBulkDelete = () => {
    setPlaylists(prev => prev.filter(p => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    showToast('Selected playlists deleted', 'success');
  };
  const handleBulkShare = () => {
    setSharePlaylist(null);
    setShareModalOpen(true);
  };

  // Calculate counts for different filter types
  const favoriteCount = playlists.filter(p => likedPlaylists.has(p.id)).length;
  const mixedCount = playlists.filter(p => p.collaborative || p.name.toLowerCase().includes('mix')).length;
  const regularCount = playlists.filter(p => !p.collaborative && !p.name.toLowerCase().includes('mix')).length;

  // Filtering logic
  // Filter and sort playlists
  const filteredAndSortedPlaylists = playlists
    .filter(p => {
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
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'tracks':
          return b.tracks.total - a.tracks.total;
        case 'duration':
          return b.tracks.duration_ms - a.tracks.duration_ms;
        case 'recent':
        default:
          return 0; // Keep original order for recent
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPlaylists.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlaylists = filteredAndSortedPlaylists.slice(startIndex, endIndex);

  // Selection state for filtered playlists
  const allSelected = filteredAndSortedPlaylists.length > 0 && selectedIds.length === filteredAndSortedPlaylists.length;
  const someSelected = selectedIds.length > 0 && !allSelected;
  
  // Select all filtered playlists
  const selectAll = () => setSelectedIds(filteredAndSortedPlaylists.map(p => p.id));

  // Show genres for a playlist
  const showGenresForPlaylist = async (playlist: SpotifyPlaylist) => {
    try {
      // Fetch enriched tracks for the playlist (with genres)
      const response = await fetch(`/api/playlists/${playlist.id}/tracks`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch tracks');
      // Aggregate genres
      const genreCounts: Record<string, number> = {};
      for (const track of data.tracks) {
        if (track.genres && Array.isArray(track.genres)) {
          for (const genre of track.genres) {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          }
        }
      }
      setGenresModalData({ playlistName: playlist.name, genres: genreCounts });
      setGenresModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch genres', 'error');
    }
  };

  // Show musical profile for a playlist
  const showMusicalProfile = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylistForAnalysis(playlist.id);
    setMusicalProfileOpen(true);
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
            onClick={handleRetry}
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
      {/* Filter bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex gap-2 lg:gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          <button
            className={`px-4 lg:px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-lg whitespace-nowrap ${typeFilter === 'all' ? 'bg-[#1DB954] text-white shadow-[#1DB954]/25' : 'bg-[#2a2a2a] text-gray-300 border border-[#282828] hover:bg-[#282828] hover:border-[#1DB954]/30'}`}
            onClick={() => setTypeFilter('all')}
            aria-pressed={typeFilter === 'all'}
          >
            All ({playlists.length})
          </button>
          <button
            className={`px-4 lg:px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-lg whitespace-nowrap ${typeFilter === 'mixed' ? 'bg-[#1DB954] text-white shadow-[#1DB954]/25' : 'bg-[#2a2a2a] text-gray-300 border border-[#282828] hover:bg-[#282828] hover:border-[#1DB954]/30'}`}
            onClick={() => setTypeFilter('mixed')}
            aria-pressed={typeFilter === 'mixed'}
          >
            Mixed ({mixedCount})
          </button>
          <button
            className={`px-4 lg:px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-lg whitespace-nowrap ${typeFilter === 'regular' ? 'bg-[#1DB954] text-white shadow-[#1DB954]/25' : 'bg-[#2a2a2a] text-gray-300 border border-[#282828] hover:bg-[#282828] hover:border-[#1DB954]/30'}`}
            onClick={() => setTypeFilter('regular')}
            aria-pressed={typeFilter === 'regular'}
          >
            Regular ({regularCount})
          </button>
          <button
            className={`px-4 lg:px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-lg whitespace-nowrap ${typeFilter === 'favorites' ? 'bg-[#1DB954] text-white shadow-[#1DB954]/25' : 'bg-[#2a2a2a] text-gray-300 border border-[#282828] hover:bg-[#282828] hover:border-[#1DB954]/30'}`}
            onClick={() => setTypeFilter('favorites')}
            aria-pressed={typeFilter === 'favorites'}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span className="hidden sm:inline">Favorites</span>
              <span className="sm:hidden">Fav</span>
              ({favoriteCount})
            </div>
          </button>
        </div>
        {!loading && playlists.length > 0 && (
          <div className="text-sm text-gray-400">
            Loaded {playlists.length} playlist{playlists.length !== 1 ? 's' : ''} from Spotify
            {hasMorePlaylists && (
              <span className="text-[#1DB954]"> • More available</span>
            )}
          </div>
        )}
        </div>
      </div>
      
      {/* Search bar */}
      <div className="mb-6 px-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search playlists, descriptions, or creators..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="block w-full pl-10 pr-3 py-3 border border-[#282828] rounded-xl bg-[#232323] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-400">
            Found {filteredAndSortedPlaylists.length} playlist{filteredAndSortedPlaylists.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}
      </div>
      
      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#232323] border border-[#282828] rounded-xl shadow-2xl px-6 py-3 flex items-center gap-6 animate-fade-in-up">
          <span className="text-white font-semibold">{selectedIds.length} selected</span>
          <button
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 shadow-md"
            onClick={handleBulkDelete}
          >
            Delete Selected
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-[#1DB954] text-white font-semibold hover:bg-[#1ed760] shadow-md"
            onClick={handleBulkShare}
          >
            Share Selected
          </button>
          <button
            className="ml-2 px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-[#282828]"
            onClick={deselectAll}
            aria-label="Clear selection"
          >
            Clear
          </button>
        </div>
      )}
      {/* Filters and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0 px-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Select All Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div className={`relative w-5 h-5 rounded-md border-2 transition-all duration-200 checkbox-hover ${
              allSelected 
                ? 'bg-[#1DB954] border-[#1DB954] shadow-md shadow-[#1DB954]/30 scale-105' 
                : someSelected
                ? 'bg-[#1DB954]/50 border-[#1DB954] shadow-md shadow-[#1DB954]/20'
                : 'bg-[#232323] border-[#1DB954]/50 hover:border-[#1DB954] hover:bg-[#1DB954]/10'
            }`}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected; }}
                onChange={e => e.target.checked ? selectAll() : deselectAll()}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Select all playlists"
              />
              {(allSelected || someSelected) && (
                <svg 
                  className="absolute inset-0 w-full h-full text-white p-0.5 animate-scale-in" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {someSelected && !allSelected ? (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2.5} 
                      d="M5 12h14"
                      className="animate-checkmark"
                    />
                  ) : (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2.5} 
                      d="M5 13l4 4L19 7"
                      className="animate-checkmark"
                    />
                  )}
                </svg>
              )}
            </div>
            <span className="text-white text-sm font-medium group-hover:text-[#1DB954] transition-colors">
              Select All
            </span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'tracks' | 'duration')}
                className="appearance-none px-3 py-2 border border-[#282828] rounded-lg bg-[#232323] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954] font-sans pr-8 transition-shadow shadow-sm hover:shadow-md w-full sm:w-auto" 
                style={{ minWidth: 140 }}
              >
                <option value="recent">Recently Added</option>
                <option value="name">Name A-Z</option>
                <option value="tracks">Most Songs</option>
                <option value="duration">Longest Duration</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </span>
            </div>
            <div className="relative">
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="appearance-none px-3 py-2 border border-[#282828] rounded-lg bg-[#232323] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954] font-sans pr-8 transition-shadow shadow-sm hover:shadow-md w-full sm:w-auto" 
                style={{ minWidth: 120 }}
              >
                <option value={8}>8 per page</option>
                <option value={12}>12 per page</option>
                <option value={16}>16 per page</option>
                <option value={24}>24 per page</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className={`p-2 rounded-full focus:ring-2 focus:ring-[#1DB954] transition-colors ${viewMode === 'list' ? 'text-[#1DB954] bg-[#1DB954]/20' : 'text-gray-400 hover:text-white hover:bg-[#282828]'}`} 
            aria-label="List view"
            onClick={() => setViewMode('list')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button 
            className={`p-2 rounded-full focus:ring-2 focus:ring-[#1DB954] transition-colors ${viewMode === 'grid' ? 'text-[#1DB954] bg-[#1DB954]/20' : 'text-gray-400 hover:text-white hover:bg-[#282828]'}`} 
            aria-label="Grid view"
            onClick={() => setViewMode('grid')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Playlist grid */}
      <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'flex flex-col'} gap-6 p-6`}>
        {paginatedPlaylists.map((playlist, index) => {
          const badges = getBadges(playlist);
          const selected = selectedIds.includes(playlist.id);
          return (
            <article
              key={playlist.id}
              className={`bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-3xl shadow-xl border border-[#282828] overflow-hidden group cursor-pointer focus-within:ring-2 focus-within:ring-[#1DB954] outline-none transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-[#1DB954]/30 active:scale-[0.98] relative ${selected ? 'ring-2 ring-[#1DB954] shadow-[#1DB954]/20' : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
              tabIndex={0}
              aria-label={`Playlist: ${playlist.name}`}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  // TODO: handle playlist card action
                }
              }}
            >
              {/* Selection checkbox */}
              <label className="absolute top-3 left-3 z-10 cursor-pointer group-hover:opacity-100 opacity-80 transition-all duration-200">
                <div className={`relative w-6 h-6 rounded-full border-2 transition-all duration-200 checkbox-hover ${
                  selected 
                    ? 'bg-[#1DB954] border-[#1DB954] shadow-lg shadow-[#1DB954]/30 scale-110' 
                    : 'bg-[#232323]/90 border-[#1DB954]/50 hover:border-[#1DB954] hover:bg-[#1DB954]/10'
                }`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(playlist.id)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label={`Select playlist ${playlist.name}`}
                  />
                  {selected && (
                    <svg 
                      className="absolute inset-0 w-full h-full text-white p-0.5 animate-scale-in" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2.5} 
                        d="M5 13l4 4L19 7"
                        className="animate-checkmark"
                      />
                    </svg>
                  )}
                </div>
              </label>
              {/* Playlist image */}
              <div className="relative aspect-square bg-gray-800">
                {playlist.images && playlist.images.length > 0 && typeof playlist.images[0].url === 'string' && playlist.images[0].url ? (
                  <img
                    src={`/api/proxy/image?url=${encodeURIComponent(playlist.images[0].url)}`}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log(`Image failed to load for playlist "${playlist.name}", falling back to default`);
                      e.currentTarget.src = "/globe.svg";
                      e.currentTarget.style.opacity = "0.6";
                    }}
                    onLoad={() => {
                      console.log(`✅ Image loaded successfully for playlist "${playlist.name}"`);
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1DB954]/20 to-[#1ed760]/20 flex items-center justify-center">
                    <svg className="w-16 h-16 text-[#1DB954]/40" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </div>
                )}
                {/* Overlay play/quick actions on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center pointer-events-none">

                </div>

                {/* Badges */}
                <div className="absolute left-2 bottom-2 flex flex-wrap gap-2 z-10">
                  {badges.map(badge => (
                    <span key={badge.label} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white shadow ${badge.color}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={badge.icon} />
                      </svg>
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Playlist info */}
              <div className="p-6">
                <h3 className="font-bold text-white text-xl mb-3 truncate font-sans group-hover:text-[#1DB954] transition-colors">
                  {playlist.name}
                </h3>
                <p className="text-gray-300 text-sm line-clamp-2 font-sans leading-relaxed mb-6">
                  {playlist.description || 'No description available'}
                </p>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#1DB954]/10 rounded-full px-2 py-1">
                      <svg className="w-3 h-3 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span className="text-white font-semibold text-xs">{playlist.tracks.total}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-[#1DB954]/10 rounded-full px-2 py-1">
                      <svg className="w-3 h-3 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-white font-semibold text-xs">{formatDuration(playlist.tracks.duration_ms || 0)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-[#1DB954] shadow-sm bg-[#1DB954]/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <span className="text-gray-300 font-medium text-xs truncate max-w-[80px]">{playlist.owner.display_name}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-[#282828] mt-auto relative z-10 min-h-[40px]">
                  <div className="flex items-center gap-2">
                    <button
                      className="flex items-center gap-1 px-2 py-1 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] hover:text-white rounded-lg font-semibold text-xs transition-all duration-200 group/btn relative z-10 shadow-md hover:shadow-lg"
                      aria-label="Show genres in this playlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        showGenresForPlaylist(playlist);
                      }}
                    >
                      <svg className="w-3 h-3 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Genres
                    </button>
                    <button
                      className="flex items-center gap-1 px-2 py-1 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-lg font-semibold text-xs transition-all duration-200 shadow-md hover:shadow-xl group/btn relative z-10"
                      aria-label="Analyze musical profile"
                      onClick={(e) => {
                        e.stopPropagation();
                        showMusicalProfile(playlist);
                      }}
                    >
                      <svg className="w-3 h-3 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Analyze
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      className={`p-1.5 rounded-lg transition-all duration-200 relative z-10 hover:shadow-md ${
                        likedPlaylists.has(playlist.id) 
                          ? 'text-[#1DB954] bg-[#1DB954]/10' 
                          : 'text-gray-400 hover:text-[#1DB954] hover:bg-[#1DB954]/10'
                      }`}
                      aria-label={likedPlaylists.has(playlist.id) ? 'Unlike playlist' : 'Like playlist'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLikePlaylist(playlist.id);
                      }}
                    >
                      <svg className="w-4 h-4" fill={likedPlaylists.has(playlist.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <button
                      ref={el => { menuButtonRefs.current[playlist.id] = el || null; }}
                      className="p-1.5 text-gray-400 hover:text-[#1DB954] hover:bg-[#1DB954]/10 rounded-lg transition-all duration-200 relative z-10 hover:shadow-md"
                      aria-label="More options"
                      tabIndex={0}
                      onClick={e => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === playlist.id ? null : playlist.id);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                      </svg>
                    </button>
                  </div>
                </div>
                {menuOpenId === playlist.id && (
                  <PlaylistContextMenu
                    onEdit={() => handleEdit(playlist)}
                    onDelete={() => handleDelete(playlist)}
                    onShare={() => handleShare(playlist)}
                    onClose={() => setMenuOpenId(null)}
                    anchorRef={{ current: menuButtonRefs.current[playlist.id] }}
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Loading more playlists indicator */}
      {isLoadingMore && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center gap-3 text-[#1DB954]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1DB954]"></div>
            <span className="text-sm font-medium">Loading more playlists...</span>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Playlist">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleEditSave();
          }}
        >
          <label className="block text-white font-semibold mb-2">Playlist Name</label>
          <input
            className="w-full mb-4 px-4 py-2 rounded-lg bg-[#191414] text-white border border-[#282828] focus:ring-2 focus:ring-[#1DB954]"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            required
          />
          <label className="block text-white font-semibold mb-2">Description</label>
          <textarea
            className="w-full mb-4 px-4 py-2 rounded-lg bg-[#191414] text-white border border-[#282828] focus:ring-2 focus:ring-[#1DB954]"
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-4">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-[#1DB954] text-white font-semibold hover:bg-[#1ed760] shadow-md"
              disabled={!editName.trim()}
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Playlist?">
        <div className="mb-6 text-white">Are you sure you want to delete <span className="font-bold">{deletePlaylist?.name}</span>? This cannot be undone.</div>
        <div className="flex justify-end gap-4">
          <button
            className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 shadow-md"
            onClick={handleDeleteConfirm}
          >
            Delete
          </button>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal open={shareModalOpen} onClose={() => setShareModalOpen(false)} title="Share Playlist{selectedIds.length > 1 ? 's' : ''}">
        <div className="mb-6 text-white">Share these playlist links with your friends:</div>
        <div className="space-y-2 mb-4">
          {(selectedIds.length > 0 ? playlists.filter(p => selectedIds.includes(p.id)) : sharePlaylist ? [sharePlaylist] : []).map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <input
                className="w-full px-4 py-2 rounded-lg bg-[#191414] text-white border border-[#282828] focus:ring-2 focus:ring-[#1DB954]"
                value={`https://playlister.app/playlist/${p.id}`}
                readOnly
              />
              <button
                className="px-3 py-2 rounded-lg bg-[#1DB954] text-white font-semibold hover:bg-[#1ed760] shadow-md"
                onClick={() => { navigator.clipboard.writeText(`https://playlister.app/playlist/${p.id}`); showToast('Link copied!', 'success'); }}
              >
                Copy
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
            onClick={() => setShareModalOpen(false)}
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Genres Modal */}
      {genresModalOpen && genresModalData && (
        <Modal open={genresModalOpen} onClose={() => setGenresModalOpen(false)} title={`Genres in "${genresModalData.playlistName}"`}>
          <div className="max-h-96 overflow-y-auto">
            {Object.keys(genresModalData.genres).length === 0 ? (
              <div className="text-gray-300">No genres found in this playlist.</div>
            ) : (
              <ul className="space-y-2">
                {Object.entries(genresModalData.genres)
                  .sort((a, b) => b[1] - a[1])
                  .map(([genre, count]) => (
                    <li key={genre} className="flex justify-between items-center">
                      <span className="text-white font-medium">{genre}</span>
                      <span className="text-gray-400">{count} track{count > 1 ? 's' : ''}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div className="flex justify-end mt-6">
            <button
              className="px-4 py-2 rounded-lg bg-[#1DB954] text-white font-semibold hover:bg-[#1ed760] shadow-md"
              onClick={() => setGenresModalOpen(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Musical Profile Modal */}
      {musicalProfileOpen && selectedPlaylistForAnalysis && (
        <Modal open={musicalProfileOpen} onClose={() => setMusicalProfileOpen(false)} title="Musical Profile Analysis">
          <MusicalProfile 
            playlistId={selectedPlaylistForAnalysis} 
            onClose={() => setMusicalProfileOpen(false)}
          />
        </Modal>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8 mb-4 px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                currentPage === 1 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-[#1DB954] text-white hover:bg-[#1ed760] shadow-md'
              }`}
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">←</span>
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#1DB954] text-white shadow-md'
                        : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#282828]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                currentPage === totalPages 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-[#1DB954] text-white hover:bg-[#1ed760] shadow-md'
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">→</span>
            </button>
          </div>
          
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}

      {/* Empty state */}
      {playlists.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
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