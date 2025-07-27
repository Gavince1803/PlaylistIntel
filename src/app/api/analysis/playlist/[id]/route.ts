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
    playlistSuggestions: string[];
    discoveryTips: string[];
  };
  // Timestamp de cuando se generó el análisis
  analyzedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación del usuario
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: playlistId } = await params;
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

    // Paso 4: Obtener características de audio de los tracks (OPCIONAL)
    let audioFeatures: any[] = [];
    let audioFeaturesMap: Record<string, any> = {};
    
    try {
      const trackIds = tracks.map(track => track.id);
      console.log(`🎵 Fetching audio features for ${trackIds.length} tracks...`);
      audioFeatures = await spotifyService.getAudioFeatures(trackIds);
      console.log(`✅ Successfully fetched audio features for ${audioFeatures.length} tracks`);
      
      audioFeatures.forEach(feature => {
        audioFeaturesMap[feature.id] = feature;
      });
    } catch (error) {
      console.log('⚠️ Audio features not available (Spotify restriction), continuing with genre analysis only');
    }

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

    // Paso 6: Análisis de características de audio (OPCIONAL)
    console.log('🎚️ Analyzing audio features...');
    let audioAnalysis = {
      averageEnergy: 0,
      averageDanceability: 0,
      averageValence: 0,
      averageTempo: 0,
      averageAcousticness: 0,
      averageInstrumentalness: 0,
      mood: 'mixed' as 'energetic' | 'chill' | 'happy' | 'melancholic' | 'mixed'
    };

    if (audioFeatures.length > 0) {
      const analyzableTracks = tracks.filter(track => audioFeaturesMap[track.id]);
      if (analyzableTracks.length > 0) {
        const audioFeaturesList = analyzableTracks.map(track => audioFeaturesMap[track.id]);
        
        // Calcular promedios de características de audio
        audioAnalysis = {
          averageEnergy: average(audioFeaturesList.map(f => f.energy)),
          averageDanceability: average(audioFeaturesList.map(f => f.danceability)),
          averageValence: average(audioFeaturesList.map(f => f.valence)),
          averageTempo: average(audioFeaturesList.map(f => f.tempo)),
          averageAcousticness: average(audioFeaturesList.map(f => f.acousticness)),
          averageInstrumentalness: average(audioFeaturesList.map(f => f.instrumentalness)),
          mood: determineMood(
            average(audioFeaturesList.map(f => f.energy)),
            average(audioFeaturesList.map(f => f.valence)),
            average(audioFeaturesList.map(f => f.tempo))
          )
        };
      }
    } else {
      // Determinar mood basado en géneros si no hay audio features
      audioAnalysis.mood = determineMoodFromGenres(topGenres);
    }

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
      audioAnalysis.mood,
      audioAnalysis.averageEnergy,
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
      audioAnalysis: audioAnalysis,
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
  const artistRecommendations: string[] = [];

  // Mapeo avanzado de géneros relacionados (sin usar API de Spotify)
  const genreRelationships: Record<string, string[]> = {
    'rock': ['alternative rock', 'indie rock', 'punk rock', 'hard rock', 'classic rock'],
    'pop': ['indie pop', 'synthpop', 'electropop', 'dream pop', 'art pop'],
    'hip hop': ['trap', 'r&b', 'rap', 'conscious hip hop', 'alternative hip hop'],
    'electronic': ['house', 'techno', 'trance', 'ambient', 'downtempo'],
    'jazz': ['smooth jazz', 'acid jazz', 'nu jazz', 'jazz fusion', 'bebop'],
    'classical': ['orchestral', 'chamber music', 'symphony', 'opera', 'baroque'],
    'reggae': ['dub', 'roots reggae', 'dancehall', 'ska', 'reggaeton'],
    'country': ['folk', 'bluegrass', 'americana', 'country rock', 'outlaw country'],
    'blues': ['delta blues', 'electric blues', 'blues rock', 'rhythm and blues'],
    'metal': ['heavy metal', 'thrash metal', 'death metal', 'black metal', 'progressive metal']
  };

  // Generar géneros similares basados en relaciones conocidas
  topGenres.slice(0, 3).forEach(({ genre }) => {
    const baseGenre = Object.keys(genreRelationships).find(key => 
      genre.toLowerCase().includes(key)
    );
    
    if (baseGenre && genreRelationships[baseGenre]) {
      similarGenres.push(...genreRelationships[baseGenre]);
    }
  });

  // Generar sugerencias de mood más específicas
  switch (mood) {
    case 'energetic':
      moodSuggestions.push(
        'Workout & Fitness Mix',
        'Party & Celebration',
        'High-Energy Workout',
        'Gym Motivation',
        'Dance Party Hits'
      );
      break;
    case 'chill':
      moodSuggestions.push(
        'Study & Focus',
        'Relaxation & Meditation',
        'Chill Vibes Only',
        'Lo-Fi Study Beats',
        'Peaceful Moments'
      );
      break;
    case 'happy':
      moodSuggestions.push(
        'Feel-Good Vibes',
        'Summer Sunshine',
        'Positive Energy Boost',
        'Happy Morning',
        'Good Mood Mix'
      );
      break;
    case 'melancholic':
      moodSuggestions.push(
        'Rainy Day Melodies',
        'Emotional Journey',
        'Deep Thoughts',
        'Late Night Vibes',
        'Soulful Reflections'
      );
      break;
    default:
      moodSuggestions.push(
        'Mixed Emotions',
        'Variety Pack',
        'Eclectic Mix',
        'Mood Swings',
        'Diverse Collection'
      );
  }

  // Recomendaciones basadas en diversidad de géneros
  if (genreDiversity > 0.7) {
    moodSuggestions.push('Eclectic Mix', 'Genre Explorer', 'Musical Journey');
  } else if (genreDiversity < 0.3) {
    moodSuggestions.push('Pure [Genre]', 'Focused Collection', 'Genre Deep Dive');
  }

  // Determinar nivel de energía basado en géneros si no hay audio features
  let energyLevel: 'low' | 'medium' | 'high' = 'medium';
  if (energy > 0) {
    energyLevel = energy < 0.4 ? 'low' : energy > 0.7 ? 'high' : 'medium';
  } else {
    // Determinar energía basada en géneros dominantes
    const dominantGenre = topGenres[0]?.genre.toLowerCase() || '';
    if (dominantGenre.includes('rock') || dominantGenre.includes('metal') || dominantGenre.includes('electronic')) {
      energyLevel = 'high';
    } else if (dominantGenre.includes('ambient') || dominantGenre.includes('chill') || dominantGenre.includes('jazz')) {
      energyLevel = 'low';
    }
  }

  return {
    similarGenres: [...new Set(similarGenres)].slice(0, 8), // Limitar a 8 géneros
    moodSuggestions: [...new Set(moodSuggestions)].slice(0, 6), // Limitar a 6 sugerencias
    energyLevel,
    // Nuevas recomendaciones
    playlistSuggestions: generatePlaylistSuggestions(topGenres, mood, genreDiversity),
    discoveryTips: generateDiscoveryTips(genreDiversity, topGenres.length)
  };
}

// Función para generar sugerencias de playlist específicas
function generatePlaylistSuggestions(
  topGenres: Array<{ genre: string; count: number; percentage: number }>,
  mood: string,
  genreDiversity: number
): string[] {
  const suggestions: string[] = [];
  const dominantGenre = topGenres[0]?.genre || '';

  // Sugerencias basadas en el género dominante
  if (dominantGenre.includes('rock')) {
    suggestions.push('Rock Classics', 'Modern Rock Hits', 'Rock Essentials');
  } else if (dominantGenre.includes('pop')) {
    suggestions.push('Pop Hits', 'Chart Toppers', 'Pop Essentials');
  } else if (dominantGenre.includes('hip hop')) {
    suggestions.push('Hip Hop Essentials', 'Rap Classics', 'Urban Vibes');
  }

  // Sugerencias basadas en diversidad
  if (genreDiversity > 0.8) {
    suggestions.push('Genre Explorer', 'Musical Journey', 'Eclectic Mix');
  } else if (genreDiversity < 0.2) {
    suggestions.push(`Pure ${dominantGenre}`, `${dominantGenre} Deep Dive`);
  }

  return suggestions.slice(0, 4);
}

// Función para generar tips de descubrimiento
function generateDiscoveryTips(genreDiversity: number, genreCount: number): string[] {
  const tips: string[] = [];

  if (genreDiversity < 0.3) {
    tips.push('Try exploring similar genres to expand your taste');
    tips.push('Consider adding artists from related genres');
  } else if (genreDiversity > 0.7) {
    tips.push('You have diverse musical taste!');
    tips.push('Try creating focused playlists by genre');
  }

  if (genreCount < 5) {
    tips.push('Explore more genres to discover new music');
  } else if (genreCount > 15) {
    tips.push('You enjoy variety! Try creating mood-based playlists');
  }

  return tips.slice(0, 3);
}

// Función para determinar mood basado en géneros cuando no hay audio features
function determineMoodFromGenres(topGenres: Array<{ genre: string; count: number; percentage: number }>): 'energetic' | 'chill' | 'happy' | 'melancholic' | 'mixed' {
  const dominantGenre = topGenres[0]?.genre.toLowerCase() || '';
  
  // Géneros energéticos
  if (dominantGenre.includes('rock') || dominantGenre.includes('metal') || dominantGenre.includes('electronic') || dominantGenre.includes('dance')) {
    return 'energetic';
  }
  
  // Géneros felices
  if (dominantGenre.includes('pop') || dominantGenre.includes('reggaeton') || dominantGenre.includes('salsa') || dominantGenre.includes('funk')) {
    return 'happy';
  }
  
  // Géneros relajados
  if (dominantGenre.includes('ambient') || dominantGenre.includes('chill') || dominantGenre.includes('lofi') || dominantGenre.includes('jazz')) {
    return 'chill';
  }
  
  // Géneros melancólicos
  if (dominantGenre.includes('blues') || dominantGenre.includes('sad') || dominantGenre.includes('emo') || dominantGenre.includes('indie')) {
    return 'melancholic';
  }
  
  // Por defecto, mixed
  return 'mixed';
} 