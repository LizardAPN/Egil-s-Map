import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { configureSupabaseClient } from "./supabase/runtime";
import { createSupabaseClient } from "./supabase/client";

let mobileClient: SupabaseClient | null = null;

export function createSupabaseMobileClient(): SupabaseClient {
  if (!mobileClient) {
    mobileClient = createSupabaseClient({
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });
    configureSupabaseClient(() => mobileClient as SupabaseClient);
  }

  return mobileClient;
}

configureSupabaseClient(createSupabaseMobileClient);

export {
  fetchIpCityLocation,
  fetchMemoryPinDetail,
  fetchMemoryPinsInBounds,
  useMemoryPinDetail,
  useMemoryPinsInBounds
} from "./pins-queries";
export type { Bounds, MemoryPinMapItem } from "./supabase/mappers";
