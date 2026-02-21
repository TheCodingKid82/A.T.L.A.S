import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "critical";
}

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-atlas-border text-atlas-text-muted",
    success: "bg-atlas-success/10 text-atlas-success",
    warning: "bg-atlas-warning/10 text-atlas-warning",
    error: "bg-atlas-error/10 text-atlas-error",
    critical: "bg-atlas-critical/10 text-atlas-critical",
    info: "bg-atlas-accent/10 text-atlas-accent",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
