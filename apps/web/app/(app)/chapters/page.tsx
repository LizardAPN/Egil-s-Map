"use client";

import { IconBooks } from "@tabler/icons-react";

import { EmptyState } from "@imprint/ui";

export default function ChaptersPage() {
  return (
    <main className="pointer-events-auto flex h-full items-center justify-center pt-[52px]">
      <EmptyState
        icon={IconBooks}
        title="Главы"
        description="появится позже"
      />
    </main>
  );
}
