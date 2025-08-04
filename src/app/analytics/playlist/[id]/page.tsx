'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import LoadingSpinner from '@/components/LoadingSpinner';

interface PlaylistAnalytics {
  playlist: {
    id: string;
    name: string;
    description: string;
    images: Array<{ url: string; width?: number; height?: number }>;
    tracks: {
      total: number;
    };
    owner: {
      display_name: string;
    };
  };
  analytics: {
    totalTracks: number;
    averageDuration: number;
    topGenres: Array<{ genre: string; count: number; percentage: number }>;
    topArtists: Array<{ name: string; trackCount: number }>;
    moodDistribution: Array<{ mood: string; count: number }>;
    energyDistribution: Array<{ level: string; count: number }>;
    danceabilityDistribution: Array<{ level: string; count: number }>;
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
}

export default function PlaylistAnalysisPage() {
  const { data: session } = useSession();
  const params = useParams();
  const playlistId = params.id as string;
  
  const [analyticsData, setAnalyticsData] = useState<PlaylistAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (session?.accessToken && playlistId) {
      fetchPlaylistAnalytics();
    }
  }, [session, playlistId]);

  const handleAddSongToPlaylist = async (songTitle: string, artistName: string) => {
    try {
      // Buscar la canción en Spotify
      const searchResponse = await fetch(`/api/search/tracks?q=${encodeURIComponent(`${songTitle} ${artistName}`)}`);
      if (!searchResponse.ok) {
        throw new Error('Failed to search for song');
      }
      
      const searchData = await searchResponse.json();
      const tracks = searchData.tracks || [];
      
      if (tracks.length === 0) {
        showToast('Song not found on Spotify', 'error');
        return;
      }

      // Tomar la primera canción encontrada
      const track = tracks[0];
      
      // Agregar la canción a la playlist
      const addResponse = await fetch(`/api/playlists/${playlistId}/add-tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackUris: [track.uri]
        })
      });

      if (!addResponse.ok) {
        throw new Error('Failed to add song to playlist');
      }

      showToast(`Added "${track.name}" to playlist!`, 'success');
      
      // Refrescar los datos de la playlist
      fetchPlaylistAnalytics();
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      showToast('Failed to add song to playlist', 'error');
    }
  };

  const fetchPlaylistAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/analysis/playlist/${playlistId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Playlist not found');
        } else if (response.status === 403) {
          throw new Error('Access denied. This playlist may be private or collaborative.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else {
          throw new Error(`Failed to fetch playlist analytics (${response.status})`);
        }
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching playlist analytics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load playlist analytics';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchPlaylistAnalytics();
  };

  if (loading) {
    return (
      <div className="flex h-screen font-sans items-center justify-center bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954]">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-400 mt-4">Analyzing playlist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen font-sans items-center justify-center bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Analysis Failed</h3>
          <p className="text-gray-400 mb-4 text-sm">{error}</p>
          <button 
            onClick={handleRetry}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-4 py-2 rounded-xl font-semibold transition-all duration-200 shadow-lg text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex h-screen font-sans items-center justify-center bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954]">
        <div className="text-center">
          <p className="text-gray-400">No analytics data available</p>
        </div>
      </div>
    );
  }

  const { playlist, analytics, recommendations } = analyticsData;

  return (
    <div className="flex h-screen font-sans bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954]">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a1a1a] border-b border-[#282828] p-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.history.back()}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#404040] flex-shrink-0">
                {playlist.images && Array.isArray(playlist.images) && playlist.images.length > 0 && playlist.images[0] && playlist.images[0].url ? (
                  <img 
                    src={`/api/proxy/image?url=${encodeURIComponent(playlist.images[0].url)}`}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/globe.svg";
                      e.currentTarget.style.opacity = "0.6";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[#1DB954] text-xl">🎵</span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{playlist.name}</h1>
                <p className="text-gray-400 text-sm">
                  {playlist.tracks.total} tracks • {playlist.owner.display_name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {/* Content */}
            <div className="space-y-6">
              {/* Overview Stats */}
              <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
                <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl lg:text-3xl font-bold text-white">Overview</h2>
                      <p className="text-gray-400 text-sm lg:text-base mt-1">Key statistics about your playlist</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 lg:p-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#282828]">
                      <div className="text-2xl font-bold text-[#1DB954]">{analytics.totalTracks}</div>
                      <div className="text-gray-400 text-sm">Total Tracks</div>
                    </div>
                    <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#282828]">
                      <div className="text-2xl font-bold text-[#1DB954]">
                        {Math.round(analytics.averageDuration / 60)}m {analytics.averageDuration % 60}s
                      </div>
                      <div className="text-gray-400 text-sm">Avg Duration</div>
                    </div>
                    <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#282828]">
                      <div className="text-2xl font-bold text-[#1DB954]">{analytics.topGenres.length}</div>
                      <div className="text-gray-400 text-sm">Genres</div>
                    </div>
                    <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#282828]">
                      <div className="text-2xl font-bold text-[#1DB954]">{analytics.topArtists.length}</div>
                      <div className="text-gray-400 text-sm">Artists</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Top Genres */}
              <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
                <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl lg:text-3xl font-bold text-white">Top Genres</h2>
                      <p className="text-gray-400 text-sm lg:text-base mt-1">Most common genres in your playlist</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 lg:p-8">
                  <div className="space-y-3">
                    {analytics.topGenres.slice(0, 5).map((genre, index) => (
                      <div key={genre.genre} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-white">{genre.genre}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-[#2a2a2a] rounded-full h-2">
                            <div 
                              className="bg-[#1DB954] h-2 rounded-full" 
                              style={{ width: `${genre.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-400 w-12 text-right">
                            {genre.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Top Artists */}
              <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
                <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl lg:text-3xl font-bold text-white">Top Artists</h2>
                      <p className="text-gray-400 text-sm lg:text-base mt-1">Most featured artists in your playlist</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 lg:p-8">
                  <div className="space-y-3">
                    {analytics.topArtists.slice(0, 5).map((artist, index) => (
                      <div key={artist.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-white">{artist.name}</span>
                        </div>
                        <span className="text-sm text-gray-400">{artist.trackCount} tracks</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Mood Distribution */}
              {analytics.moodDistribution.length > 0 && (
                <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
                  <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl lg:text-3xl font-bold text-white">Mood Distribution</h2>
                        <p className="text-gray-400 text-sm lg:text-base mt-1">Emotional characteristics of your music</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 lg:p-8">
                    <div className="grid grid-cols-2 gap-4">
                      {analytics.moodDistribution.map((mood) => (
                        <div key={mood.mood} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                          <span className="font-medium text-white">{mood.mood}</span>
                          <span className="text-[#1DB954] font-semibold">{mood.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Energy Distribution */}
              {analytics.energyDistribution.length > 0 && (
                <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
                  <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl lg:text-3xl font-bold text-white">Energy Levels</h2>
                        <p className="text-gray-400 text-sm lg:text-base mt-1">Intensity and energy of your tracks</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 lg:p-8">
                    <div className="grid grid-cols-2 gap-4">
                      {analytics.energyDistribution.map((energy) => (
                        <div key={energy.level} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                          <span className="font-medium text-white">{energy.level}</span>
                          <span className="text-[#1DB954] font-semibold">{energy.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Danceability Distribution */}
              {analytics.danceabilityDistribution.length > 0 && (
                <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
                  <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl lg:text-3xl font-bold text-white">Danceability</h2>
                        <p className="text-gray-400 text-sm lg:text-base mt-1">How danceable your tracks are</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 lg:p-8">
                    <div className="grid grid-cols-2 gap-4">
                      {analytics.danceabilityDistribution.map((dance) => (
                        <div key={dance.level} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                          <span className="font-medium text-white">{dance.level}</span>
                          <span className="text-[#1DB954] font-semibold">{dance.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Recommended Artists */}
              {recommendations?.recommendedArtists && recommendations.recommendedArtists.length > 0 && (
                <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
                  <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl lg:text-3xl font-bold text-white">Recommended Artists</h2>
                        <p className="text-gray-400 text-sm lg:text-base mt-1">Artists you might like based on your taste</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 lg:p-8">
                    <div className="space-y-3">
                      {recommendations.recommendedArtists.slice(0, 6).map((artist, index) => (
                        <div key={artist.name} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <span className="font-medium text-white">{artist.name}</span>
                              <p className="text-gray-400 text-xs">{artist.genre}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[#1DB954] text-xs font-medium">{artist.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Recommended Songs */}
              {recommendations?.recommendedSongs && recommendations.recommendedSongs.length > 0 && (
                <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
                  <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl lg:text-3xl font-bold text-white">Recommended Songs</h2>
                        <p className="text-gray-400 text-sm lg:text-base mt-1">Songs you might enjoy</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 lg:p-8">
                    <div className="space-y-3">
                                             {recommendations.recommendedSongs.slice(0, 6).map((song, index) => (
                         <div key={`${song.title}-${song.artist}`} className="p-3 bg-[#2a2a2a] rounded-lg">
                           <div className="flex items-start gap-3">
                             <div className="w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                               {index + 1}
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-start justify-between gap-3">
                                 <div className="flex-1 min-w-0">
                                   <span className="font-medium text-white block truncate">{song.title}</span>
                                   <p className="text-gray-400 text-xs truncate">{song.artist} • {song.genre}</p>
                                   {song.year && <p className="text-gray-500 text-xs">{song.year}</p>}
                                 </div>
                                 <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                   <p className="text-[#1DB954] text-xs font-medium text-right max-w-32">{song.reason}</p>
                                   <button
                                     onClick={() => handleAddSongToPlaylist(song.title, song.artist)}
                                     className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1DB954] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-1.5 whitespace-nowrap"
                                   >
                                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                     </svg>
                                     Add
                                   </button>
                                 </div>
                               </div>
                             </div>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Similar Genres */}
              {recommendations?.similarGenres && recommendations.similarGenres.length > 0 && (
                <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
                  <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl lg:text-3xl font-bold text-white">Similar Genres</h2>
                        <p className="text-gray-400 text-sm lg:text-base mt-1">Genres you might enjoy exploring</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 lg:p-8">
                    <div className="flex flex-wrap gap-2">
                      {recommendations.similarGenres.slice(0, 8).map((genre) => (
                        <span key={genre} className="bg-[#1DB954] text-white px-3 py-1 rounded-full text-sm font-medium">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Discovery Tips */}
              {recommendations?.discoveryTips && recommendations.discoveryTips.length > 0 && (
                <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
                  <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl lg:text-3xl font-bold text-white">Discovery Tips</h2>
                        <p className="text-gray-400 text-sm lg:text-base mt-1">Tips to expand your musical horizons</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 lg:p-8">
                    <div className="space-y-3">
                      {recommendations.discoveryTips.map((tip, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-[#2a2a2a] rounded-lg">
                          <div className="w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            💡
                          </div>
                          <p className="text-white text-sm">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 