"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { createBrowserClient, listMyChapters } from "@imprint/api";

const EMPTY_COLORS = new Map<string, string>();

export function useChapterColors(): ReadonlyMap<string, string> {
  const { data: chapters } = useQuery({
    queryKey: ["chapters", "mine"],
    queryFn: async () => {
      const supabase = createBrowserClient();
      return listMyChapters(supabase);
    },
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    if (!chapters) {
      return EMPTY_COLORS;
    }

    return new Map(chapters.map((chapter) => [chapter.id, chapter.color]));
  }, [chapters]);
}
