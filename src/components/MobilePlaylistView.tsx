'use client';

import { useState } from 'react';
import { useToast } from './Toast';
import LoadingSpinner from './LoadingSpinner';

interface Playlist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string; width?: number; height?: number }>;
  tracks: { total: number };
  owner: { display_name: string };
  collaborative: boolean;
  public: boolean;
}

interface MobilePlaylistViewProps {
  playlists: Playlist[];
  loading?: boolean;
}

export default function MobilePlaylistView({ playlists, loading = false }: MobilePlaylistViewProps) {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showActions, setShowActions] = useState(false);
  const { showToast } = useToast();

  const handlePlaylistClick = (playlist: Playlist) => {
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
        showToast('Added to favorites', 'success');
        break;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[#2a2a2a] rounded-lg p-3 animate-pulse">
            <div className="w-full aspect-square bg-[#404040] rounded-md mb-3"></div>
            <div className="h-4 bg-[#404040] rounded mb-2"></div>
            <div className="h-3 bg-[#404040] rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Compact Playlist Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4">
        {playlists.map((playlist) => (
          <div 
            key={playlist.id}
            className="relative bg-[#2a2a2a] rounded-lg p-3 cursor-pointer hover:bg-[#333333] transition-colors group"
            onClick={() => handlePlaylistClick(playlist)}
          >
            {/* Playlist Image */}
            <div className="relative mb-3">
              <div className="w-full aspect-square rounded-md overflow-hidden bg-[#404040]">
                {playlist.images[0] ? (
                  <img 
                    src={`/api/proxy/image?url=${encodeURIComponent(playlist.images[0].url)}`}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[#1DB954] text-2xl">🎵</span>
                  </div>
                )}
              </div>
              
              {/* Track count badge */}
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                {playlist.tracks.total}
              </div>
            </div>

            {/* Playlist Info */}
            <div className="space-y-1">
              <h3 className="text-white font-medium text-sm truncate">
                {playlist.name}
              </h3>
              <p className="text-gray-400 text-xs truncate">
                {playlist.owner.display_name}
              </p>
            </div>

            {/* Collaborative indicator */}
            {playlist.collaborative && (
              <div className="absolute top-2 right-2">
                <span className="text-[#1DB954] text-xs">👥</span>
              </div>
            )}
          </div>
        ))}
      </div>

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
              <h3 className="text-white font-semibold text-lg truncate">
                {selectedPlaylist.name}
              </h3>
              <p className="text-gray-400 text-sm">
                {selectedPlaylist.tracks.total} tracks
              </p>
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={() => handleAction('analyze')}
                className="w-full flex items-center gap-3 p-3 text-left text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                  <span className="text-[#1DB954] text-lg">📊</span>
                </div>
                <div>
                  <p className="font-medium">Analyze Playlist</p>
                  <p className="text-gray-400 text-xs">Get musical insights</p>
                </div>
              </button>

              <button
                onClick={() => handleAction('genres')}
                className="w-full flex items-center gap-3 p-3 text-left text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                  <span className="text-[#1DB954] text-lg">🎵</span>
                </div>
                <div>
                  <p className="font-medium">View Genres</p>
                  <p className="text-gray-400 text-xs">See genre breakdown</p>
                </div>
              </button>

              <button
                onClick={() => handleAction('favorite')}
                className="w-full flex items-center gap-3 p-3 text-left text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                  <span className="text-[#1DB954] text-lg">🤍</span>
                </div>
                <div>
                  <p className="font-medium">Add to Favorites</p>
                  <p className="text-gray-400 text-xs">Save to your favorites</p>
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