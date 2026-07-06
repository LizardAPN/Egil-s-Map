"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { createBrowserClient, listInBounds } from "@imprint/api";
import type { Bbox } from "@imprint/types";

import { queryBboxForPins } from "../lib/map/bbox";
import { useMapStore } from "../stores/map-store";

export interface PinsInViewFilters {
  chapterId?: string;
  from?: string;
  to?: string;
}

export function usePinsInView(filters?: PinsInViewFilters) {
  const bbox = useMapStore((state) => state.bbox);
  const zoom = useMapStore((state) => state.zoom);
  const isMapReady = useMapStore((state) => state.isMapReady);

  const queryBbox = useMemo((): Bbox | null => {
    if (!bbox) {
      return null;
    }

    return queryBboxForPins(bbox, zoom);
  }, [bbox, zoom]);

  return useQuery({
    queryKey: [
      "pins",
      "bounds",
      queryBbox,
      filters?.chapterId,
      filters?.from,
      filters?.to,
    ],
    queryFn: async () => {
      if (!queryBbox) {
        return [];
      }

      const supabase = createBrowserClient();
      return listInBounds(supabase, {
        bbox: queryBbox,
        chapterId: filters?.chapterId,
        from: filters?.from,
        to: filters?.to,
      });
    },
    enabled: isMapReady && queryBbox !== null,
    placeholderData: keepPreviousData,
  });
}
