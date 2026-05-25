import { createClient } from "@supabase/supabase-js";
import type { MemoryPin } from "@imprint/types";
import { useQuery } from "@tanstack/react-query";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(url, anonKey);
}

export function useRecentPublicPins() {
  return useQuery<MemoryPin[]>({
    queryKey: ["memory-pins", "recent-public"],
    queryFn: async () => []
  });
}
