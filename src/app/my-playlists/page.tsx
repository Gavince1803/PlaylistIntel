"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import PlaylistGrid from "@/components/PlaylistGrid";

export default function MyPlaylistsPage() {
  const { data: session } = useSession();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/playlists?limit=50");
        const data = await res.json();
        // Filter playlists by description tag
        const filtered = (data.playlists || []).filter((pl: any) =>
          typeof pl.description === "string" && pl.description.includes("Created with Playlister")
        );
        setPlaylists(filtered);
      } catch (err) {
        setError("Failed to load playlists");
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, [session]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] p-2 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-6 mt-4">My Playlists</h1>
        <p className="text-gray-300 mb-8">These are playlists you created with Playlister.</p>
        {loading ? (
          <div className="text-white">Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : playlists.length === 0 ? (
          <div className="text-gray-400">No playlists created with Playlister yet.</div>
        ) : (
          <PlaylistGrid playlists={playlists} customTitle={null} />
        )}
      </div>
    </div>
  );
} 