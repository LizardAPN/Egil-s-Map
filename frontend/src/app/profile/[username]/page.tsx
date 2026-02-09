"use client";

import { useParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const BeaconScene = dynamic(() => import("@/components/BeaconScene"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { data: session } = useSession();
  const [beaconData, setBeaconData] = useState<{
    current_is_star: boolean;
    tiers: { id: number; title: string; order: number; pins: { id: number; lat: number; lng: number; content_type: string }[] }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [BeaconSceneComp, setBeaconSceneComp] = useState<React.ComponentType<{
    username: string;
    data?: { current_is_star: boolean; tiers: { id: number; title: string; order: number; pins: { id: number; lat: number; lng: number; content_type: string }[] }[] } | null;
    onTierSelect?: (tierId: number) => void;
  }> | null>(null);

  useEffect(() => {
    void import("@/components/BeaconScene").then((m) => setBeaconSceneComp(() => m.default));
  }, []);

  useEffect(() => {
    if (!username) return;
    fetch(`${API_BASE}/profile/${encodeURIComponent(username)}/beacon`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setBeaconData)
      .catch(() => setBeaconData(null))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 font-special-elite">Loading beacon...</p>
      </main>
    );
  }

  if (!beaconData) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-gray-400 font-special-elite">User not found.</p>
        <Link href="/strongholds" className="text-amber-400 hover:underline mt-4 inline-block font-cinzel">
          Back to Strongholds
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-md border-b border-amber-900/30">
        <div className="flex items-center gap-4">
          <Link href="/strongholds" className="text-amber-400 hover:underline font-cinzel">
            ← Back
          </Link>
          <Link href="/" className="text-xl font-bold text-amber-400 font-cinzel uppercase">
            Egil&apos;s Map
          </Link>
        </div>
        <nav className="flex gap-4 font-cinzel uppercase">
          <Link href="/map">Map</Link>
          <Link href="/strongholds">Strongholds</Link>
          {session ? (
            <>
              <Link href="/profile">Profile</Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-inherit hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/login">Sign In</Link>
          )}
        </nav>
      </header>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6 font-cinzel">
          {username}&apos;s Beacon
        </h1>
        <div className="h-[500px] rounded-lg overflow-hidden bg-gray-900">
          {BeaconSceneComp && (
            <BeaconSceneComp
              username={username}
              data={beaconData}
            />
          )}
          {!BeaconSceneComp && (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Loading...
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
