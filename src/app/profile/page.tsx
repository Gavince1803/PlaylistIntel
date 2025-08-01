"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface SpotifyProfile {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
  followers: { total: number };
  external_urls: { spotify: string };
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  tracks: { total: number };
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved avatar
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
      setAvatar(savedAvatar);
    }

    const fetchProfileAndPlaylists = async () => {
      if (!session?.accessToken) return;
      setLoading(true);
      try {
        // Fetch Spotify profile
        const resProfile = await fetch("/api/profile");
        const dataProfile = await resProfile.json();
        setProfile(dataProfile.profile);
        // Fetch playlists
        const resPlaylists = await fetch("/api/playlists?limit=5");
        const dataPlaylists = await resPlaylists.json();
        setPlaylists(dataPlaylists.playlists || []);
      } catch (err) {
        // Optionally show a toast here
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndPlaylists();
  }, [session]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const imageData = ev.target?.result as string;
        setAvatar(imageData);
        // Save to localStorage
        localStorage.setItem('userAvatar', imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen font-sans bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954]">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a1a1a] border-b border-[#282828] p-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Profile</h1>
                <p className="text-gray-400 text-sm">Manage your account settings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
              <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl lg:text-3xl font-bold text-white">User Profile</h2>
                    <p className="text-gray-400 text-sm lg:text-base mt-1">Your Spotify account information</p>
                  </div>
                </div>
              </div>
              <div className="p-4 lg:p-8">
                <div className="flex flex-col items-center mb-6 lg:mb-8">
          {avatar ? (
            <img
              src={avatar}
              alt="Avatar preview"
              className="w-20 h-20 lg:w-24 lg:h-24 rounded-full mb-2 border-4 border-[#1DB954] object-cover"
            />
          ) : profile?.images?.[0]?.url ? (
            <img
              src={profile.images[0].url}
              alt={profile.display_name || "User"}
              className="w-20 h-20 lg:w-24 lg:h-24 rounded-full mb-2 border-4 border-[#1DB954] object-cover"
            />
          ) : session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="w-20 h-20 lg:w-24 lg:h-24 rounded-full mb-2 border-4 border-[#1DB954] object-cover"
            />
          ) : (
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-[#1DB954] flex items-center justify-center mb-2 text-2xl lg:text-3xl font-bold text-white">
              {profile?.display_name?.charAt(0) || session?.user?.name?.charAt(0) || "U"}
            </div>
          )}
          <label className="block mt-2 w-full">
            <span className="sr-only">Upload avatar</span>
            <div className="text-center">
              <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mb-2">Change profile picture</p>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-xs lg:text-sm text-gray-500 dark:text-gray-300 file:mr-2 lg:file:mr-4 file:py-1.5 lg:file:py-2 file:px-3 lg:file:px-4 file:rounded-full file:border-0 file:text-xs lg:file:text-sm file:font-semibold file:bg-[#1DB954]/10 file:text-[#1DB954] hover:file:bg-[#1DB954]/20"
                onChange={handleAvatarChange}
              />
            </div>
          </label>
          <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-1 mt-2 text-center">
            {profile?.display_name || session?.user?.name || "User"}
          </h2>
          <p className="text-gray-400 mb-2 text-center break-all text-xs lg:text-sm">
            {profile?.email || session?.user?.email || "No email"}
          </p>
          {profile && profile.external_urls?.spotify && (
            <>
              <a
                href={profile.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1DB954] hover:underline text-xs lg:text-sm mb-1 text-center"
              >
                View Spotify Profile ↗
              </a>
              <div className="text-gray-400 text-xs mb-1 text-center">Spotify ID: {profile.id}</div>
              <div className="text-gray-400 text-xs mb-1 text-center">Followers: {profile.followers?.total ?? 0}</div>
            </>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 lg:py-3 rounded-lg font-semibold mb-6 lg:mb-8 transition-colors shadow-md text-sm lg:text-base flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
        <div className="border-t border-[#282828] pt-4 lg:pt-6 mt-4 lg:mt-6">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h3 className="text-base lg:text-lg font-semibold text-white">Your Playlists</h3>
            <button
              onClick={() => router.push('/')}
              className="text-[#1DB954] hover:text-[#1ed760] text-xs lg:text-sm font-medium transition-colors"
            >
              View All →
            </button>
          </div>
          {loading ? (
            <div className="text-gray-400 text-xs lg:text-sm">Loading playlists...</div>
          ) : playlists.length === 0 ? (
            <div className="text-gray-400 text-xs lg:text-sm">No playlists found.</div>
          ) : (
            <ul className="space-y-2 max-h-48 lg:max-h-60 overflow-y-auto pr-2">
              {playlists.map((pl) => (
                <li key={pl.id} className="flex items-center gap-2 lg:gap-3 p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                  {pl.images?.[0]?.url ? (
                    <img src={pl.images[0].url} alt={pl.name} className="w-8 h-8 lg:w-10 lg:h-10 rounded object-cover border border-[#1DB954] flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954] font-bold text-sm lg:text-base flex-shrink-0">🎵</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-xs lg:text-sm truncate">{pl.name}</div>
                    <div className="text-xs text-gray-400">{pl.tracks.total} tracks</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
} 