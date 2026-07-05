"use client";

import { IconMapPin } from "@tabler/icons-react";
import { useState } from "react";

import {
  createBrowserClient,
  getById,
  listInBounds,
  WORLD_BBOX,
} from "@imprint/api";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  Input,
  MonthPicker,
  Pill,
  Sheet,
  Skeleton,
  Textarea,
  Toaster,
  toast,
  type MonthValue,
} from "@imprint/ui";

import { CHAPTER_COLORS } from "../../../lib/chapter-colors";

const DEMO_PRIVATE_PIN_ID = "00000000-0000-0000-0000-000000000106";

interface PinProbeItem {
  id: string;
  title: string;
  visibility: string;
  locationExact: boolean;
}

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
  const [monthValue, setMonthValue] = useState<MonthValue | null>(null);
  const [boundedMonth, setBoundedMonth] = useState<MonthValue | null>(null);
  const [pinProbe, setPinProbe] = useState<PinProbeItem[] | null>(null);
  const [pinProbeLoading, setPinProbeLoading] = useState(false);
  const [privatePinProbe, setPrivatePinProbe] = useState<string | null>(null);
  const [privatePinLoading, setPrivatePinLoading] = useState(false);

  async function runPinProbe() {
    setPinProbeLoading(true);
    try {
      const supabase = createBrowserClient();
      const pins = await listInBounds(supabase, { bbox: WORLD_BBOX });
      setPinProbe(
        pins.map((pin) => ({
          id: pin.id,
          title: pin.title,
          visibility: pin.visibility,
          locationExact: pin.locationExact,
        })),
      );
    } catch (error) {
      setPinProbe([
        {
          id: "error",
          title: error instanceof Error ? error.message : "Probe failed",
          visibility: "error",
          locationExact: false,
        },
      ]);
    } finally {
      setPinProbeLoading(false);
    }
  }

  async function runPrivatePinProbe() {
    setPrivatePinLoading(true);
    try {
      const supabase = createBrowserClient();
      const pin = await getById(supabase, DEMO_PRIVATE_PIN_ID);
      setPrivatePinProbe(pin === null ? "null (RLS blocked)" : pin.body ?? "(empty body)");
    } catch (error) {
      setPrivatePinProbe(
        error instanceof Error ? error.message : "Probe failed",
      );
    } finally {
      setPrivatePinLoading(false);
    }
  }

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
          Playfair Display brings book-like warmth to chapter titles.
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

      <Section title="Month picker">
        <div className="grid max-w-md gap-4">
          <MonthPicker value={monthValue} onChange={setMonthValue} />
          <MonthPicker
            value={boundedMonth}
            onChange={setBoundedMonth}
            min={{ year: 2024, month: 6 }}
            max={{ year: 2026, month: 3 }}
            placeholder="С ограничениями"
          />
          <MonthPicker
            value={{ year: 2025, month: 1 }}
            onChange={() => undefined}
            error
            errorMessage="Конец не может быть раньше начала"
          />
          <p className="font-mono text-sm text-ink-secondary">
            Selected:{" "}
            {monthValue
              ? `${String(monthValue.year)}-${String(monthValue.month).padStart(2, "0")}`
              : "null"}
          </p>
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
              key={chapter.id}
              label={chapter.label}
              color={chapter.hex}
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

      <Section title="API probe (dev only — remove P2.2)">
        <p className="text-sm text-ink-secondary">
          Calls listInBounds (world bbox) and getById for demo private pin
          ...106. Log in as demo@imprint.dev vs a fresh test user to verify RLS.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            loading={pinProbeLoading}
            onClick={() => void runPinProbe()}
          >
            Probe listInBounds
          </Button>
          <Button
            variant="secondary"
            loading={privatePinLoading}
            onClick={() => void runPrivatePinProbe()}
          >
            Probe pin_by_id (private)
          </Button>
        </div>
        {pinProbe !== null ? (
          <pre className="max-h-96 overflow-auto rounded-card border border-night-700 bg-night-800 p-4 font-mono text-xs text-ink-body">
            {JSON.stringify(pinProbe, null, 2)}
          </pre>
        ) : null}
        {privatePinProbe !== null ? (
          <p className="font-mono text-sm text-ink-secondary">
            pin_by_id ...106: {privatePinProbe}
          </p>
        ) : null}
      </Section>

      <Toaster />
    </div>
  );
}
