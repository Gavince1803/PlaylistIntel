"use client";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "../../components/Providers";
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
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        setAvatar(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#e5e7eb] to-[#1DB954] dark:from-[#191414] dark:via-[#232323] dark:to-[#1DB954] p-2 sm:p-6 transition-colors">
      <div className="relative bg-white dark:bg-[#232323] rounded-2xl shadow-2xl border border-[#e5e7eb] dark:border-[#282828] p-4 sm:p-10 w-full max-w-md mx-2 sm:mx-4 transition-colors">
        <button
          onClick={() => router.back()}
          className="absolute left-2 top-2 sm:left-4 sm:top-4 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-[#232323] rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954] text-base sm:text-lg"
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
          ) : profile?.images?.[0]?.url ? (
            <img
              src={profile.images[0].url}
              alt={profile.display_name || "User"}
              className="w-24 h-24 rounded-full mb-2 border-4 border-[#1DB954] object-cover"
            />
          ) : session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="w-24 h-24 rounded-full mb-2 border-4 border-[#1DB954] object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#1DB954] flex items-center justify-center mb-2 text-3xl font-bold text-white">
              {profile?.display_name?.charAt(0) || session?.user?.name?.charAt(0) || "U"}
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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 mt-2 text-center">
            {profile?.display_name || session?.user?.name || "User"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-2 text-center break-all">
            {profile?.email || session?.user?.email || "No email"}
          </p>
          {profile && profile.external_urls?.spotify && (
            <>
              <a
                href={profile.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1DB954] hover:underline text-sm mb-1 text-center"
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
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold mb-8 transition-colors shadow-md text-base sm:text-lg flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
        <div className="border-t border-[#e5e7eb] dark:border-[#282828] pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Settings</h3>
          <ul className="text-gray-500 dark:text-gray-400 space-y-2 mb-4">
            <li className="flex items-center justify-between">
              <span>Theme:</span>
              <button
                onClick={toggleTheme}
                className="ml-2 px-3 py-1 rounded-lg border border-[#1DB954] bg-white dark:bg-[#191414] text-gray-900 dark:text-white hover:bg-[#1DB954] hover:text-white dark:hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-[#1DB954] text-sm sm:text-base"
                aria-label="Toggle dark/light mode"
              >
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            </li>
            <li>Notifications: <span className="italic">Not available yet</span></li>
            <li>More settings coming soon...</li>
          </ul>
        </div>
        <div className="border-t border-[#e5e7eb] dark:border-[#282828] pt-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your Playlists</h3>
          {loading ? (
            <div className="text-gray-400">Loading playlists...</div>
          ) : playlists.length === 0 ? (
            <div className="text-gray-400">No playlists found.</div>
          ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {playlists.map((pl) => (
                <li key={pl.id} className="flex items-center gap-3">
                  {pl.images?.[0]?.url ? (
                    <img src={pl.images[0].url} alt={pl.name} className="w-10 h-10 rounded object-cover border border-[#1DB954]" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954] font-bold">🎵</div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{pl.name}</div>
                    <div className="text-xs text-gray-400">{pl.tracks.total} tracks</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 