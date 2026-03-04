import { cn } from "../../../client/utils";
import { Badge } from "../../../client/components/ui/badge";
import { Coins } from "lucide-react";

const TIER_COLORS = {
  budget: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  standard: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  premium: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

interface CreditCostDisplayProps {
  cost: number;
  tier: "budget" | "standard" | "premium";
  className?: string;
  showTier?: boolean;
}

export function CreditCostDisplay({ cost, tier, className, showTier = true }: CreditCostDisplayProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Badge variant="outline" className={cn("gap-1 font-medium", TIER_COLORS[tier])}>
        <Coins className="h-3 w-3" />
        {cost} credits
      </Badge>
      {showTier && (
        <span className="text-muted-foreground text-xs capitalize">{tier}</span>
      )}
    </div>
  );
}
