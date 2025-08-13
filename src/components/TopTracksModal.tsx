'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';

interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string }> };
  duration_ms: number;
  popularity: number;
  playCount?: number;
  playlists?: string[];
  external_urls: { spotify: string };
  // New properties from user top tracks API
  rank?: number;
  timeRange?: string;
  estimatedPlays?: number;
}

interface TopTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TopTracksModal({ isOpen, onClose }: TopTracksModalProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tracks.length === 0) {
      fetchTopTracks();
    }
  }, [isOpen]);

  const fetchTopTracks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/analytics/tracks/user-top?time_range=medium_term');
      if (!response.ok) {
        throw new Error('Failed to fetch top tracks');
      }
      
      const data = await response.json();
      const sortedTracks = (data.tracks || []).sort((a: Track, b: Track) => 
        (b.estimatedPlays || 0) - (a.estimatedPlays || 0)
      );
      setTracks(sortedTracks);
    } catch (error) {
      console.error('Error fetching top tracks:', error);
      setError('Failed to load top tracks data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const openInSpotify = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Your Top Tracks from Spotify">
      {/* Back Button - Repositioned to not collide with header */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Main Content - Better spacing and removed bottom tab */}
      <div className="pt-12 pb-6 px-2">
        <div className="max-h-[65vh] overflow-y-auto pr-2">
          {loading ? (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" />
              <p className="text-gray-400 mt-4 text-lg">Loading your top tracks...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4 text-lg">{error}</p>
              <button
                onClick={fetchTopTracks}
                className="px-6 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : tracks.length > 0 ? (
            <div className="space-y-4">
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center space-x-4 p-4 rounded-xl hover:bg-[#2a2a2a] transition-all duration-200 cursor-pointer group border border-transparent hover:border-[#404040]"
                  onClick={() => openInSpotify(track.external_urls.spotify)}
                >
                  {/* Rank - Better styling */}
                  <div className="flex-shrink-0">
                    <span className={`text-xl font-bold ${
                      index < 3 ? 'text-[#1DB954]' : 'text-gray-400'
                    }`}>
                      #{track.rank || index + 1}
                    </span>
                  </div>

                  {/* Album Art - Better sizing */}
                  <div className="flex-shrink-0">
                    <img
                      src={track.album.images[0]?.url || '/logo.png'}
                      alt={track.album.name}
                      className="w-14 h-14 rounded-lg object-cover shadow-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/logo.png';
                      }}
                    />
                  </div>

                  {/* Track Info - Better text handling and spacing */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-base leading-tight group-hover:text-[#1DB954] transition-colors" title={track.name}>
                      {track.name.length > 40 ? `${track.name.substring(0, 40)}...` : track.name}
                    </h3>
                    <p className="text-gray-300 text-sm leading-tight mt-1 font-medium">
                      {track.artists.map(artist => artist.name).join(', ')}
                    </p>
                    <p className="text-gray-500 text-xs leading-tight mt-1">
                      {track.album.name}
                    </p>
                  </div>

                  {/* Estimated Plays - Better styling */}
                  <div className="flex-shrink-0 text-center">
                    <div className="text-[#1DB954] font-bold text-xl">
                      {track.estimatedPlays || track.playCount || 0}
                    </div>
                    <div className="text-gray-400 text-xs font-medium">
                      plays
                    </div>
                  </div>

                  {/* Duration - Better styling */}
                  <div className="flex-shrink-0 text-gray-400 text-sm font-medium bg-[#282828] px-3 py-1 rounded-lg">
                    {formatDuration(track.duration_ms)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No tracks found</p>
              <p className="text-gray-500 text-sm mt-2">
                This might be because you don't have enough playlists or tracks.
              </p>
            </div>
          )}
        </div>

        {/* Footer info - Integrated into main content, no separate tab */}
        {tracks.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[#404040]">
            <p className="text-gray-400 text-sm text-center">
              💡 Click on any track to open it in Spotify
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
