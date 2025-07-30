'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

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

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (session?.accessToken) {
      fetchAnalytics();
    }
  }, [session]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // TODO: Implement actual analytics API call
      // For now, we'll use mock data
      const mockData: AnalyticsData = {
        totalPlaylists: 24,
        totalTracks: 847,
        averagePlaylistLength: 35,
        topGenres: [
          { genre: 'Pop', count: 156, percentage: 18.4 },
          { genre: 'Rock', count: 134, percentage: 15.8 },
          { genre: 'Hip Hop', count: 98, percentage: 11.6 },
          { genre: 'Electronic', count: 87, percentage: 10.3 },
          { genre: 'R&B', count: 76, percentage: 9.0 }
        ],
        listeningTime: 2847,
        mostActiveMonth: 'December',
        favoriteArtists: [
          { name: 'The Weeknd', trackCount: 23 },
          { name: 'Drake', trackCount: 19 },
          { name: 'Taylor Swift', trackCount: 17 },
          { name: 'Post Malone', trackCount: 15 },
          { name: 'Dua Lipa', trackCount: 12 }
        ],
        moodDistribution: [
          { mood: 'Energetic', count: 45 },
          { mood: 'Chill', count: 38 },
          { mood: 'Happy', count: 32 },
          { mood: 'Melancholic', count: 28 }
        ]
      };
      
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showToast('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-lg transition-colors"
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">Analytics Dashboard</h1>
          </div>
          <p className="text-gray-300 text-lg">Discover insights about your music taste</p>
        </div>

        {analyticsData ? (
          <div className="space-y-8">
            {/* Key Metrics */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-2xl p-6 border border-[#282828] shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Playlists</p>
                    <p className="text-3xl font-bold text-white">{analyticsData.totalPlaylists}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#1DB954]/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-2xl p-6 border border-[#282828] shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Tracks</p>
                    <p className="text-3xl font-bold text-white">{analyticsData.totalTracks.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#1DB954]/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-2xl p-6 border border-[#282828] shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Avg. Playlist Length</p>
                    <p className="text-3xl font-bold text-white">{analyticsData.averagePlaylistLength}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#1DB954]/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-2xl p-6 border border-[#282828] shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Listening Time</p>
                    <p className="text-3xl font-bold text-white">{formatTime(analyticsData.listeningTime)}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#1DB954]/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </section>

            {/* Top Genres */}
            <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-2xl p-6 border border-[#282828] shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-6">Top Genres</h2>
              <div className="space-y-4">
                {analyticsData.topGenres.map((genre, index) => (
                  <div key={genre.genre} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-lg font-bold text-[#1DB954]">#{index + 1}</span>
                      <span className="text-white font-medium">{genre.genre}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-32 bg-[#404040] rounded-full h-2">
                        <div 
                          className="bg-[#1DB954] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${genre.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-400 text-sm w-16 text-right">{genre.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Favorite Artists & Mood Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-2xl p-6 border border-[#282828] shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-6">Favorite Artists</h2>
                <div className="space-y-4">
                  {analyticsData.favoriteArtists.map((artist, index) => (
                    <div key={artist.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-lg font-bold text-[#1DB954]">#{index + 1}</span>
                        <span className="text-white font-medium">{artist.name}</span>
                      </div>
                      <span className="text-gray-400">{artist.trackCount} tracks</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-2xl p-6 border border-[#282828] shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-6">Mood Distribution</h2>
                <div className="space-y-4">
                  {analyticsData.moodDistribution.map((mood, index) => (
                    <div key={mood.mood} className="flex items-center justify-between">
                      <span className="text-white font-medium">{mood.mood}</span>
                      <div className="flex items-center space-x-4">
                        <div className="w-32 bg-[#404040] rounded-full h-2">
                          <div 
                            className="bg-[#1DB954] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(mood.count / analyticsData.moodDistribution.reduce((sum, m) => sum + m.count, 0)) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-gray-400 text-sm w-16 text-right">{mood.count}</span>
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
    </div>
  );
} 