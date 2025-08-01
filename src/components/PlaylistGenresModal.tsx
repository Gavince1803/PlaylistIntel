'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import LoadingSpinner from './LoadingSpinner';

interface GenreData {
  genre: string;
  trackCount: number;
  percentage: number;
}

interface PlaylistGenresModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
  playlistName: string;
}

export default function PlaylistGenresModal({ 
  isOpen, 
  onClose, 
  playlistId, 
  playlistName 
}: PlaylistGenresModalProps) {
  const [genres, setGenres] = useState<GenreData[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && playlistId) {
      fetchPlaylistGenres();
    }
  }, [isOpen, playlistId]);

  const fetchPlaylistGenres = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/playlists/${playlistId}/tracks`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch playlist tracks');
      }
      
      const data = await response.json();
      
      // Process genres from tracks
      const genreCounts: Record<string, number> = {};
      let totalTracks = 0;
      
      data.tracks.forEach((track: any) => {
        if (track.genres) {
          track.genres.forEach((genre: string) => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            totalTracks++;
          });
        }
      });

      // Convert to array and calculate percentages
      const genresArray = Object.entries(genreCounts).map(([genre, count]) => ({
        genre,
        trackCount: count,
        percentage: totalTracks > 0 ? (count / totalTracks) * 100 : 0
      }));

      // Sort by track count (descending)
      genresArray.sort((a, b) => b.trackCount - a.trackCount);
      
      setGenres(genresArray);
    } catch (error) {
      console.error('Error fetching playlist genres:', error);
      showToast('Failed to load playlist genres', 'error');
    } finally {
      setLoading(false);
    }
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
      <div className="relative bg-[#232323] rounded-2xl shadow-2xl border border-[#282828] w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#282828]">
          <div>
            <h2 className="text-xl font-bold text-white truncate">{playlistName}</h2>
            <p className="text-gray-400 mt-1">Genre Breakdown</p>
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
                <p className="text-white">Analyzing genres...</p>
                <p className="text-gray-400 text-sm mt-2">This may take a moment</p>
              </div>
            </div>
          ) : genres.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No genres found for this playlist</p>
            </div>
          ) : (
            <div className="space-y-3">
              {genres.map((genre, index) => (
                <div 
                  key={genre.genre}
                  className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <span className="text-base font-bold text-[#1DB954] flex-shrink-0">#{index + 1}</span>
                    <span className="text-white font-medium truncate">{genre.genre}</span>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <div className="w-20 bg-[#404040] rounded-full h-2">
                      <div 
                        className="bg-[#1DB954] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${genre.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-gray-400 text-sm w-12 text-right">
                      {genre.trackCount}
                    </span>
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