"use client";

import { useQuery } from "@tanstack/react-query";

import { createBrowserClient, listMyChapters } from "@imprint/api";

export const chapterKeys = {
  mine: ["chapters", "mine"] as const,
};

export function useMyChapters() {
  return useQuery({
    queryKey: chapterKeys.mine,
    queryFn: async () => {
      const supabase = createBrowserClient();
      return listMyChapters(supabase);
    },
    staleTime: 5 * 60_000,
  });
}
