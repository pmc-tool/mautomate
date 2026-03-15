import {
  CREDIT_COSTS,
  CreditActionType,
  QUALITY_TIERS,
  getStoryCreditAction,
} from "../../../credits/creditConfig";
import type { StoryQuality } from "../../../credits/creditConfig";
import { Coins } from "lucide-react";

const BRAND = "#bd711d";

interface CostEstimateProps {
  sceneCount: number;
  quality: StoryQuality;
  targetDuration: number;
}

export function CostEstimate({ sceneCount, quality, targetDuration }: CostEstimateProps) {
  const planCost = CREDIT_COSTS[CreditActionType.StoryPlan];
  const creditAction = getStoryCreditAction(quality, sceneCount);
  const generationCost = CREDIT_COSTS[creditAction];
  // Plan cost was already charged in Step 1 — only show generation cost as "remaining"
  const totalRemaining = generationCost;

  const tier = QUALITY_TIERS.find((t) => t.id === quality) || QUALITY_TIERS[0];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Coins className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-foreground">Credit Estimate</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Story planning</span>
          <span className="font-medium text-muted-foreground">{planCost} credits (already charged)</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>
            {tier.label} quality · {sceneCount} scene{sceneCount !== 1 ? "s" : ""} · ~{targetDuration}s
          </span>
          <span className="font-medium text-foreground">{generationCost} credits</span>
        </div>
        <div className="my-2 border-t border-border" />
        <div className="flex items-center justify-between font-semibold">
          <span className="text-foreground">Cost to generate</span>
          <span style={{ color: BRAND }}>{totalRemaining} credits</span>
        </div>
      </div>

      {/* Per-tier comparison */}
      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Compare quality tiers
        </p>
        <div className="grid grid-cols-3 gap-2">
          {QUALITY_TIERS.map((t) => {
            const action = getStoryCreditAction(t.id, sceneCount);
            const cost = CREDIT_COSTS[action];
            const isActive = t.id === quality;
            return (
              <div
                key={t.id}
                className={`rounded-lg p-2 text-center text-xs ${
                  isActive ? "ring-1" : "bg-muted/50"
                }`}
                style={
                  isActive
                    ? { backgroundColor: `${BRAND}10`, borderColor: BRAND }
                    : undefined
                }
              >
                <p className="font-semibold text-foreground">{t.label}</p>
                <p className="text-muted-foreground">{t.description.split("·")[0].trim()}</p>
                <p className="mt-1 font-bold" style={{ color: isActive ? BRAND : undefined }}>
                  {cost} cr
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
