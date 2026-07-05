import { type ReactNode } from "react";

import { Card } from "@imprint/ui";

import { OnboardingBackdrop } from "./OnboardingBackdrop";
import { OnboardingProgress } from "./OnboardingProgress";

export function OnboardingShell({
  step,
  children,
}: {
  step: 1 | 2 | 3;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-night-950 px-4 py-12">
      <OnboardingBackdrop />
      <div className="relative z-10 w-full max-w-[480px] space-y-6">
        <OnboardingProgress step={step} />
        <Card className="border-line p-8">{children}</Card>
      </div>
    </main>
  );
}
