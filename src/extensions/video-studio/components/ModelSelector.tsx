import { VIDEO_MODELS, type VideoModel } from "../modelRegistry";
import { cn } from "../../../client/utils";
import { Card, CardContent } from "../../../client/components/ui/card";
import { Badge } from "../../../client/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../client/components/ui/tooltip";
import { Sparkles, Zap, Coins, Volume2, Wand2, Check } from "lucide-react";
import { CreditCostDisplay } from "./CreditCostDisplay";

interface ModelSelectorProps {
  type: "ttv" | "itv" | "upscale" | "avatar";
  selectedKey: string;
  onSelect: (model: VideoModel) => void;
}

const TIER_ICONS = {
  budget: Coins,
  standard: Zap,
  premium: Sparkles,
};

const TIER_BORDER = {
  budget: "hover:border-green-400 dark:hover:border-green-600",
  standard: "hover:border-blue-400 dark:hover:border-blue-600",
  premium: "hover:border-[#bd711d] dark:hover:border-[#d4923e]",
};

const TIER_SELECTED = {
  budget: "border-green-500 ring-green-500/20 dark:border-green-400",
  standard: "border-blue-500 ring-blue-500/20 dark:border-blue-400",
  premium: "border-[#bd711d] ring-[#bd711d]/20 dark:border-[#d4923e]",
};

const TIER_GRADIENT = {
  budget: "from-green-500/5 to-transparent",
  standard: "from-blue-500/5 to-transparent",
  premium: "from-[#bd711d]/5 to-transparent",
};

export function ModelSelector({ type, selectedKey, onSelect }: ModelSelectorProps) {
  const models = VIDEO_MODELS.filter((m) => m.type === type);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => {
          const TierIcon = TIER_ICONS[model.tier];
          const isSelected = model.key === selectedKey;

          return (
            <Card
              key={model.key}
              data-slot="model-card"
              onClick={() => onSelect(model)}
              className={cn(
                "relative cursor-pointer overflow-hidden border-2 transition-all",
                isSelected
                  ? cn(TIER_SELECTED[model.tier], "ring-2")
                  : cn("border-border", TIER_BORDER[model.tier]),
              )}
            >
              {/* Gradient background */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity",
                  isSelected ? "opacity-100" : "group-hover:opacity-100",
                  TIER_GRADIENT[model.tier],
                )}
              />

              <CardContent className="relative p-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TierIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-foreground text-sm font-semibold leading-tight">
                      {model.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="bg-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                      <Check className="text-primary-foreground h-3 w-3" />
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {model.description}
                </p>

                {/* Capability badges */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {model.supportsAudio && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                          <Volume2 className="h-2.5 w-2.5" />
                          Audio
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Generates audio with video</TooltipContent>
                    </Tooltip>
                  )}
                  {model.supportsEnhancePrompt && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                          <Wand2 className="h-2.5 w-2.5" />
                          Enhance
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>AI prompt enhancement</TooltipContent>
                    </Tooltip>
                  )}
                  {model.supportsFirstLastFrame && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      First/Last
                    </Badge>
                  )}
                  {model.supportsReferenceImages && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      Reference
                    </Badge>
                  )}
                </div>

                {/* Credit cost */}
                <div className="mt-3">
                  <CreditCostDisplay cost={model.creditCost} tier={model.tier} showTier={false} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
