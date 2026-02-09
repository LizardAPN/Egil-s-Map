"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import AddressSearch from "@/components/AddressSearch";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

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
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

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
      setLocationLabel(null);
      onCreated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-4 rounded-lg bg-gray-800 border border-gray-700">
      <h2 className="font-medium mb-2">Create Stronghold</h2>
      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Location</label>
          <AddressSearch
            onSelect={({ lat: la, lng: ln, display_name }) => {
              setLat(la);
              setLng(ln);
              setLocationLabel(display_name);
            }}
            placeholder="Search address..."
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => setMapPickerOpen(true)}
              className="px-4 py-2 rounded-lg bg-gray-700/80 backdrop-blur border border-gray-600 text-amber-400 hover:bg-gray-600/80"
            >
              Pick on Map
            </button>
            {locationLabel && (
              <span className="text-sm text-gray-400 truncate max-w-[200px]" title={locationLabel}>
                {locationLabel}
              </span>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-amber-500 text-gray-900 font-medium"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
      <MapPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onPick={(la, ln) => {
          setLat(la);
          setLng(ln);
          setLocationLabel(`Selected: ${la.toFixed(4)}, ${ln.toFixed(4)}`);
        }}
        initialLat={lat}
        initialLng={lng}
      />
    </form>
  );
}

function StrongholdsPage() {
  const { data: session } = useSession();
  const [strongholds, setStrongholds] = useState<
    { id: number; name: string; lat: number; lng: number; brightness: number; is_member?: boolean }[]
  >([]);
  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API_BASE}/strongholds`, { headers })
      .then((r) => r.json())
      .then(setStrongholds)
      .catch(() => setStrongholds([]));
  }, [token]);

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
                s.is_member ? (
                  <span className="px-4 py-2 text-sm text-gray-400">Member</span>
                ) : (
                  <button
                    onClick={() => {
                      if (!token) return;
                      fetch(`${API_BASE}/strongholds/${s.id}/join`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then((r) => {
                          if (r.ok) {
                            setStrongholds((prev) =>
                              prev.map((x) =>
                                x.id === s.id ? { ...x, is_member: true } : x
                              )
                            );
                          } else {
                            r.json().then((e) => alert(e.detail || "Could not join"));
                          }
                        });
                    }}
                    className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30"
                  >
                    Join
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default StrongholdsPage;
