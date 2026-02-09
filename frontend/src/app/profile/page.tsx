"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") return <div className="p-8">Loading...</div>;

  const username = session?.user?.name || "me";
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between p-4 bg-gray-900/80 border-b border-gray-700">
        <Link href="/" className="text-xl font-bold text-amber-400">
          Egil&apos;s Map
        </Link>
        <nav className="flex gap-4">
          <Link href="/map">Map</Link>
          <Link href="/strongholds">Strongholds</Link>
          <Link href="/api/auth/signout">Sign Out</Link>
        </nav>
      </header>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Your Beacon</h1>
        <div className="mb-6">
          <TierManager token={(session as { accessToken?: string })?.accessToken} />
        </div>
        <div className="h-[500px] rounded-lg overflow-hidden bg-gray-900">
          <BeaconScene username={username} />
        </div>
      </div>
    </main>
  );
}

function TierManager({ token }: { token?: string }) {
  const [tiers, setTiers] = useState<{ id: number; title: string; order: number }[]>([]);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/beacon`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          const error = await r.json().catch(() => ({ detail: r.statusText }));
          throw new Error(error.detail || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(setTiers)
      .catch((err) => {
        console.error("Failed to load tiers:", err);
        setTiers([]);
      });
  }, [token]);

  function addTier() {
    if (!token || !newTitle.trim()) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/beacon`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: newTitle.trim(), order: tiers.length }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const error = await r.json().catch(() => ({ detail: r.statusText }));
          throw new Error(error.detail || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((t) => {
        setTiers([...tiers, t]);
        setNewTitle("");
      })
      .catch((err) => {
        console.error("Failed to add tier:", err);
        alert(`Failed to add tier: ${err.message}`);
      });
  }

  return (
    <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
      <h2 className="font-medium mb-2">Beacon Tiers (Life Chapters)</h2>
      <ul className="space-y-1 mb-4">
        {tiers.map((t) => (
          <li key={t.id} className="text-gray-300">
            {t.order + 1}. {t.title}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New tier (e.g. Moscow)"
          className="flex-1 px-3 py-2 rounded bg-gray-700 border border-gray-600"
        />
        <button
          onClick={addTier}
          className="px-4 py-2 rounded bg-amber-500 text-gray-900 font-medium"
        >
          Add Tier
        </button>
      </div>
    </div>
  );
}

function BeaconScene({ username }: { username: string }) {
  const [Beacon3D, setBeacon3D] = useState<React.ComponentType<{ username: string }> | null>(null);

  useEffect(() => {
    void import("@/components/Beacon3D").then((m) => setBeacon3D(() => m.default));
  }, []);

  if (!Beacon3D) return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  return <Beacon3D username={username} />;
}
