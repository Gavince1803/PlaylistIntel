'use client';

import { useState } from 'react';
import { useToast } from './Toast';

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

interface CompactPlaylistCardProps {
  playlist: Playlist;
  onAnalyze: (playlistId: string) => void;
  onViewGenres: (playlistId: string) => void;
  onToggleFavorite: (playlistId: string) => void;
  isFavorite?: boolean;
}

export default function CompactPlaylistCard({ 
  playlist, 
  onAnalyze, 
  onViewGenres, 
  onToggleFavorite, 
  isFavorite = false 
}: CompactPlaylistCardProps) {
  const [showActions, setShowActions] = useState(false);
  const { showToast } = useToast();

  const handleCardClick = () => {
    setShowActions(true);
  };

  const handleAction = (action: string) => {
    setShowActions(false);
    
    switch (action) {
      case 'analyze':
        onAnalyze(playlist.id);
        break;
      case 'genres':
        onViewGenres(playlist.id);
        break;
      case 'favorite':
        onToggleFavorite(playlist.id);
        break;
    }
  };

  return (
    <>
      {/* Playlist Card */}
      <div 
        className="relative bg-[#2a2a2a] rounded-lg p-3 cursor-pointer hover:bg-[#333333] transition-colors group"
        onClick={handleCardClick}
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

        {/* Favorite indicator */}
        {isFavorite && (
          <div className="absolute top-2 left-2">
            <span className="text-[#1DB954] text-lg">❤️</span>
          </div>
        )}

        {/* Collaborative indicator */}
        {playlist.collaborative && (
          <div className="absolute top-2 right-2">
            <span className="text-[#1DB954] text-xs">👥</span>
          </div>
        )}
      </div>

      {/* Actions Modal */}
      {showActions && (
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
                {playlist.name}
              </h3>
              <p className="text-gray-400 text-sm">
                {playlist.tracks.total} tracks
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
                  <span className={`text-lg ${isFavorite ? 'text-red-500' : 'text-[#1DB954]'}`}>
                    {isFavorite ? '❤️' : '🤍'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {isFavorite ? 'Remove from your favorites' : 'Save to your favorites'}
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