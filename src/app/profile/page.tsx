'use client';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from '../../components/Providers';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatar(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#e5e7eb] to-[#1DB954] dark:from-[#191414] dark:via-[#232323] dark:to-[#1DB954] p-6 transition-colors">
      <div className="bg-white dark:bg-[#232323] rounded-2xl shadow-2xl border border-[#e5e7eb] dark:border-[#282828] p-10 max-w-md w-full mx-4 transition-colors">
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-4 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-[#232323] rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
          aria-label="Go back"
        >
          ← Back
        </button>
        <div className="flex flex-col items-center mb-8 mt-4">
          {avatar ? (
            <img
              src={avatar}
              alt="Avatar preview"
              className="w-24 h-24 rounded-full mb-2 border-4 border-[#1DB954] object-cover"
            />
          ) : session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="w-24 h-24 rounded-full mb-2 border-4 border-[#1DB954] object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#1DB954] flex items-center justify-center mb-2 text-3xl font-bold text-white">
              {session?.user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <label className="block mt-2">
            <span className="sr-only">Upload avatar</span>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-gray-500 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1DB954]/10 file:text-[#1DB954] hover:file:bg-[#1DB954]/20"
              onChange={handleAvatarChange}
            />
          </label>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 mt-2">{session?.user?.name || 'User'}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-2">{session?.user?.email || 'No email'}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold mb-8 transition-colors shadow-md"
        >
          Sign Out
        </button>
        <div className="border-t border-[#e5e7eb] dark:border-[#282828] pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Settings</h3>
          <ul className="text-gray-500 dark:text-gray-400 space-y-2 mb-4">
            <li className="flex items-center justify-between">
              <span>Theme:</span>
              <button
                onClick={toggleTheme}
                className="ml-2 px-3 py-1 rounded-lg border border-[#1DB954] bg-white dark:bg-[#191414] text-gray-900 dark:text-white hover:bg-[#1DB954] hover:text-white dark:hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
                aria-label="Toggle dark/light mode"
              >
                {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            </li>
            <li>Notifications: <span className="italic">Not available yet</span></li>
            <li>More settings coming soon...</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 