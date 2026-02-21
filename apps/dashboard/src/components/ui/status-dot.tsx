interface StatusDotProps {
  status: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  ONLINE: "bg-atlas-success",
  OFFLINE: "bg-atlas-text-muted",
  ERROR: "bg-atlas-error",
  PROCESSING: "bg-atlas-warning animate-pulse",
  HEALTHY: "bg-atlas-success",
  UNHEALTHY: "bg-atlas-error",
  UNKNOWN: "bg-atlas-text-muted",
};

export function StatusDot({ status, className = "" }: StatusDotProps) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        statusColors[status] || "bg-atlas-text-muted"
      } ${className}`}
    />
  );
}
