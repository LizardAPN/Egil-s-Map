import { useMutation, useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "./supabase/runtime";

export interface PinReactionState {
  count: number;
  reacted: boolean;
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

export async function addReaction(pinId: string) {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();
  const { error } = await client.from("reactions").insert({
    user_id: userId,
    pin_id: pinId
  });

  if (error) {
    throw error;
  }
}

export async function removeReaction(pinId: string) {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();
  const { error } = await client
    .from("reactions")
    .delete()
    .eq("user_id", userId)
    .eq("pin_id", pinId);

  if (error) {
    throw error;
  }
}

export async function getPinReactionCount(pinId: string) {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from("reactions")
    .select("id", { count: "exact", head: true })
    .eq("pin_id", pinId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function hasReactedToPin(pinId: string) {
  const client = getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();

  if (authError) {
    throw authError;
  }

  const userId = authData.user?.id;
  if (!userId) {
    return false;
  }

  const { data, error } = await client
    .from("reactions")
    .select("id")
    .eq("pin_id", pinId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return Boolean(data);
}

export async function getPinReactionState(pinId: string) {
  const [count, reacted] = await Promise.all([
    getPinReactionCount(pinId),
    hasReactedToPin(pinId)
  ]);

  return {
    count,
    reacted
  } satisfies PinReactionState;
}

export function usePinReactionCount(pinId: string, enabled = true) {
  return useQuery({
    queryKey: ["reactions", "count", pinId],
    queryFn: async () => getPinReactionCount(pinId),
    enabled: enabled && pinId.length > 0
  });
}

export function usePinReactionState(pinId: string, enabled = true) {
  return useQuery({
    queryKey: ["reactions", "state", pinId],
    queryFn: async () => getPinReactionState(pinId),
    enabled: enabled && pinId.length > 0
  });
}

export function useAddReaction() {
  return useMutation({
    mutationFn: addReaction
  });
}

export function useRemoveReaction() {
  return useMutation({
    mutationFn: removeReaction
  });
}
