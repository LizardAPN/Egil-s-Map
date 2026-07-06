"use client";

import { Suspense, useEffect } from "react";

import { Toaster } from "@imprint/ui";

import { useChapterColors } from "../../../hooks/use-chapter-colors";
import { useMapPinSync } from "../../../hooks/use-map-pin-sync";
import { usePinsInView } from "../../../hooks/use-pins-in-view";
import { useMapController } from "../../../components/map/MapCanvas";
import { MapCreatePinUi } from "../../../components/map/MapCreatePinUi";
import { MapPinDetailUi } from "../../../components/map/MapPinDetailUi";
import { PinsFetchIndicator } from "../../../components/map/PinsFetchIndicator";
import { pinsToFeatureCollection } from "../../../lib/map/geojson";
import { useMapStore } from "../../../stores/map-store";

function MapPinsLayer() {
  const controller = useMapController();
  const { data: pins, isFetching } = usePinsInView();
  const chapterColors = useChapterColors();
  const isMapReady = useMapStore((state) => state.isMapReady);

  useMapPinSync();

  useEffect(() => {
    if (!controller || !pins || !isMapReady) {
      return;
    }

    controller.setPinsData(
      pinsToFeatureCollection(pins, null, chapterColors),
    );
  }, [pins, chapterColors, controller, isMapReady]);

  return <PinsFetchIndicator fetching={isFetching} />;
}

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPinsLayer />
      <MapPinDetailUi />
      <MapCreatePinUi />
      <Toaster />
    </Suspense>
  );
}
