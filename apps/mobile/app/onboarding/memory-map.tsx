import { router } from "expo-router";
import {
  MemoryMapVisual,
  OnboardingScaffold
} from "../../src/components/onboarding";

export default function OnboardingMemoryMapScreen() {
  return (
    <OnboardingScaffold
      body="Pin your memories to places that matter."
      ctaLabel="Next"
      onCtaPress={() => {
        router.push("/onboarding/life-chapters");
      }}
      title="Memory Map"
      visual={<MemoryMapVisual />}
    />
  );
}
