"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
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
      <header className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-md z-10 border-b h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent">
        <Link href="/" className="text-xl font-bold text-amber-400 font-cinzel uppercase">Egil&apos;s Map</Link>
        <nav className="flex gap-4 font-cinzel uppercase">
          <Link href="/map" className="text-amber-400">Map</Link>
          <Link href="/strongholds">Strongholds</Link>
          {status === "authenticated" ? (
            <>
              <Link href="/create-pin">Add Pin</Link>
              <Link href="/profile">Profile</Link>
              <Link href="/admin">Admin</Link>
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="text-inherit hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit">
              Sign Out
            </button>
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
