import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full bg-atlas-bg border border-atlas-border rounded-lg px-3 py-2 text-sm text-atlas-text placeholder:text-atlas-text-muted focus:outline-none focus:ring-2 focus:ring-atlas-accent/50 focus:border-atlas-accent ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => (
  <textarea
    ref={ref}
    className={`w-full bg-atlas-bg border border-atlas-border rounded-lg px-3 py-2 text-sm text-atlas-text placeholder:text-atlas-text-muted focus:outline-none focus:ring-2 focus:ring-atlas-accent/50 focus:border-atlas-accent resize-none ${className}`}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className = "", ...props }, ref) => (
  <select
    ref={ref}
    className={`w-full bg-atlas-bg border border-atlas-border rounded-lg px-3 py-2 text-sm text-atlas-text focus:outline-none focus:ring-2 focus:ring-atlas-accent/50 focus:border-atlas-accent ${className}`}
    {...props}
  />
));
Select.displayName = "Select";
