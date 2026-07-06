"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { createBrowserClient, getById } from "@imprint/api";

import { useMapController } from "../components/map/MapCanvas";
import { useMapStore } from "../stores/map-store";

export function useMapPinSync(): void {
  const controller = useMapController();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pinParam = searchParams.get("pin");
  const activePinId = useMapStore((state) => state.activePinId);
  const setActivePin = useMapStore((state) => state.setActivePin);
  const isMapReady = useMapStore((state) => state.isMapReady);
  const flownPinRef = useRef<string | null>(null);
  const skipStoreToUrlRef = useRef(false);

  useEffect(() => {
    if (!controller) {
      return;
    }

    controller.setActivePin(activePinId);
  }, [controller, activePinId]);

  // URL → store
  useEffect(() => {
    setActivePin(pinParam);
    skipStoreToUrlRef.current = true;
  }, [pinParam, setActivePin]);

  // Store → URL (skip the echo right after URL → store)
  useEffect(() => {
    if (skipStoreToUrlRef.current) {
      skipStoreToUrlRef.current = false;
      return;
    }

    if (activePinId === pinParam) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (activePinId) {
      params.set("pin", activePinId);
    } else {
      params.delete("pin");
    }

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [activePinId, pinParam, pathname, router, searchParams]);

  useEffect(() => {
    if (!pinParam || !isMapReady || !controller) {
      return;
    }

    if (flownPinRef.current === pinParam) {
      return;
    }

    let cancelled = false;
    const supabase = createBrowserClient();

    void getById(supabase, pinParam).then((pin) => {
      if (!cancelled && pin) {
        flownPinRef.current = pinParam;
        controller.flyToPin(pin.location);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pinParam, isMapReady, controller]);

  useEffect(() => {
    if (!pinParam) {
      flownPinRef.current = null;
    }
  }, [pinParam]);

  useEffect(() => {
    if (!controller) {
      return;
    }

    controller.setPinInteractionHandlers({
      onPinClick: (pinId) => {
        setActivePin(pinId);
      },
      onMapClick: () => {
        setActivePin(null);
      },
    });
  }, [controller, setActivePin]);
}
