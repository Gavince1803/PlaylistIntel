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
    recommendedArtists: Array<{ name: string; genre: string; reason: string }>;
    recommendedSongs: Array<{ title: string; artist: string; genre: string; reason: string; year?: number; spotifyUrl?: string }>;
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

    // Paso 1: Obtener tracks de la playlist (con paginación para playlists grandes)
    console.log('📀 Fetching playlist tracks...');
    const tracks = await spotifyService.getAllPlaylistTracks(playlistId, 2000); // Soporte hasta 2000 tracks
    console.log(`✅ Found ${tracks.length} tracks total`);

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
    const recommendations = await generateRecommendations(
      topGenres,
      topArtists,
      audioAnalysis.mood,
      audioAnalysis.averageEnergy,
      genreDiversity,
      spotifyService
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
function generateArtistRecommendations(
  topGenres: Array<{ genre: string; count: number; percentage: number }>,
  topArtists: Array<{ name: string; trackCount: number }>,
  mood: string,
  genreDiversity: number
): Array<{ name: string; genre: string; reason: string }> {
  const recommendations: Array<{ name: string; genre: string; reason: string }> = [];
  
  // Base de datos de artistas populares por género (sin usar API de Spotify)
  const artistDatabase: Record<string, Array<{ name: string; genre: string; popularity: 'high' | 'medium' | 'low' }>> = {
    'rock': [
      { name: 'Arctic Monkeys', genre: 'indie rock', popularity: 'high' },
      { name: 'The Strokes', genre: 'indie rock', popularity: 'high' },
      { name: 'Foo Fighters', genre: 'alternative rock', popularity: 'high' },
      { name: 'Red Hot Chili Peppers', genre: 'alternative rock', popularity: 'high' },
      { name: 'Queens of the Stone Age', genre: 'stoner rock', popularity: 'medium' },
      { name: 'Tame Impala', genre: 'psychedelic rock', popularity: 'high' },
      { name: 'The Killers', genre: 'indie rock', popularity: 'high' },
      { name: 'Interpol', genre: 'post-punk', popularity: 'medium' }
    ],
    'pop': [
      { name: 'Dua Lipa', genre: 'pop', popularity: 'high' },
      { name: 'The Weeknd', genre: 'pop', popularity: 'high' },
      { name: 'Ariana Grande', genre: 'pop', popularity: 'high' },
      { name: 'Billie Eilish', genre: 'indie pop', popularity: 'high' },
      { name: 'Lorde', genre: 'indie pop', popularity: 'high' },
      { name: 'Charli XCX', genre: 'electropop', popularity: 'medium' },
      { name: 'Carly Rae Jepsen', genre: 'pop', popularity: 'medium' },
      { name: 'Halsey', genre: 'pop', popularity: 'high' }
    ],
    'hip hop': [
      { name: 'Kendrick Lamar', genre: 'hip hop', popularity: 'high' },
      { name: 'Drake', genre: 'hip hop', popularity: 'high' },
      { name: 'J. Cole', genre: 'hip hop', popularity: 'high' },
      { name: 'Travis Scott', genre: 'trap', popularity: 'high' },
      { name: 'Tyler, The Creator', genre: 'hip hop', popularity: 'high' },
      { name: 'A$AP Rocky', genre: 'hip hop', popularity: 'high' },
      { name: 'Post Malone', genre: 'hip hop', popularity: 'high' },
      { name: '21 Savage', genre: 'trap', popularity: 'high' }
    ],
    'electronic': [
      { name: 'Daft Punk', genre: 'electronic', popularity: 'high' },
      { name: 'The Chemical Brothers', genre: 'electronic', popularity: 'medium' },
      { name: 'Aphex Twin', genre: 'ambient', popularity: 'medium' },
      { name: 'Four Tet', genre: 'electronic', popularity: 'medium' },
      { name: 'Flying Lotus', genre: 'electronic', popularity: 'medium' },
      { name: 'Caribou', genre: 'electronic', popularity: 'medium' },
      { name: 'Jamie xx', genre: 'electronic', popularity: 'high' },
      { name: 'Disclosure', genre: 'house', popularity: 'high' }
    ],
    'jazz': [
      { name: 'Kamasi Washington', genre: 'jazz', popularity: 'medium' },
      { name: 'Robert Glasper', genre: 'jazz', popularity: 'medium' },
      { name: 'Esperanza Spalding', genre: 'jazz', popularity: 'medium' },
      { name: 'Christian Scott', genre: 'jazz', popularity: 'medium' },
      { name: 'Snarky Puppy', genre: 'jazz fusion', popularity: 'medium' },
      { name: 'BADBADNOTGOOD', genre: 'jazz', popularity: 'medium' },
      { name: 'GoGo Penguin', genre: 'jazz', popularity: 'medium' },
      { name: 'The Comet Is Coming', genre: 'jazz', popularity: 'medium' }
    ],
    'indie': [
      { name: 'Vampire Weekend', genre: 'indie pop', popularity: 'high' },
      { name: 'Phoenix', genre: 'indie pop', popularity: 'high' },
      { name: 'MGMT', genre: 'indie pop', popularity: 'high' },
      { name: 'Foster The People', genre: 'indie pop', popularity: 'high' },
      { name: 'Two Door Cinema Club', genre: 'indie pop', popularity: 'medium' },
      { name: 'The 1975', genre: 'indie pop', popularity: 'high' },
      { name: 'Glass Animals', genre: 'indie pop', popularity: 'high' },
      { name: 'Alt-J', genre: 'indie rock', popularity: 'high' }
    ],
    'r&b': [
      { name: 'Frank Ocean', genre: 'r&b', popularity: 'high' },
      { name: 'The Weeknd', genre: 'r&b', popularity: 'high' },
      { name: 'SZA', genre: 'r&b', popularity: 'high' },
      { name: 'H.E.R.', genre: 'r&b', popularity: 'high' },
      { name: 'Daniel Caesar', genre: 'r&b', popularity: 'medium' },
      { name: 'Giveon', genre: 'r&b', popularity: 'medium' },
      { name: 'Lucky Daye', genre: 'r&b', popularity: 'medium' },
      { name: 'Snoh Aalegra', genre: 'r&b', popularity: 'medium' }
    ]
  };

  // Obtener géneros dominantes
  const dominantGenres = topGenres.slice(0, 3).map(g => g.genre.toLowerCase());
  
  // Generar recomendaciones basadas en géneros dominantes
  for (const genre of dominantGenres) {
    // Buscar artistas que coincidan con el género
    for (const [category, artists] of Object.entries(artistDatabase)) {
      if (genre.includes(category) || category.includes(genre)) {
        // Filtrar artistas que no están ya en la playlist
        const existingArtists = topArtists.map(a => a.name.toLowerCase());
        const newArtists = artists.filter(artist => 
          !existingArtists.includes(artist.name.toLowerCase())
        );
        
        // Agregar hasta 2 artistas por género
        newArtists.slice(0, 2).forEach(artist => {
          let reason = '';
          if (genreDiversity > 0.7) {
            reason = 'Similar to your eclectic taste';
          } else if (artist.popularity === 'high') {
            reason = 'Popular artist in your favorite genre';
          } else {
            reason = 'Emerging artist in your style';
          }
          
          recommendations.push({
            name: artist.name,
            genre: artist.genre,
            reason
          });
        });
      }
    }
  }

  // Si no hay suficientes recomendaciones, agregar artistas de géneros relacionados
  if (recommendations.length < 5) {
    const relatedGenres = ['indie', 'alternative', 'electronic'];
    relatedGenres.forEach(genre => {
      if (!dominantGenres.some(dg => dg.includes(genre))) {
        const artists = artistDatabase[genre] || [];
        const newArtists = artists.filter(artist => 
          !recommendations.some(r => r.name === artist.name) &&
          !topArtists.some(a => a.name.toLowerCase() === artist.name.toLowerCase())
        );
        
        newArtists.slice(0, 2).forEach(artist => {
          recommendations.push({
            name: artist.name,
            genre: artist.genre,
            reason: 'Expand your musical horizons'
          });
        });
      }
    });
  }

  // Limitar a 8 recomendaciones y eliminar duplicados
  const uniqueRecommendations = recommendations
    .filter((rec, index, self) => 
      index === self.findIndex(r => r.name === rec.name)
    )
    .slice(0, 8);

  return uniqueRecommendations;
}

function generateSongRecommendations(
  topGenres: Array<{ genre: string; count: number; percentage: number }>,
  topArtists: Array<{ name: string; trackCount: number }>,
  mood: string,
  genreDiversity: number
): Array<{ title: string; artist: string; genre: string; reason: string; year?: number; spotifyUrl?: string }> {
  const recommendations: Array<{ title: string; artist: string; genre: string; reason: string; year?: number; spotifyUrl?: string }> = [];
  
  // Base de datos de canciones populares por género (sin usar API de Spotify)
  const songDatabase: Record<string, Array<{ title: string; artist: string; genre: string; year: number; popularity: 'high' | 'medium' | 'low' }>> = {
    'rock': [
      { title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', genre: 'indie rock', year: 2013, popularity: 'high' },
      { title: 'Last Nite', artist: 'The Strokes', genre: 'indie rock', year: 2001, popularity: 'high' },
      { title: 'Everlong', artist: 'Foo Fighters', genre: 'alternative rock', year: 1997, popularity: 'high' },
      { title: 'Californication', artist: 'Red Hot Chili Peppers', genre: 'alternative rock', year: 1999, popularity: 'high' },
      { title: 'No One Knows', artist: 'Queens of the Stone Age', genre: 'stoner rock', year: 2002, popularity: 'medium' },
      { title: 'The Less I Know The Better', artist: 'Tame Impala', genre: 'psychedelic rock', year: 2015, popularity: 'high' },
      { title: 'Mr. Brightside', artist: 'The Killers', genre: 'indie rock', year: 2004, popularity: 'high' },
      { title: 'Obstacle 1', artist: 'Interpol', genre: 'post-punk', year: 2002, popularity: 'medium' }
    ],
    'pop': [
      { title: 'Levitating', artist: 'Dua Lipa', genre: 'pop', year: 2020, popularity: 'high' },
      { title: 'Blinding Lights', artist: 'The Weeknd', genre: 'pop', year: 2019, popularity: 'high' },
      { title: 'thank u, next', artist: 'Ariana Grande', genre: 'pop', year: 2018, popularity: 'high' },
      { title: 'bad guy', artist: 'Billie Eilish', genre: 'indie pop', year: 2019, popularity: 'high' },
      { title: 'Royals', artist: 'Lorde', genre: 'indie pop', year: 2013, popularity: 'high' },
      { title: 'Vroom Vroom', artist: 'Charli XCX', genre: 'electropop', year: 2016, popularity: 'medium' },
      { title: 'Run Away With Me', artist: 'Carly Rae Jepsen', genre: 'pop', year: 2015, popularity: 'medium' },
      { title: 'Without Me', artist: 'Halsey', genre: 'pop', year: 2018, popularity: 'high' }
    ],
    'hip hop': [
      { title: 'HUMBLE.', artist: 'Kendrick Lamar', genre: 'hip hop', year: 2017, popularity: 'high' },
      { title: 'God\'s Plan', artist: 'Drake', genre: 'hip hop', year: 2018, popularity: 'high' },
      { title: 'No Role Modelz', artist: 'J. Cole', genre: 'hip hop', year: 2014, popularity: 'high' },
      { title: 'SICKO MODE', artist: 'Travis Scott', genre: 'trap', year: 2018, popularity: 'high' },
      { title: 'EARFQUAKE', artist: 'Tyler, The Creator', genre: 'hip hop', year: 2019, popularity: 'high' },
      { title: 'Praise The Lord (Da Shine)', artist: 'A$AP Rocky', genre: 'hip hop', year: 2018, popularity: 'high' },
      { title: 'rockstar', artist: 'Post Malone', genre: 'hip hop', year: 2017, popularity: 'high' },
      { title: 'a lot', artist: '21 Savage', genre: 'trap', year: 2018, popularity: 'high' }
    ],
    'electronic': [
      { title: 'Get Lucky', artist: 'Daft Punk', genre: 'electronic', year: 2013, popularity: 'high' },
      { title: 'Go', artist: 'The Chemical Brothers', genre: 'electronic', year: 2015, popularity: 'medium' },
      { title: 'Windowlicker', artist: 'Aphex Twin', genre: 'ambient', year: 1999, popularity: 'medium' },
      { title: 'Two Thousand And Seventeen', artist: 'Four Tet', genre: 'electronic', year: 2017, popularity: 'medium' },
      { title: 'Never Catch Me', artist: 'Flying Lotus', genre: 'electronic', year: 2014, popularity: 'medium' },
      { title: 'Can\'t Do Without You', artist: 'Caribou', genre: 'electronic', year: 2014, popularity: 'medium' },
      { title: 'Gosh', artist: 'Jamie xx', genre: 'electronic', year: 2015, popularity: 'high' },
      { title: 'Latch', artist: 'Disclosure', genre: 'house', year: 2012, popularity: 'high' }
    ],
    'jazz': [
      { title: 'The Rhythm Changes', artist: 'Kamasi Washington', genre: 'jazz', year: 2015, popularity: 'medium' },
      { title: 'Ah Yeah', artist: 'Robert Glasper', genre: 'jazz', year: 2012, popularity: 'medium' },
      { title: 'I Can\'t Help It', artist: 'Esperanza Spalding', genre: 'jazz', year: 2010, popularity: 'medium' },
      { title: 'Litany Against Fear', artist: 'Christian Scott', genre: 'jazz', year: 2015, popularity: 'medium' },
      { title: 'Lingus', artist: 'Snarky Puppy', genre: 'jazz fusion', year: 2014, popularity: 'medium' },
      { title: 'In Your Eyes', artist: 'BADBADNOTGOOD', genre: 'jazz', year: 2014, popularity: 'medium' },
      { title: 'Hopopono', artist: 'GoGo Penguin', genre: 'jazz', year: 2014, popularity: 'medium' },
      { title: 'Summon The Fire', artist: 'The Comet Is Coming', genre: 'jazz', year: 2019, popularity: 'medium' }
    ],
    'indie': [
      { title: 'A-Punk', artist: 'Vampire Weekend', genre: 'indie pop', year: 2008, popularity: 'high' },
      { title: '1901', artist: 'Phoenix', genre: 'indie pop', year: 2009, popularity: 'high' },
      { title: 'Kids', artist: 'MGMT', genre: 'indie pop', year: 2007, popularity: 'high' },
      { title: 'Pumped Up Kicks', artist: 'Foster The People', genre: 'indie pop', year: 2011, popularity: 'high' },
      { title: 'What You Know', artist: 'Two Door Cinema Club', genre: 'indie pop', year: 2010, popularity: 'medium' },
      { title: 'Chocolate', artist: 'The 1975', genre: 'indie pop', year: 2013, popularity: 'high' },
      { title: 'Gooey', artist: 'Glass Animals', genre: 'indie pop', year: 2014, popularity: 'high' },
      { title: 'Breezeblocks', artist: 'Alt-J', genre: 'indie rock', year: 2012, popularity: 'high' }
    ],
    'r&b': [
      { title: 'Pink + White', artist: 'Frank Ocean', genre: 'r&b', year: 2016, popularity: 'high' },
      { title: 'Starboy', artist: 'The Weeknd', genre: 'r&b', year: 2016, popularity: 'high' },
      { title: 'Good Days', artist: 'SZA', genre: 'r&b', year: 2020, popularity: 'high' },
      { title: 'Focus', artist: 'H.E.R.', genre: 'r&b', year: 2016, popularity: 'high' },
      { title: 'Get You', artist: 'Daniel Caesar', genre: 'r&b', year: 2017, popularity: 'medium' },
      { title: 'Heartbreak Anniversary', artist: 'Giveon', genre: 'r&b', year: 2020, popularity: 'medium' },
      { title: 'Roll Some Mo', artist: 'Lucky Daye', genre: 'r&b', year: 2019, popularity: 'medium' },
      { title: 'I Want You Around', artist: 'Snoh Aalegra', genre: 'r&b', year: 2019, popularity: 'medium' }
    ]
  };

  // Obtener géneros dominantes
  const dominantGenres = topGenres.slice(0, 3).map(g => g.genre.toLowerCase());
  
  // Generar recomendaciones basadas en géneros dominantes
  dominantGenres.forEach(genre => {
    // Buscar canciones que coincidan con el género
    Object.entries(songDatabase).forEach(([category, songs]) => {
      if (genre.includes(category) || category.includes(genre)) {
        // Filtrar canciones de artistas que no están ya en la playlist
        const existingArtists = topArtists.map(a => a.name.toLowerCase());
        const newSongs = songs.filter(song => 
          !existingArtists.includes(song.artist.toLowerCase())
        );
        
        // Agregar hasta 2 canciones por género
        newSongs.slice(0, 2).forEach(song => {
          let reason = '';
          if (genreDiversity > 0.7) {
            reason = 'Perfect for your eclectic taste';
          } else if (song.popularity === 'high') {
            reason = 'Must-listen in your favorite genre';
          } else {
            reason = 'Hidden gem in your style';
          }
          
          recommendations.push({
            title: song.title,
            artist: song.artist,
            genre: song.genre,
            year: song.year,
            reason
          });
        });
      }
    });
  });

  // Si no hay suficientes recomendaciones, agregar canciones de géneros relacionados
  if (recommendations.length < 6) {
    const relatedGenres = ['indie', 'alternative', 'electronic'];
    for (const genre of relatedGenres) {
      if (!dominantGenres.some(dg => dg.includes(genre))) {
        const songs = songDatabase[genre] || [];
        const newSongs = songs.filter(song => 
          !recommendations.some(r => r.title === song.title && r.artist === song.artist) &&
          !topArtists.some(a => a.name.toLowerCase() === song.artist.toLowerCase())
        );
        
        newSongs.slice(0, 2).forEach(song => {
          recommendations.push({
            title: song.title,
            artist: song.artist,
            genre: song.genre,
            year: song.year,
            reason: 'Expand your musical horizons'
          });
        });
      }
    }
  }

  // Limitar a 8 recomendaciones y eliminar duplicados
  const uniqueRecommendations = recommendations
    .filter((rec, index, self) => 
      index === self.findIndex(r => r.title === rec.title && r.artist === rec.artist)
    )
    .slice(0, 8);

  return uniqueRecommendations;
}

async function generateRecommendations(
  topGenres: Array<{ genre: string; count: number; percentage: number }>,
  topArtists: Array<{ name: string; trackCount: number }>,
  mood: string,
  energy: number,
  genreDiversity: number,
  spotifyService: SpotifyService
) {
  const similarGenres: string[] = [];
  const moodSuggestions: string[] = [];

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
    recommendedArtists: generateArtistRecommendations(topGenres, topArtists, mood, genreDiversity),
    recommendedSongs: generateSongRecommendations(topGenres, topArtists, mood, genreDiversity),
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