"use client";

import { IconRss } from "@tabler/icons-react";

import { EmptyState } from "@imprint/ui";

import { AppPagePanel } from "../../../components/app/app-page-panel";

export default function FeedPage() {
  return (
    <AppPagePanel>
      <EmptyState
        icon={IconRss}
        title="Лента"
        description="появится позже"
      />
    </AppPagePanel>
  );
}
