"use client";

import { IconRoute } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrowserClient, updateMyProfile } from "@imprint/api";
import { Button, EmptyState } from "@imprint/ui";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      await updateMyProfile(supabase, { isOnboarded: true });
      router.push("/map");
      router.refresh();
    } catch {
      setError("Не удалось продолжить. Попробуй ещё раз?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-night-900">
      <EmptyState
        icon={IconRoute}
        title="Онбординг"
        description="Полный онбординг появится позже. Пока можно сразу открыть карту."
        action={
          <div className="space-y-2">
            <Button loading={loading} onClick={() => void handleContinue()}>
              Продолжить на карту
            </Button>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        }
      />
    </main>
  );
}
