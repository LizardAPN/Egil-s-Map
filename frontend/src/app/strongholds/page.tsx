"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import AddressSearch from "@/components/AddressSearch";
import { isValidToken } from "@/lib/api";

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
    if (!isValidToken(token)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/strongholds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, lat, lng, is_private: false }),
      });
      if (res.ok) {
        setName("");
        setLocationLabel(null);
        onCreated();
      } else {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const msg = Array.isArray(err.detail)
          ? err.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join("; ")
          : err.detail || "Failed to create stronghold";
        console.error("API Error: create stronghold", msg, err);
        alert(msg);
      }
    } catch (err) {
      console.error("API Error: create stronghold", err);
      alert("Failed to create stronghold. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-4 bg-[#1a1a1e] border-2 border-[#3a3a3e] rounded-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
      <h2 className="font-medium mb-2 font-cinzel">Create Stronghold</h2>
      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full px-3 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-special-elite"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1 font-special-elite">Location</label>
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
              className="px-4 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel"
            >
              Pick on Map
            </button>
            {locationLabel && (
              <span className="text-sm text-gray-400 truncate max-w-[200px] font-special-elite" title={locationLabel}>
                {locationLabel}
              </span>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#d4af37] text-gray-900 font-cinzel font-medium hover:bg-[#b8860b] hover:brightness-110 disabled:opacity-50"
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
    const headers: HeadersInit = isValidToken(token) ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API_BASE}/strongholds`, { headers })
      .then((r) => r.json())
      .then(setStrongholds)
      .catch(() => setStrongholds([]));
  }, [token]);

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-md border-b h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent">
        <Link href="/" className="text-xl font-bold text-amber-400 font-cinzel uppercase">
          Egil&apos;s Map
        </Link>
        <nav className="flex gap-4 font-cinzel uppercase">
          <Link href="/map">Map</Link>
          <Link href="/strongholds" className="text-amber-400">
            Strongholds
          </Link>
          {session ? (
            <>
              <Link href="/profile">Profile</Link>
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="text-inherit hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit">
              Sign Out
            </button>
            </>
          ) : (
            <Link href="/login">Sign In</Link>
          )}
        </nav>
      </header>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6 font-cinzel">Strongholds</h1>
        <p className="text-gray-400 mb-8 font-special-elite">
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
              className="p-4 bg-[#1a1a1e] border-2 border-[#3a3a3e] rounded-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] flex justify-between items-center"
            >
              <div>
                <h2 className="font-medium font-cinzel">{s.name}</h2>
                <p className="text-sm text-gray-400 font-special-elite">
                  Brightness: {s.brightness} | {s.lat.toFixed(2)}, {s.lng.toFixed(2)}
                </p>
              </div>
              {session && (
                s.is_member ? (
                  <span className="px-4 py-2 text-sm text-gray-400 font-special-elite">Member</span>
                ) : (
                  <button
                    onClick={() => {
                      if (!isValidToken(token)) return;
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
                            r.json()
                              .then((e) => {
                                const msg = Array.isArray(e.detail)
                                  ? e.detail.map((x: { msg?: string }) => x.msg || JSON.stringify(x)).join("; ")
                                  : e.detail || "Could not join";
                                console.error("API Error: join stronghold", msg, e);
                                alert(msg);
                              })
                              .catch(() => {
                                console.error("API Error: join stronghold", r.statusText);
                                alert("Could not join");
                              });
                          }
                        });
                    }}
                    className="px-4 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel"
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
