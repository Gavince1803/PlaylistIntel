import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { SpotifyService } from '@/lib/spotify';
import { authOptions } from '../../../auth/authOptions';

// Interface para definir la estructura del perfil musical
interface MusicalProfile {
  playlistId: string;
  playlistName: string;
  totalTracks: number;
  // Análisis de géneros
  genreAnalysis: {
    topGenres: Array<{ genre: string; count: number; percentage: number }>;
    genreDiversity: number; // 0-1, donde 1 es muy diverso
    dominantGenre: string;
  };
  // Análisis de características de audio
  audioAnalysis: {
    averageEnergy: number;
    averageDanceability: number;
    averageValence: number; // Positividad/humor
    averageTempo: number;
    averageAcousticness: number;
    averageInstrumentalness: number;
    mood: 'energetic' | 'chill' | 'happy' | 'melancholic' | 'mixed';
  };
  // Análisis de artistas
  artistAnalysis: {
    uniqueArtists: number;
    topArtists: Array<{ name: string; trackCount: number }>;
    artistDiversity: number; // 0-1, donde 1 es muy diverso
  };
  // Recomendaciones generadas
  recommendations: {
    similarGenres: string[];
    moodSuggestions: string[];
    energyLevel: 'low' | 'medium' | 'high';
  };
  // Timestamp de cuando se generó el análisis
  analyzedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación del usuario
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const playlistId = params.id;
    const spotifyService = new SpotifyService(session.accessToken);

    console.log(`🔍 Starting analysis for playlist: ${playlistId}`);

    // Paso 1: Obtener tracks de la playlist
    console.log('📀 Fetching playlist tracks...');
    const tracks = await spotifyService.getPlaylistTracks(playlistId);
    console.log(`✅ Found ${tracks.length} tracks`);

    if (tracks.length === 0) {
      return NextResponse.json({ error: 'Playlist is empty' }, { status: 400 });
    }

    // Paso 2: Obtener IDs únicos de artistas para análisis de géneros
    const artistIds = Array.from(new Set(tracks.flatMap(track => track.artists.map(a => a.id))));
    console.log(`🎤 Fetching details for ${artistIds.length} unique artists...`);

    // Paso 3: Obtener información de artistas (incluyendo géneros)
    const artists = await spotifyService.getArtists(artistIds);
    console.log(`✅ Successfully fetched ${artists.length} artists`);

    // Crear mapa de géneros por artista para acceso rápido
    const artistGenres: Record<string, string[]> = {};
    artists.forEach(artist => {
      artistGenres[artist.id] = artist.genres;
    });

    // Paso 4: Obtener características de audio de los tracks
    const trackIds = tracks.map(track => track.id);
    console.log(`🎵 Fetching audio features for ${trackIds.length} tracks...`);
    const audioFeatures = await spotifyService.getAudioFeatures(trackIds);
    console.log(`✅ Successfully fetched audio features for ${audioFeatures.length} tracks`);

    // Crear mapa de características de audio por track
    const audioFeaturesMap: Record<string, any> = {};
    audioFeatures.forEach(feature => {
      audioFeaturesMap[feature.id] = feature;
    });

    // Paso 5: Análisis de géneros
    console.log('🎼 Analyzing genres...');
    const genreCounts: Record<string, number> = {};
    let totalGenreOccurrences = 0;

    tracks.forEach(track => {
      // Obtener géneros de todos los artistas del track
      const trackGenres = Array.from(new Set(
        track.artists.flatMap(artist => artistGenres[artist.id] || [])
      ));
      
      // Contar cada género
      trackGenres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        totalGenreOccurrences++;
      });
    });

    // Calcular top géneros y diversidad
    const topGenres = Object.entries(genreCounts)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: (count / totalGenreOccurrences) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 géneros

    const dominantGenre = topGenres[0]?.genre || 'unknown';
    
    // Calcular diversidad de géneros (usando índice de Shannon)
    const genreDiversity = calculateDiversity(Object.values(genreCounts));

    // Paso 6: Análisis de características de audio
    console.log('🎚️ Analyzing audio features...');
    const analyzableTracks = tracks.filter(track => audioFeaturesMap[track.id]);
    
    if (analyzableTracks.length === 0) {
      return NextResponse.json({ error: 'No tracks with audio features found' }, { status: 400 });
    }

    const audioFeaturesList = analyzableTracks.map(track => audioFeaturesMap[track.id]);
    
    // Calcular promedios de características de audio
    const averageEnergy = average(audioFeaturesList.map(f => f.energy));
    const averageDanceability = average(audioFeaturesList.map(f => f.danceability));
    const averageValence = average(audioFeaturesList.map(f => f.valence));
    const averageTempo = average(audioFeaturesList.map(f => f.tempo));
    const averageAcousticness = average(audioFeaturesList.map(f => f.acousticness));
    const averageInstrumentalness = average(audioFeaturesList.map(f => f.instrumentalness));

    // Determinar el mood basado en características de audio
    const mood = determineMood(averageEnergy, averageValence, averageTempo);

    // Paso 7: Análisis de artistas
    console.log('👥 Analyzing artists...');
    const artistCounts: Record<string, number> = {};
    tracks.forEach(track => {
      track.artists.forEach(artist => {
        artistCounts[artist.name] = (artistCounts[artist.name] || 0) + 1;
      });
    });

    const uniqueArtists = Object.keys(artistCounts).length;
    const topArtists = Object.entries(artistCounts)
      .map(([name, count]) => ({ name, trackCount: count }))
      .sort((a, b) => b.trackCount - a.trackCount)
      .slice(0, 10); // Top 10 artistas

    const artistDiversity = calculateDiversity(Object.values(artistCounts));

    // Paso 8: Generar recomendaciones
    console.log('💡 Generating recommendations...');
    const recommendations = generateRecommendations(
      topGenres,
      mood,
      averageEnergy,
      genreDiversity
    );

    // Paso 9: Construir el perfil musical completo
    const musicalProfile: MusicalProfile = {
      playlistId,
      playlistName: `Playlist ${playlistId}`, // Podríamos obtener el nombre real de la playlist
      totalTracks: tracks.length,
      genreAnalysis: {
        topGenres,
        genreDiversity,
        dominantGenre
      },
      audioAnalysis: {
        averageEnergy,
        averageDanceability,
        averageValence,
        averageTempo,
        averageAcousticness,
        averageInstrumentalness,
        mood
      },
      artistAnalysis: {
        uniqueArtists,
        topArtists,
        artistDiversity
      },
      recommendations,
      analyzedAt: new Date().toISOString()
    };

    console.log('✅ Musical profile analysis completed successfully!');
    return NextResponse.json({ profile: musicalProfile });

  } catch (error: any) {
    console.error('❌ Error analyzing playlist:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze playlist',
      details: error.message 
    }, { status: 500 });
  }
}

// Función auxiliar para calcular el promedio de un array de números
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

// Función para calcular la diversidad usando el índice de Shannon
function calculateDiversity(counts: number[]): number {
  if (counts.length === 0) return 0;
  
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;

  // Calcular proporciones
  const proportions = counts.map(count => count / total);
  
  // Calcular índice de Shannon
  const shannonIndex = -proportions.reduce((sum, p) => {
    if (p === 0) return sum;
    return sum + (p * Math.log(p));
  }, 0);

  // Normalizar a 0-1 (dividir por el logaritmo del número de categorías)
  const maxDiversity = Math.log(counts.length);
  return maxDiversity > 0 ? shannonIndex / maxDiversity : 0;
}

// Función para determinar el mood basado en características de audio
function determineMood(energy: number, valence: number, tempo: number): 'energetic' | 'chill' | 'happy' | 'melancholic' | 'mixed' {
  // Lógica para determinar el mood:
  // - Energetic: alta energía, tempo rápido
  // - Happy: alta positividad (valence)
  // - Chill: baja energía, tempo lento
  // - Melancholic: baja positividad
  // - Mixed: combinación de características

  if (energy > 0.7 && tempo > 120) return 'energetic';
  if (valence > 0.7) return 'happy';
  if (energy < 0.4 && tempo < 100) return 'chill';
  if (valence < 0.3) return 'melancholic';
  return 'mixed';
}

// Función para generar recomendaciones basadas en el análisis
function generateRecommendations(
  topGenres: Array<{ genre: string; count: number; percentage: number }>,
  mood: string,
  energy: number,
  genreDiversity: number
) {
  const similarGenres: string[] = [];
  const moodSuggestions: string[] = [];

  // Generar géneros similares basados en los top géneros
  topGenres.slice(0, 3).forEach(({ genre }) => {
    // Aquí podrías tener un mapeo de géneros relacionados
    // Por ahora, sugerimos géneros similares basados en patrones conocidos
    if (genre.includes('rock')) similarGenres.push('alternative rock', 'indie rock');
    if (genre.includes('pop')) similarGenres.push('indie pop', 'synthpop');
    if (genre.includes('hip hop')) similarGenres.push('trap', 'r&b');
    if (genre.includes('electronic')) similarGenres.push('house', 'techno');
  });

  // Generar sugerencias de mood
  switch (mood) {
    case 'energetic':
      moodSuggestions.push('Workout playlist', 'Party music', 'High-energy tracks');
      break;
    case 'chill':
      moodSuggestions.push('Study music', 'Relaxation playlist', 'Ambient sounds');
      break;
    case 'happy':
      moodSuggestions.push('Feel-good songs', 'Summer vibes', 'Positive energy');
      break;
    case 'melancholic':
      moodSuggestions.push('Rainy day music', 'Emotional tracks', 'Deep thoughts');
      break;
    default:
      moodSuggestions.push('Mixed mood playlist', 'Variety of emotions');
  }

  // Determinar nivel de energía
  const energyLevel: 'low' | 'medium' | 'high' = 
    energy < 0.4 ? 'low' : energy > 0.7 ? 'high' : 'medium';

  return {
    similarGenres: [...new Set(similarGenres)], // Remover duplicados
    moodSuggestions,
    energyLevel
  };
} 