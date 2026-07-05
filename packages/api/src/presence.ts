import type { PresenceVisibility } from "@imprint/types";
import { getSupabaseClient } from "./supabase/runtime";
import type { Coordinates } from "@imprint/types";

export interface PresenceBroadcastInput {
  location: Coordinates;
  visibility: PresenceVisibility;
}

async function getCurrentUserId() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user?.id) {
    throw new Error("You must be signed in.");
  }

  return data.user.id;
}

export async function broadcastPresence(input: PresenceBroadcastInput) {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();
  const { error } = await client.from("live_presence").upsert({
    user_id: userId,
    visibility: input.visibility,
    location: `SRID=4326;POINT(${input.location.longitude} ${input.location.latitude})`
  });

  if (error) {
    throw error;
  }
}

export async function stopBroadcasting() {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();
  const { error } = await client.from("live_presence").delete().eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export function subscribeToPresence(onChange: (payload: unknown) => void) {
  const client = getSupabaseClient();
  const channel = client
    .channel("live-presence-table")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_presence"
      },
      (payload) => {
        onChange(payload);
      }
    )
    .subscribe();

  return {
    unsubscribe: async () => {
      await client.removeChannel(channel);
    }
  };
}
