"use client";

import { forwardRef } from "react";

import { cn } from "../lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-card border border-line bg-night-800",
        hoverable &&
          "transition-colors duration-150 hover:border-line-strong hover:bg-night-700",
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";
