'use client';
import { useSession, signOut } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] p-6">
      <div className="bg-[#232323] rounded-2xl shadow-2xl border border-[#282828] p-10 max-w-md w-full mx-4">
        <div className="flex flex-col items-center mb-8">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="w-24 h-24 rounded-full mb-4 border-4 border-[#1DB954]"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#1DB954] flex items-center justify-center mb-4 text-3xl font-bold text-white">
              {session?.user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <h2 className="text-2xl font-bold text-white mb-1">{session?.user?.name || 'User'}</h2>
          <p className="text-gray-400 mb-2">{session?.user?.email || 'No email'}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold mb-8 transition-colors shadow-md"
        >
          Sign Out
        </button>
        <div className="border-t border-[#282828] pt-6">
          <h3 className="text-lg font-semibold text-white mb-2">Settings (coming soon)</h3>
          <ul className="text-gray-400 space-y-2">
            <li>Theme: <span className="font-semibold text-white">Dark</span> (auto)</li>
            <li>Notifications: <span className="italic">Not available yet</span></li>
            <li>More settings coming soon...</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 