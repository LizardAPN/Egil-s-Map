"use client";

import { type ReactNode } from "react";

import { Card } from "@imprint/ui";

import { OnboardingBackdrop } from "../onboarding/OnboardingBackdrop";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-night-950 px-4 py-12">
      <OnboardingBackdrop />
      <Card className="relative z-10 w-full max-w-[400px] border-line p-8">
        {children}
      </Card>
    </div>
  );
}
