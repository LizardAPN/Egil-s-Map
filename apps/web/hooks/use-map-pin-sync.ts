"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { createBrowserClient, getById } from "@imprint/api";
import { toast } from "@imprint/ui";

import { useMapController } from "../components/map/MapCanvas";
import { getTimelineCameraPadding } from "../lib/map/camera-padding";
import { pinNavigationState } from "../lib/map-pin-navigation";
import { useSelectPin } from "./use-select-pin";
import { useTimelineCollapsed } from "./use-timeline-collapsed";
import { useMapStore } from "../stores/map-store";

export function useCloseActivePin() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (options?: { replace?: boolean }) => {
      const pinParam = searchParams.get("pin");

      if (!pinParam) {
        useMapStore.getState().setActivePin(null);
        return;
      }

      if (!options?.replace && pinNavigationState.selectionPushed) {
        pinNavigationState.selectionPushed = false;
        router.back();
        return;
      }

      pinNavigationState.selectionPushed = false;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("pin");
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
}

export function useMapPinSync(): void {
  const controller = useMapController();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pinParam = searchParams.get("pin");
  const activePinId = useMapStore((state) => state.activePinId);
  const setActivePin = useMapStore((state) => state.setActivePin);
  const isMapReady = useMapStore((state) => state.isMapReady);
  const closeActivePin = useCloseActivePin();
  const selectPin = useSelectPin();
  const { collapsed } = useTimelineCollapsed();
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

  // Store → URL (programmatic updates e.g. create pin, delete)
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
      if (cancelled) {
        return;
      }

      if (!pin) {
        toast.error("Воспоминание недоступно");
        flownPinRef.current = null;
        router.replace(pathname, { scroll: false });
        return;
      }

      flownPinRef.current = pinParam;
      controller.flyToPin(pin.location, {
        padding: getTimelineCameraPadding(collapsed),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [pinParam, isMapReady, controller, pathname, router, collapsed]);

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
        selectPin(pinId);
      },
      onMapClick: () => {
        if (controller.isInCreateMode() || controller.isInMoveMode()) {
          return;
        }

        if (pinParam) {
          closeActivePin();
        }
      },
    });
  }, [controller, pinParam, closeActivePin, selectPin]);
}
