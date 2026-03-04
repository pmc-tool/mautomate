import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "../../client/components/ui/card";

interface KpiCardProps {
  title: string;
  value: number;
  delta: number;
  icon: LucideIcon;
  invertDelta?: boolean;
  format?: "number" | "percent";
}

export default function KpiCard({
  title,
  value,
  delta,
  icon: Icon,
  invertDelta = false,
  format = "number",
}: KpiCardProps) {
  const isPositive = invertDelta ? delta <= 0 : delta >= 0;
  const ArrowIcon = delta >= 0 ? ArrowUp : ArrowDown;
  const displayDelta = Math.abs(delta);
  const displayValue = format === "percent" ? `${value}%` : value.toLocaleString();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className="text-foreground text-2xl font-bold">{displayValue}</p>
          </div>
          <div className="bg-primary/10 rounded-full p-3">
            <Icon className="text-primary h-5 w-5" />
          </div>
        </div>
        {delta !== 0 && (
          <div className="mt-3 flex items-center gap-1 text-sm">
            <ArrowIcon
              className={`h-3.5 w-3.5 ${isPositive ? "text-emerald-500" : "text-red-500"}`}
            />
            <span className={isPositive ? "text-emerald-500" : "text-red-500"}>
              {displayDelta}%
            </span>
            <span className="text-muted-foreground">vs prior period</span>
          </div>
        )}
        {delta === 0 && (
          <div className="mt-3 flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">No change vs prior period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
