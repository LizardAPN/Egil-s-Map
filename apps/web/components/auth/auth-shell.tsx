"use client";

import { type ReactNode } from "react";

import { Card } from "@imprint/ui";

function DecorativeArc() {
  const dots = Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 23) * Math.PI;
    const x = 200 + Math.cos(angle) * 180;
    const y = 120 + Math.sin(angle) * 80;
    return { x, y, key: index };
  });

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
    >
      {dots.map((dot) => (
        <circle
          key={dot.key}
          cx={dot.x}
          cy={dot.y}
          r={3}
          className="fill-ink-muted/20"
        />
      ))}
    </svg>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-night-950 px-4 py-12">
      <DecorativeArc />
      <Card className="relative z-10 w-full max-w-[400px] border-line p-8">
        {children}
      </Card>
    </div>
  );
}
