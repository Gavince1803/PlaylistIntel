"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import MusicalProfile from "@/components/MusicalProfile";

interface SavedProfile {
  id: string;
  playlistId: string;
  playlistName: string;
  playlistImage?: string;
  analyzedAt: string;
  totalTracks: number;
  dominantGenre: string;
  mood: string;
  energyLevel: string;
  profile: any; // Full musical profile data
}

export default function ProfilesPage() {
  const { data: session } = useSession();
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedProfiles();
  }, []);

  const loadSavedProfiles = () => {
    try {
      const saved = localStorage.getItem('spotify-musical-profiles');
      if (saved) {
        const profiles = JSON.parse(saved);
        setSavedProfiles(profiles);
      }
    } catch (error) {
      console.error('Error loading saved profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProfile = (profileId: string) => {
    try {
      const updatedProfiles = savedProfiles.filter(p => p.id !== profileId);
      setSavedProfiles(updatedProfiles);
      localStorage.setItem('spotify-musical-profiles', JSON.stringify(updatedProfiles));
    } catch (error) {
      console.error('Error deleting profile:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'energetic': return 'text-orange-400';
      case 'chill': return 'text-blue-400';
      case 'happy': return 'text-yellow-400';
      case 'melancholic': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  // Generate a human-readable name for the profile
  const generateProfileName = (profile: SavedProfile) => {
    const genre = profile.dominantGenre;
    const mood = profile.mood;
    const energy = profile.energyLevel;
    
    // Create descriptive name based on characteristics
    let descriptiveName = '';
    
    // Add mood description
    switch (mood) {
      case 'energetic':
        descriptiveName += 'Energetic ';
        break;
      case 'happy':
        descriptiveName += 'Happy ';
        break;
      case 'chill':
        descriptiveName += 'Chill ';
        break;
      case 'melancholic':
        descriptiveName += 'Melancholic ';
        break;
      default:
        descriptiveName += 'Vibrant ';
    }
    
    // Add genre
    descriptiveName += genre.charAt(0).toUpperCase() + genre.slice(1);
    
    // Add energy level
    switch (energy) {
      case 'high':
        descriptiveName += ' (High Energy)';
        break;
      case 'medium':
        descriptiveName += ' (Medium Energy)';
        break;
      case 'low':
        descriptiveName += ' (Low Energy)';
        break;
    }
    
    return descriptiveName;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] p-4 sm:p-6 lg:p-8 custom-scrollbar overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Loading Header */}
          <div className="mb-8 lg:mb-12">
            <div className="bg-gradient-to-r from-[#1DB954]/10 to-[#1ed760]/10 rounded-3xl p-6 lg:p-8 border border-[#1DB954]/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                                  <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-2 tracking-tight">
                  Music Library 🎵
                </h1>
                <p className="text-lg text-gray-300">
                  Loading your musical analyses...
                </p>
                </div>
              </div>
              
              {/* Loading Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-[#232323]/50 rounded-xl p-4 border border-[#282828] animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 bg-[#1DB954]/50 rounded"></div>
                    </div>
                    <div>
                      <div className="w-8 h-4 bg-gray-600 rounded mb-1"></div>
                      <div className="w-20 h-3 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#232323]/50 rounded-xl p-4 border border-[#282828] animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 bg-[#1DB954]/50 rounded"></div>
                    </div>
                    <div>
                      <div className="w-12 h-4 bg-gray-600 rounded mb-1"></div>
                      <div className="w-16 h-3 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#232323]/50 rounded-xl p-4 border border-[#282828] animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 bg-[#1DB954]/50 rounded"></div>
                    </div>
                    <div>
                      <div className="w-20 h-4 bg-gray-600 rounded mb-1"></div>
                      <div className="w-16 h-3 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <div key={index} className="bg-gradient-to-br from-[#282828] to-[#2a2a2a] rounded-3xl p-6 border border-[#282828] animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#1DB954]/20 rounded-2xl"></div>
                    <div>
                      <div className="w-32 h-6 bg-gray-600 rounded mb-2"></div>
                      <div className="w-16 h-4 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#232323]/50 rounded-lg p-2 border border-[#282828]">
                      <div className="w-12 h-3 bg-gray-600 rounded mb-1"></div>
                      <div className="w-16 h-4 bg-gray-500 rounded"></div>
                    </div>
                    <div className="bg-[#232323]/50 rounded-lg p-2 border border-[#282828]">
                      <div className="w-10 h-3 bg-gray-600 rounded mb-1"></div>
                      <div className="w-14 h-4 bg-gray-500 rounded"></div>
                    </div>
                  </div>
                  <div className="bg-[#232323]/50 rounded-lg p-2 border border-[#282828]">
                    <div className="w-12 h-3 bg-gray-600 rounded mb-1"></div>
                    <div className="w-16 h-4 bg-gray-500 rounded"></div>
                  </div>
                </div>
                <div className="pt-3 border-t border-[#404040]">
                  <div className="w-full h-10 bg-[#1DB954]/20 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] p-4 sm:p-6 lg:p-8 custom-scrollbar overflow-y-auto">
      <div className="max-w-7xl mx-auto px-2">
        {/* Header Section */}
        <div className="mb-8 lg:mb-12 mt-4">
          <div className="bg-gradient-to-r from-[#1DB954]/10 to-[#1ed760]/10 rounded-3xl p-6 lg:p-8 border border-[#1DB954]/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-2 tracking-tight">
                    Music Library 🎵
                  </h1>
                  <p className="text-lg text-gray-300">
                    Your saved musical analyses and insights
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 px-4 py-2 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] hover:text-white rounded-xl transition-all duration-200 group"
                title="Go back"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-semibold">Back</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-[#232323]/50 rounded-xl p-4 border border-[#282828]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{savedProfiles.length}</p>
                    <p className="text-gray-400 text-sm">Saved profiles</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#232323]/50 rounded-xl p-4 border border-[#282828]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Analytics</p>
                    <p className="text-gray-400 text-sm">Detailed</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#232323]/50 rounded-xl p-4 border border-[#282828]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Recommendations</p>
                    <p className="text-gray-400 text-sm">Personalized</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {savedProfiles.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gradient-to-br from-[#282828] to-[#2a2a2a] rounded-3xl p-8 lg:p-12 max-w-md mx-auto border border-[#282828] shadow-2xl">
              <div className="w-20 h-20 bg-gradient-to-br from-[#1DB954]/20 to-[#1ed760]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No saved profiles</h3>
              <p className="text-gray-400 mb-8 text-lg">
                Analyze a playlist to see your first musical profile here
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go to Dashboard
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 custom-scrollbar max-h-[70vh] overflow-y-auto pr-2 pt-4 pl-2">
            {savedProfiles.map((profile, index) => (
              <div
                key={profile.id}
                className="bg-gradient-to-br from-[#282828] to-[#2a2a2a] rounded-3xl p-6 hover:bg-gradient-to-br hover:from-[#333333] hover:to-[#353535] transition-all duration-300 cursor-pointer group shadow-xl hover:shadow-2xl hover:scale-[1.02] border border-[#282828] hover:border-[#1DB954]/30 flex flex-col h-full animate-fade-in-down"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'both'
                }}
                onClick={() => setSelectedProfile(profile.playlistId)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {profile.playlistImage ? (
                      <div className="relative">
                        <img
                          src={profile.playlistImage}
                          alt={profile.playlistName}
                          className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="w-16 h-16 bg-[#1DB954]/20 rounded-2xl flex items-center justify-center shadow-lg">
                          <svg className="w-8 h-8 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-bold text-xl truncate max-w-40 group-hover:text-[#1DB954] transition-colors">
                        {profile.playlistName}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1 italic">
                        {generateProfileName(profile)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 bg-[#1DB954]/10 rounded-full px-2 py-1">
                          <svg className="w-3 h-3 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          <span className="text-white font-semibold text-sm">{profile.totalTracks}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProfile(profile.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all duration-200 p-2 hover:bg-red-500/10 rounded-xl"
                    title="Delete profile"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#232323]/50 rounded-lg p-2 border border-[#282828]">
                      <div className="flex items-center gap-1 mb-1">
                        <svg className="w-3 h-3 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="text-gray-400 text-xs">Genre</span>
                      </div>
                      <span className="text-white font-semibold text-xs capitalize">
                        {profile.dominantGenre}
                      </span>
                    </div>
                    
                    <div className="bg-[#232323]/50 rounded-lg p-2 border border-[#282828]">
                      <div className="flex items-center gap-1 mb-1">
                        <svg className="w-3 h-3 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-400 text-xs">Mood</span>
                      </div>
                      <span className={`font-semibold text-xs capitalize ${getMoodColor(profile.mood)}`}>
                        {profile.mood}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-[#232323]/50 rounded-lg p-2 border border-[#282828]">
                    <div className="flex items-center gap-1 mb-1">
                      <svg className="w-3 h-3 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                                              <span className="text-gray-400 text-xs">Energy</span>
                    </div>
                    <span className={`font-semibold text-xs capitalize ${getEnergyColor(profile.energyLevel)}`}>
                      {profile.energyLevel}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Analyzed on {formatDate(profile.analyzedAt)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#404040] mt-auto">
                  <button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-xl group/btn">
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Analysis
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for viewing full profile */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50">
          <MusicalProfile 
            playlistId={selectedProfile} 
            onClose={() => setSelectedProfile(null)}
          />
        </div>
      )}
    </div>
  );
} 