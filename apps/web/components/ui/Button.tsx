import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "app-btn-primary"
      : variant === "secondary"
        ? "app-btn-secondary"
        : "app-btn-ghost";

  return (
    <button type="button" className={`app-btn ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
