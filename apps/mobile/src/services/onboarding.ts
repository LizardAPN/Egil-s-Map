import * as SecureStore from "expo-secure-store";
import { getCurrentUserAccount, setOnboardingState } from "@imprint/api/users";

const ONBOARDING_COMPLETED_KEY = "imprint.onboarding.completed";

export async function getOnboardingCompleted() {
  try {
    try {
      const account = await getCurrentUserAccount();
      if (account.isOnboarded) {
        await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, "true");
        return true;
      }
    } catch {
      // Fall back to local storage when the user is signed out or offline.
    }

    const value = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(completed: boolean) {
  try {
    try {
      await setOnboardingState(completed);
    } catch {
      // Preserve local completion even if the network request fails.
    }

    if (completed) {
      await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, "true");
      return;
    }

    await SecureStore.deleteItemAsync(ONBOARDING_COMPLETED_KEY);
  } catch {
    return;
  }
}
