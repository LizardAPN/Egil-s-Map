import { useQuery } from "@tanstack/react-query";
import { fetchPublicDiscoverPins } from "./discover";
import { hasSupabaseEnv } from "./supabase/env";

export * from "./users";
export * from "./reactions";
export * from "./presence";

export function useRecentPublicPins() {
  return useQuery({
    queryKey: ["memory-pins", "recent-public"],
    queryFn: async () =>
      fetchPublicDiscoverPins({
        center: { latitude: 40.7128, longitude: -74.006 },
        radiusMeters: 50_000_000,
        timeFilter: "recent",
        withPhotos: false,
        limit: 20
      }),
    enabled: hasSupabaseEnv(),
    staleTime: 60_000
  });
}
