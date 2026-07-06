"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { createBrowserClient, listInBounds } from "@imprint/api";
import type { Bbox } from "@imprint/types";

import { queryBboxForPins } from "../lib/map/bbox";
import { pinKeys } from "../lib/pin-keys";
import { useMapStore } from "../stores/map-store";

export interface PinsInViewFilters {
  chapterId?: string;
  from?: string;
  to?: string;
}

export function usePinsInView() {
  const bbox = useMapStore((state) => state.bbox);
  const zoom = useMapStore((state) => state.zoom);
  const isMapReady = useMapStore((state) => state.isMapReady);
  const chapterId = useMapStore((state) => state.scope.chapterId);

  const filters = useMemo(
    (): PinsInViewFilters => ({
      chapterId: chapterId ?? undefined,
    }),
    [chapterId],
  );

  const queryBbox = useMemo((): Bbox | null => {
    if (!bbox) {
      return null;
    }

    return queryBboxForPins(bbox, zoom);
  }, [bbox, zoom]);

  return useQuery({
    queryKey: pinKeys.bounds(queryBbox, filters),
    queryFn: async () => {
      if (!queryBbox) {
        return [];
      }

      const supabase = createBrowserClient();
      return listInBounds(supabase, {
        bbox: queryBbox,
        chapterId: filters.chapterId,
        from: filters.from,
        to: filters.to,
      });
    },
    enabled: isMapReady && queryBbox !== null,
    placeholderData: keepPreviousData,
  });
}
