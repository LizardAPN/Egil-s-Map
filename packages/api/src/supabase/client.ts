import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "./env";

export function createSupabaseClient(options?: SupabaseClientOptions<"public">): SupabaseClient {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), options);
}
