'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import LoadingSpinner from './LoadingSpinner';

interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  duration_ms: number;
  external_urls: { spotify: string };
}

interface GenreTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
  playlistName: string;
  selectedGenre: string;
}

export default function GenreTracksModal({ 
  isOpen, 
  onClose, 
  playlistId, 
  playlistName, 
  selectedGenre 
}: GenreTracksModalProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && playlistId && selectedGenre) {
      fetchGenreTracks();
    }
  }, [isOpen, playlistId, selectedGenre]);

  const fetchGenreTracks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/playlists/${playlistId}/tracks`);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. This playlist may be private or collaborative.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a moment.');
        } else {
          throw new Error('Failed to fetch playlist tracks');
        }
      }
      
      const data = await response.json();
      
      // Filter tracks that contain the selected genre
      const genreTracks = data.tracks.filter((track: any) => 
        track.genres && Array.isArray(track.genres) && track.genres.includes(selectedGenre)
      );
      
      setTracks(genreTracks);
    } catch (error) {
      console.error('Error fetching genre tracks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tracks for this genre';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
      <div className="relative bg-[#232323] rounded-2xl shadow-2xl border border-[#282828] w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#282828]">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-white truncate">{playlistName}</h2>
            <p className="text-[#1DB954] font-medium truncate">{selectedGenre}</p>
            <p className="text-gray-400 text-sm mt-1">{tracks.length} tracks</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-lg transition-colors flex-shrink-0"
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
                <p className="text-white">Loading tracks...</p>
                <p className="text-gray-400 text-sm mt-2">Finding {selectedGenre} tracks</p>
              </div>
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No tracks found for {selectedGenre}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <div 
                  key={track.id}
                  className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg hover:bg-[#333333] transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <span className="text-sm text-gray-400 w-8 flex-shrink-0">#{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{track.name}</p>
                                             <p className="text-gray-400 text-sm truncate">
                         {track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
                       </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                                         <span className="text-gray-400 text-sm">
                       {track.duration_ms ? formatDuration(track.duration_ms) : '--:--'}
                     </span>
                                         {track.external_urls?.spotify && (
                       <a
                         href={track.external_urls.spotify}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="p-2 text-gray-400 hover:text-[#1DB954] hover:bg-[#333333] rounded-lg transition-colors"
                       >
                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                           <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-9.54-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 3.56-1.021 7.56-.6 10.68 1.32.42.18.479.659.3 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2z"/>
                         </svg>
                       </a>
                     )}
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