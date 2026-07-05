import { forwardRef } from "react";

import { cn } from "../lib/cn";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
}

export const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size = 16, ...props }, ref) => (
    <svg
      ref={ref}
      className={cn("animate-spin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  ),
);

Spinner.displayName = "Spinner";
