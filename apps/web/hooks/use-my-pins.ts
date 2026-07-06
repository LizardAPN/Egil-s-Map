"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { createBrowserClient, listMine } from "@imprint/api";
import type { PinListItem } from "@imprint/types";

import { pinKeys } from "../lib/pin-keys";
import { useMapStore } from "../stores/map-store";

function sortPinsDesc(pins: PinListItem[]): PinListItem[] {
  return [...pins].sort(
    (a, b) => new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime(),
  );
}

export function useMyPins() {
  const chapterId = useMapStore((state) => state.scope.chapterId);

  const query = useQuery({
    queryKey: pinKeys.mine(chapterId),
    queryFn: async () => {
      const supabase = createBrowserClient();
      return listMine(supabase, {
        chapterId: chapterId ?? undefined,
      });
    },
    staleTime: 30_000,
  });

  const sortedPins = useMemo(
    () => (query.data ? sortPinsDesc(query.data) : undefined),
    [query.data],
  );

  return { ...query, data: sortedPins };
}

/** Unscoped pin list for chapter pin-count aggregation in the switcher. */
export function useAllMyPins() {
  return useQuery({
    queryKey: pinKeys.mine(null),
    queryFn: async () => {
      const supabase = createBrowserClient();
      return listMine(supabase);
    },
    staleTime: 30_000,
  });
}
