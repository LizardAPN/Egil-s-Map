"use client";

import type { EchoNotificationCandidate } from "@imprint/api/echoes";

interface EchoToastProps {
  echo: EchoNotificationCandidate | null;
  onDismiss: () => void;
}

export function EchoToast({ echo, onDismiss }: EchoToastProps) {
  if (!echo) {
    return null;
  }

  return (
    <div className="app-echo-toast" role="status">
      <strong>{echo.author.username}</strong> was here · {echo.timeAgoLabel}
      <button type="button" className="app-sheet-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
