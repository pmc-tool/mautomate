import { Badge } from "../../../../client/components/ui/badge";
import { cn } from "../../../../client/utils";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  resolved: "bg-blue-100 text-blue-700 border-blue-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
};

const HANDLER_STYLES: Record<string, string> = {
  ai: "bg-purple-100 text-purple-700 border-purple-200",
  human: "bg-blue-100 text-blue-700 border-blue-200",
  queued: "bg-orange-100 text-orange-700 border-orange-200",
};

interface StatusBadgeProps {
  status: string;
  type?: "status" | "handler";
  className?: string;
}

export function StatusBadge({ status, type = "status", className }: StatusBadgeProps) {
  const styles = type === "handler" ? HANDLER_STYLES : STATUS_STYLES;
  const style = styles[status] || "bg-gray-100 text-gray-500";

  const label = type === "handler"
    ? status === "ai" ? "AI" : status === "human" ? "Human" : "Queued"
    : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", style, className)}>
      {label}
    </Badge>
  );
}
