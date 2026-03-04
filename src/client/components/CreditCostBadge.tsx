import { CREDIT_COSTS, CreditActionType } from "../../credits/creditConfig";
import { Badge } from "./ui/badge";

interface CreditCostBadgeProps {
  actionType: CreditActionType;
  multiplier?: number;
  className?: string;
}

export function CreditCostBadge({
  actionType,
  multiplier = 1,
  className,
}: CreditCostBadgeProps) {
  const cost = CREDIT_COSTS[actionType] * multiplier;
  return (
    <Badge variant="secondary" className={className}>
      {cost} credit{cost !== 1 ? "s" : ""}
    </Badge>
  );
}
