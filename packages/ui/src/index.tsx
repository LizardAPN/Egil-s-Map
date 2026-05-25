import type { ReactNode } from "react";

export interface ScreenContainerProps {
  children: ReactNode;
}

export function ScreenContainer({ children }: ScreenContainerProps) {
  return children;
}
