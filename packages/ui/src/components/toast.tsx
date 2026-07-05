"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

import { cn } from "../lib/cn";

export interface ToasterProps {
  className?: string;
}

export function Toaster({ className }: ToasterProps) {
  return (
    <SonnerToaster
      theme="dark"
      className={className}
      toastOptions={{
        classNames: {
          toast: cn(
            "bg-night-800 border border-line shadow-float text-ink-primary",
            "!rounded-card",
          ),
          title: "text-ink-primary",
          description: "text-ink-secondary",
        },
      }}
    />
  );
}

export { toast };
