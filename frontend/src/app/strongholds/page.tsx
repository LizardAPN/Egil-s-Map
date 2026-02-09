"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function CreateStrongholdForm({
  token,
  onCreated,
}: {
  token?: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState(55.75);
  const [lng, setLng] = useState(37.62);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/strongholds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, lat, lng, is_private: false }),
      });
      setName("");
      onCreated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-4 rounded-lg bg-gray-800 border border-gray-700">
      <h2 className="font-medium mb-2">Create Stronghold</h2>
      <div className="flex gap-4 flex-wrap">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="px-3 py-2 rounded bg-gray-700"
          required
        />
        <input
          type="number"
          step="any"
          value={lat}
          onChange={(e) => setLat(Number(e.target.value))}
          placeholder="Lat"
          className="px-3 py-2 rounded bg-gray-700 w-24"
        />
        <input
          type="number"
          step="any"
          value={lng}
          onChange={(e) => setLng(Number(e.target.value))}
          placeholder="Lng"
          className="px-3 py-2 rounded bg-gray-700 w-24"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-amber-500 text-gray-900 font-medium"
        >
          Create
        </button>
      </div>
    </form>
  );
}

function StrongholdsPage() {
  const { data: session } = useSession();
  const [strongholds, setStrongholds] = useState<
    { id: number; name: string; lat: number; lng: number; brightness: number }[]
  >([]);

  useEffect(() => {
    fetch(`${API_BASE}/strongholds`)
      .then((r) => r.json())
      .then(setStrongholds)
      .catch(() => setStrongholds([]));
  }, []);

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between p-4 bg-gray-900/80 border-b border-gray-700">
        <Link href="/" className="text-xl font-bold text-amber-400">
          Egil&apos;s Map
        </Link>
        <nav className="flex gap-4">
          <Link href="/map">Map</Link>
          <Link href="/strongholds" className="text-amber-400">
            Strongholds
          </Link>
          {session ? (
            <>
              <Link href="/profile">Profile</Link>
              <Link href="/api/auth/signout">Sign Out</Link>
            </>
          ) : (
            <Link href="/login">Sign In</Link>
          )}
        </nav>
      </header>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Strongholds</h1>
        <p className="text-gray-400 mb-8">
          Communities of light. Brightness is the sum of all members&apos; inspiration scores.
        </p>
        {session && (
          <CreateStrongholdForm
            token={(session as { accessToken?: string })?.accessToken}
            onCreated={() => window.location.reload()}
          />
        )}
        <div className="grid gap-4">
          {strongholds.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-lg bg-gray-800 border border-gray-700 flex justify-between items-center"
            >
              <div>
                <h2 className="font-medium">{s.name}</h2>
                <p className="text-sm text-gray-400">
                  Brightness: {s.brightness} | {s.lat.toFixed(2)}, {s.lng.toFixed(2)}
                </p>
              </div>
              {session && (
                <button
                  onClick={() => {
                    const token = (session as { accessToken?: string })?.accessToken;
                    if (!token) return;
                    fetch(`${API_BASE}/strongholds/${s.id}/join`, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` },
                    }).then(() => alert("Joined!"));
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/50"
                >
                  Join
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default StrongholdsPage;
