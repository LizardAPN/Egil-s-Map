import { type ReactNode } from "react";

import { cn } from "@imprint/ui";

export function AppPagePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className="flex h-full pt-[52px]">
      <div
        className={cn(
          "pointer-events-auto m-4 w-full max-w-md rounded-sheet border border-line bg-night-900/90 p-4 backdrop-blur-md shadow-float",
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}
