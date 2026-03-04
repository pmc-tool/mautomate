import { cn } from "../../../client/utils";
import { Badge } from "../../../client/components/ui/badge";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; dotClass: string; animate?: boolean }
> = {
  draft: { label: "Draft", variant: "secondary", dotClass: "bg-gray-400" },
  queued: { label: "Queued", variant: "outline", dotClass: "bg-yellow-400", animate: true },
  processing: { label: "Processing", variant: "outline", dotClass: "bg-blue-400", animate: true },
  completed: { label: "Completed", variant: "default", dotClass: "bg-green-400" },
  failed: { label: "Failed", variant: "destructive", dotClass: "bg-red-400" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <Badge variant={config.variant} className={cn("gap-1.5", className)}>
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          config.dotClass,
          config.animate && "animate-pulse",
        )}
      />
      {config.label}
    </Badge>
  );
}
