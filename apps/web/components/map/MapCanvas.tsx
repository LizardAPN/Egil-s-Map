"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { MapController } from "../../lib/map/controller";
import { isWebpackHmr } from "../../lib/map/hmr";
import { useMapStore } from "../../stores/map-store";

const MapControllerContext = createContext<MapController | null>(null);
const MapControllerSetterContext = createContext<
  ((controller: MapController) => void) | null
>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const [controller, setController] = useState<MapController | null>(
    () => MapController.getInstance(),
  );

  return (
    <MapControllerSetterContext.Provider value={setController}>
      <MapControllerContext.Provider value={controller}>
        {children}
      </MapControllerContext.Provider>
    </MapControllerSetterContext.Provider>
  );
}

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const setController = useContext(MapControllerSetterContext);
  const setBbox = useMapStore((state) => state.setBbox);
  const setReady = useMapStore((state) => state.setReady);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !setController) {
      return;
    }

    const mapController = MapController.create(container);
    setController(mapController);

    requestAnimationFrame(() => {
      mapController.resize();
    });

    const unsubscribeBounds = mapController.onBoundsChanged(({ bbox, zoom }) => {
      setBbox(bbox, zoom);
    });

    const unsubscribeReady = mapController.onReady(() => {
      setReady(true);
    });

    const resizeObserver = new ResizeObserver(() => {
      mapController.resize();
    });
    resizeObserver.observe(container);

    return () => {
      // HMR guard: tear down listeners only during Fast Refresh — the singleton map
      // survives remounts so we do not destroy the WebGL context here.
      unsubscribeBounds();
      unsubscribeReady();
      resizeObserver.disconnect();

      if (!isWebpackHmr()) {
        MapController.getInstance()?.destroy();
      }
    };
  }, [setController, setBbox, setReady]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      MapController.getInstance()?.destroy();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0">
        <div ref={containerRef} className="h-full w-full" aria-hidden />
      </div>
      {process.env.NODE_ENV === "development" ? <DevFlyToButton /> : null}
    </>
  );
}

function DevFlyToButton() {
  const controller = useContext(MapControllerContext);

  if (!controller) {
    return null;
  }

  return (
    <button
      type="button"
      className="pointer-events-auto fixed bottom-4 left-4 z-30 rounded-control border border-line bg-night-800/90 px-3 py-1.5 text-xs text-ink-secondary backdrop-blur-md"
      onClick={() => {
        controller.flyToPin({ lng: 15, lat: 50 });
      }}
    >
      Dev: fly to Europe
    </button>
  );
}

export function useMapController(): MapController {
  const controller = useContext(MapControllerContext);

  if (!controller) {
    throw new Error("useMapController must be used within MapProvider");
  }

  return controller;
}
