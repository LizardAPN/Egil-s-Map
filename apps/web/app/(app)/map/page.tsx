"use client";

import { IconMap } from "@tabler/icons-react";

import { EmptyState } from "@imprint/ui";

export default function MapPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-night-900">
      <EmptyState
        icon={IconMap}
        title="Карта скоро"
        description="Карта появится в следующей задаче"
      />
    </main>
  );
}
