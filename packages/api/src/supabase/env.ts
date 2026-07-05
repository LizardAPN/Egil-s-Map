export function getSupabaseEnv(): { url: string; anonKey: string } {
  // Must use static property access so Next.js inlines values in the client bundle.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing Supabase env: ${missing.join(", ")}`);
  }

  return { url: url as string, anonKey: anonKey as string };
}
