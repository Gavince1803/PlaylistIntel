'use client';

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from './Toast';
import Modal from './Modal';

import MusicalProfile from './MusicalProfile';

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

export default function PlaylistGrid({ playlists: propPlaylists, customTitle }: PlaylistGridProps) {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>(propPlaylists || []);
  const [loading, setLoading] = useState(!propPlaylists);
  const [error, setError] = useState<string | null>(null);
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
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mixed' | 'regular'>('all');
  const [genresModalOpen, setGenresModalOpen] = useState(false);
  const [genresModalData, setGenresModalData] = useState<{playlistName: string, genres: Record<string, number>} | null>(null);
  const [musicalProfileOpen, setMusicalProfileOpen] = useState(false);
  const [selectedPlaylistForAnalysis, setSelectedPlaylistForAnalysis] = useState<string | null>(null);

  useEffect(() => {
    if (!propPlaylists && session?.accessToken) {
      fetchPlaylists();
    } else if (propPlaylists) {
      setPlaylists(propPlaylists);
      setLoading(false);
    }
  }, [session, propPlaylists]);

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
  const handleEditSave = () => {
    if (editPlaylist) {
      setPlaylists(prev => prev.map(p => p.id === editPlaylist.id ? { ...p, name: editName, description: editDesc } : p));
      setEditModalOpen(false);
      showToast('Playlist updated', 'success');
    }
  };

  // Delete logic
  const handleDelete = useCallback((playlist: SpotifyPlaylist) => {
    setDeletePlaylist(playlist);
    setDeleteConfirmOpen(true);
    setMenuOpenId(null);
  }, []);
  const handleDeleteConfirm = () => {
    if (deletePlaylist) {
      setPlaylists(prev => prev.filter(p => p.id !== deletePlaylist.id));
      setDeleteConfirmOpen(false);
      showToast('Playlist deleted', 'success');
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
  const selectAll = () => setSelectedIds(playlists.map(p => p.id));
  const deselectAll = () => setSelectedIds([]);
  const allSelected = playlists.length > 0 && selectedIds.length === playlists.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  // Bulk delete/share handlers
  const handleBulkDelete = () => {
    setPlaylists(prev => prev.filter(p => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    showToast('Selected playlists deleted', 'success');
  };
  const handleBulkShare = () => {
    setSharePlaylist(null);
    setShareModalOpen(true);
  };

  // Filtering logic
  const filteredPlaylists = playlists.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    let matchesType = true;
    if (typeFilter === 'mixed') {
      matchesType = p.collaborative || p.name.toLowerCase().includes('mix');
    } else if (typeFilter === 'regular') {
      matchesType = !p.collaborative && !p.name.toLowerCase().includes('mix');
    }
    return matchesSearch && matchesType;
  });

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
      {/* Search and filter bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 p-6">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your playlists..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#2a2a2a] text-white border border-[#282828] focus:ring-2 focus:ring-[#1DB954] focus:border-[#1DB954] font-sans shadow-lg transition-all duration-200 placeholder-gray-400"
            aria-label="Search playlists"
          />
        </div>
        <div className="flex gap-3">
          <button
            className={`px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-lg ${typeFilter === 'all' ? 'bg-[#1DB954] text-white shadow-[#1DB954]/25' : 'bg-[#2a2a2a] text-gray-300 border border-[#282828] hover:bg-[#282828] hover:border-[#1DB954]/30'}`}
            onClick={() => setTypeFilter('all')}
            aria-pressed={typeFilter === 'all'}
          >
            All Playlists
          </button>
          <button
            className={`px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-lg ${typeFilter === 'mixed' ? 'bg-[#1DB954] text-white shadow-[#1DB954]/25' : 'bg-[#2a2a2a] text-gray-300 border border-[#282828] hover:bg-[#282828] hover:border-[#1DB954]/30'}`}
            onClick={() => setTypeFilter('mixed')}
            aria-pressed={typeFilter === 'mixed'}
          >
            Mixed
          </button>
          <button
            className={`px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-lg ${typeFilter === 'regular' ? 'bg-[#1DB954] text-white shadow-[#1DB954]/25' : 'bg-[#2a2a2a] text-gray-300 border border-[#282828] hover:bg-[#282828] hover:border-[#1DB954]/30'}`}
            onClick={() => setTypeFilter('regular')}
            aria-pressed={typeFilter === 'regular'}
          >
            Regular
          </button>
        </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
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
          <div className="relative">
            <select className="appearance-none px-3 py-2 border border-[#282828] rounded-lg bg-[#232323] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954] font-sans pr-8 transition-shadow shadow-sm hover:shadow-md" style={{ minWidth: 140 }}>
              <option>All Playlists</option>
              <option>Mixed Playlists</option>
              <option>Regular Playlists</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
          </div>
          <div className="relative">
            <select className="appearance-none px-3 py-2 border border-[#282828] rounded-lg bg-[#232323] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954] font-sans pr-8 transition-shadow shadow-sm hover:shadow-md" style={{ minWidth: 140 }}>
              <option>Recently Added</option>
              <option>Name A-Z</option>
              <option>Most Songs</option>
              <option>Longest Duration</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-full focus:ring-2 focus:ring-[#1DB954]" aria-label="List view">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-full focus:ring-2 focus:ring-[#1DB954]" aria-label="Grid view">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Playlist grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
        {filteredPlaylists.map((playlist, index) => {
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
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      console.log(`Image failed to load for playlist "${playlist.name}", falling back to default`);
                      e.currentTarget.src = "/globe.svg";
                      e.currentTarget.style.opacity = "0.6";
                    }}
                    onLoad={() => {
                      console.log(`✅ Image loaded successfully for playlist "${playlist.name}"`);
                    }}
                  />
                ) : (
                  <img
                    src="/globe.svg"
                    alt="Default playlist cover"
                    className="w-full h-full object-cover opacity-60"
                  />
                )}
                {/* Overlay play/quick actions on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center pointer-events-none">

                </div>
                {/* Context menu button */}
                <button
                  ref={el => { menuButtonRefs.current[playlist.id] = el || null; }}
                  className="absolute top-2 right-2 z-10 p-2 rounded-full bg-[#232323]/80 text-gray-300 hover:text-white hover:bg-[#282828] focus:ring-2 focus:ring-[#1DB954] transition-colors"
                  aria-label="More options"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === playlist.id ? null : playlist.id);
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
                {menuOpenId === playlist.id && (
                  <PlaylistContextMenu
                    onEdit={() => handleEdit(playlist)}
                    onDelete={() => handleDelete(playlist)}
                    onShare={() => handleShare(playlist)}
                    onClose={() => setMenuOpenId(null)}
                    anchorRef={{ current: menuButtonRefs.current[playlist.id] }}
                  />
                )}
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
              <div className="p-6 flex flex-col h-full">
                <div className="mb-4 flex-1">
                  <h3 className="font-bold text-white text-xl mb-2 truncate font-sans group-hover:text-[#1DB954] transition-colors">
                    {playlist.name}
                  </h3>
                  <p className="text-gray-300 text-sm line-clamp-2 font-sans leading-relaxed mb-4">
                    {playlist.description || 'No description available'}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
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
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-[#282828] mt-auto">
                  <div className="flex items-center gap-2">
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] hover:text-white rounded-lg font-semibold text-xs transition-all duration-200 group/btn"
                      aria-label="Show genres in this playlist"
                      onClick={() => showGenresForPlaylist(playlist)}
                    >
                      <svg className="w-3 h-3 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Genres
                    </button>
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-lg font-semibold text-xs transition-all duration-200 shadow-md hover:shadow-lg group/btn"
                      aria-label="Analyze musical profile"
                      onClick={() => showMusicalProfile(playlist)}
                    >
                      <svg className="w-3 h-3 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Analyze
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 text-gray-400 hover:text-[#1DB954] hover:bg-[#1DB954]/10 rounded-lg transition-all duration-200" aria-label="Like playlist">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-[#1DB954] hover:bg-[#1DB954]/10 rounded-lg transition-all duration-200" aria-label="Share playlist">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>



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