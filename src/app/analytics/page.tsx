'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import GenreTracksModal from '@/components/GenreTracksModal';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AnalyticsData {
  totalPlaylists: number;
  totalTracks: number;
  averagePlaylistLength: number;
  topGenres: Array<{ genre: string; count: number; percentage: number }>;
  listeningTime: number;
  mostActiveMonth: string;
  favoriteArtists: Array<{ name: string; trackCount: number }>;
  moodDistribution: Array<{ mood: string; count: number }>;
}

interface GenreData {
  genre: string;
  trackCount: number;
  tracks: any[];
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [genresData, setGenresData] = useState<GenreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [genresLoading, setGenresLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [genreLoading, setGenreLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (session?.accessToken) {
      // Fetch analytics first, then genres
      fetchAnalytics().then(() => {
        fetchGenres();
      });
    }
  }, [session]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/analytics/overview');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showToast('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGenres = async () => {
    try {
      setGenresLoading(true);
      console.log('🎵 Fetching genres data...');
      const response = await fetch('/api/analytics/genres');
      console.log('🎵 Genres API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🎵 Genres API error:', errorText);
        throw new Error('Failed to fetch genres data');
      }
      
      const data = await response.json();
      console.log('🎵 Genres data received:', data.genres?.length || 0, 'genres');
      setGenresData(data.genres);
    } catch (error) {
      console.error('Error fetching genres:', error);
      showToast('Failed to load genres data', 'error');
    } finally {
      setGenresLoading(false);
    }
  };

  const handleGenreClick = async (genre: string) => {
    try {
      setGenreLoading(true);
      console.log(`🎵 Clicking on genre: ${genre}`);
      
      // Test the API endpoint first
      const response = await fetch(`/api/analytics/genres/${encodeURIComponent(genre)}/tracks`);
      console.log(`🎵 API Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🎵 API Error: ${response.status} - ${errorText}`);
        showToast(`Failed to load tracks for ${genre}`, 'error');
        return;
      }
      
      const data = await response.json();
      console.log(`🎵 API Response data:`, data);
      
      if (data.tracks && data.tracks.length > 0) {
        showToast(`Found ${data.tracks.length} tracks for ${genre}`, 'success');
      } else {
        showToast(`No tracks found for ${genre}`, 'info');
      }
      
      setSelectedGenre(genre);
      setShowGenreModal(true);
    } catch (error) {
      console.error('Error testing genre API:', error);
      showToast(`Error loading ${genre} tracks`, 'error');
    } finally {
      setGenreLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] p-3 sm:p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center gap-3 lg:gap-4 mb-3 lg:mb-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-lg transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Analytics Dashboard</h1>
          </div>
          <p className="text-gray-300 text-base lg:text-lg">Discover insights about your music taste</p>
        </div>

        {analyticsData ? (
          <div className="space-y-6 lg:space-y-8">
            {/* Key Metrics */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-400 text-xs lg:text-sm">Total Playlists</p>
                    <p className="text-2xl lg:text-3xl font-bold text-white truncate">{analyticsData.totalPlaylists}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#1DB954]/20 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 lg:w-6 lg:h-6 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-400 text-xs lg:text-sm">Total Tracks</p>
                    <p className="text-2xl lg:text-3xl font-bold text-white truncate">{analyticsData.totalTracks.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#1DB954]/20 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 lg:w-6 lg:h-6 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-400 text-xs lg:text-sm">Avg. Playlist Length</p>
                    <p className="text-2xl lg:text-3xl font-bold text-white truncate">{analyticsData.averagePlaylistLength}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#1DB954]/20 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 lg:w-6 lg:h-6 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-400 text-xs lg:text-sm">Listening Time</p>
                    <p className="text-2xl lg:text-3xl font-bold text-white truncate">{formatTime(analyticsData.listeningTime)}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#1DB954]/20 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 lg:w-6 lg:h-6 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </section>

            {/* Top Genres */}
            <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6">Top Genres</h2>
              <div className="space-y-3 lg:space-y-4">
                {genresLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading genres...</p>
                  </div>
                ) : genresData.length > 0 ? (
                  genresData.slice(0, 10).map((genre, index) => {
                    // Calculate percentage based on total tracks in genres data
                    const totalTracksInGenres = genresData.reduce((sum, g) => sum + g.trackCount, 0);
                    const percentage = totalTracksInGenres > 0 ? (genre.trackCount / totalTracksInGenres) * 100 : 0;
                    return (
                                             <div 
                         key={genre.genre} 
                         className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                           genreLoading ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#2a2a2a] cursor-pointer'
                         }`}
                         onClick={() => !genreLoading && handleGenreClick(genre.genre)}
                       >
                                                 <div className="flex items-center space-x-3 lg:space-x-4 min-w-0 flex-1">
                           <span className="text-base lg:text-lg font-bold text-[#1DB954] flex-shrink-0">#{index + 1}</span>
                           <span className="text-white font-medium truncate">{genre.genre}</span>
                           {genreLoading && (
                             <LoadingSpinner size="sm" className="ml-2" />
                           )}
                         </div>
                        <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
                          <div className="w-20 lg:w-32 bg-[#404040] rounded-full h-2">
                            <div 
                              className="bg-[#1DB954] h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-400 text-xs lg:text-sm w-12 lg:w-16 text-right">
                            {genre.trackCount} tracks
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No genres found</p>
                  </div>
                )}
              </div>
            </section>

            {/* Favorite Artists & Mood Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
                <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6">Favorite Artists</h2>
                <div className="space-y-3 lg:space-y-4">
                  {analyticsData.favoriteArtists.map((artist, index) => (
                    <div key={artist.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 lg:space-x-4 min-w-0 flex-1">
                        <span className="text-base lg:text-lg font-bold text-[#1DB954] flex-shrink-0">#{index + 1}</span>
                        <span className="text-white font-medium truncate">{artist.name}</span>
                      </div>
                      <span className="text-gray-400 text-xs lg:text-sm flex-shrink-0">{artist.trackCount} tracks</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
                <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6">Mood Distribution</h2>
                <div className="space-y-3 lg:space-y-4">
                  {analyticsData.moodDistribution.map((mood, index) => (
                    <div key={mood.mood} className="flex items-center justify-between">
                      <span className="text-white font-medium text-sm lg:text-base truncate min-w-0 flex-1">{mood.mood}</span>
                      <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
                        <div className="w-20 lg:w-32 bg-[#404040] rounded-full h-2">
                          <div 
                            className="bg-[#1DB954] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(mood.count / analyticsData.moodDistribution.reduce((sum, m) => sum + m.count, 0)) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-gray-400 text-xs lg:text-sm w-12 lg:w-16 text-right">{mood.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No analytics data available</p>
          </div>
        )}
      </div>

      {/* Genre Tracks Modal */}
      <GenreTracksModal
        isOpen={showGenreModal}
        onClose={() => setShowGenreModal(false)}
        genre={selectedGenre || ''}
      />
    </div>
  );
} 