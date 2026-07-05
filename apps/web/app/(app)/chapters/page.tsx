"use client";

import { IconBooks } from "@tabler/icons-react";

import { EmptyState } from "@imprint/ui";

import { AppPagePanel } from "../../../components/app/app-page-panel";

export default function ChaptersPage() {
  return (
    <AppPagePanel>
      <EmptyState
        icon={IconBooks}
        title="Главы"
        description="появится позже"
      />
    </AppPagePanel>
  );
}
