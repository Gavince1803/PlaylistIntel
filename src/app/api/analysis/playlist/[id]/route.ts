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
    let audioFeaturesAvailable = false;
    
    try {
      const trackIds = tracks.map(track => track.id);
      console.log(`🎵 Fetching audio features for ${trackIds.length} tracks...`);
      audioFeatures = await spotifyService.getAudioFeatures(trackIds);
      console.log(`✅ Successfully fetched audio features for ${audioFeatures.length} tracks`);
      
      if (audioFeatures.length > 0) {
        audioFeaturesAvailable = true;
      audioFeatures.forEach(feature => {
        audioFeaturesMap[feature.id] = feature;
      });
      } else {
        console.log('⚠️ No audio features returned, using genre-based analysis');
      }
    } catch (error) {
      console.log('⚠️ Audio features not available (Spotify restriction), using genre-based analysis');
      audioFeaturesAvailable = false;
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

    if (audioFeaturesAvailable && audioFeatures.length > 0) {
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
        console.log('✅ Audio analysis completed with actual data');
      }
    } else {
      // Determinar mood basado en géneros si no hay audio features
      audioAnalysis.mood = determineMoodFromGenres(topGenres);
      console.log('⚠️ Using genre-based mood analysis due to audio features restriction');
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
  
  // Base de datos expandida de artistas populares por género
  const artistDatabase: Record<string, Array<{ name: string; genre: string; popularity: 'high' | 'medium' | 'low' }>> = {
    'rock': [
      { name: 'Arctic Monkeys', genre: 'indie rock', popularity: 'high' },
      { name: 'The Strokes', genre: 'indie rock', popularity: 'high' },
      { name: 'Foo Fighters', genre: 'alternative rock', popularity: 'high' },
      { name: 'Red Hot Chili Peppers', genre: 'alternative rock', popularity: 'high' },
      { name: 'Queens of the Stone Age', genre: 'stoner rock', popularity: 'medium' },
      { name: 'Tame Impala', genre: 'psychedelic rock', popularity: 'high' },
      { name: 'The Killers', genre: 'indie rock', popularity: 'high' },
      { name: 'Interpol', genre: 'post-punk', popularity: 'medium' },
      { name: 'Radiohead', genre: 'alternative rock', popularity: 'high' },
      { name: 'Muse', genre: 'alternative rock', popularity: 'high' },
      { name: 'Arcade Fire', genre: 'indie rock', popularity: 'high' },
      { name: 'The National', genre: 'indie rock', popularity: 'high' },
      { name: 'Vampire Weekend', genre: 'indie rock', popularity: 'high' },
      { name: 'The Black Keys', genre: 'blues rock', popularity: 'high' },
      { name: 'Cage The Elephant', genre: 'indie rock', popularity: 'high' },
      { name: 'Portugal. The Man', genre: 'indie rock', popularity: 'medium' },
      { name: 'Greta Van Fleet', genre: 'classic rock', popularity: 'medium' },
      { name: 'Royal Blood', genre: 'rock', popularity: 'medium' },
      { name: 'Nothing But Thieves', genre: 'alternative rock', popularity: 'medium' },
      { name: 'Wolf Alice', genre: 'indie rock', popularity: 'medium' }
    ],
    'pop': [
      { name: 'Dua Lipa', genre: 'pop', popularity: 'high' },
      { name: 'The Weeknd', genre: 'pop', popularity: 'high' },
      { name: 'Ariana Grande', genre: 'pop', popularity: 'high' },
      { name: 'Billie Eilish', genre: 'indie pop', popularity: 'high' },
      { name: 'Lorde', genre: 'indie pop', popularity: 'high' },
      { name: 'Charli XCX', genre: 'electropop', popularity: 'medium' },
      { name: 'Carly Rae Jepsen', genre: 'pop', popularity: 'medium' },
      { name: 'Halsey', genre: 'pop', popularity: 'high' },
      { name: 'Taylor Swift', genre: 'pop', popularity: 'high' },
      { name: 'Ed Sheeran', genre: 'pop', popularity: 'high' },
      { name: 'Shawn Mendes', genre: 'pop', popularity: 'high' },
      { name: 'Camila Cabello', genre: 'pop', popularity: 'high' },
      { name: 'Doja Cat', genre: 'pop', popularity: 'high' },
      { name: 'Megan Thee Stallion', genre: 'pop', popularity: 'high' },
      { name: 'Lizzo', genre: 'pop', popularity: 'high' },
      { name: 'Lana Del Rey', genre: 'indie pop', popularity: 'high' },
      { name: 'Florence + The Machine', genre: 'indie pop', popularity: 'high' },
      { name: 'HAIM', genre: 'indie pop', popularity: 'medium' },
      { name: 'Phoebe Bridgers', genre: 'indie pop', popularity: 'high' },
      { name: 'Clairo', genre: 'indie pop', popularity: 'medium' },
      { name: 'Beabadoobee', genre: 'indie pop', popularity: 'medium' }
    ],
    'hip hop': [
      { name: 'Kendrick Lamar', genre: 'hip hop', popularity: 'high' },
      { name: 'Drake', genre: 'hip hop', popularity: 'high' },
      { name: 'J. Cole', genre: 'hip hop', popularity: 'high' },
      { name: 'Travis Scott', genre: 'trap', popularity: 'high' },
      { name: 'Tyler, The Creator', genre: 'hip hop', popularity: 'high' },
      { name: 'A$AP Rocky', genre: 'hip hop', popularity: 'high' },
      { name: 'Post Malone', genre: 'hip hop', popularity: 'high' },
      { name: '21 Savage', genre: 'trap', popularity: 'high' },
      { name: 'Lil Baby', genre: 'trap', popularity: 'high' },
      { name: 'DaBaby', genre: 'hip hop', popularity: 'high' },
      { name: 'Roddy Ricch', genre: 'hip hop', popularity: 'high' },
      { name: 'Lil Uzi Vert', genre: 'trap', popularity: 'high' },
      { name: 'Playboi Carti', genre: 'trap', popularity: 'medium' },
      { name: 'YoungBoy Never Broke Again', genre: 'hip hop', popularity: 'high' },
      { name: 'Pop Smoke', genre: 'drill', popularity: 'high' },
      { name: 'Juice WRLD', genre: 'hip hop', popularity: 'high' },
      { name: 'Lil Peep', genre: 'emo rap', popularity: 'medium' },
      { name: 'XXXTentacion', genre: 'hip hop', popularity: 'high' },
      { name: 'Eminem', genre: 'hip hop', popularity: 'high' },
      { name: 'Logic', genre: 'hip hop', popularity: 'medium' },
      { name: 'NF', genre: 'hip hop', popularity: 'medium' }
    ],
    'electronic': [
      { name: 'Daft Punk', genre: 'electronic', popularity: 'high' },
      { name: 'The Chemical Brothers', genre: 'electronic', popularity: 'medium' },
      { name: 'Aphex Twin', genre: 'ambient', popularity: 'medium' },
      { name: 'Four Tet', genre: 'electronic', popularity: 'medium' },
      { name: 'Flying Lotus', genre: 'electronic', popularity: 'medium' },
      { name: 'Caribou', genre: 'electronic', popularity: 'medium' },
      { name: 'Jamie xx', genre: 'electronic', popularity: 'high' },
      { name: 'Disclosure', genre: 'house', popularity: 'high' },
      { name: 'Calvin Harris', genre: 'electronic', popularity: 'high' },
      { name: 'The Chainsmokers', genre: 'electronic', popularity: 'high' },
      { name: 'Marshmello', genre: 'electronic', popularity: 'high' },
      { name: 'Zedd', genre: 'electronic', popularity: 'high' },
      { name: 'Skrillex', genre: 'dubstep', popularity: 'high' },
      { name: 'Flume', genre: 'electronic', popularity: 'high' },
      { name: 'Odesza', genre: 'electronic', popularity: 'medium' },
      { name: 'Porter Robinson', genre: 'electronic', popularity: 'medium' },
      { name: 'Madeon', genre: 'electronic', popularity: 'medium' },
      { name: 'San Holo', genre: 'electronic', popularity: 'medium' },
      { name: 'Illenium', genre: 'electronic', popularity: 'medium' },
      { name: 'Gryffin', genre: 'electronic', popularity: 'medium' }
    ],
    'jazz': [
      { name: 'Kamasi Washington', genre: 'jazz', popularity: 'medium' },
      { name: 'Robert Glasper', genre: 'jazz', popularity: 'medium' },
      { name: 'Esperanza Spalding', genre: 'jazz', popularity: 'medium' },
      { name: 'Christian Scott', genre: 'jazz', popularity: 'medium' },
      { name: 'Snarky Puppy', genre: 'jazz fusion', popularity: 'medium' },
      { name: 'BADBADNOTGOOD', genre: 'jazz', popularity: 'medium' },
      { name: 'GoGo Penguin', genre: 'jazz', popularity: 'medium' },
      { name: 'The Comet Is Coming', genre: 'jazz', popularity: 'medium' },
      { name: 'Cory Henry', genre: 'jazz', popularity: 'medium' },
      { name: 'Jacob Collier', genre: 'jazz', popularity: 'medium' },
      { name: 'Cécile McLorin Salvant', genre: 'jazz', popularity: 'medium' },
      { name: 'Jose James', genre: 'jazz', popularity: 'medium' },
      { name: 'Gregory Porter', genre: 'jazz', popularity: 'medium' },
      { name: 'Diana Krall', genre: 'jazz', popularity: 'medium' },
      { name: 'Norah Jones', genre: 'jazz', popularity: 'high' },
      { name: 'Jamie Cullum', genre: 'jazz', popularity: 'medium' },
      { name: 'Michael Bublé', genre: 'jazz', popularity: 'high' },
      { name: 'Harry Connick Jr.', genre: 'jazz', popularity: 'medium' },
      { name: 'Diana Krall', genre: 'jazz', popularity: 'medium' },
      { name: 'Stacey Kent', genre: 'jazz', popularity: 'medium' }
    ],
    'indie': [
      { name: 'Vampire Weekend', genre: 'indie pop', popularity: 'high' },
      { name: 'Phoenix', genre: 'indie pop', popularity: 'high' },
      { name: 'MGMT', genre: 'indie pop', popularity: 'high' },
      { name: 'Foster The People', genre: 'indie pop', popularity: 'high' },
      { name: 'Two Door Cinema Club', genre: 'indie pop', popularity: 'medium' },
      { name: 'The 1975', genre: 'indie pop', popularity: 'high' },
      { name: 'Glass Animals', genre: 'indie pop', popularity: 'high' },
      { name: 'Alt-J', genre: 'indie rock', popularity: 'high' },
      { name: 'Arctic Monkeys', genre: 'indie rock', popularity: 'high' },
      { name: 'The Strokes', genre: 'indie rock', popularity: 'high' },
      { name: 'Tame Impala', genre: 'psychedelic rock', popularity: 'high' },
      { name: 'The Killers', genre: 'indie rock', popularity: 'high' },
      { name: 'Interpol', genre: 'post-punk', popularity: 'medium' },
      { name: 'Radiohead', genre: 'alternative rock', popularity: 'high' },
      { name: 'Muse', genre: 'alternative rock', popularity: 'high' },
      { name: 'Arcade Fire', genre: 'indie rock', popularity: 'high' },
      { name: 'The National', genre: 'indie rock', popularity: 'high' },
      { name: 'The Black Keys', genre: 'blues rock', popularity: 'high' },
      { name: 'Cage The Elephant', genre: 'indie rock', popularity: 'high' },
      { name: 'Portugal. The Man', genre: 'indie rock', popularity: 'medium' }
    ],
    'r&b': [
      { name: 'Frank Ocean', genre: 'r&b', popularity: 'high' },
      { name: 'The Weeknd', genre: 'r&b', popularity: 'high' },
      { name: 'SZA', genre: 'r&b', popularity: 'high' },
      { name: 'H.E.R.', genre: 'r&b', popularity: 'high' },
      { name: 'Daniel Caesar', genre: 'r&b', popularity: 'medium' },
      { name: 'Giveon', genre: 'r&b', popularity: 'medium' },
      { name: 'Lucky Daye', genre: 'r&b', popularity: 'medium' },
      { name: 'Snoh Aalegra', genre: 'r&b', popularity: 'medium' },
      { name: 'Brent Faiyaz', genre: 'r&b', popularity: 'medium' },
      { name: 'Summer Walker', genre: 'r&b', popularity: 'high' },
      { name: 'Jhené Aiko', genre: 'r&b', popularity: 'high' },
      { name: 'Ella Mai', genre: 'r&b', popularity: 'medium' },
      { name: 'Mahalia', genre: 'r&b', popularity: 'medium' },
      { name: 'Cleo Sol', genre: 'r&b', popularity: 'medium' },
      { name: 'Joyce Wrice', genre: 'r&b', popularity: 'medium' },
      { name: 'Victoria Monét', genre: 'r&b', popularity: 'medium' },
      { name: 'Tinashe', genre: 'r&b', popularity: 'medium' },
      { name: 'Kelela', genre: 'r&b', popularity: 'medium' },
      { name: 'FKA twigs', genre: 'r&b', popularity: 'medium' },
      { name: 'Solange', genre: 'r&b', popularity: 'medium' }
    ],
    'latin': [
      { name: 'Bad Bunny', genre: 'reggaeton', popularity: 'high' },
      { name: 'J Balvin', genre: 'reggaeton', popularity: 'high' },
      { name: 'Maluma', genre: 'reggaeton', popularity: 'high' },
      { name: 'Ozuna', genre: 'reggaeton', popularity: 'high' },
      { name: 'Anuel AA', genre: 'reggaeton', popularity: 'high' },
      { name: 'Karol G', genre: 'reggaeton', popularity: 'high' },
      { name: 'Natti Natasha', genre: 'reggaeton', popularity: 'medium' },
      { name: 'Becky G', genre: 'reggaeton', popularity: 'high' },
      { name: 'Rosalía', genre: 'flamenco', popularity: 'high' },
      { name: 'C. Tangana', genre: 'flamenco', popularity: 'medium' },
      { name: 'Bizarrap', genre: 'trap latino', popularity: 'high' },
      { name: 'Peso Pluma', genre: 'corridos', popularity: 'high' },
      { name: 'Natanael Cano', genre: 'corridos', popularity: 'medium' },
      { name: 'Junior H', genre: 'corridos', popularity: 'medium' },
      { name: 'Fuerza Regida', genre: 'corridos', popularity: 'medium' },
      { name: 'Grupo Frontera', genre: 'corridos', popularity: 'medium' },
      { name: 'Eslabon Armado', genre: 'corridos', popularity: 'medium' },
      { name: 'Los Ángeles Azules', genre: 'cumbia', popularity: 'medium' },
      { name: 'Café Tacvba', genre: 'rock en español', popularity: 'medium' },
      { name: 'Zoé', genre: 'rock en español', popularity: 'medium' }
    ],
    'kpop': [
      { name: 'BTS', genre: 'k-pop', popularity: 'high' },
      { name: 'BLACKPINK', genre: 'k-pop', popularity: 'high' },
      { name: 'TWICE', genre: 'k-pop', popularity: 'high' },
      { name: 'Red Velvet', genre: 'k-pop', popularity: 'high' },
      { name: 'EXO', genre: 'k-pop', popularity: 'high' },
      { name: 'NCT', genre: 'k-pop', popularity: 'high' },
      { name: 'Stray Kids', genre: 'k-pop', popularity: 'high' },
      { name: 'ITZY', genre: 'k-pop', popularity: 'high' },
      { name: 'aespa', genre: 'k-pop', popularity: 'high' },
      { name: 'NewJeans', genre: 'k-pop', popularity: 'high' },
      { name: 'IVE', genre: 'k-pop', popularity: 'high' },
      { name: 'LE SSERAFIM', genre: 'k-pop', popularity: 'high' },
      { name: 'SEVENTEEN', genre: 'k-pop', popularity: 'high' },
      { name: 'TXT', genre: 'k-pop', popularity: 'high' },
      { name: 'ENHYPEN', genre: 'k-pop', popularity: 'high' },
      { name: 'ATEEZ', genre: 'k-pop', popularity: 'high' },
      { name: 'The Boyz', genre: 'k-pop', popularity: 'medium' },
      { name: 'STAYC', genre: 'k-pop', popularity: 'medium' },
      { name: 'fromis_9', genre: 'k-pop', popularity: 'medium' },
      { name: 'Weeekly', genre: 'k-pop', popularity: 'medium' }
    ],
    'country': [
      { name: 'Luke Combs', genre: 'country', popularity: 'high' },
      { name: 'Morgan Wallen', genre: 'country', popularity: 'high' },
      { name: 'Zach Bryan', genre: 'country', popularity: 'high' },
      { name: 'Jason Aldean', genre: 'country', popularity: 'high' },
      { name: 'Florida Georgia Line', genre: 'country', popularity: 'high' },
      { name: 'Dan + Shay', genre: 'country', popularity: 'high' },
      { name: 'Thomas Rhett', genre: 'country', popularity: 'high' },
      { name: 'Kane Brown', genre: 'country', popularity: 'high' },
      { name: 'Maren Morris', genre: 'country', popularity: 'high' },
      { name: 'Kelsea Ballerini', genre: 'country', popularity: 'high' },
      { name: 'Carly Pearce', genre: 'country', popularity: 'medium' },
      { name: 'Ashley McBryde', genre: 'country', popularity: 'medium' },
      { name: 'Brandi Carlile', genre: 'country', popularity: 'medium' },
      { name: 'Chris Stapleton', genre: 'country', popularity: 'high' },
      { name: 'Eric Church', genre: 'country', popularity: 'high' },
      { name: 'Miranda Lambert', genre: 'country', popularity: 'high' },
      { name: 'Carrie Underwood', genre: 'country', popularity: 'high' },
      { name: 'Blake Shelton', genre: 'country', popularity: 'high' },
      { name: 'Luke Bryan', genre: 'country', popularity: 'high' },
      { name: 'Keith Urban', genre: 'country', popularity: 'high' }
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
  
  // Base de datos expandida de canciones populares por género
  const songDatabase: Record<string, Array<{ title: string; artist: string; genre: string; year: number; popularity: 'high' | 'medium' | 'low' }>> = {
    'rock': [
      { title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', genre: 'indie rock', year: 2013, popularity: 'high' },
      { title: 'Last Nite', artist: 'The Strokes', genre: 'indie rock', year: 2001, popularity: 'high' },
      { title: 'Everlong', artist: 'Foo Fighters', genre: 'alternative rock', year: 1997, popularity: 'high' },
      { title: 'Californication', artist: 'Red Hot Chili Peppers', genre: 'alternative rock', year: 1999, popularity: 'high' },
      { title: 'No One Knows', artist: 'Queens of the Stone Age', genre: 'stoner rock', year: 2002, popularity: 'medium' },
      { title: 'The Less I Know The Better', artist: 'Tame Impala', genre: 'psychedelic rock', year: 2015, popularity: 'high' },
      { title: 'Mr. Brightside', artist: 'The Killers', genre: 'indie rock', year: 2004, popularity: 'high' },
      { title: 'Obstacle 1', artist: 'Interpol', genre: 'post-punk', year: 2002, popularity: 'medium' },
      { title: 'Creep', artist: 'Radiohead', genre: 'alternative rock', year: 1993, popularity: 'high' },
      { title: 'Uprising', artist: 'Muse', genre: 'alternative rock', year: 2009, popularity: 'high' },
      { title: 'Wake Up', artist: 'Arcade Fire', genre: 'indie rock', year: 2004, popularity: 'high' },
      { title: 'Bloodbuzz Ohio', artist: 'The National', genre: 'indie rock', year: 2010, popularity: 'high' },
      { title: 'Lonely Boy', artist: 'The Black Keys', genre: 'blues rock', year: 2011, popularity: 'high' },
      { title: 'Ain\'t No Rest for the Wicked', artist: 'Cage The Elephant', genre: 'indie rock', year: 2008, popularity: 'high' },
      { title: 'Feel It Still', artist: 'Portugal. The Man', genre: 'indie rock', year: 2017, popularity: 'high' },
      { title: 'Highway Tune', artist: 'Greta Van Fleet', genre: 'classic rock', year: 2017, popularity: 'medium' },
      { title: 'Figure It Out', artist: 'Royal Blood', genre: 'rock', year: 2014, popularity: 'medium' },
      { title: 'Amsterdam', artist: 'Nothing But Thieves', genre: 'alternative rock', year: 2015, popularity: 'medium' },
      { title: 'Bros', artist: 'Wolf Alice', genre: 'indie rock', year: 2015, popularity: 'medium' },
      { title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'classic rock', year: 1975, popularity: 'high' },
      { title: 'Stairway to Heaven', artist: 'Led Zeppelin', genre: 'classic rock', year: 1971, popularity: 'high' }
    ],
    'pop': [
      { title: 'Levitating', artist: 'Dua Lipa', genre: 'pop', year: 2020, popularity: 'high' },
      { title: 'Blinding Lights', artist: 'The Weeknd', genre: 'pop', year: 2019, popularity: 'high' },
      { title: 'thank u, next', artist: 'Ariana Grande', genre: 'pop', year: 2018, popularity: 'high' },
      { title: 'bad guy', artist: 'Billie Eilish', genre: 'indie pop', year: 2019, popularity: 'high' },
      { title: 'Royals', artist: 'Lorde', genre: 'indie pop', year: 2013, popularity: 'high' },
      { title: 'Vroom Vroom', artist: 'Charli XCX', genre: 'electropop', year: 2016, popularity: 'medium' },
      { title: 'Run Away With Me', artist: 'Carly Rae Jepsen', genre: 'pop', year: 2015, popularity: 'medium' },
      { title: 'Without Me', artist: 'Halsey', genre: 'pop', year: 2018, popularity: 'high' },
      { title: 'Shake It Off', artist: 'Taylor Swift', genre: 'pop', year: 2014, popularity: 'high' },
      { title: 'Shape of You', artist: 'Ed Sheeran', genre: 'pop', year: 2017, popularity: 'high' },
      { title: 'Senorita', artist: 'Shawn Mendes', genre: 'pop', year: 2019, popularity: 'high' },
      { title: 'Havana', artist: 'Camila Cabello', genre: 'pop', year: 2017, popularity: 'high' },
      { title: 'Say So', artist: 'Doja Cat', genre: 'pop', year: 2020, popularity: 'high' },
      { title: 'Savage', artist: 'Megan Thee Stallion', genre: 'pop', year: 2020, popularity: 'high' },
      { title: 'Truth Hurts', artist: 'Lizzo', genre: 'pop', year: 2017, popularity: 'high' },
      { title: 'Video Games', artist: 'Lana Del Rey', genre: 'indie pop', year: 2011, popularity: 'high' },
      { title: 'Dog Days Are Over', artist: 'Florence + The Machine', genre: 'indie pop', year: 2008, popularity: 'high' },
      { title: 'The Wire', artist: 'HAIM', genre: 'indie pop', year: 2013, popularity: 'medium' },
      { title: 'Motion Sickness', artist: 'Phoebe Bridgers', genre: 'indie pop', year: 2017, popularity: 'high' },
      { title: 'Sofia', artist: 'Clairo', genre: 'indie pop', year: 2019, popularity: 'medium' },
      { title: 'Coffee', artist: 'Beabadoobee', genre: 'indie pop', year: 2017, popularity: 'medium' }
    ],
    'hip hop': [
      { title: 'HUMBLE.', artist: 'Kendrick Lamar', genre: 'hip hop', year: 2017, popularity: 'high' },
      { title: 'God\'s Plan', artist: 'Drake', genre: 'hip hop', year: 2018, popularity: 'high' },
      { title: 'No Role Modelz', artist: 'J. Cole', genre: 'hip hop', year: 2014, popularity: 'high' },
      { title: 'SICKO MODE', artist: 'Travis Scott', genre: 'trap', year: 2018, popularity: 'high' },
      { title: 'EARFQUAKE', artist: 'Tyler, The Creator', genre: 'hip hop', year: 2019, popularity: 'high' },
      { title: 'Praise The Lord (Da Shine)', artist: 'A$AP Rocky', genre: 'hip hop', year: 2018, popularity: 'high' },
      { title: 'rockstar', artist: 'Post Malone', genre: 'hip hop', year: 2017, popularity: 'high' },
      { title: 'a lot', artist: '21 Savage', genre: 'trap', year: 2018, popularity: 'high' },
      { title: 'Drip Too Hard', artist: 'Lil Baby', genre: 'trap', year: 2018, popularity: 'high' },
      { title: 'Suge', artist: 'DaBaby', genre: 'hip hop', year: 2019, popularity: 'high' },
      { title: 'The Box', artist: 'Roddy Ricch', genre: 'hip hop', year: 2019, popularity: 'high' },
      { title: 'XO Tour Llif3', artist: 'Lil Uzi Vert', genre: 'trap', year: 2017, popularity: 'high' },
      { title: 'Magnolia', artist: 'Playboi Carti', genre: 'trap', year: 2017, popularity: 'medium' },
      { title: 'Outside Today', artist: 'YoungBoy Never Broke Again', genre: 'hip hop', year: 2018, popularity: 'high' },
      { title: 'Welcome to the Party', artist: 'Pop Smoke', genre: 'drill', year: 2019, popularity: 'high' },
      { title: 'Lucid Dreams', artist: 'Juice WRLD', genre: 'hip hop', year: 2018, popularity: 'high' },
      { title: 'Save That Shit', artist: 'Lil Peep', genre: 'emo rap', year: 2017, popularity: 'medium' },
      { title: 'Look at Me!', artist: 'XXXTentacion', genre: 'hip hop', year: 2017, popularity: 'high' },
      { title: 'Lose Yourself', artist: 'Eminem', genre: 'hip hop', year: 2002, popularity: 'high' },
      { title: '1-800-273-8255', artist: 'Logic', genre: 'hip hop', year: 2017, popularity: 'high' },
      { title: 'Let You Down', artist: 'NF', genre: 'hip hop', year: 2017, popularity: 'medium' }
    ],
    'electronic': [
      { title: 'Get Lucky', artist: 'Daft Punk', genre: 'electronic', year: 2013, popularity: 'high' },
      { title: 'Go', artist: 'The Chemical Brothers', genre: 'electronic', year: 2015, popularity: 'medium' },
      { title: 'Windowlicker', artist: 'Aphex Twin', genre: 'ambient', year: 1999, popularity: 'medium' },
      { title: 'Two Thousand And Seventeen', artist: 'Four Tet', genre: 'electronic', year: 2017, popularity: 'medium' },
      { title: 'Never Catch Me', artist: 'Flying Lotus', genre: 'electronic', year: 2014, popularity: 'medium' },
      { title: 'Can\'t Do Without You', artist: 'Caribou', genre: 'electronic', year: 2014, popularity: 'medium' },
      { title: 'Gosh', artist: 'Jamie xx', genre: 'electronic', year: 2015, popularity: 'high' },
      { title: 'Latch', artist: 'Disclosure', genre: 'house', year: 2012, popularity: 'high' },
      { title: 'This Is What You Came For', artist: 'Calvin Harris', genre: 'electronic', year: 2016, popularity: 'high' },
      { title: 'Closer', artist: 'The Chainsmokers', genre: 'electronic', year: 2016, popularity: 'high' },
      { title: 'Alone', artist: 'Marshmello', genre: 'electronic', year: 2016, popularity: 'high' },
      { title: 'Stay', artist: 'Zedd', genre: 'electronic', year: 2017, popularity: 'high' },
      { title: 'Bangarang', artist: 'Skrillex', genre: 'dubstep', year: 2011, popularity: 'high' },
      { title: 'Never Be Like You', artist: 'Flume', genre: 'electronic', year: 2016, popularity: 'high' },
      { title: 'Say My Name', artist: 'Odesza', genre: 'electronic', year: 2014, popularity: 'medium' },
      { title: 'Language', artist: 'Porter Robinson', genre: 'electronic', year: 2012, popularity: 'medium' },
      { title: 'Shelter', artist: 'Madeon', genre: 'electronic', year: 2016, popularity: 'medium' },
      { title: 'Light', artist: 'San Holo', genre: 'electronic', year: 2016, popularity: 'medium' },
      { title: 'Fractures', artist: 'Illenium', genre: 'electronic', year: 2016, popularity: 'medium' },
      { title: 'Tie Me Down', artist: 'Gryffin', genre: 'electronic', year: 2018, popularity: 'medium' }
    ],
    'jazz': [
      { title: 'The Rhythm Changes', artist: 'Kamasi Washington', genre: 'jazz', year: 2015, popularity: 'medium' },
      { title: 'Ah Yeah', artist: 'Robert Glasper', genre: 'jazz', year: 2012, popularity: 'medium' },
      { title: 'I Can\'t Help It', artist: 'Esperanza Spalding', genre: 'jazz', year: 2010, popularity: 'medium' },
      { title: 'Litany Against Fear', artist: 'Christian Scott', genre: 'jazz', year: 2015, popularity: 'medium' },
      { title: 'Lingus', artist: 'Snarky Puppy', genre: 'jazz fusion', year: 2014, popularity: 'medium' },
      { title: 'In Your Eyes', artist: 'BADBADNOTGOOD', genre: 'jazz', year: 2014, popularity: 'medium' },
      { title: 'Hopopono', artist: 'GoGo Penguin', genre: 'jazz', year: 2014, popularity: 'medium' },
      { title: 'Summon The Fire', artist: 'The Comet Is Coming', genre: 'jazz', year: 2019, popularity: 'medium' },
      { title: 'Don\'t Know Why', artist: 'Norah Jones', genre: 'jazz', year: 2002, popularity: 'high' },
      { title: 'Home', artist: 'Michael Bublé', genre: 'jazz', year: 2005, popularity: 'high' },
      { title: 'It Had to Be You', artist: 'Harry Connick Jr.', genre: 'jazz', year: 1989, popularity: 'medium' },
      { title: 'The Look of Love', artist: 'Diana Krall', genre: 'jazz', year: 2001, popularity: 'medium' },
      { title: 'It\'s Wonderful', artist: 'Stacey Kent', genre: 'jazz', year: 2007, popularity: 'medium' },
      { title: 'Take Five', artist: 'Dave Brubeck', genre: 'jazz', year: 1959, popularity: 'high' },
      { title: 'So What', artist: 'Miles Davis', genre: 'jazz', year: 1959, popularity: 'high' },
      { title: 'What a Wonderful World', artist: 'Louis Armstrong', genre: 'jazz', year: 1967, popularity: 'high' },
      { title: 'Take the A Train', artist: 'Duke Ellington', genre: 'jazz', year: 1941, popularity: 'high' },
      { title: 'My Favorite Things', artist: 'John Coltrane', genre: 'jazz', year: 1961, popularity: 'high' },
      { title: 'Blue in Green', artist: 'Bill Evans', genre: 'jazz', year: 1959, popularity: 'medium' },
      { title: 'Giant Steps', artist: 'John Coltrane', genre: 'jazz', year: 1960, popularity: 'medium' }
    ],
    'indie': [
      { title: 'A-Punk', artist: 'Vampire Weekend', genre: 'indie pop', year: 2008, popularity: 'high' },
      { title: '1901', artist: 'Phoenix', genre: 'indie pop', year: 2009, popularity: 'high' },
      { title: 'Kids', artist: 'MGMT', genre: 'indie pop', year: 2007, popularity: 'high' },
      { title: 'Pumped Up Kicks', artist: 'Foster The People', genre: 'indie pop', year: 2011, popularity: 'high' },
      { title: 'What You Know', artist: 'Two Door Cinema Club', genre: 'indie pop', year: 2010, popularity: 'medium' },
      { title: 'Chocolate', artist: 'The 1975', genre: 'indie pop', year: 2013, popularity: 'high' },
      { title: 'Gooey', artist: 'Glass Animals', genre: 'indie pop', year: 2014, popularity: 'high' },
      { title: 'Breezeblocks', artist: 'Alt-J', genre: 'indie rock', year: 2012, popularity: 'high' },
      { title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', genre: 'indie rock', year: 2013, popularity: 'high' },
      { title: 'Last Nite', artist: 'The Strokes', genre: 'indie rock', year: 2001, popularity: 'high' },
      { title: 'The Less I Know The Better', artist: 'Tame Impala', genre: 'psychedelic rock', year: 2015, popularity: 'high' },
      { title: 'Mr. Brightside', artist: 'The Killers', genre: 'indie rock', year: 2004, popularity: 'high' },
      { title: 'Creep', artist: 'Radiohead', genre: 'alternative rock', year: 1993, popularity: 'high' },
      { title: 'Uprising', artist: 'Muse', genre: 'alternative rock', year: 2009, popularity: 'high' },
      { title: 'Wake Up', artist: 'Arcade Fire', genre: 'indie rock', year: 2004, popularity: 'high' },
      { title: 'Bloodbuzz Ohio', artist: 'The National', genre: 'indie rock', year: 2010, popularity: 'high' },
      { title: 'Lonely Boy', artist: 'The Black Keys', genre: 'blues rock', year: 2011, popularity: 'high' },
      { title: 'Ain\'t No Rest for the Wicked', artist: 'Cage The Elephant', genre: 'indie rock', year: 2008, popularity: 'high' },
      { title: 'Feel It Still', artist: 'Portugal. The Man', genre: 'indie rock', year: 2017, popularity: 'high' }
    ],
    'r&b': [
      { title: 'Pink + White', artist: 'Frank Ocean', genre: 'r&b', year: 2016, popularity: 'high' },
      { title: 'Starboy', artist: 'The Weeknd', genre: 'r&b', year: 2016, popularity: 'high' },
      { title: 'Good Days', artist: 'SZA', genre: 'r&b', year: 2020, popularity: 'high' },
      { title: 'Focus', artist: 'H.E.R.', genre: 'r&b', year: 2016, popularity: 'high' },
      { title: 'Get You', artist: 'Daniel Caesar', genre: 'r&b', year: 2017, popularity: 'medium' },
      { title: 'Heartbreak Anniversary', artist: 'Giveon', genre: 'r&b', year: 2020, popularity: 'medium' },
      { title: 'Roll Some Mo', artist: 'Lucky Daye', genre: 'r&b', year: 2019, popularity: 'medium' },
      { title: 'I Want You Around', artist: 'Snoh Aalegra', genre: 'r&b', year: 2019, popularity: 'medium' },
      { title: 'Dead Man Walking', artist: 'Brent Faiyaz', genre: 'r&b', year: 2020, popularity: 'medium' },
      { title: 'Girls Need Love', artist: 'Summer Walker', genre: 'r&b', year: 2018, popularity: 'high' },
      { title: 'The Worst', artist: 'Jhené Aiko', genre: 'r&b', year: 2013, popularity: 'high' },
      { title: 'Boo\'d Up', artist: 'Ella Mai', genre: 'r&b', year: 2017, popularity: 'medium' },
      { title: 'Sober', artist: 'Mahalia', genre: 'r&b', year: 2018, popularity: 'medium' },
      { title: 'Why Don\'t You Love Me', artist: 'Cleo Sol', genre: 'r&b', year: 2020, popularity: 'medium' },
      { title: 'So So Sick', artist: 'Joyce Wrice', genre: 'r&b', year: 2021, popularity: 'medium' },
      { title: 'Moment', artist: 'Victoria Monét', genre: 'r&b', year: 2020, popularity: 'medium' },
      { title: '2 On', artist: 'Tinashe', genre: 'r&b', year: 2014, popularity: 'medium' },
      { title: 'LMK', artist: 'Kelela', genre: 'r&b', year: 2017, popularity: 'medium' },
      { title: 'Two Weeks', artist: 'FKA twigs', genre: 'r&b', year: 2014, popularity: 'medium' },
      { title: 'Cranes in the Sky', artist: 'Solange', genre: 'r&b', year: 2016, popularity: 'medium' }
    ],
    'latin': [
      { title: 'Me Porto Bonito', artist: 'Bad Bunny', genre: 'reggaeton', year: 2022, popularity: 'high' },
      { title: 'Mi Gente', artist: 'J Balvin', genre: 'reggaeton', year: 2017, popularity: 'high' },
      { title: 'Felices los 4', artist: 'Maluma', genre: 'reggaeton', year: 2017, popularity: 'high' },
      { title: 'Taki Taki', artist: 'Ozuna', genre: 'reggaeton', year: 2018, popularity: 'high' },
      { title: 'China', artist: 'Anuel AA', genre: 'reggaeton', year: 2019, popularity: 'high' },
      { title: 'Tusa', artist: 'Karol G', genre: 'reggaeton', year: 2019, popularity: 'high' },
      { title: 'Criminal', artist: 'Natti Natasha', genre: 'reggaeton', year: 2017, popularity: 'medium' },
      { title: 'Mayores', artist: 'Becky G', genre: 'reggaeton', year: 2017, popularity: 'high' },
      { title: 'Malamente', artist: 'Rosalía', genre: 'flamenco', year: 2018, popularity: 'high' },
      { title: 'Los Tontos', artist: 'C. Tangana', genre: 'flamenco', year: 2021, popularity: 'medium' },
      { title: 'Bzrp Music Sessions #53', artist: 'Bizarrap', genre: 'trap latino', year: 2022, popularity: 'high' },
      { title: 'Ella Baila Sola', artist: 'Peso Pluma', genre: 'corridos', year: 2023, popularity: 'high' },
      { title: 'Amor Tumbado', artist: 'Natanael Cano', genre: 'corridos', year: 2019, popularity: 'medium' },
      { title: 'El Azul', artist: 'Junior H', genre: 'corridos', year: 2022, popularity: 'medium' },
      { title: 'Bebe Dame', artist: 'Fuerza Regida', genre: 'corridos', year: 2023, popularity: 'medium' },
      { title: 'No Se Va', artist: 'Grupo Frontera', genre: 'corridos', year: 2022, popularity: 'medium' },
      { title: 'Jugaste y Sufrí', artist: 'Eslabon Armado', genre: 'corridos', year: 2020, popularity: 'medium' },
      { title: 'Como Te Voy a Olvidar', artist: 'Los Ángeles Azules', genre: 'cumbia', year: 1996, popularity: 'medium' },
      { title: 'Eres', artist: 'Café Tacvba', genre: 'rock en español', year: 2003, popularity: 'medium' },
      { title: 'Soñé', artist: 'Zoé', genre: 'rock en español', year: 2006, popularity: 'medium' }
    ],
    'kpop': [
      { title: 'Dynamite', artist: 'BTS', genre: 'k-pop', year: 2020, popularity: 'high' },
      { title: 'DDU-DU DDU-DU', artist: 'BLACKPINK', genre: 'k-pop', year: 2018, popularity: 'high' },
      { title: 'Fancy', artist: 'TWICE', genre: 'k-pop', year: 2019, popularity: 'high' },
      { title: 'Red Flavor', artist: 'Red Velvet', genre: 'k-pop', year: 2017, popularity: 'high' },
      { title: 'Love Shot', artist: 'EXO', genre: 'k-pop', year: 2018, popularity: 'high' },
      { title: 'Kick Back', artist: 'NCT', genre: 'k-pop', year: 2021, popularity: 'high' },
      { title: 'God\'s Menu', artist: 'Stray Kids', genre: 'k-pop', year: 2020, popularity: 'high' },
      { title: 'Wannabe', artist: 'ITZY', genre: 'k-pop', year: 2020, popularity: 'high' },
      { title: 'Next Level', artist: 'aespa', genre: 'k-pop', year: 2021, popularity: 'high' },
      { title: 'Hype Boy', artist: 'NewJeans', genre: 'k-pop', year: 2022, popularity: 'high' },
      { title: 'After LIKE', artist: 'IVE', genre: 'k-pop', year: 2022, popularity: 'high' },
      { title: 'UNFORGIVEN', artist: 'LE SSERAFIM', genre: 'k-pop', year: 2023, popularity: 'high' },
      { title: 'Super', artist: 'SEVENTEEN', genre: 'k-pop', year: 2023, popularity: 'high' },
      { title: 'Sugar Rush Ride', artist: 'TXT', genre: 'k-pop', year: 2023, popularity: 'high' },
      { title: 'Bite Me', artist: 'ENHYPEN', genre: 'k-pop', year: 2023, popularity: 'high' },
      { title: 'Bouncy', artist: 'ATEEZ', genre: 'k-pop', year: 2023, popularity: 'high' },
      { title: 'Thrill Ride', artist: 'The Boyz', genre: 'k-pop', year: 2021, popularity: 'medium' },
      { title: 'ASAP', artist: 'STAYC', genre: 'k-pop', year: 2021, popularity: 'medium' },
      { title: 'DM', artist: 'fromis_9', genre: 'k-pop', year: 2022, popularity: 'medium' },
      { title: 'After School', artist: 'Weeekly', genre: 'k-pop', year: 2021, popularity: 'medium' }
    ],
    'country': [
      { title: 'Beautiful Crazy', artist: 'Luke Combs', genre: 'country', year: 2018, popularity: 'high' },
      { title: 'Whiskey Glasses', artist: 'Morgan Wallen', genre: 'country', year: 2018, popularity: 'high' },
      { title: 'Something in the Orange', artist: 'Zach Bryan', genre: 'country', year: 2022, popularity: 'high' },
      { title: 'Dirt Road Anthem', artist: 'Jason Aldean', genre: 'country', year: 2011, popularity: 'high' },
      { title: 'Cruise', artist: 'Florida Georgia Line', genre: 'country', year: 2012, popularity: 'high' },
      { title: 'Tequila', artist: 'Dan + Shay', genre: 'country', year: 2018, popularity: 'high' },
      { title: 'Die a Happy Man', artist: 'Thomas Rhett', genre: 'country', year: 2015, popularity: 'high' },
      { title: 'Heaven', artist: 'Kane Brown', genre: 'country', year: 2019, popularity: 'high' },
      { title: 'The Bones', artist: 'Maren Morris', genre: 'country', year: 2019, popularity: 'high' },
      { title: 'Peter Pan', artist: 'Kelsea Ballerini', genre: 'country', year: 2016, popularity: 'high' },
      { title: 'Every Little Thing', artist: 'Carly Pearce', genre: 'country', year: 2017, popularity: 'medium' },
      { title: 'A Little Dive Bar in Dahlonega', artist: 'Ashley McBryde', genre: 'country', year: 2017, popularity: 'medium' },
      { title: 'The Joke', artist: 'Brandi Carlile', genre: 'country', year: 2018, popularity: 'medium' },
      { title: 'Tennessee Whiskey', artist: 'Chris Stapleton', genre: 'country', year: 2015, popularity: 'high' },
      { title: 'Springsteen', artist: 'Eric Church', genre: 'country', year: 2011, popularity: 'high' },
      { title: 'The House That Built Me', artist: 'Miranda Lambert', genre: 'country', year: 2010, popularity: 'high' },
      { title: 'Before He Cheats', artist: 'Carrie Underwood', genre: 'country', year: 2006, popularity: 'high' },
      { title: 'Honey Bee', artist: 'Blake Shelton', genre: 'country', year: 2011, popularity: 'high' },
      { title: 'Country Girl (Shake It for Me)', artist: 'Luke Bryan', genre: 'country', year: 2011, popularity: 'high' },
      { title: 'Somebody Like You', artist: 'Keith Urban', genre: 'country', year: 2002, popularity: 'high' }
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