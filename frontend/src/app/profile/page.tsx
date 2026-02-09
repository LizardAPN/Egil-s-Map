"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { BeaconTier } from "@/components/Beacon3D";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [beaconData, setBeaconData] = useState<{
    current_is_star: boolean;
    tiers: BeaconTier[];
  } | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);
  const [Beacon3D, setBeacon3D] = useState<
    React.ComponentType<{
      username: string;
      data?: { current_is_star: boolean; tiers: BeaconTier[] } | null;
      onTierSelect?: (tierId: number) => void;
    }> | null
  >(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    void import("@/components/Beacon3D").then((m) => setBeacon3D(() => m.default));
  }, []);

  useEffect(() => {
    const username = session?.user?.name || "me";
    if (!username) return;
    fetch(`${API_BASE}/profile/${encodeURIComponent(username)}/beacon`)
      .then((r) => r.json())
      .then(setBeaconData)
      .catch(() => setBeaconData({ current_is_star: false, tiers: [] }));
  }, [session?.user?.name]);

  function refreshBeacon() {
    const username = session?.user?.name || "me";
    if (!username) return;
    fetch(`${API_BASE}/profile/${encodeURIComponent(username)}/beacon`)
      .then((r) => r.json())
      .then(setBeaconData)
      .catch(() => setBeaconData({ current_is_star: false, tiers: [] }));
  }

  if (status === "loading") return <div className="p-8">Loading...</div>;

  const username = session?.user?.name || "me";
  const selectedTier = beaconData?.tiers.find((t) => t.id === selectedTierId) ?? null;

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
          {Beacon3D && (
            <Beacon3D
              username={username}
              data={beaconData}
              onTierSelect={(tierId) => setSelectedTierId(tierId)}
            />
          )}
          {!Beacon3D && (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Loading...
            </div>
          )}
        </div>
      </div>

      {selectedTier && (
        <TierSideDrawer
          tier={selectedTier}
          onClose={() => setSelectedTierId(null)}
          onUpdated={refreshBeacon}
          token={(session as { accessToken?: string })?.accessToken}
        />
      )}
    </main>
  );
}

function TierSideDrawer({
  tier,
  onClose,
  onUpdated,
  token,
}: {
  tier: BeaconTier;
  onClose: () => void;
  onUpdated: () => void;
  token?: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(tier.title);
  const [editSummary, setEditSummary] = useState(tier.chapter_summary ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditTitle(tier.title);
    setEditSummary(tier.chapter_summary ?? "");
  }, [tier.id, tier.title, tier.chapter_summary]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/beacon/${tier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle,
          order: tier.order,
          chapter_summary: editSummary || null,
        }),
      });
      if (res.ok) {
        onUpdated();
        setEditOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to update");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 z-50 w-full max-w-md h-full bg-gray-900/90 backdrop-blur-xl border-l border-gray-700 shadow-2xl overflow-y-auto"
        role="dialog"
        aria-label="Tier Chronicle"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-amber-400">{tier.title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {tier.chapter_summary && (
            <p className="text-gray-300 mb-6 text-sm">{tier.chapter_summary}</p>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Legacy Pins ({tier.pins.length})</h3>
            {tier.pins.length === 0 ? (
              <p className="text-gray-500 text-sm">No pins in this chapter yet.</p>
            ) : (
              <ul className="space-y-2">
                {tier.pins.map((pin) => (
                  <li key={pin.id}>
                    <Link
                      href={`/pins/${pin.id}`}
                      className="block p-3 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 text-sm"
                    >
                      Pin #{pin.id} ({pin.content_type}) — {pin.lat.toFixed(2)}, {pin.lng.toFixed(2)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {token && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="w-full py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30"
            >
              Edit Chapter
            </button>
          )}
        </div>
      </aside>

      {editOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setEditOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-gray-800 border border-gray-700 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Edit Chapter</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Chapter Summary / Main Wisdom</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={4}
                  placeholder="A brief summary or key wisdom from this life chapter..."
                  className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
