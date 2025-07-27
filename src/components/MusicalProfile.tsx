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
  const { showToast } = useToast();

  // Cargar el perfil musical cuando el componente se monta
  useEffect(() => {
    fetchMusicalProfile();
  }, [playlistId]);

  const fetchMusicalProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎵 Fetching musical profile for playlist:', playlistId);
      const response = await fetch(`/api/analysis/playlist/${playlistId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze playlist');
      }

      setProfile(data.profile);
      console.log('✅ Musical profile loaded successfully:', data.profile);
    } catch (err: any) {
      console.error('❌ Error fetching musical profile:', err);
      setError(err.message || 'Failed to analyze playlist');
      showToast(err.message || 'Failed to analyze playlist', 'error');
    } finally {
      setLoading(false);
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
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="bg-[#232323] rounded-2xl p-8 shadow-lg border border-[#282828]">
        <div className="flex items-center justify-center space-x-4">
          <div className="w-8 h-8 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-lg">Analizando tu música...</p>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="bg-[#232323] rounded-2xl p-8 shadow-lg border border-[#282828]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Error en el análisis</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchMusicalProfile}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  // Si no hay perfil, mostrar mensaje
  if (!profile) {
    return (
      <div className="bg-[#232323] rounded-2xl p-8 shadow-lg border border-[#282828]">
        <p className="text-gray-400 text-center">No se pudo cargar el perfil musical</p>
      </div>
    );
  }

  return (
    <div className="bg-[#232323] rounded-2xl shadow-lg border border-[#282828] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Perfil Musical</h2>
            <p className="text-white/80 text-sm">
              Analizado el {formatDate(profile.analyzedAt)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-white text-3xl font-bold">{profile.totalTracks}</div>
            <div className="text-white/80 text-sm">canciones</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Resumen General */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Resumen General
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#282828] rounded-lg p-4">
              <div className="text-2xl font-bold text-[#1DB954]">{profile.artistAnalysis.uniqueArtists}</div>
              <div className="text-gray-400 text-sm">Artistas únicos</div>
            </div>
            <div className="bg-[#282828] rounded-lg p-4">
              <div className="text-2xl font-bold text-[#1DB954]">{profile.genreAnalysis.dominantGenre}</div>
              <div className="text-gray-400 text-sm">Género dominante</div>
            </div>
            <div className="bg-[#282828] rounded-lg p-4">
              <div className={`text-2xl font-bold ${getMoodColor(profile.audioAnalysis.mood)}`}>
                {getMoodIcon(profile.audioAnalysis.mood)} {profile.audioAnalysis.mood}
              </div>
              <div className="text-gray-400 text-sm">Mood general</div>
            </div>
          </div>
        </section>

        {/* Análisis de Géneros */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">🎼</span>
            Análisis de Géneros
          </h3>
          <div className="bg-[#282828] rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">Diversidad de géneros</span>
              <span className="text-[#1DB954] font-semibold">
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
                <div className="flex items-center">
                  <span className="text-[#1DB954] font-bold mr-3">#{index + 1}</span>
                  <span className="text-white font-medium">{genre.genre}</span>
                </div>
                <div className="text-right">
                  <div className="text-[#1DB954] font-semibold">{genre.count} canciones</div>
                  <div className="text-gray-400 text-sm">{formatPercentage(genre.percentage)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

                {/* Análisis de Audio */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">🎚️</span>
            Características de Audio
          </h3>
          
          {profile.audioAnalysis.averageEnergy > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#282828] rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Energía</span>
                  <span className="text-[#1DB954] font-semibold">{formatPercentage(profile.audioAnalysis.averageEnergy * 100)}</span>
                </div>
                <div className="w-full bg-[#404040] rounded-full h-2">
                  <div 
                    className="bg-[#1DB954] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${profile.audioAnalysis.averageEnergy * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-[#282828] rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Bailabilidad</span>
                  <span className="text-[#1DB954] font-semibold">{formatPercentage(profile.audioAnalysis.averageDanceability * 100)}</span>
                </div>
                <div className="w-full bg-[#404040] rounded-full h-2">
                  <div 
                    className="bg-[#1DB954] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${profile.audioAnalysis.averageDanceability * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-[#282828] rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Positividad</span>
                  <span className="text-[#1DB954] font-semibold">{formatPercentage(profile.audioAnalysis.averageValence * 100)}</span>
                </div>
                <div className="w-full bg-[#404040] rounded-full h-2">
                  <div 
                    className="bg-[#1DB954] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${profile.audioAnalysis.averageValence * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-[#282828] rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Tempo</span>
                  <span className="text-[#1DB954] font-semibold">{formatTempo(profile.audioAnalysis.averageTempo)}</span>
                </div>
                <div className="w-full bg-[#404040] rounded-full h-2">
                  <div 
                    className="bg-[#1DB954] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(profile.audioAnalysis.averageTempo / 200) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#282828] rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h4 className="text-white font-semibold mb-2">Características de Audio No Disponibles</h4>
              <p className="text-gray-400 text-sm">
                Spotify ha restringido el acceso a las características de audio. 
                El análisis se basa en géneros musicales y artistas.
              </p>
            </div>
          )}
        </section>

        {/* Top Artistas */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">👥</span>
            Top Artistas
          </h3>
          <div className="space-y-2">
            {profile.artistAnalysis.topArtists.slice(0, 5).map((artist, index) => (
              <div key={artist.name} className="flex items-center justify-between bg-[#282828] rounded-lg p-3">
                <div className="flex items-center">
                  <span className="text-[#1DB954] font-bold mr-3">#{index + 1}</span>
                  <span className="text-white font-medium">{artist.name}</span>
                </div>
                <div className="text-[#1DB954] font-semibold">{artist.trackCount} canciones</div>
              </div>
            ))}
          </div>
        </section>

                  {/* Recomendaciones */}
          <section>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="mr-2">💡</span>
              Recomendaciones
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Géneros Similares */}
              <div className="bg-[#282828] rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">Géneros Similares</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.recommendations.similarGenres.map((genre, index) => (
                    <span 
                      key={index}
                      className="bg-[#1DB954]/20 text-[#1DB954] px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sugerencias de Playlist */}
              <div className="bg-[#282828] rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">Sugerencias de Playlist</h4>
                <div className="space-y-2">
                  {profile.recommendations.playlistSuggestions?.map((suggestion, index) => (
                    <div key={index} className="text-gray-300 text-sm flex items-center">
                      <span className="text-[#1DB954] mr-2">•</span>
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tips de Descubrimiento */}
            {profile.recommendations.discoveryTips && profile.recommendations.discoveryTips.length > 0 && (
              <div className="bg-[#282828] rounded-lg p-4 mt-4">
                <h4 className="text-white font-semibold mb-3">💡 Tips de Descubrimiento</h4>
                <div className="space-y-2">
                  {profile.recommendations.discoveryTips.map((tip, index) => (
                    <div key={index} className="text-gray-300 text-sm flex items-start">
                      <span className="text-yellow-400 mr-2 mt-1">💡</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nivel de Energía */}
            <div className="bg-[#282828] rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">Nivel de Energía</span>
                <span className={`font-bold text-lg ${getEnergyColor(profile.recommendations.energyLevel)}`}>
                  {profile.recommendations.energyLevel.toUpperCase()}
                </span>
              </div>
            </div>
          </section>

        {/* Botón de cerrar */}
        {onClose && (
          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="bg-[#404040] hover:bg-[#505050] text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 