import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseClientFactory = () => SupabaseClient;

let clientFactory: SupabaseClientFactory | null = null;

export function configureSupabaseClient(factory: SupabaseClientFactory) {
  clientFactory = factory;
}

export function getSupabaseClient(): SupabaseClient {
  if (!clientFactory) {
    throw new Error(
      "Supabase client is not configured. Import @imprint/api/mobile or @imprint/api/browser first."
    );
  }

  return clientFactory();
}
