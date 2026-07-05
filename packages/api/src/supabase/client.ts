import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@imprint/types";

import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient<Database> | undefined;

export function createBrowserClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error("createBrowserClient() must be called in the browser");
  }

  browserClient ??= createSupabaseBrowserClient<Database>(
    getSupabaseEnv().url,
    getSupabaseEnv().anonKey,
  );

  return browserClient;
}
