"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { IconX } from "@tabler/icons-react";
import { type ReactNode } from "react";

import { cn } from "../lib/cn";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: "right" | "bottom";
  blocking?: boolean;
  children: ReactNode;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  side = "right",
  blocking = true,
  children,
}: SheetProps) {
  const isRight = side === "right";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={blocking}>
      <DialogPrimitive.Portal>
        {blocking ? (
          <DialogPrimitive.Overlay
            className={cn(
              "fixed inset-0 z-50 bg-night-950/60",
              "data-[state=open]:animate-overlay-enter data-[state=closed]:animate-overlay-exit",
              "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none motion-reduce:opacity-100",
            )}
          />
        ) : null}
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col border-line bg-night-800 shadow-float focus:outline-none",
            !blocking && "pointer-events-auto",
            isRight
              ? [
                  "inset-y-0 right-0 h-full w-[400px] border-l rounded-l-sheet",
                  "data-[state=open]:animate-sheet-enter-right data-[state=closed]:animate-sheet-exit-right",
                ]
              : [
                  "inset-x-0 bottom-0 w-full max-h-[85vh] border-t rounded-t-sheet",
                  "data-[state=open]:animate-sheet-enter-bottom data-[state=closed]:animate-sheet-exit-bottom",
                ],
            "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none motion-reduce:opacity-100 motion-reduce:translate-x-0 motion-reduce:translate-y-0",
          )}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-subtle bg-night-800 px-4 py-3">
            <DialogPrimitive.Title className="text-base font-medium text-ink-primary">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="rounded-control p-1 text-ink-secondary transition-colors hover:bg-night-700 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25"
              aria-label="Close"
            >
              <IconX size={18} stroke={1.5} />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
