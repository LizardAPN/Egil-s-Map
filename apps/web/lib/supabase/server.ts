import { createSupabaseServerClient } from "@imprint/api/server";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll();
    },
    set(name, value, options) {
      cookieStore.set(name, value, options);
    }
  });
}
