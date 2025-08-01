'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import LoadingSpinner from './LoadingSpinner';

interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  uri: string;
  playlistName: string;
  playlistId: string;
}

interface GenreTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
  genre: string;
}

export default function GenreTracksModal({ isOpen, onClose, genre }: GenreTracksModalProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<string[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && genre) {
      fetchGenreTracks();
    }
  }, [isOpen, genre]);

  const fetchGenreTracks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/genres/${encodeURIComponent(genre)}/tracks`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch genre tracks');
      }
      
      const data = await response.json();
      setTracks(data.tracks);
      setPlaylists(data.playlists);
    } catch (error) {
      console.error('Error fetching genre tracks:', error);
      showToast('Failed to load genre tracks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatArtists = (artists: Array<{ name: string }>) => {
    return artists.map(artist => artist.name).join(', ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#232323] rounded-2xl shadow-2xl border border-[#282828] w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#282828]">
          <div>
            <h2 className="text-2xl font-bold text-white">{genre}</h2>
            <p className="text-gray-400 mt-1">
              {tracks.length} tracks across {playlists.length} playlists
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                     {loading ? (
             <div className="flex items-center justify-center py-12">
               <div className="text-center">
                 <LoadingSpinner size="lg" className="mx-auto mb-4" />
                 <p className="text-white">Loading tracks for {genre}...</p>
                 <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
               </div>
             </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No tracks found for this genre</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tracks.map((track, index) => (
                <div 
                  key={`${track.id}-${track.playlistId}`}
                  className="flex items-center gap-4 p-4 bg-[#2a2a2a] rounded-lg hover:bg-[#333333] transition-colors"
                >
                  {/* Track number */}
                  <div className="w-8 h-8 bg-[#1DB954]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[#1DB954] font-semibold text-sm">{index + 1}</span>
                  </div>

                  {/* Album art */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    {track.album.images[0] ? (
                      <img 
                        src={track.album.images[0].url} 
                        alt={track.album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1DB954]/20 flex items-center justify-center">
                        <span className="text-[#1DB954] text-lg">🎵</span>
                      </div>
                    )}
                  </div>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold truncate">{track.name}</h3>
                      <span className="text-gray-400 text-xs px-2 py-1 bg-[#404040] rounded">
                        {track.playlistName}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm truncate">
                      {formatArtists(track.artists)} • {track.album.name}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="text-gray-400 text-sm flex-shrink-0">
                    {formatDuration(track.duration_ms)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 