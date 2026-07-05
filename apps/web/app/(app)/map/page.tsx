"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { createBrowserClient, getMyPinById } from "@imprint/api";

import { MapController } from "../../../lib/map/controller";
import { useMapStore } from "../../../stores/map-store";

function MapPinFlyTo() {
  const searchParams = useSearchParams();
  const pinId = searchParams.get("pin");
  const isMapReady = useMapStore((state) => state.isMapReady);

  useEffect(() => {
    if (!pinId || !isMapReady) {
      return;
    }

    const controller = MapController.getInstance();

    if (!controller) {
      return;
    }

    let cancelled = false;
    const supabase = createBrowserClient();

    void getMyPinById(supabase, pinId).then((pin) => {
      if (!cancelled && pin) {
        controller.flyToPin(pin.location);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pinId, isMapReady]);

  return null;
}

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPinFlyTo />
    </Suspense>
  );
}
