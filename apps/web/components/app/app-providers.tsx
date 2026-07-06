"use client";

import { type ReactNode } from "react";

import { MapCanvas, MapProvider } from "../map/MapCanvas";
import { TopNav } from "../nav/TopNav";
import { QueryProvider } from "./query-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
    <div className="relative h-dvh w-full overflow-hidden bg-night-950">
      <MapProvider>
        <MapCanvas />
        <TopNav />
        <div className="pointer-events-none relative z-10 h-full">{children}</div>
      </MapProvider>
    </div>
    </QueryProvider>
  );
}
