"use client";

import { cn } from "../lib/cn";

export interface PillProps extends React.HTMLAttributes<HTMLButtonElement> {
  label: string;
  color?: string;
  selected?: boolean;
  as?: "span" | "button";
}

export function Pill({
  label,
  color,
  selected = false,
  as = "span",
  className,
  ...props
}: PillProps) {
  const Component = as === "button" ? "button" : "span";

  return (
    <Component
      type={as === "button" ? "button" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors",
        selected
          ? "border-amber bg-night-700 text-ink-primary"
          : "border-line bg-night-800 text-ink-secondary hover:border-line-strong",
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
    </Component>
  );
}
