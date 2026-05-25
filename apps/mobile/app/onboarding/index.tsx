import { router } from "expo-router";
import {
  OnboardingScaffold,
  WelcomeVisual
} from "../../src/components/onboarding";

export default function OnboardingWelcomeScreen() {
  return (
    <OnboardingScaffold
      body="Every moment. Every place. Your story."
      ctaLabel="Get started"
      onCtaPress={() => {
        router.push("/onboarding/memory-map");
      }}
      title="Your life, mapped."
      visual={<WelcomeVisual />}
    />
  );
}
