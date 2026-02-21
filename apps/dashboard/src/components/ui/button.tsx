import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
      primary: "bg-atlas-accent text-white hover:bg-atlas-accent-hover",
      secondary: "bg-atlas-border text-atlas-text hover:bg-atlas-border/80",
      ghost: "text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-border/50",
      danger: "bg-atlas-error text-white hover:bg-atlas-error/80",
    };
    const sizes = {
      sm: "px-2.5 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
