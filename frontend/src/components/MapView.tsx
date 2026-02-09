"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";

const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false });

export default function MapView() {
  const { data: session, status } = useSession();

  useEffect(() => {
    import("leaflet/dist/leaflet.css");
  }, []);

  const token = (session as { accessToken?: string })?.accessToken;

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between p-4 bg-gray-900/80 border-b border-gray-700 z-10">
        <Link href="/" className="text-xl font-bold text-amber-400">Egil&apos;s Map</Link>
        <nav className="flex gap-4">
          <Link href="/map" className="text-amber-400">Map</Link>
          <Link href="/strongholds">Strongholds</Link>
          {status === "authenticated" ? (
            <>
              <Link href="/create-pin">Add Pin</Link>
              <Link href="/profile">Profile</Link>
              <Link href="/api/auth/signout">Sign Out</Link>
            </>
          ) : (
            <Link href="/login">Sign In</Link>
          )}
        </nav>
      </header>
      <div className="flex-1 relative">
        <MapCanvas token={token} />
      </div>
    </div>
  );
}
