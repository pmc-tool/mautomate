import { CREDIT_COSTS, CreditActionType } from "../../../credits/creditConfig";
import { Coins } from "lucide-react";

interface CostEstimateProps {
  sceneCount: number;
  resolution: string;
  targetDuration: number;
}

export function CostEstimate({ sceneCount, resolution, targetDuration }: CostEstimateProps) {
  const planCost = CREDIT_COSTS[CreditActionType.StoryPlan];
  const generationCost =
    targetDuration <= 60
      ? CREDIT_COSTS[CreditActionType.StoryBasic]
      : CREDIT_COSTS[CreditActionType.StoryStandard];
  const totalCost = planCost + generationCost;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Coins className="h-5 w-5 text-yellow-400" />
        <h3 className="font-semibold text-white">Credit Estimate</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-gray-300">
          <span>Story planning</span>
          <span className="font-medium text-white">{planCost} credits</span>
        </div>
        <div className="flex items-center justify-between text-gray-300">
          <span>
            Video generation ({sceneCount} scene{sceneCount !== 1 ? "s" : ""}, {resolution},{" "}
            ~{targetDuration}s)
          </span>
          <span className="font-medium text-white">{generationCost} credits</span>
        </div>
        <div className="my-2 border-t border-gray-700" />
        <div className="flex items-center justify-between font-semibold">
          <span className="text-white">Total</span>
          <span className="text-yellow-400">{totalCost} credits</span>
        </div>
      </div>
    </div>
  );
}
