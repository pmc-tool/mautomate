import { Coins, AlertTriangle } from "lucide-react";
import { Link } from "react-router";
import { useQuery, getCreditsBalance } from "wasp/client/operations";
import { cn } from "../utils";

export function CreditsWidget() {
  const { data: balance, isLoading } = useQuery(getCreditsBalance);

  if (isLoading || !balance) {
    return null;
  }

  const { totalBalance, planAllotment, planName } = balance;
  const isLow = planAllotment > 0 && totalBalance < planAllotment * 0.1;

  return (
    <Link
      to="/account"
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent",
        isLow && "border-yellow-500/50 bg-yellow-500/5",
      )}
    >
      <Coins className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="font-medium">
          {totalBalance.toLocaleString()} credits
        </span>
        {planAllotment > 0 && (
          <div className="mt-0.5 h-1.5 w-20 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isLow ? "bg-yellow-500" : "bg-primary",
              )}
              style={{
                width: `${Math.min((totalBalance / planAllotment) * 100, 100)}%`,
              }}
            />
          </div>
        )}
      </div>
      {isLow && (
        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
      )}
    </Link>
  );
}
