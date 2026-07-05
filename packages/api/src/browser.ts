import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "./supabase/env";
import { configureSupabaseClient } from "./supabase/runtime";

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
    configureSupabaseClient(() => browserClient as SupabaseClient);
  }

  return browserClient;
}

export {
  fetchIpCityLocation,
  fetchMemoryPinDetail,
  fetchMemoryPinsInBounds,
  useMemoryPinDetail,
  useMemoryPinsInBounds
} from "./pins-queries";
export type { Bounds, MemoryPinMapItem } from "./supabase/mappers";
