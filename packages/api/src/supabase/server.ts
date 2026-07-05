import "server-only";

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@imprint/types";

import { getSupabaseEnv } from "./env";

export async function createServerClient(): Promise<
  SupabaseClient<Database>
> {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createSupabaseServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll can be called from Server Components where cookies are read-only.
        }
      },
    },
  });
}
