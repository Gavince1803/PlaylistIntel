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
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-400 mt-4">Analyzing playlist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No analytics data available</p>
        </div>
      </div>
    );
  }

  const { playlist, analytics } = analyticsData;

  return (
    <div className="min-h-screen bg-[#121212] text-white">
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
              <h1 className="text-xl font-bold">{playlist.name}</h1>
              <p className="text-gray-400 text-sm">
                {playlist.tracks.total} tracks • {playlist.owner.display_name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Overview Stats */}
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

        {/* Top Genres */}
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#282828]">
          <h2 className="text-lg font-semibold mb-4">Top Genres</h2>
          <div className="space-y-3">
            {analytics.topGenres.slice(0, 5).map((genre, index) => (
              <div key={genre.genre} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium">{genre.genre}</span>
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

        {/* Top Artists */}
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#282828]">
          <h2 className="text-lg font-semibold mb-4">Top Artists</h2>
          <div className="space-y-3">
            {analytics.topArtists.slice(0, 5).map((artist, index) => (
              <div key={artist.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium">{artist.name}</span>
                </div>
                <span className="text-sm text-gray-400">{artist.trackCount} tracks</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mood Distribution */}
        {analytics.moodDistribution.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#282828]">
            <h2 className="text-lg font-semibold mb-4">Mood Distribution</h2>
            <div className="grid grid-cols-2 gap-4">
              {analytics.moodDistribution.map((mood) => (
                <div key={mood.mood} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                  <span className="font-medium">{mood.mood}</span>
                  <span className="text-[#1DB954] font-semibold">{mood.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Energy Distribution */}
        {analytics.energyDistribution.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#282828]">
            <h2 className="text-lg font-semibold mb-4">Energy Levels</h2>
            <div className="grid grid-cols-2 gap-4">
              {analytics.energyDistribution.map((energy) => (
                <div key={energy.level} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                  <span className="font-medium">{energy.level}</span>
                  <span className="text-[#1DB954] font-semibold">{energy.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danceability Distribution */}
        {analytics.danceabilityDistribution.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#282828]">
            <h2 className="text-lg font-semibold mb-4">Danceability</h2>
            <div className="grid grid-cols-2 gap-4">
              {analytics.danceabilityDistribution.map((dance) => (
                <div key={dance.level} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                  <span className="font-medium">{dance.level}</span>
                  <span className="text-[#1DB954] font-semibold">{dance.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 