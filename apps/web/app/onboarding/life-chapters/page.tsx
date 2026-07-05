import { OnboardingScaffold } from "../../../components/onboarding/OnboardingScaffold";

export default function OnboardingLifeChaptersPage() {
  return (
    <OnboardingScaffold
      body="Group memories into arcs — trips, eras, relationships."
      ctaHref="/onboarding/first-memory"
      ctaLabel="Next →"
      title="Life Chapters"
    />
  );
}
