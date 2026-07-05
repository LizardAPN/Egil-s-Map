"use client";

import { IconMapPin } from "@tabler/icons-react";
import { useState } from "react";

import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Input,
  Pill,
  Sheet,
  Skeleton,
  Textarea,
  Toaster,
  toast,
} from "@imprint/ui";

const CHAPTER_COLORS = [
  { label: "Amber", color: "var(--color-ch-amber)" },
  { label: "Teal", color: "var(--color-ch-teal)" },
  { label: "Coral", color: "var(--color-ch-coral)" },
  { label: "Lime", color: "var(--color-ch-lime)" },
  { label: "Sky", color: "var(--color-ch-sky)" },
  { label: "Lilac", color: "var(--color-ch-lilac)" },
  { label: "Rose", color: "var(--color-ch-rose)" },
  { label: "Ice", color: "var(--color-ch-ice)" },
] as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl text-ink-cream">{title}</h2>
      {children}
    </section>
  );
}

export default function DevUiPage() {
  const [rightSheetOpen, setRightSheetOpen] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen space-y-16 bg-night-900 p-8">
      <header>
        <h1 className="font-display text-4xl text-ink-cream">UI showcase</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Dark Atlas design system — dev only
        </p>
      </header>

      <Section title="Typography">
        <p className="max-w-prose text-ink-body">
          Inter is the workhorse for UI copy and story text. It stays readable
          on deep night backgrounds without stealing focus from the map.
        </p>
        <p className="font-display text-xl text-ink-cream">
          Fraunces brings book-like warmth to chapter titles.
        </p>
        <p className="font-mono text-sm text-ink-secondary">
          2024-03-15 · 59.9139° N, 10.7522° E
        </p>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="sm">
            Primary sm
          </Button>
          <Button variant="primary" size="md">
            Primary md
          </Button>
          <Button variant="secondary" size="sm">
            Secondary sm
          </Button>
          <Button variant="secondary" size="md">
            Secondary md
          </Button>
          <Button variant="ghost" size="sm">
            Ghost sm
          </Button>
          <Button variant="ghost" size="md">
            Ghost md
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Input and textarea">
        <div className="grid max-w-md gap-4">
          <Input placeholder="Memory title" />
          <Input
            error
            errorMessage="Couldn't save your memory. Try again?"
            defaultValue="Broken value"
          />
          <Textarea placeholder="What happened here?" />
          <Textarea
            error
            errorMessage="Story text is required."
            defaultValue=""
          />
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid max-w-md gap-4">
          <Card className="p-4">
            <p className="text-sm text-ink-primary">Static card</p>
            <p className="mt-1 text-xs text-ink-secondary">
              Border and background only — no shadow.
            </p>
          </Card>
          <Card hoverable className="cursor-default p-4">
            <p className="text-sm text-ink-primary">Hoverable card</p>
            <p className="mt-1 text-xs text-ink-secondary">
              Hover to see night-700 lift.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Chapter pills">
        <div className="flex flex-wrap gap-2">
          {CHAPTER_COLORS.map((chapter) => (
            <Pill
              key={chapter.label}
              label={chapter.label}
              color={chapter.color}
            />
          ))}
        </div>
      </Section>

      <Section title="Skeleton">
        <div className="max-w-md space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full rounded-card" />
        </div>
      </Section>

      <Section title="Empty state">
        <Card className="max-w-md">
          <EmptyState
            icon={IconMapPin}
            title="Drop your first pin"
            description="Tap the map to mark a place that matters."
            action={<Button size="sm">Add a memory</Button>}
          />
        </Card>
      </Section>

      <Section title="Sheet">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setRightSheetOpen(true);
            }}
          >
            Open right sheet
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setBottomSheetOpen(true);
            }}
          >
            Open bottom sheet
          </Button>
        </div>
        <Sheet
          open={rightSheetOpen}
          onOpenChange={setRightSheetOpen}
          title="Create memory"
          side="right"
        >
          <p className="text-sm text-ink-body">
            Side sheet for pin creation — place, date, title, and visibility.
          </p>
        </Sheet>
        <Sheet
          open={bottomSheetOpen}
          onOpenChange={setBottomSheetOpen}
          title="Quick actions"
          side="bottom"
        >
          <p className="text-sm text-ink-body">
            Bottom sheet for mobile-friendly panels.
          </p>
        </Sheet>
      </Section>

      <Section title="Dialog">
        <Button
          variant="secondary"
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          Open confirm dialog
        </Button>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Delete this memory?"
          description="This can't be undone. The pin will disappear from your map."
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setDialogOpen(false);
            }}
          >
            Delete
          </Button>
        </Dialog>
      </Section>

      <Section title="Toast">
        <Button
          variant="secondary"
          onClick={() => toast("Memory saved")}
        >
          Show toast
        </Button>
      </Section>

      <Toaster />
    </div>
  );
}
