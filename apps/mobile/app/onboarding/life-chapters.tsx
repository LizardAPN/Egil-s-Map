import { router } from "expo-router";
import {
  ChaptersVisual,
  OnboardingScaffold
} from "../../src/components/onboarding";

export default function OnboardingLifeChaptersScreen() {
  return (
    <OnboardingScaffold
      body="Tokyo 2024. My startup journey. Alps summer."
      ctaLabel="Next"
      onCtaPress={() => {
        router.push("/onboarding/live-map");
      }}
      title="Organize your life into chapters"
      visual={<ChaptersVisual />}
    />
  );
}
