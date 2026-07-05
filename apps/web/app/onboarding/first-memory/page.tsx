"use client";

import { fetchIpCityLocation } from "@imprint/api/browser";
import { setOnboardingState } from "@imprint/api/users";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingScaffold } from "../../../components/onboarding/OnboardingScaffold";
import { formatImprintError } from "../../../lib/auth";

async function resolveCreatePinCoordinates() {
  if (typeof navigator !== "undefined" && "geolocation" in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          maximumAge: 60_000,
          timeout: 8_000
        });
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch {
      // Fall back to IP city when location permission is denied or unavailable.
    }
  }

  const ipCity = await fetchIpCityLocation();
  return ipCity.coordinates;
}

export default function OnboardingFirstMemoryPage() {
  const router = useRouter();
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinish = async () => {
    setInlineError(null);
    setIsFinishing(true);

    try {
      const coordinates = await resolveCreatePinCoordinates();
      await setOnboardingState(true);
      router.push(
        `/create-pin?lat=${encodeURIComponent(String(coordinates.latitude))}&lng=${encodeURIComponent(String(coordinates.longitude))}`
      );
    } catch (error) {
      setInlineError(formatImprintError(error));
      setIsFinishing(false);
    }
  };

  return (
    <OnboardingScaffold
      body="Drop your first pin — default private, always yours."
      ctaBusy={isFinishing}
      ctaLabel="Finish onboarding"
      inlineError={inlineError}
      onCtaClick={() => {
        void handleFinish();
      }}
      title="First memory"
    />
  );
}
