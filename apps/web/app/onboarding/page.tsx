import { ImprintGlobeVisual } from "../../components/onboarding/ImprintGlobeVisual";
import { OnboardingScaffold } from "../../components/onboarding/OnboardingScaffold";

export default function OnboardingWelcomePage() {
  return (
    <OnboardingScaffold
      body="Every moment. Every place. Your story."
      ctaHref="/onboarding/memory-map"
      ctaLabel="Get started →"
      title="Your life, mapped."
      visual={<ImprintGlobeVisual />}
    />
  );
}
