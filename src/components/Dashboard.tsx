'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Sidebar from './Sidebar';
import Header from './Header';
import PlaylistGrid from './PlaylistGrid';
import MobilePlaylistView from './MobilePlaylistView';
import { useToast } from './Toast';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, status } = useSession();
  const [showSignIn, setShowSignIn] = useState(false);
  const { showToast } = useToast();

  // Debug logging for session data
  console.log('🔍 Dashboard - Session data:', {
    user: session?.user,
    product: session?.user?.product,
    name: session?.user?.name,
    email: session?.user?.email,
    status: status,
    showSignIn: showSignIn
  });

  // Log authentication flow
  if (status === 'unauthenticated') {
    console.log('🚫 User is unauthenticated - showing sign-in modal');
  } else if (status === 'authenticated') {
    console.log('✅ User is authenticated - showing dashboard');
  } else if (status === 'loading') {
    console.log('⏳ Authentication status is loading...');
  }

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex h-screen font-sans items-center justify-center bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold">Loading your musical experience...</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-[#1DB954] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-[#1DB954] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-[#1DB954] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in modal if not authenticated or if requested
  if (status === 'unauthenticated') {
    return (
      <div className="flex h-screen font-sans items-center justify-center bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954]">
        <div className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-3xl p-8 lg:p-12 shadow-2xl border border-[#1DB954]/20 text-center max-w-md w-full mx-4 animate-fade-in-down">
          <div className="w-20 h-20 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-4 tracking-tight">Welcome to PlaylistIntel! 🎵</h1>
          <p className="text-gray-300 mb-8 text-lg leading-relaxed">
            Connect your Spotify account to analyze your playlists and discover powerful music insights
          </p>
          <button
            onClick={() => signIn('spotify')}
            className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1DB954] text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl w-full transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Connect with Spotify
            </span>
          </button>
          <button
            onClick={() => setShowSignIn(false)}
            className="mt-6 text-gray-400 hover:text-white underline transition-colors duration-200 font-medium"
          >
            Continue without connecting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen font-sans bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954]">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 custom-scrollbar pt-20 lg:pt-24">
          <div className="max-w-7xl mx-auto">
            {/* Welcome section */}
            <section className="mb-6 lg:mb-12">
              <div className="bg-gradient-to-r from-[#1DB954]/10 to-[#1ed760]/10 rounded-2xl lg:rounded-3xl p-4 lg:p-8 border border-[#1DB954]/20">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-12 h-12 rounded-full border-2 border-[#1DB954]/30 shadow-lg self-start sm:self-center"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center self-start sm:self-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-1 tracking-tight">
                      Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}! 🎵
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <p className="text-base lg:text-lg text-gray-300">Discover insights about your music taste and analyze your playlists</p>
                      {session?.user?.product && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-center ${
                          session.user.product === 'premium' 
                            ? 'bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-white' 
                            : 'bg-gray-600 text-gray-200'
                        }`}>
                          {session.user.product.charAt(0).toUpperCase() + session.user.product.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:gap-3 mt-4 lg:mt-6">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#232323]/30 rounded-lg border border-[#282828]/50">
                    <svg className="w-3 h-3 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-gray-300 text-xs">Analyze Playlists</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#232323]/30 rounded-lg border border-[#282828]/50">
                    <svg className="w-3 h-3 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-gray-300 text-xs">Discover Music</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#232323]/30 rounded-lg border border-[#282828]/50">
                    <svg className="w-3 h-3 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-gray-300 text-xs">Discover Music</span>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Playlists section */}
            <section data-section="playlists" className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
              <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl lg:text-3xl font-bold text-white">Your Playlists</h2>
                    <p className="text-gray-400 text-sm lg:text-base mt-1">Analyze your music taste and discover insights</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-yellow-400 text-xs font-medium">Rate limiting active - using cached data</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile view for small screens */}
              <div className="block lg:hidden">
                <MobilePlaylistView />
              </div>
              
              {/* Desktop view for larger screens */}
              <div className="hidden lg:block">
                <PlaylistGrid />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
} 