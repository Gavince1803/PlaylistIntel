'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toast';

// Interface para el perfil musical (igual que en el endpoint)
interface MusicalProfile {
  playlistId: string;
  playlistName: string;
  totalTracks: number;
  genreAnalysis: {
    topGenres: Array<{ genre: string; count: number; percentage: number }>;
    genreDiversity: number;
    dominantGenre: string;
  };
  audioAnalysis: {
    averageEnergy: number;
    averageDanceability: number;
    averageValence: number;
    averageTempo: number;
    averageAcousticness: number;
    averageInstrumentalness: number;
    mood: 'energetic' | 'chill' | 'happy' | 'melancholic' | 'mixed';
  };
  artistAnalysis: {
    uniqueArtists: number;
    topArtists: Array<{ name: string; trackCount: number }>;
    artistDiversity: number;
  };
  recommendations: {
    similarGenres: string[];
    recommendedArtists: Array<{ name: string; genre: string; reason: string }>;
    recommendedSongs: Array<{ title: string; artist: string; genre: string; reason: string; year?: number; spotifyUrl?: string }>;
    moodSuggestions: string[];
    energyLevel: 'low' | 'medium' | 'high';
    playlistSuggestions: string[];
    discoveryTips: string[];
  };
  analyzedAt: string;
}

interface MusicalProfileProps {
  playlistId: string;
  onClose?: () => void;
}

export default function MusicalProfile({ playlistId, onClose }: MusicalProfileProps) {
  const [profile, setProfile] = useState<MusicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const { showToast } = useToast();
  
  // Add playlist selection state
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<{ title: string; artist: string; genre: string; reason: string; year?: number; spotifyUrl?: string } | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<Array<{ id: string; name: string; tracks: { total: number } }>>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState(false);
  
  // Create playlist state
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  // Cargar el perfil musical cuando el componente se monta
  useEffect(() => {
    fetchMusicalProfile();
  }, [playlistId]);

  const fetchMusicalProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      setProgress('Starting analysis...');
      
      console.log('🎵 Fetching musical profile for playlist:', playlistId);
      
      // Simulate progress updates for large playlists
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev.includes('Fetching tracks')) {
            const current = parseInt(prev.match(/\d+/)?.[0] || '0');
            return `Fetching tracks ${current + 100}-${current + 200}...`;
          }
          return 'Analyzing genres and artists...';
        });
      }, 2000);

      const response = await fetch(`/api/analysis/playlist/${playlistId}`);
      const data = await response.json();

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze playlist');
      }

      setProfile(data.profile);
      console.log('✅ Musical profile loaded successfully:', data.profile);
      
      // Save profile to localStorage
      saveProfileToStorage(data.profile);
    } catch (err: any) {
      console.error('❌ Error fetching musical profile:', err);
      setError(err.message || 'Failed to analyze playlist');
      showToast(err.message || 'Failed to analyze playlist', 'error');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  // Function to save profile to localStorage
  const saveProfileToStorage = (profileData: MusicalProfile) => {
    try {
      // Check if auto-save is enabled
      const autoSaveEnabled = localStorage.getItem('autoSaveProfiles');
      if (autoSaveEnabled === 'false') {
        return; // Don't save if auto-save is disabled
      }
      
      const savedProfiles = localStorage.getItem('spotify-musical-profiles');
      const profiles = savedProfiles ? JSON.parse(savedProfiles) : [];
      
      // Check if profile already exists
      const existingIndex = profiles.findIndex((p: any) => p.playlistId === profileData.playlistId);
      
      const profileToSave = {
        id: `${profileData.playlistId}-${Date.now()}`,
        playlistId: profileData.playlistId,
        playlistName: profileData.playlistName,
        playlistImage: '', // We'll need to get this from the playlist data
        analyzedAt: profileData.analyzedAt,
        totalTracks: profileData.totalTracks,
        dominantGenre: profileData.genreAnalysis.dominantGenre,
        mood: profileData.audioAnalysis.mood,
        energyLevel: profileData.recommendations.energyLevel,
        profile: profileData
      };
      
      if (existingIndex >= 0) {
        // Update existing profile
        profiles[existingIndex] = profileToSave;
      } else {
        // Add new profile
        profiles.push(profileToSave);
      }
      
      localStorage.setItem('spotify-musical-profiles', JSON.stringify(profiles));
      showToast('Profile saved to your library', 'success');
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  // Función para obtener el color del mood
  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'energetic': return 'text-orange-400';
      case 'happy': return 'text-yellow-400';
      case 'chill': return 'text-blue-400';
      case 'melancholic': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  // Función para obtener el icono del mood
  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'energetic': return '⚡';
      case 'happy': return '😊';
      case 'chill': return '😌';
      case 'melancholic': return '😔';
      default: return '🎵';
    }
  };

  // Función para obtener el color del nivel de energía
  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  // Función para formatear el tempo
  const formatTempo = (tempo: number) => {
    return `${Math.round(tempo)} BPM`;
  };

  // Función para formatear porcentajes
  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to fetch user playlists
  const fetchUserPlaylists = async () => {
    try {
      setLoadingPlaylists(true);
      const response = await fetch('/api/playlists?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }
      const data = await response.json();
      setUserPlaylists(data.playlists || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      showToast('Failed to load playlists', 'error');
    } finally {
      setLoadingPlaylists(false);
    }
  };

  // Function to search for a track and get its URI
  const searchTrack = async (title: string, artist: string): Promise<string | null> => {
    try {
      const query = `${title} ${artist}`;
      const response = await fetch(`/api/search/tracks?q=${encodeURIComponent(query)}&limit=1`);
      if (!response.ok) {
        throw new Error('Failed to search track');
      }
      const data = await response.json();
      return data.tracks?.[0]?.uri || null;
    } catch (error) {
      console.error('Error searching track:', error);
      return null;
    }
  };

  // Function to add song to playlist
  const addSongToPlaylist = async (playlistId: string, song: { title: string; artist: string }) => {
    try {
      setAddingToPlaylist(true);
      
      // Search for the track to get its URI
      const trackUri = await searchTrack(song.title, song.artist);
      if (!trackUri) {
        throw new Error('Could not find track on Spotify');
      }

      // Add track to playlist
      const response = await fetch(`/api/playlists/${playlistId}/add-tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackUris: [trackUri]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add track to playlist');
      }

      const result = await response.json();
      showToast(`Added "${song.title}" to playlist!`, 'success');
      setShowAddToPlaylistModal(false);
      setSelectedSong(null);
    } catch (error: any) {
      console.error('Error adding song to playlist:', error);
      showToast(error.message || 'Failed to add song to playlist', 'error');
    } finally {
      setAddingToPlaylist(false);
    }
  };

  // Function to open add to playlist modal
  const handleAddToPlaylist = (song: { title: string; artist: string; genre: string; reason: string; year?: number; spotifyUrl?: string }) => {
    setSelectedSong(song);
    setShowAddToPlaylistModal(true);
    fetchUserPlaylists();
  };

  // Function to create new playlist
  const createNewPlaylist = async (song: { title: string; artist: string }) => {
    try {
      setCreatingPlaylist(true);
      
      // Search for the track to get its URI
      const trackUri = await searchTrack(song.title, song.artist);
      if (!trackUri) {
        throw new Error('Could not find track on Spotify');
      }

      // Create playlist with the track
      const response = await fetch('/api/playlists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPlaylistName,
          description: newPlaylistDescription,
          trackUris: [trackUri]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create playlist');
      }

      const result = await response.json();
      showToast(`Playlist "${newPlaylistName}" created with "${song.title}"!`, 'success');
      setShowCreatePlaylistModal(false);
      setShowAddToPlaylistModal(false);
      setSelectedSong(null);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      
      // Refresh playlists list
      fetchUserPlaylists();
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      showToast(error.message || 'Failed to create playlist', 'error');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  // Function to open create playlist modal
  const handleCreatePlaylist = () => {
    setShowCreatePlaylistModal(true);
    setShowAddToPlaylistModal(false);
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="bg-[#232323] rounded-2xl p-4 sm:p-8 shadow-lg border border-[#282828]">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-lg text-center">Analyzing your music...</p>
          {progress && (
            <p className="text-gray-400 text-sm text-center">{progress}</p>
          )}
          <div className="w-full max-w-xs bg-[#404040] rounded-full h-2">
            <div className="bg-[#1DB954] h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="bg-[#232323] rounded-2xl p-4 sm:p-8 shadow-lg border border-[#282828]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Analysis Error</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchMusicalProfile}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Si no hay perfil, mostrar mensaje
  if (!profile) {
    return (
      <div className="bg-[#232323] rounded-2xl p-4 sm:p-8 shadow-lg border border-[#282828]">
        <p className="text-gray-400 text-center">Could not load musical profile</p>
      </div>
    );
  }

  return (
    <div className="bg-[#232323] rounded-2xl shadow-lg border border-[#282828] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] p-4 sm:p-6 relative">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-4 text-white hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-white/10"
            aria-label="Close musical profile"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Musical Profile</h2>
            <p className="text-white/80 text-xs sm:text-sm">
              Analyzed on {formatDate(profile.analyzedAt)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-white text-2xl sm:text-3xl font-bold">{profile.totalTracks}</div>
            <div className="text-white/80 text-xs sm:text-sm">tracks</div>
            {profile.totalTracks > 500 && (
              <div className="text-yellow-400 text-xs mt-1">Large playlist</div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* General Summary */}
        <section>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">📊</span>
            General Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-[#282828] rounded-lg p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-[#1DB954]">{profile.artistAnalysis.uniqueArtists}</div>
              <div className="text-gray-400 text-xs sm:text-sm">Unique Artists</div>
            </div>
            <div className="bg-[#282828] rounded-lg p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-[#1DB954]">{profile.genreAnalysis.dominantGenre}</div>
              <div className="text-gray-400 text-xs sm:text-sm">Dominant Genre</div>
            </div>
            <div className="bg-[#282828] rounded-lg p-3 sm:p-4">
              <div className={`text-xl sm:text-2xl font-bold ${getMoodColor(profile.audioAnalysis.mood)}`}>
                {getMoodIcon(profile.audioAnalysis.mood)} {profile.audioAnalysis.mood}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm">General Mood</div>
            </div>
          </div>
        </section>

        {/* Genre Analysis */}
        <section>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">🎼</span>
            Genre Analysis
          </h3>
          <div className="bg-[#282828] rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300 text-sm sm:text-base">Genre Diversity</span>
              <span className="text-[#1DB954] font-semibold text-sm sm:text-base">
                {formatPercentage(profile.genreAnalysis.genreDiversity * 100)}
              </span>
            </div>
            <div className="w-full bg-[#404040] rounded-full h-2">
              <div 
                className="bg-[#1DB954] h-2 rounded-full transition-all duration-300"
                style={{ width: `${profile.genreAnalysis.genreDiversity * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="space-y-2">
            {profile.genreAnalysis.topGenres.slice(0, 5).map((genre, index) => (
              <div key={genre.genre} className="flex items-center justify-between bg-[#282828] rounded-lg p-3">
                <div className="flex items-center min-w-0 flex-1">
                  <span className="text-[#1DB954] font-bold mr-2 sm:mr-3 text-sm">#{index + 1}</span>
                  <span className="text-white font-medium text-sm sm:text-base truncate">{genre.genre}</span>
                </div>
                <div className="text-right ml-2">
                  <div className="text-[#1DB954] font-semibold text-sm">{genre.count} tracks</div>
                  <div className="text-gray-400 text-xs">{formatPercentage(genre.percentage)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        

        {/* Top Artists */}
        <section>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">👥</span>
            Top Artists
          </h3>
          <div className="space-y-2">
            {profile.artistAnalysis.topArtists.slice(0, 5).map((artist, index) => (
              <div key={artist.name} className="flex items-center justify-between bg-[#282828] rounded-lg p-3">
                <div className="flex items-center min-w-0 flex-1">
                  <span className="text-[#1DB954] font-bold mr-2 sm:mr-3 text-sm">#{index + 1}</span>
                  <span className="text-white font-medium text-sm sm:text-base truncate">{artist.name}</span>
                </div>
                <div className="text-[#1DB954] font-semibold text-sm ml-2">{artist.trackCount} tracks</div>
              </div>
            ))}
          </div>
        </section>

                          {/* Recommendations */}
        <section>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">💡</span>
            Recommendations
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Similar Genres */}
            <div className="bg-[#282828] rounded-lg p-3 sm:p-4">
              <h4 className="text-white font-semibold mb-3 text-sm sm:text-base">Similar Genres</h4>
              <div className="flex flex-wrap gap-2">
                {profile.recommendations.similarGenres.map((genre, index) => (
                  <span 
                    key={index}
                    className="bg-[#1DB954]/20 text-[#1DB954] px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Recommended Artists */}
            <div className="bg-[#282828] rounded-lg p-3 sm:p-4">
              <h4 className="text-white font-semibold mb-3 text-sm sm:text-base">🎤 Recommended Artists</h4>
              <div className="space-y-2">
                {profile.recommendations.recommendedArtists?.slice(0, 4).map((artist, index) => (
                  <div key={index} className="text-gray-300 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white truncate">{artist.name}</span>
                      <span className="text-[#1DB954] text-xs ml-2 flex-shrink-0">{artist.genre}</span>
                    </div>
                    <div className="text-gray-400 text-xs mt-1 italic">{artist.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Songs */}
          <div className="bg-[#282828] rounded-lg p-3 sm:p-4 mt-4">
            <h4 className="text-white font-semibold mb-3 text-sm sm:text-base">🎵 Recommended Songs</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.recommendations.recommendedSongs?.slice(0, 6).map((song, index) => (
                <div key={index} className="bg-[#191414] rounded-lg p-3 border border-[#404040]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">{song.title}</div>
                      <div className="text-[#1DB954] text-xs mt-1">{song.artist}</div>
                      <div className="text-gray-400 text-xs mt-1 flex items-center gap-2">
                        <span>{song.genre}</span>
                        {song.year && <span>• {song.year}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-[#1DB954] text-xs flex-shrink-0">#{index + 1}</div>
                      <button
                        onClick={() => handleAddToPlaylist(song)}
                        className="text-[#1DB954] hover:text-white transition-colors p-1 rounded"
                        title="Add to Playlist"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                      {song.spotifyUrl && (
                        <a
                          href={song.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1DB954] hover:text-white transition-colors"
                          title="Open in Spotify"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs mt-2 italic">{song.reason}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Playlist Suggestions */}
          <div className="bg-[#282828] rounded-lg p-3 sm:p-4 mt-4">
            <h4 className="text-white font-semibold mb-3 text-sm sm:text-base">Playlist Suggestions</h4>
            <div className="space-y-2">
              {profile.recommendations.playlistSuggestions?.map((suggestion, index) => (
                <div key={index} className="text-gray-300 text-xs sm:text-sm flex items-center">
                  <span className="text-[#1DB954] mr-2">•</span>
                  <span className="truncate">{suggestion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Discovery Tips */}
          {profile.recommendations.discoveryTips && profile.recommendations.discoveryTips.length > 0 && (
            <div className="bg-[#282828] rounded-lg p-3 sm:p-4 mt-4">
              <h4 className="text-white font-semibold mb-3 text-sm sm:text-base">💡 Discovery Tips</h4>
              <div className="space-y-2">
                {profile.recommendations.discoveryTips.map((tip, index) => (
                  <div key={index} className="text-gray-300 text-xs sm:text-sm flex items-start">
                    <span className="text-yellow-400 mr-2 mt-1 flex-shrink-0">💡</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Energy Level */}
          <div className="bg-[#282828] rounded-lg p-3 sm:p-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm sm:text-base">Energy Level</span>
              <span className={`font-bold text-base sm:text-lg ${getEnergyColor(profile.recommendations.energyLevel)}`}>
                {profile.recommendations.energyLevel.toUpperCase()}
              </span>
            </div>
          </div>
        </section>


      </div>

      {/* Add to Playlist Modal */}
      {showAddToPlaylistModal && selectedSong && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#232323] rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Add to Playlist</h3>
              <button
                onClick={() => {
                  setShowAddToPlaylistModal(false);
                  setSelectedSong(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-[#191414] rounded-lg p-3 border border-[#404040]">
                <div className="text-white font-medium text-sm">{selectedSong.title}</div>
                <div className="text-[#1DB954] text-xs mt-1">{selectedSong.artist}</div>
                <div className="text-gray-400 text-xs mt-1">{selectedSong.genre}</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold">Select a Playlist</h4>
                <button
                  onClick={handleCreatePlaylist}
                  className="text-[#1DB954] hover:text-white text-sm font-medium transition-colors"
                >
                  + Create New
                </button>
              </div>
              {loadingPlaylists ? (
                <div className="text-gray-400 text-center py-4">Loading playlists...</div>
              ) : userPlaylists.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-gray-400 mb-3">No playlists found</div>
                  <button
                    onClick={handleCreatePlaylist}
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Create Your First Playlist
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userPlaylists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => addSongToPlaylist(playlist.id, selectedSong)}
                      disabled={addingToPlaylist}
                      className="w-full text-left bg-[#282828] hover:bg-[#404040] rounded-lg p-3 transition-colors disabled:opacity-50"
                    >
                      <div className="text-white font-medium text-sm">{playlist.name}</div>
                      <div className="text-gray-400 text-xs">{playlist.tracks.total} tracks</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {addingToPlaylist && (
              <div className="text-center py-2">
                <div className="inline-flex items-center text-[#1DB954]">
                  <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin mr-2"></div>
                  Adding to playlist...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && selectedSong && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#232323] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Create New Playlist</h3>
              <button
                onClick={() => {
                  setShowCreatePlaylistModal(false);
                  setShowAddToPlaylistModal(true);
                  setNewPlaylistName('');
                  setNewPlaylistDescription('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-[#191414] rounded-lg p-3 border border-[#404040]">
                <div className="text-white font-medium text-sm">{selectedSong.title}</div>
                <div className="text-[#1DB954] text-xs mt-1">{selectedSong.artist}</div>
                <div className="text-gray-400 text-xs mt-1">{selectedSong.genre}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium text-sm mb-2">
                  Playlist Name *
                </label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Enter playlist name"
                  className="w-full bg-[#282828] border border-[#404040] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#1DB954]"
                />
              </div>

              <div>
                <label className="block text-white font-medium text-sm mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  placeholder="Describe your playlist"
                  rows={3}
                  className="w-full bg-[#282828] border border-[#404040] rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#1DB954] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreatePlaylistModal(false);
                  setShowAddToPlaylistModal(true);
                  setNewPlaylistName('');
                  setNewPlaylistDescription('');
                }}
                className="flex-1 bg-[#404040] hover:bg-[#505050] text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createNewPlaylist(selectedSong)}
                disabled={!newPlaylistName.trim() || creatingPlaylist}
                className="flex-1 bg-[#1DB954] hover:bg-[#1ed760] disabled:bg-[#404040] disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {creatingPlaylist ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Playlist'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 