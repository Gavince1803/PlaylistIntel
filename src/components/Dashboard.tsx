'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Sidebar from './Sidebar';
import Header from './Header';
import PlaylistGrid from './PlaylistGrid';
import { useToast } from './Toast';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, status } = useSession();
  const [showSignIn, setShowSignIn] = useState(false);
  const { showToast } = useToast();

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] font-sans items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show sign-in modal if requested
  if (showSignIn) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] font-sans items-center justify-center">
        <div className="bg-[#232323] rounded-2xl p-12 shadow-2xl border border-[#282828] text-center max-w-md w-full mx-4">
          <div className="w-20 h-20 bg-[#1DB954] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to Playlister</h1>
          <p className="text-gray-300 mb-8">
            Connect your Spotify account to start creating playlists from your mixed collections
          </p>
          <button
            onClick={() => signIn('spotify')}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-8 py-3 rounded-full text-lg font-semibold transition-colors shadow-lg w-full"
          >
            Connect with Spotify
          </button>
          <button
            onClick={() => setShowSignIn(false)}
            className="mt-4 text-gray-400 hover:text-white underline"
          >
            Continue without connecting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] font-sans">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {/* Welcome section */}
            <section className="mb-10">
              <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
                Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}!
              </h1>
              <p className="text-lg text-gray-300">Analyze and discover insights about your music taste</p>
            </section>
            {/* Playlists section */}
            <section className="bg-[#232323] rounded-2xl shadow-lg border border-[#282828]">
              <div className="p-8 border-b border-[#282828]">
                <h2 className="text-2xl font-bold text-white">Your Playlists</h2>
                <p className="text-gray-400 text-base mt-1">Analyze your music taste and discover insights</p>
              </div>
              <PlaylistGrid />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
} 