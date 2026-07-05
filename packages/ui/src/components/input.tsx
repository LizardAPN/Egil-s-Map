"use client";

import { forwardRef, useId } from "react";

import { cn } from "../lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, errorMessage, id: idProp, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const errorId = error && errorMessage ? `${id}-error` : undefined;

    return (
      <div className="w-full">
        <input
          ref={ref}
          id={id}
          suppressHydrationWarning
          className={cn(
            "h-10 w-full rounded-control border bg-night-800 px-3 text-sm text-ink-primary placeholder:text-ink-muted",
            "focus:border-line-strong focus:outline-none focus:ring-1 focus:ring-amber/25",
            error ? "border-danger" : "border-line",
            className,
          )}
          aria-invalid={error ?? undefined}
          aria-describedby={errorId}
          {...props}
        />
        {error && errorMessage ? (
          <p id={errorId} className="mt-1.5 text-xs text-danger" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
