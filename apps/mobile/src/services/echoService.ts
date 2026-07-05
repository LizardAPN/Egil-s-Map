import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSupabaseMobileClient } from "@imprint/api/mobile";
import {
  createEchoDebounceKey,
  findNearbyFriendEchoPins,
  getMutualFriendIds,
  logEchoTriggered,
  wasEchoRecentlyTriggered
} from "@imprint/api/echoes";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { router } from "expo-router";

const ECHOES_ENABLED_STORAGE_KEY = "imprint:echoes-enabled";
const SEEN_ECHOES_STORAGE_KEY = "imprint:seen-echoes";
const BACKGROUND_ECHOES_TASK = "BACKGROUND_FETCH_TASK";

interface SeenEchoRecord {
  debounceKey: string;
  pinId: string;
  seenAt: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

async function getCurrentEchoesEnabled() {
  const storedValue = await AsyncStorage.getItem(ECHOES_ENABLED_STORAGE_KEY);
  return storedValue === "true";
}

async function getSeenEchoes() {
  const raw = await AsyncStorage.getItem(SEEN_ECHOES_STORAGE_KEY);
  if (!raw) {
    return [] satisfies SeenEchoRecord[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [] satisfies SeenEchoRecord[];
    }

    return parsed.filter(
      (item): item is SeenEchoRecord =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as SeenEchoRecord).debounceKey === "string" &&
        typeof (item as SeenEchoRecord).pinId === "string" &&
        typeof (item as SeenEchoRecord).seenAt === "string"
    );
  } catch {
    return [] satisfies SeenEchoRecord[];
  }
}

async function setSeenEchoes(entries: SeenEchoRecord[]) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
  const recentEntries = entries.filter(
    (entry) => new Date(entry.seenAt).getTime() >= cutoff
  );
  await AsyncStorage.setItem(SEEN_ECHOES_STORAGE_KEY, JSON.stringify(recentEntries));
}

async function recordSeenEcho(debounceKey: string, pinId: string) {
  const seenEchoes = await getSeenEchoes();
  seenEchoes.push({
    debounceKey,
    pinId,
    seenAt: new Date().toISOString()
  });
  await setSeenEchoes(seenEchoes);
}

export async function setEchoesEnabled(enabled: boolean) {
  await AsyncStorage.setItem(ECHOES_ENABLED_STORAGE_KEY, enabled ? "true" : "false");

  if (!enabled) {
    await stopEchoBackgroundUpdates();
    return;
  }

  await startEchoBackgroundUpdates();
}

export async function startEchoBackgroundUpdates() {
  const foregroundPermission = await Location.requestForegroundPermissionsAsync();
  if (!foregroundPermission.granted) {
    return false;
  }

  const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
  if (!backgroundPermission.granted) {
    return false;
  }

  const notificationPermission = await Notifications.requestPermissionsAsync();
  if (!notificationPermission.granted) {
    return false;
  }

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_ECHOES_TASK);
  if (alreadyStarted) {
    return true;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_ECHOES_TASK, {
    accuracy: Location.Accuracy.Balanced,
    deferredUpdatesDistance: 150,
    distanceInterval: 150,
    showsBackgroundLocationIndicator: false,
    pausesUpdatesAutomatically: true,
    foregroundService: {
      notificationTitle: "Echoes active",
      notificationBody: "Imprint is checking for nearby memories from friends."
    }
  });

  return true;
}

export async function stopEchoBackgroundUpdates() {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_ECHOES_TASK);
  if (!isRunning) {
    return;
  }

  await Location.stopLocationUpdatesAsync(BACKGROUND_ECHOES_TASK);
}

async function handleBackgroundEchoCheck(latitude: number, longitude: number) {
  const enabled = await getCurrentEchoesEnabled();
  if (!enabled) {
    return;
  }

  const supabase = createSupabaseMobileClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return;
  }

  const userId = data.user?.id;
  if (!userId) {
    return;
  }

  const friendIds = await getMutualFriendIds(userId);

  if (friendIds.length === 0) {
    return;
  }

  const seenEchoes = await getSeenEchoes();
  const candidates = await findNearbyFriendEchoPins(
    { latitude, longitude },
    friendIds,
    seenEchoes.map((entry) => entry.debounceKey)
  );

  const nextEcho = candidates[0];
  if (!nextEcho) {
    return;
  }

  try {
    const wasRecentlyTriggered = await wasEchoRecentlyTriggered(
      userId,
      nextEcho.id,
      nextEcho.location
    );

    if (wasRecentlyTriggered) {
      return;
    }
  } catch {
    // Fall back to local debounce storage if the log table is unavailable.
  }

  const notificationBody = `${nextEcho.author.username} left a memory here ${nextEcho.timeAgoLabel} · ${nextEcho.title}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Echo nearby",
      body: notificationBody,
      data: {
        pinId: nextEcho.id,
        latitude: nextEcho.location.latitude,
        longitude: nextEcho.location.longitude,
        echo: true
      }
    },
    trigger: null
  });

  await recordSeenEcho(
    nextEcho.debounceKey ?? createEchoDebounceKey(nextEcho.id, nextEcho.location),
    nextEcho.id
  );

  try {
    await logEchoTriggered(userId, nextEcho.id, nextEcho.location);
  } catch {
    // Local debounce is still recorded above.
  }
}

TaskManager.defineTask(BACKGROUND_ECHOES_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }

  const locations = (data as { locations?: Array<{ coords?: { latitude?: number; longitude?: number } }> })
    ?.locations;

  const nextLocation = locations?.[0]?.coords;
  if (
    !nextLocation ||
    typeof nextLocation.latitude !== "number" ||
    typeof nextLocation.longitude !== "number"
  ) {
    return;
  }

  await handleBackgroundEchoCheck(nextLocation.latitude, nextLocation.longitude);
});

export function registerEchoNotificationResponseHandler() {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as
      | { pinId?: string; latitude?: number; longitude?: number; echo?: boolean }
      | undefined;

    if (!data?.pinId) {
      return;
    }

    router.push({
      pathname: "/pin/[id]",
      params: {
        id: data.pinId,
        latitude:
          typeof data.latitude === "number" ? String(data.latitude) : undefined,
        longitude:
          typeof data.longitude === "number" ? String(data.longitude) : undefined
      }
    });
  });
}

export async function initializeEchoes() {
  const enabled = await getCurrentEchoesEnabled();
  if (!enabled) {
    return;
  }

  await startEchoBackgroundUpdates();
}

export { BACKGROUND_ECHOES_TASK, ECHOES_ENABLED_STORAGE_KEY };
