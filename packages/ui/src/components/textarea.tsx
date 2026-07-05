"use client";

import { forwardRef, useId } from "react";

import { cn } from "../lib/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  errorMessage?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, errorMessage, id: idProp, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const errorId = error && errorMessage ? `${id}-error` : undefined;

    return (
      <div className="w-full">
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "min-h-24 w-full resize-y rounded-control border bg-night-800 px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted",
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

Textarea.displayName = "Textarea";
