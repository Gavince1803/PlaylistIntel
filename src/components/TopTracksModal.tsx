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
  playCount: number;
  playlists: string[];
  external_urls: { spotify: string };
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
      
      const response = await fetch('/api/analytics/tracks/most-played');
      if (!response.ok) {
        throw new Error('Failed to fetch top tracks');
      }
      
      const data = await response.json();
      setTracks(data.tracks || []);
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
    <Modal open={isOpen} onClose={onClose} title="Top 25 Most Played Tracks">
      <div className="max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner size="lg" />
            <p className="text-gray-400 mt-4">Loading your top tracks...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchTopTracks}
              className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : tracks.length > 0 ? (
          <div className="space-y-3">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center space-x-4 p-3 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer group"
                onClick={() => openInSpotify(track.external_urls.spotify)}
              >
                {/* Rank */}
                <div className="flex-shrink-0">
                  <span className={`text-lg font-bold ${
                    index < 3 ? 'text-[#1DB954]' : 'text-gray-400'
                  }`}>
                    #{index + 1}
                  </span>
                </div>

                {/* Album Art */}
                <div className="flex-shrink-0">
                  <img
                    src={track.album.images[0]?.url || '/logo.png'}
                    alt={track.album.name}
                    className="w-12 h-12 rounded-md object-cover"
                  />
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate group-hover:text-[#1DB954] transition-colors">
                    {track.name}
                  </h3>
                  <p className="text-gray-400 text-sm truncate">
                    {track.artists.map(artist => artist.name).join(', ')}
                  </p>
                  <p className="text-gray-500 text-xs truncate">
                    {track.album.name}
                  </p>
                </div>

                {/* Play Count */}
                <div className="flex-shrink-0 text-center">
                  <div className="text-[#1DB954] font-bold text-lg">
                    {track.playCount}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {track.playCount === 1 ? 'playlist' : 'playlists'}
                  </div>
                </div>

                {/* Duration */}
                <div className="flex-shrink-0 text-gray-400 text-sm">
                  {formatDuration(track.duration_ms)}
                </div>

                {/* Popularity */}
                <div className="flex-shrink-0">
                  <div className="w-16 bg-[#404040] rounded-full h-2">
                    <div
                      className="bg-[#1DB954] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${track.popularity}%` }}
                    ></div>
                  </div>
                  <div className="text-gray-400 text-xs text-center mt-1">
                    {track.popularity}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">No tracks found</p>
            <p className="text-gray-500 text-sm mt-2">
              This might be because you don't have enough playlists or tracks.
            </p>
          </div>
        )}
      </div>

      {tracks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[#404040]">
          <p className="text-gray-400 text-sm text-center">
            Click on any track to open it in Spotify
          </p>
        </div>
      )}
    </Modal>
  );
}
