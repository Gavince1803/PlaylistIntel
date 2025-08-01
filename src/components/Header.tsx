'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  // Extiende el tipo de usuario para permitir 'product'
  type UserWithProduct = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    id?: string;
    product?: string;
  };
  const user = session?.user as UserWithProduct | undefined;

  // Debug logging
  console.log('🔍 Header - Session data:', {
    user: session?.user,
    product: user?.product,
    name: user?.name,
    email: user?.email
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#191414]/95 backdrop-blur-md shadow-lg border-b border-[#282828] lg:left-64">
      <div className="flex items-center justify-between h-16 lg:h-20 px-3 lg:px-8">
        {/* Left side - Menu button and search */}
        <div className="flex items-center space-x-3 lg:space-x-6">
          {/* Mobile menu button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#282828] transition-colors"
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Search bar - Mobile optimized */}
          <div className="relative flex-1 lg:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="block w-full lg:w-96 pl-9 lg:pl-10 pr-3 py-2 lg:py-2.5 border border-[#282828] rounded-lg leading-5 bg-[#232323] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-[#1DB954] font-sans text-sm lg:text-base"
              aria-label="Search playlists, songs, artists"
            />
          </div>
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center space-x-3 lg:space-x-6">
          {/* User info - Mobile optimized */}
          <div className="flex items-center space-x-2 lg:space-x-3 p-1 lg:p-2">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-full flex items-center justify-center">
                <span className="text-sm lg:text-lg font-bold text-white">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            )} 
            <div className="hidden sm:block text-left">
              <p className="text-sm lg:text-base font-semibold text-white">
                {user?.name || 'User Name'}
              </p>
              <p className="text-xs text-gray-400">
                {user?.product
                  ? user.product.charAt(0).toUpperCase() + user.product.slice(1)
                  : 'Account'}
              </p>
            </div>
          </div>

          {/* Connect/Disconnect Spotify button - Mobile optimized */}
          {session ? (
            <button 
              onClick={() => signOut()}
              className="bg-red-600 hover:bg-red-700 text-white px-3 lg:px-6 py-2 rounded-full text-sm lg:text-base font-semibold transition-colors shadow-md" 
              aria-label="Sign out"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </button>
          ) : (
            <button 
              onClick={() => signIn('spotify')}
              className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-3 lg:px-6 py-2 rounded-full text-sm lg:text-base font-semibold transition-colors shadow-md" 
              aria-label="Connect Spotify"
            >
              <span className="hidden sm:inline">Connect</span>
              <span className="sm:hidden">Join</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
} 