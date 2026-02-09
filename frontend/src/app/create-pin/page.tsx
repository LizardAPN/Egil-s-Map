"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import AddressSearch from "@/components/AddressSearch";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CreatePinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tiers, setTiers] = useState<{ id: number; title: string }[]>([]);
  const [tierId, setTierId] = useState<number | null>(null);
  const [contentType, setContentType] = useState<"photo" | "video" | "text">("text");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lat, setLat] = useState(55.75);
  const [lng, setLng] = useState(37.62);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isEcho, setIsEcho] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/beacon`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: { id: number; title: string }[]) => {
        setTiers(data);
        if (data.length > 0 && !tierId) setTierId(data[0].id);
      })
      .catch(() => setTiers([]));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !tierId) return;
    setLoading(true);
    const form = new FormData();
    form.append("tier_id", String(tierId));
    form.append("lat", String(lat));
    form.append("lng", String(lng));
    form.append("content_type", contentType);
    form.append("is_private", String(isPrivate));
    form.append("is_echo", String(isEcho));
    if (contentType === "text") {
      form.append("text_content", textContent);
    } else if (file) {
      form.append("file", file);
    }
    try {
      const res = await fetch(`${API_BASE}/pins`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      router.push(`/pins/${data.id}`);
    } catch {
      setLoading(false);
    }
  }

  if (status === "loading") return <div className="p-8">Loading...</div>;

  return (
    <main className="min-h-screen p-8">
      <header className="mb-8">
        <Link href="/map" className="text-amber-400 hover:underline">
          ← Back to Map
        </Link>
      </header>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-6">Create Pin</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tier (life chapter)</label>
            {tiers.length === 0 ? (
              <p className="text-amber-400">
                Create a tier first in your{" "}
                <Link href="/profile" className="underline">
                  Profile
                </Link>
                .
              </p>
            ) : (
              <select
                value={tierId ?? ""}
                onChange={(e) => setTierId(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600"
                required
              >
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as "photo" | "video" | "text")}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600"
            >
              <option value="text">Text</option>
              <option value="photo">Photo</option>
              <option value="video">Video</option>
            </select>
          </div>
          {contentType === "text" && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Content</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600"
                rows={4}
              />
            </div>
          )}
          {(contentType === "photo" || contentType === "video") && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">File</label>
              <input
                type="file"
                accept={contentType === "photo" ? "image/*" : "video/*"}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Location</label>
            <AddressSearch
              onSelect={({ lat: la, lng: ln, display_name }) => {
                setLat(la);
                setLng(ln);
                setLocationLabel(display_name);
              }}
              placeholder="Search address..."
              className="mb-2"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMapPickerOpen(true)}
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-amber-400 hover:bg-gray-700"
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
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <span className="text-sm">Private</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isEcho}
                onChange={(e) => setIsEcho(e.target.checked)}
              />
              <span className="text-sm">Echo (time/geo locked)</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={loading || tiers.length === 0}
            className="w-full py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Pin"}
          </button>
        </form>
      </div>
    </main>
  );
}
