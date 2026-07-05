import {
  findNearbyFriendEchoPins,
  getMutualFriendIds,
  logEchoTriggered,
  wasEchoRecentlyTriggered,
  type EchoNotificationCandidate
} from "@imprint/api/echoes";
import { createSupabaseBrowserClient } from "@imprint/api/browser";
import type { Coordinates } from "@imprint/types";

let lastCheckAt = 0;
const CHECK_INTERVAL_MS = 45_000;

export async function checkEchoesAtLocation(
  coordinates: Coordinates
): Promise<EchoNotificationCandidate | null> {
  const now = Date.now();
  if (now - lastCheckAt < CHECK_INTERVAL_MS) {
    return null;
  }
  lastCheckAt = now;

  const client = createSupabaseBrowserClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user?.id) {
    return null;
  }

  const userId = authData.user.id;
  const friendIds = await getMutualFriendIds(userId);
  if (friendIds.length === 0) {
    return null;
  }

  const candidates = await findNearbyFriendEchoPins(coordinates, friendIds);
  const nextEcho = candidates[0];
  if (!nextEcho) {
    return null;
  }

  try {
    const wasRecent = await wasEchoRecentlyTriggered(userId, nextEcho.id, nextEcho.location);
    if (wasRecent) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    await logEchoTriggered(userId, nextEcho.id, nextEcho.location);
  } catch {
    return nextEcho;
  }

  return nextEcho;
}
