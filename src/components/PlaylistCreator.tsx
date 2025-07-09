'use client';

import { useState } from 'react';
import { useToast } from './Toast';

interface PlaylistCreatorProps {
  sourcePlaylistId: string;
  sourcePlaylistName: string;
  onClose: () => void;
  onSuccess?: (playlistId: string) => void;
}

export default function PlaylistCreator({ 
  sourcePlaylistId, 
  sourcePlaylistName, 
  onClose, 
  onSuccess 
}: PlaylistCreatorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // Filter states
  const [genres, setGenres] = useState<string[]>([]);
  const [genreInput, setGenreInput] = useState('');
  const [energyRange, setEnergyRange] = useState<[number, number]>([0, 1]);
  const [danceabilityRange, setDanceabilityRange] = useState<[number, number]>([0, 1]);
  const [valenceRange, setValenceRange] = useState<[number, number]>([0, 1]);
  const [tempoRange, setTempoRange] = useState<[number, number]>([0, 200]);
  const [acousticness, setAcousticness] = useState<'any' | 'acoustic' | 'electronic'>('any');
  const [instrumentalness, setInstrumentalness] = useState<'any' | 'instrumental' | 'vocal'>('any');

  const handleCreatePlaylist = async () => {
    if (!name.trim()) {
      showToast('Please enter a playlist name', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/playlists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourcePlaylistId,
          name: name.trim(),
          description: description.trim() || undefined,
          filters: {
            genres: genres.length > 0 ? genres : undefined,
            minEnergy: energyRange[0],
            maxEnergy: energyRange[1],
            minDanceability: danceabilityRange[0],
            maxDanceability: danceabilityRange[1],
            minValence: valenceRange[0],
            maxValence: valenceRange[1],
            minTempo: tempoRange[0],
            maxTempo: tempoRange[1],
            acousticness: acousticness === 'any' ? undefined : acousticness,
            instrumentalness: instrumentalness === 'any' ? undefined : instrumentalness,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create playlist');
      }

      showToast(`Playlist "${name}" created successfully with ${data.trackCount} tracks!`, 'success');
      onSuccess?.(data.playlistId);
      onClose();
    } catch (error) {
      console.error('Error creating playlist:', error);
      showToast(error instanceof Error ? error.message : 'Failed to create playlist', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addGenre = () => {
    if (genreInput.trim() && !genres.includes(genreInput.trim())) {
      setGenres([...genres, genreInput.trim()]);
      setGenreInput('');
    }
  };

  const removeGenre = (genreToRemove: string) => {
    setGenres(genres.filter(genre => genre !== genreToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addGenre();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#232323] rounded-2xl shadow-2xl border border-[#282828] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Create New Playlist</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Source Playlist Info */}
            <div className="bg-[#282828] rounded-lg p-4">
              <p className="text-gray-400 text-sm">Source Playlist</p>
              <p className="text-white font-semibold">{sourcePlaylistName}</p>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Playlist Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter playlist name"
                  className="w-full bg-[#282828] border border-[#404040] rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#1DB954] transition-colors"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full bg-[#282828] border border-[#404040] rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#1DB954] transition-colors resize-none"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Filters</h3>
              
              {/* Genre Filter */}
              <div>
                <label className="block text-white font-medium mb-2">Genres</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={genreInput}
                    onChange={(e) => setGenreInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add genre (e.g., rock, pop, jazz)"
                    className="flex-1 bg-[#282828] border border-[#404040] rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#1DB954] transition-colors"
                  />
                  <button
                    onClick={addGenre}
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
                {genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre) => (
                      <span
                        key={genre}
                        className="bg-[#1DB954] text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {genre}
                        <button
                          onClick={() => removeGenre(genre)}
                          className="hover:text-red-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Energy Filter */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Energy: {energyRange[0].toFixed(1)} - {energyRange[1].toFixed(1)}
                </label>
                <div className="flex gap-4">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={energyRange[0]}
                    onChange={(e) => setEnergyRange([parseFloat(e.target.value), energyRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={energyRange[1]}
                    onChange={(e) => setEnergyRange([energyRange[0], parseFloat(e.target.value)])}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Danceability Filter */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Danceability: {danceabilityRange[0].toFixed(1)} - {danceabilityRange[1].toFixed(1)}
                </label>
                <div className="flex gap-4">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={danceabilityRange[0]}
                    onChange={(e) => setDanceabilityRange([parseFloat(e.target.value), danceabilityRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={danceabilityRange[1]}
                    onChange={(e) => setDanceabilityRange([danceabilityRange[0], parseFloat(e.target.value)])}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Valence (Mood) Filter */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Mood (Valence): {valenceRange[0].toFixed(1)} - {valenceRange[1].toFixed(1)}
                </label>
                <div className="flex gap-4">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={valenceRange[0]}
                    onChange={(e) => setValenceRange([parseFloat(e.target.value), valenceRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={valenceRange[1]}
                    onChange={(e) => setValenceRange([valenceRange[0], parseFloat(e.target.value)])}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Tempo Filter */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Tempo (BPM): {Math.round(tempoRange[0])} - {Math.round(tempoRange[1])}
                </label>
                <div className="flex gap-4">
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="1"
                    value={tempoRange[0]}
                    onChange={(e) => setTempoRange([parseInt(e.target.value), tempoRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="1"
                    value={tempoRange[1]}
                    onChange={(e) => setTempoRange([tempoRange[0], parseInt(e.target.value)])}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Acousticness Filter */}
              <div>
                <label className="block text-white font-medium mb-2">Acousticness</label>
                <select
                  value={acousticness}
                  onChange={(e) => setAcousticness(e.target.value as 'any' | 'acoustic' | 'electronic')}
                  className="w-full bg-[#282828] border border-[#404040] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                >
                  <option value="any">Any</option>
                  <option value="acoustic">Acoustic</option>
                  <option value="electronic">Electronic</option>
                </select>
              </div>

              {/* Instrumentalness Filter */}
              <div>
                <label className="block text-white font-medium mb-2">Instrumentalness</label>
                <select
                  value={instrumentalness}
                  onChange={(e) => setInstrumentalness(e.target.value as 'any' | 'instrumental' | 'vocal')}
                  className="w-full bg-[#282828] border border-[#404040] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                >
                  <option value="any">Any</option>
                  <option value="instrumental">Instrumental</option>
                  <option value="vocal">Vocal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={onClose}
              className="flex-1 bg-[#404040] hover:bg-[#505050] text-white px-6 py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePlaylist}
              disabled={isLoading || !name.trim()}
              className="flex-1 bg-[#1DB954] hover:bg-[#1ed760] disabled:bg-[#404040] disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                'Create Playlist'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 