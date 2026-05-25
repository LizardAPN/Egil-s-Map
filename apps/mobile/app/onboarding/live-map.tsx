import { router } from "expo-router";
import {
  LiveMapVisual,
  OnboardingScaffold
} from "../../src/components/onboarding";

export default function OnboardingLiveMapScreen() {
  return (
    <OnboardingScaffold
      body="Your location is always your choice. Opt-in, anytime."
      ctaLabel="Next"
      onCtaPress={() => {
        router.push("/onboarding/first-memory");
      }}
      title="See where your people are"
      visual={<LiveMapVisual />}
    />
  );
}
