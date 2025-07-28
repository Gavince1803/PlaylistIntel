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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] p-2 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white text-center py-20">
            <div className="inline-flex items-center">
              <div className="w-8 h-8 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin mr-3"></div>
              Cargando perfiles...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] p-2 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
            Perfiles Musicales
          </h1>
          <p className="text-gray-300 text-lg">
            Tus análisis musicales guardados
          </p>
        </div>

        {savedProfiles.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-[#282828] rounded-2xl p-8 max-w-md mx-auto">
              <div className="w-16 h-16 bg-[#1DB954]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No hay perfiles guardados</h3>
              <p className="text-gray-400 mb-6">
                Analiza una playlist para ver tu primer perfil musical aquí
              </p>
              <a
                href="/"
                className="inline-flex items-center px-6 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold rounded-lg transition-colors"
              >
                Ir al Dashboard
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedProfiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-[#282828] rounded-2xl p-6 hover:bg-[#333333] transition-colors cursor-pointer group"
                onClick={() => setSelectedProfile(profile.playlistId)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {profile.playlistImage ? (
                      <img
                        src={profile.playlistImage}
                        alt={profile.playlistName}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-[#1DB954]/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-semibold text-lg truncate max-w-32">
                        {profile.playlistName}
                      </h3>
                      <p className="text-gray-400 text-sm">{profile.totalTracks} canciones</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProfile(profile.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
                    title="Eliminar perfil"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Género dominante</span>
                    <span className="text-white font-medium text-sm capitalize">
                      {profile.dominantGenre}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Estado de ánimo</span>
                    <span className={`font-medium text-sm capitalize ${getMoodColor(profile.mood)}`}>
                      {profile.mood}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Nivel de energía</span>
                    <span className={`font-medium text-sm capitalize ${getEnergyColor(profile.energyLevel)}`}>
                      {profile.energyLevel}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Analizado</span>
                    <span className="text-white text-sm">
                      {formatDate(profile.analyzedAt)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#404040]">
                  <button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                    Ver Análisis Completo
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