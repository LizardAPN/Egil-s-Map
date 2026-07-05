"use client";

import { type TablerIcon } from "@tabler/icons-react";
import { type ReactNode } from "react";

import { cn } from "../lib/cn";

export interface EmptyStateProps {
  icon: TablerIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <Icon
        size={40}
        stroke={1.5}
        className="text-ink-muted"
        aria-hidden="true"
      />
      <h3 className="mt-4 font-display text-xl text-ink-cream">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-ink-secondary">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
