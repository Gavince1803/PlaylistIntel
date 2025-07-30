export const translations = {
  en: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Dashboard
    welcomeBack: 'Welcome back',
    yourPlaylists: 'Your Playlists',
    analyzePlaylist: 'Analyze Playlist',
    genres: 'Genres',
    like: 'Like',
    share: 'Share',
    
    // Library
    musicLibrary: 'Music Library',
    analyzedProfiles: 'Analyzed Profiles',
    noProfilesYet: 'No profiles yet',
    startAnalyzing: 'Start analyzing your playlists to see them here',
    analyzedOn: 'Analyzed on',
    viewAnalysis: 'View Analysis',
    deleteProfile: 'Delete Profile',
    
    // Musical Profile
    musicalProfile: 'Musical Profile',
    recommendations: 'Recommendations',
    addToPlaylist: 'Add to Playlist',
    createPlaylist: 'Create Playlist',
    playlistName: 'Playlist Name',
    playlistDescription: 'Description (optional)',
    create: 'Create',
    searchPlaylists: 'Search playlists...',
    noPlaylistsFound: 'No playlists found',
    
    // Analytics
    analyticsDashboard: 'Analytics Dashboard',
    discoverInsights: 'Discover insights about your music taste',
    totalPlaylists: 'Total Playlists',
    totalTracks: 'Total Tracks',
    averageLength: 'Average Length',
    topGenres: 'Top Genres',
    favoriteArtists: 'Favorite Artists',
    moodDistribution: 'Mood Distribution',
    
    // Settings
    customizeExperience: 'Customize your experience',
    accountInformation: 'Account Information',
    preferences: 'Preferences',
    theme: 'Theme',
    language: 'Language',
    autoSaveProfiles: 'Auto-save Profiles',
    autoSaveDescription: 'Automatically save analyzed playlist profiles',
    saveSettings: 'Save Settings',
    settingsSaved: 'Settings saved successfully!',
    failedToSave: 'Failed to save settings',
    
    // Profile
    signOut: 'Sign Out',
    viewSpotifyProfile: 'View Spotify Profile',
    followers: 'Followers',
    settings: 'Settings',
    themeToggle: 'Theme',
    notifications: 'Notifications',
    moreSettings: 'More settings coming soon...',
    
    // Toast messages
    profileSaved: 'Profile saved to your library',
    playlistCreated: 'Playlist created successfully!',
    songAdded: 'Song added to playlist!',
    errorOccurred: 'An error occurred',
  },
  es: {
    // Common
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    back: 'Atrás',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    

    
    // Dashboard
    welcomeBack: 'Bienvenido de vuelta',
    yourPlaylists: 'Tus Playlists',
    analyzePlaylist: 'Analizar Playlist',
    genres: 'Géneros',
    like: 'Me gusta',
    share: 'Compartir',
    
    // Library
    musicLibrary: 'Biblioteca Musical',
    analyzedProfiles: 'Perfiles Analizados',
    noProfilesYet: 'Aún no hay perfiles',
    startAnalyzing: 'Comienza a analizar tus playlists para verlas aquí',
    analyzedOn: 'Analizado el',
    viewAnalysis: 'Ver Análisis',
    deleteProfile: 'Eliminar Perfil',
    
    // Musical Profile
    musicalProfile: 'Perfil Musical',
    recommendations: 'Recomendaciones',
    addToPlaylist: 'Añadir a Playlist',
    createPlaylist: 'Crear Playlist',
    playlistName: 'Nombre de Playlist',
    playlistDescription: 'Descripción (opcional)',
    create: 'Crear',
    searchPlaylists: 'Buscar playlists...',
    noPlaylistsFound: 'No se encontraron playlists',
    
    // Analytics
    analyticsDashboard: 'Dashboard de Analíticas',
    discoverInsights: 'Descubre insights sobre tu gusto musical',
    totalPlaylists: 'Total de Playlists',
    totalTracks: 'Total de Canciones',
    averageLength: 'Longitud Promedio',
    topGenres: 'Géneros Principales',
    favoriteArtists: 'Artistas Favoritos',
    moodDistribution: 'Distribución de Estados de Ánimo',
    
    // Settings
    customizeExperience: 'Personaliza tu experiencia',
    accountInformation: 'Información de Cuenta',
    preferences: 'Preferencias',
    theme: 'Tema',
    language: 'Idioma',
    autoSaveProfiles: 'Auto-guardar Perfiles',
    autoSaveDescription: 'Guardar automáticamente los perfiles de playlists analizadas',
    saveSettings: 'Guardar Configuración',
    settingsSaved: '¡Configuración guardada exitosamente!',
    failedToSave: 'Error al guardar la configuración',
    
    // Profile
    signOut: 'Cerrar Sesión',
    viewSpotifyProfile: 'Ver Perfil de Spotify',
    followers: 'Seguidores',
    settings: 'Configuración',
    themeToggle: 'Tema',
    notifications: 'Notificaciones',
    moreSettings: 'Más configuraciones próximamente...',
    
    // Toast messages
    profileSaved: 'Perfil guardado en tu biblioteca',
    playlistCreated: '¡Playlist creada exitosamente!',
    songAdded: '¡Canción añadida a la playlist!',
    errorOccurred: 'Ocurrió un error',
  }
};

export type Language = 'en' | 'es';
export type TranslationKey = keyof typeof translations.en;

import { useLanguage } from '@/components/Providers';

export function useTranslation() {
  const { language } = useLanguage();
  
  return {
    t: (key: TranslationKey): string => {
      return translations[language as 'en' | 'es']?.[key] || translations.en[key] || key;
    },
    language
  };
} 