"use client";

import { IconRss } from "@tabler/icons-react";

import { EmptyState } from "@imprint/ui";

export default function FeedPage() {
  return (
    <main className="pointer-events-auto flex h-full items-center justify-center pt-[52px]">
      <EmptyState
        icon={IconRss}
        title="Лента"
        description="появится позже"
      />
    </main>
  );
}
