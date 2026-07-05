"use client";

import { IconRoute } from "@tabler/icons-react";

import { EmptyState } from "@imprint/ui";

export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-night-900">
      <EmptyState
        icon={IconRoute}
        title="Онбординг"
        description="Онбординг появится в следующей задаче"
      />
    </main>
  );
}
