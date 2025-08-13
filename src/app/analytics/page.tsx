'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import AnalyticsGenreTracksModal from '@/components/AnalyticsGenreTracksModal';
import TopTracksModal from '@/components/TopTracksModal';
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

interface MostListenedPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  owner: { display_name: string };
  public: boolean;
  collaborative: boolean;
  trackCount: number;
  followers: number;
  createdAt: string;
  popularityScore?: number;
  estimatedListens?: number;
  // New properties for user activity
  activityScore: number;
  estimatedUsage: number;
  estimatedTotalPlays: number;
  daysSinceCreation?: number;
  recentlyPlayedTracks?: number;
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
  const [mostListenedPlaylists, setMostListenedPlaylists] = useState<MostListenedPlaylist[]>([]);
  const [showTopTracksModal, setShowTopTracksModal] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [userTopTracks, setUserTopTracks] = useState<any[]>([]);
  const [topTracksLoading, setTopTracksLoading] = useState(false);
  const [listeningHistory, setListeningHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (session?.accessToken) {
      // Fetch analytics first, then genres and playlists
      fetchAnalytics().then(() => {
        // Add a small delay to ensure analytics are loaded before fetching other data
        setTimeout(() => {
          fetchGenres();
          fetchUserPlaylistActivity();
          fetchUserTopTracks();
          fetchListeningHistory();
        }, 500);
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
      
      if (data.genres && Array.isArray(data.genres)) {
        setGenresData(data.genres);
        if (data.genres.length === 0) {
          showToast('No genres found in your playlists', 'info');
        }
      } else {
        console.warn('🎵 Genres API returned invalid data format:', data);
        setGenresData([]);
        showToast('No genre data available', 'info');
      }
    } catch (error) {
      console.error('Error fetching genres:', error);
      showToast('Failed to load genres data', 'error');
      setGenresData([]);
    } finally {
      setGenresLoading(false);
    }
  };

  const fetchUserPlaylistActivity = async () => {
    try {
      setPlaylistsLoading(true);
      console.log('📊 Fetching user playlist activity...');
      
      const response = await fetch('/api/analytics/playlists/user-activity');
      if (!response.ok) {
        throw new Error('Failed to fetch user playlist activity');
      }
      
      const data = await response.json();
      console.log('📊 User playlist activity received:', data.playlists?.length || 0, 'playlists');
      
      if (data.playlists && Array.isArray(data.playlists)) {
        setMostListenedPlaylists(data.playlists);
      } else {
        console.warn('📊 User playlist activity API returned invalid data format:', data);
        setMostListenedPlaylists([]);
      }
    } catch (error) {
      console.error('Error fetching user playlist activity:', error);
      showToast('Failed to load playlist activity data', 'error');
      setMostListenedPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const fetchUserTopTracks = async () => {
    try {
      setTopTracksLoading(true);
      console.log('🎵 Fetching user top tracks...');
      
      const response = await fetch('/api/analytics/tracks/user-top?time_range=medium_term');
      if (!response.ok) {
        throw new Error('Failed to fetch user top tracks');
      }
      
      const data = await response.json();
      console.log('🎵 User top tracks received:', data.tracks?.length || 0, 'tracks');
      
      if (data.tracks && Array.isArray(data.tracks)) {
        setUserTopTracks(data.tracks);
      } else {
        console.warn('🎵 User top tracks API returned invalid data format:', data);
        setUserTopTracks([]);
      }
    } catch (error) {
      console.error('Error fetching user top tracks:', error);
      showToast('Failed to load user top tracks data', 'error');
      setUserTopTracks([]);
    } finally {
      setTopTracksLoading(false);
    }
  };

  const fetchListeningHistory = async () => {
    try {
      setHistoryLoading(true);
      console.log('📚 Fetching listening history...');
      
      const response = await fetch('/api/analytics/listening-history?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch listening history');
      }
      
      const data = await response.json();
      console.log('📚 Listening history received:', data.tracks?.length || 0, 'tracks');
      
      if (data.tracks && Array.isArray(data.tracks)) {
        setListeningHistory(data);
      } else {
        console.warn('📚 Listening history API returned invalid data format:', data);
        setListeningHistory(null);
      }
    } catch (error) {
      console.error('Error fetching listening history:', error);
      showToast('Failed to load listening history data', 'error');
      setListeningHistory(null);
    } finally {
      setHistoryLoading(false);
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
           <div className="bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-lg p-3 mt-3">
             <p className="text-[#1DB954] text-sm font-medium">📊 Nota sobre las métricas:</p>
             <p className="text-gray-400 text-xs leading-relaxed">
               • <strong>Top Tracks:</strong> Basado en tu historial real de reproducción de Spotify (endpoint /me/top/tracks)<br/>
               • <strong>Reproducciones por Playlist:</strong> Estimación basada en actividad reciente, tracks, followers y uso colaborativo<br/>
               • <strong>Actividad de Playlists:</strong> Combinación de tracks recientemente reproducidos, recencia y popularidad
             </p>
           </div>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3" />
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3" />
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
                    console.log(`🎵 Rendering genre: ${genre.genre} with ${genre.trackCount} tracks (${percentage.toFixed(1)}%)`);
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
                     <p className="text-gray-500 text-sm mt-2">This might be because:</p>
                     <ul className="text-gray-500 text-sm mt-1 space-y-1">
                       <li>• Your playlists don't have enough genre data</li>
                       <li>• Some playlists might be private or collaborative</li>
                       <li>• Rate limits from Spotify API</li>
                       <li>• Try refreshing the page</li>
                     </ul>
                     <button
                       onClick={fetchGenres}
                       className="mt-4 px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-lg text-sm font-medium transition-colors"
                     >
                       Try Again
                     </button>
                     <div className="mt-3 text-xs text-gray-500">
                       💡 Tip: Genres are fetched from your first 5 playlists to avoid API limits
                     </div>
                   </div>
                 )}
              </div>
            </section>

            {/* Favorite Artists */}
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

            {/* User's Most Active Playlists */}
            <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-white">Your Most Active Playlists</h2>
                <div className="text-gray-400 text-sm">
                  Based on real user activity
                </div>
              </div>
              <div className="space-y-3 lg:space-y-4">
                {playlistsLoading ? (
                  <div className="text-center py-8">
                    <LoadingSpinner size="sm" />
                    <p className="text-gray-400 mt-2">Loading your playlist activity...</p>
                  </div>
                ) : mostListenedPlaylists.length > 0 ? (
                  mostListenedPlaylists.slice(0, 5).map((playlist, index) => (
                    <div key={playlist.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-[#2a2a2a] transition-colors">
                      {/* Rank */}
                      <div className="flex-shrink-0">
                        <span className={`text-lg font-bold ${
                          index < 3 ? 'text-[#1DB954]' : 'text-gray-400'
                        }`}>
                          #{index + 1}
                        </span>
                      </div>

                      {/* Playlist Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={playlist.images[0]?.url || '/logo.png'}
                          alt={playlist.name}
                          className="w-12 h-12 rounded-md object-cover"
                        />
                      </div>

                      {/* Playlist Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{playlist.name}</h3>
                        <p className="text-gray-400 text-sm truncate">
                          {playlist.owner.display_name} • {playlist.trackCount} tracks
                        </p>
                        <p className="text-gray-500 text-xs truncate">
                          {playlist.collaborative ? 'Collaborative' : playlist.public ? 'Public' : 'Private'}
                        </p>
                      </div>

                      {/* Total Plays All Time */}
                      <div className="flex-shrink-0 text-center">
                        <div className="text-[#1DB954] font-bold text-lg">
                          {playlist.estimatedTotalPlays}
                        </div>
                        <div className="text-gray-400 text-xs">total plays</div>
                      </div>

                      {/* Activity Score Bar */}
                      <div className="flex-shrink-0">
                        <div className="w-20 bg-[#404040] rounded-full h-2">
                          <div 
                            className="bg-[#1DB954] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((playlist.activityScore / 100) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-gray-400 text-xs text-center mt-1">
                          {playlist.activityScore}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No playlist activity data available</p>
                    <p className="text-gray-500 text-sm mt-2">This might be because:</p>
                    <ul className="text-gray-500 text-sm mt-1 space-y-1">
                      <li>• You haven't played any tracks recently</li>
                      <li>• Some playlists might be private</li>
                      <li>• Try refreshing the page</li>
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* User's Top Tracks */}
            <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-white">Your Top Tracks</h2>
                <button
                  onClick={() => setShowTopTracksModal(true)}
                  className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  View All Tracks
                </button>
              </div>
              <div className="space-y-3 lg:space-y-4">
                {topTracksLoading ? (
                  <div className="text-center py-8">
                    <LoadingSpinner size="sm" />
                    <p className="text-gray-400 mt-2">Loading your top tracks...</p>
                  </div>
                                 ) : userTopTracks.length > 0 ? (
                   userTopTracks
                     .sort((a, b) => (b.estimatedPlays || 0) - (a.estimatedPlays || 0))
                     .slice(0, 5).map((track, index) => (
                    <div key={track.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-[#2a2a2a] transition-colors">
                      {/* Rank */}
                      <div className="flex-shrink-0">
                        <span className={`text-lg font-bold ${
                          index < 3 ? 'text-[#1DB954]' : 'text-gray-400'
                        }`}>
                          #{track.rank}
                        </span>
                      </div>

                      {/* Track Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={track.album.images[0]?.url || '/logo.png'}
                          alt={track.name}
                          className="w-12 h-12 rounded-md object-cover"
                        />
                      </div>

                      {/* Track Info - Better text handling */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-sm leading-tight" title={track.name}>
                          {track.name.length > 25 ? `${track.name.substring(0, 25)}...` : track.name}
                        </h3>
                        <p className="text-gray-400 text-xs leading-tight mt-1">
                          {track.artists.map((artist: any) => artist.name).join(', ')}
                        </p>
                        <p className="text-gray-500 text-xs leading-tight mt-1">
                          {track.album.name}
                        </p>
                      </div>

                      {/* Estimated Plays */}
                      <div className="flex-shrink-0 text-center">
                        <div className="text-[#1DB954] font-bold text-lg">
                          {track.estimatedPlays}
                        </div>
                        <div className="text-gray-400 text-xs">plays</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No top tracks data available</p>
                    <p className="text-gray-500 text-sm mt-2">This might be because:</p>
                    <ul className="text-gray-500 text-sm mt-1 space-y-1">
                      <li>• You haven't listened to enough tracks yet</li>
                      <li>• Your listening history is private</li>
                      <li>• Try refreshing the page</li>
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Listening History */}
            {listeningHistory && (
              <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <h2 className="text-xl lg:text-2xl font-bold text-white">Recent Listening Activity</h2>
                  <div className="text-gray-400 text-sm">
                    Last 50 tracks
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-[#2a2a2a] rounded-lg p-4">
                    <div className="text-[#1DB954] text-2xl font-bold">{listeningHistory.timeGroups?.lastHour || 0}</div>
                    <div className="text-gray-400 text-sm">Last Hour</div>
                  </div>
                  <div className="bg-[#2a2a2a] rounded-lg p-4">
                    <div className="text-[#1DB954] text-2xl font-bold">{listeningHistory.timeGroups?.lastDay || 0}</div>
                    <div className="text-gray-400 text-sm">Last 24 Hours</div>
                  </div>
                  <div className="bg-[#2a2a2a] rounded-lg p-4">
                    <div className="text-[#1DB954] text-2xl font-bold">{listeningHistory.timeGroups?.lastWeek || 0}</div>
                    <div className="text-gray-400 text-sm">This Week</div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-gray-400 text-sm">
                    Most active period: <span className="text-[#1DB954] font-medium">{listeningHistory.listeningInsights?.mostActivePeriod || 'Unknown'}</span>
                  </p>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No analytics data available</p>
          </div>
        )}
      </div>

      {/* Genre Tracks Modal */}
      <AnalyticsGenreTracksModal
        isOpen={showGenreModal}
        onClose={() => setShowGenreModal(false)}
        selectedGenre={selectedGenre || ''}
      />

      {/* Top Tracks Modal */}
      <TopTracksModal
        isOpen={showTopTracksModal}
        onClose={() => setShowTopTracksModal(false)}
      />
    </div>
  );
} 