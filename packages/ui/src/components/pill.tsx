"use client";

import { cn } from "../lib/cn";

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  color?: string;
}

export function Pill({ label, color, className, ...props }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line bg-night-800 px-3 py-1 text-sm text-ink-secondary",
        className,
      )}
      {...props}
    >
      {color ? (
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      ) : null}
      {label}
    </span>
  );
}
