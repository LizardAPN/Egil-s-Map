"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BeaconTier } from "@/components/BeaconScene";
import { isValidToken } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [beaconData, setBeaconData] = useState<{
    current_is_star: boolean;
    tiers: BeaconTier[];
  } | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);
  const [BeaconSceneComp, setBeaconSceneComp] = useState<
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
    void import("@/components/BeaconScene").then((m) => setBeaconSceneComp(() => m.default));
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
  const selectedTier = beaconData?.tiers?.find((t) => t.id === selectedTierId) ?? null;

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-md border-b h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent">
        <Link href="/" className="text-xl font-bold text-amber-400 font-cinzel uppercase">
          Egil&apos;s Map
        </Link>
        <nav className="flex gap-4 font-cinzel uppercase">
          <Link href="/map">Map</Link>
          <Link href="/strongholds">Strongholds</Link>
          <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="text-inherit hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit">
          Sign Out
        </button>
        </nav>
      </header>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6 font-cinzel">Your Beacon</h1>
        <div className="mb-6">
          <TierManager
            token={(session as { accessToken?: string })?.accessToken}
            onTierAdded={refreshBeacon}
            isAuthenticated={status === "authenticated"}
          />
        </div>
        <div className="h-[500px] rounded-lg overflow-hidden bg-gray-900">
          {BeaconSceneComp && (
            <BeaconSceneComp
              username={username}
              data={beaconData}
              onTierSelect={(tierId) => setSelectedTierId(tierId)}
            />
          )}
          {!BeaconSceneComp && (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Loading...
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedTier && (
          <TierSideDrawer
            key={selectedTier.id}
            tier={selectedTier}
            onClose={() => setSelectedTierId(null)}
            onUpdated={refreshBeacon}
            token={(session as { accessToken?: string })?.accessToken}
          />
        )}
      </AnimatePresence>
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
    if (!isValidToken(token)) return;
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
        const msg = Array.isArray(err.detail)
          ? err.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join("; ")
          : err.detail || "Failed to update";
        console.error("API Error: update tier", msg, err);
        alert(msg);
      }
    } catch (err) {
      console.error("API Error: update tier", err);
      alert("Failed to update. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.aside
        initial={{ x: "100%", clipPath: "inset(0 100% 0 0)" }}
        animate={{ x: 0, clipPath: "inset(0 0% 0 0)" }}
        exit={{ x: "100%", clipPath: "inset(0 100% 0 0)" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 z-50 w-full max-w-md h-full bg-gray-900/90 backdrop-blur-xl border-l border-amber-900/50 shadow-2xl overflow-y-auto torn-paper-clip"
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
                      className="block p-3 rounded-sm bg-[#1a1a1e] border border-[#3a3a3e] hover:bg-[#2a2a2e] text-gray-200 text-sm"
                    >
                      Pin #{pin.id} ({pin.content_type}) — {pin.lat.toFixed(2)}, {pin.lng.toFixed(2)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isValidToken(token) && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="w-full py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel"
            >
              Edit Chapter
            </button>
          )}
        </div>
      </motion.aside>

      {editOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setEditOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#1a1a1e] border-2 border-[#3a3a3e] rounded-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] p-6"
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
                  className="w-full px-4 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-special-elite"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Chapter Summary / Main Wisdom</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={4}
                  placeholder="A brief summary or key wisdom from this life chapter..."
                  className="w-full px-4 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-special-elite"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel font-medium disabled:opacity-50"
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

function TierManager({
  token,
  onTierAdded,
  isAuthenticated,
}: {
  token?: string;
  onTierAdded?: () => void;
  isAuthenticated?: boolean;
}) {
  const [tiers, setTiers] = useState<{ id: number; title: string; order: number }[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const validToken = isValidToken(token);

  useEffect(() => {
    if (!validToken) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/beacon`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          const error = await r.json().catch(() => ({ detail: r.statusText }));
          const msg = Array.isArray(error.detail)
            ? error.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join("; ")
            : (error.detail || `HTTP ${r.status}`);
          console.error("API Error: load tiers", msg, error);
          throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
        }
        return r.json();
      })
      .then((data) => setTiers(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Failed to load tiers:", err?.message, err);
        setTiers([]);
      });
  }, [validToken]);

  function addTier() {
    if (!isValidToken(token) || !newTitle.trim()) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/beacon`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: newTitle.trim(), order: tiers.length }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const error = await r.json().catch(() => ({ detail: r.statusText }));
          const msg = Array.isArray(error.detail)
            ? error.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join("; ")
            : (error.detail || `HTTP ${r.status}`);
          console.error("API Error: add tier", msg, error);
          throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
        }
        return r.json();
      })
      .then((t) => {
        setTiers([...tiers, t]);
        setNewTitle("");
        onTierAdded?.();
      })
      .catch((err) => {
        console.error("Failed to add tier:", err?.message, err);
        alert(`Failed to add tier: ${err.message}`);
      });
  }

  const hasSessionNoToken = isAuthenticated && !validToken;

  return (
    <div className="p-4 bg-[#1a1a1e] border-2 border-[#3a3a3e] rounded-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
      <h2 className="font-medium mb-2">Beacon Tiers (Life Chapters)</h2>
      {hasSessionNoToken && (
        <p className="text-amber-400 text-sm mb-4">
          Please sign out and sign in again to use tier features.
        </p>
      )}
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
          className="flex-1 px-3 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-special-elite"
        />
        <button
          onClick={addTier}
          className="px-4 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel font-medium"
        >
          Add Tier
        </button>
      </div>
    </div>
  );
}
