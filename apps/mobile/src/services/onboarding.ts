import * as SecureStore from "expo-secure-store";

const ONBOARDING_COMPLETED_KEY = "imprint.onboarding.completed";

export async function getOnboardingCompleted() {
  try {
    const value = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(completed: boolean) {
  try {
    if (completed) {
      await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, "true");
      return;
    }

    await SecureStore.deleteItemAsync(ONBOARDING_COMPLETED_KEY);
  } catch {
    return;
  }
}
