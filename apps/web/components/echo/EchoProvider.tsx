"use client";

import type { EchoNotificationCandidate } from "@imprint/api/echoes";
import { useEffect, useState } from "react";
import { checkEchoesAtLocation } from "../../lib/echo-service";
import { EchoToast } from "./EchoToast";

export function EchoProvider({ children }: { children: React.ReactNode }) {
  const [echo, setEcho] = useState<EchoNotificationCandidate | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        void checkEchoesAtLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }).then((candidate) => {
          if (candidate) {
            setEcho(candidate);
          }
        });
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 30_000 }
    );

    return () => { navigator.geolocation.clearWatch(watchId); };
  }, []);

  return (
    <>
      {children}
      <EchoToast echo={echo} onDismiss={() => { setEcho(null); }} />
    </>
  );
}
