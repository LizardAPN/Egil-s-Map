import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, UserPreferences } from "@imprint/types";

import { ApiError, toApiError } from "./errors";
import { mapUserPreferencesRow } from "./mappers";

type PreferencesClient = SupabaseClient<Database>;

async function requireUser(client: PreferencesClient) {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    throw toApiError(authError);
  }

  if (!user) {
    throw new ApiError("not_authenticated", "Not signed in");
  }

  return user;
}

export async function getMyPreferences(
  client: PreferencesClient,
): Promise<UserPreferences> {
  const user = await requireUser(client);

  const { data, error } = await client
    .from("user_preferences")
    .select("user_id, default_pin_visibility, settings, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw toApiError(error);
  }

  if (data) {
    return mapUserPreferencesRow(data);
  }

  const { data: created, error: insertError } = await client
    .from("user_preferences")
    .upsert({
      user_id: user.id,
      default_pin_visibility: "private",
    })
    .select("user_id, default_pin_visibility, settings, updated_at")
    .single();

  if (insertError) {
    throw toApiError(insertError);
  }

  return mapUserPreferencesRow(created);
}
