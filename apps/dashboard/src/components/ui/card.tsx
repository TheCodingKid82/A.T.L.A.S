import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className = "", hover = false, ...props }: CardProps) {
  return (
    <div
      className={`bg-atlas-surface border border-atlas-border rounded-xl ${
        hover ? "hover:border-atlas-accent/30 transition-colors cursor-pointer" : ""
      } ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 border-b border-atlas-border ${className}`} {...props} />;
}

export function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 ${className}`} {...props} />;
}
