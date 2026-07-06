"use client";

import { useQuery } from "@tanstack/react-query";

import { createBrowserClient, getMyPreferences } from "@imprint/api";

export function useMyPreferences() {
  return useQuery({
    queryKey: ["preferences", "mine"],
    queryFn: async () => {
      const supabase = createBrowserClient();
      return getMyPreferences(supabase);
    },
    staleTime: 5 * 60_000,
  });
}
