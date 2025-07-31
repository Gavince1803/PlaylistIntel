'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { data: session } = useSession();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [customProfilePicture, setCustomProfilePicture] = useState<string | null>(null);

  // Load custom profile picture from localStorage
  useEffect(() => {
    const savedCustomPicture = localStorage.getItem('userAvatar');
    if (savedCustomPicture) {
      setCustomProfilePicture(savedCustomPicture);
    }

    // Listen for changes to custom profile picture
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userAvatar') {
        if (e.newValue) {
          setCustomProfilePicture(e.newValue);
        } else {
          setCustomProfilePicture(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Debug session data
  useEffect(() => {
    if (session) {
      console.log('Sidebar session data:', {
        user: session.user,
        image: session.user?.image,
        name: session.user?.name,
        email: session.user?.email
      });
    }
  }, [session]);

  // Focus trap and ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
      if (e.key === 'Tab' && sidebarRef.current) {
        const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    // Focus the sidebar on open
    setTimeout(() => sidebarRef.current?.focus(), 0);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z', current: true },
    { name: 'Library', href: '/profiles', icon: 'M3 7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z', current: false },
    { name: 'Analytics', href: '/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', current: false },
    { name: 'Settings', href: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', current: false },
    { name: 'Profile', href: '/profile', icon: 'M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196zM15 11a3 3 0 11-6 0 3 3 0 016 0z', current: false },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Sidebar navigation"
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#191414] shadow-lg transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        ref={sidebarRef}
        tabIndex={isOpen ? 0 : -1}
        onBlur={e => {
          if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false);
        }}
      >
        <div className="flex items-center h-20 px-6 border-b border-[#282828]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Music Taste</span>
          </div>
        </div>

        <nav className="mt-8 px-3" aria-label="Main navigation">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={`
                    group flex items-center px-4 py-2 text-base font-medium rounded-lg transition-colors
                    ${item.current 
                      ? 'bg-[#1DB954]/20 text-[#1DB954]' 
                      : 'text-gray-300 hover:bg-[#282828] hover:text-white'
                    }
                  `}
                  aria-current={item.current ? 'page' : undefined}
                >
                  <svg
                    className={`
                      mr-4 h-6 w-6 transition-colors
                      ${item.current 
                        ? 'text-[#1DB954]' 
                        : 'text-gray-400 group-hover:text-white'
                      }
                    `}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-[#282828] bg-[#191414]">
          <div className="flex items-center space-x-3">
            {/* Custom profile picture (priority) */}
            {customProfilePicture && (
              <img
                src={customProfilePicture}
                alt={session?.user?.name || 'User'}
                className="w-10 h-10 rounded-full border-2 border-[#1DB954] shadow-md object-cover"
                onError={(e) => {
                  console.log('Custom profile image failed to load, falling back to Spotify');
                  e.currentTarget.style.display = 'none';
                  setCustomProfilePicture(null);
                }}
                onLoad={() => {
                  console.log('✅ Custom profile image loaded successfully');
                }}
              />
            )}
            
            {/* Spotify profile picture (fallback) */}
            {!customProfilePicture && session?.user?.image && (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-10 h-10 rounded-full border border-[#1DB954]/30 shadow-md"
                onError={(e) => {
                  console.log('Spotify profile image failed to load, falling back to default');
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
                onLoad={() => {
                  console.log('✅ Spotify profile image loaded successfully');
                }}
              />
            )}
            
            {/* Default avatar (final fallback) */}
            <div className={`w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center ${customProfilePicture || session?.user?.image ? 'hidden' : ''}`}>
              <span className="text-lg font-bold text-white">
                {session?.user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <p className="text-base font-semibold text-white">{session?.user?.name || 'User Name'}</p>
              <p className="text-xs text-gray-400">{session?.user?.email || 'user@example.com'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
} 