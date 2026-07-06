"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrowserClient, updateMyProfile } from "@imprint/api";

import { OnboardingShell } from "../../components/onboarding/OnboardingShell";
import { ChapterStep } from "../../components/onboarding/steps/ChapterStep";
import { ProfileStep } from "../../components/onboarding/steps/ProfileStep";

const PinStep = dynamic(
  () =>
    import("../../components/onboarding/steps/PinStep").then(
      (module) => module.PinStep,
    ),
  { ssr: false },
);

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [chapterId, setChapterId] = useState<string | null>(null);

  async function finish(pinId?: string) {
    const supabase = createBrowserClient();
    await updateMyProfile(supabase, { isOnboarded: true });
    router.replace(pinId ? `/map?pin=${pinId}` : "/map");
    router.refresh();
  }

  return (
    <OnboardingShell step={step}>
      {step === 1 ? (
        <ProfileStep
          onNext={() => {
            setStep(2);
          }}
        />
      ) : null}

      {step === 2 ? (
        <ChapterStep
          existingChapterId={chapterId}
          onBack={() => {
            setStep(1);
          }}
          onNext={(id) => {
            setChapterId(id);
            setStep(3);
          }}
          onSkip={() => {
            setChapterId(null);
            setStep(3);
          }}
        />
      ) : null}

      {step === 3 ? (
        <PinStep
          chapterId={chapterId}
          onBack={() => {
            setStep(2);
          }}
          onFinish={finish}
        />
      ) : null}
    </OnboardingShell>
  );
}
