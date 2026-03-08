import { VIDEO_MODELS, type VideoModel } from "../modelRegistry";
import { cn } from "../../../client/utils";
import { Badge } from "../../../client/components/ui/badge";
import { Check, Sparkles, Zap, Coins, Volume2, Wand2 } from "lucide-react";

interface ModelSelectorProps {
  type: "ttv" | "itv" | "upscale" | "avatar";
  selectedKey: string;
  onSelect: (model: VideoModel) => void;
  recommended?: string;
}

const TIER_CONFIG = {
  premium: {
    label: "Premium",
    subtitle: "Best quality, highest fidelity",
    icon: Sparkles,
    color: "text-[#bd711d]",
    bg: "bg-[#bd711d]/10",
    selectedBorder: "border-[#bd711d] ring-[#bd711d]/20",
    hoverBorder: "hover:border-[#bd711d]/40",
    costColor: "text-[#bd711d]",
  },
  standard: {
    label: "Standard",
    subtitle: "Great balance of quality and cost",
    icon: Zap,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    selectedBorder: "border-blue-500 ring-blue-500/20",
    hoverBorder: "hover:border-blue-400",
    costColor: "text-blue-600",
  },
  budget: {
    label: "Budget",
    subtitle: "Most affordable option",
    icon: Coins,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    selectedBorder: "border-emerald-500 ring-emerald-500/20",
    hoverBorder: "hover:border-emerald-400",
    costColor: "text-emerald-600",
  },
} as const;

const MODEL_PROVIDER: Record<string, string> = {
  veo3: "Google",
  "veo3-fast": "Google",
  "veo31-ttv": "Google",
  "veo31-ttv-fast": "Google",
  wan25: "Wan AI",
  "minimax-hailuo": "Minimax",
  "seedance-pro": "ByteDance",
  hunyuan: "Tencent",
  "kling25-turbo": "Kuaishou",
  "kling25-pro": "Kuaishou",
  "veo31-itv": "Google",
  "veo31-first-last": "Google",
  "veo31-reference": "Google",
  "seedance-itv": "ByteDance",
  "luma-dream": "Luma AI",
  "wan25-itv": "Wan AI",
  "hunyuan-itv": "Tencent",
  "kling3-pro": "Kuaishou",
  "veed-avatar": "VEED",
  "video-upscaler": "fal.ai",
};

export function ModelSelector({
  type,
  selectedKey,
  onSelect,
  recommended,
}: ModelSelectorProps) {
  const models = VIDEO_MODELS.filter((m) => m.type === type);
  const tiers = ["premium", "standard", "budget"] as const;

  return (
    <div className="space-y-6">
      {tiers.map((tier) => {
        const tierModels = models.filter((m) => m.tier === tier);
        if (tierModels.length === 0) return null;
        const cfg = TIER_CONFIG[tier];
        const TierIcon = cfg.icon;

        return (
          <div key={tier}>
            {/* Tier header */}
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg",
                  cfg.bg,
                )}
              >
                <TierIcon className={cn("h-3.5 w-3.5", cfg.color)} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-sm font-semibold", cfg.color)}>
                  {cfg.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  — {cfg.subtitle}
                </span>
              </div>
            </div>

            {/* Model cards */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {tierModels.map((model) => {
                const isSelected = model.key === selectedKey;
                const isRecommended = model.key === recommended;
                const provider = MODEL_PROVIDER[model.key] || "AI";

                return (
                  <button
                    key={model.key}
                    type="button"
                    onClick={() => onSelect(model)}
                    className={cn(
                      "relative w-full text-left rounded-xl border-2 p-4 transition-all",
                      isSelected
                        ? cn(cfg.selectedBorder, "ring-2 bg-card shadow-sm")
                        : cn(
                            "border-border bg-card",
                            cfg.hoverBorder,
                            "hover:shadow-sm",
                          ),
                    )}
                  >
                    {/* Recommended badge */}
                    {isRecommended && !isSelected && (
                      <span className="absolute -top-2.5 right-3 rounded-full bg-[#bd711d] px-2 py-0.5 text-[9px] font-bold text-white shadow-sm tracking-wide uppercase">
                        Best Value
                      </span>
                    )}

                    {/* Header: provider initial + name + check */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                          cfg.bg,
                          cfg.color,
                        )}
                      >
                        {provider[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-foreground leading-tight block truncate">
                          {model.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {provider}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#bd711d]">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground text-[11px] mt-2 leading-relaxed line-clamp-2">
                      {model.description}
                    </p>

                    {/* Capability badges */}
                    {(model.supportsAudio ||
                      model.supportsEnhancePrompt ||
                      model.supportsFirstLastFrame ||
                      model.supportsReferenceImages) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {model.supportsAudio && (
                          <Badge
                            variant="secondary"
                            className="gap-0.5 px-1.5 py-0 text-[9px]"
                          >
                            <Volume2 className="h-2.5 w-2.5" /> Audio
                          </Badge>
                        )}
                        {model.supportsEnhancePrompt && (
                          <Badge
                            variant="secondary"
                            className="gap-0.5 px-1.5 py-0 text-[9px]"
                          >
                            <Wand2 className="h-2.5 w-2.5" /> Enhance
                          </Badge>
                        )}
                        {model.supportsFirstLastFrame && (
                          <Badge
                            variant="secondary"
                            className="px-1.5 py-0 text-[9px]"
                          >
                            First/Last
                          </Badge>
                        )}
                        {model.supportsReferenceImages && (
                          <Badge
                            variant="secondary"
                            className="px-1.5 py-0 text-[9px]"
                          >
                            Reference
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Footer: specs + cost */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground">
                        {model.durations.length > 0 &&
                          `${model.durations.join("/")}s`}
                        {model.aspectRatios.length > 0 &&
                          ` · ${model.aspectRatios.length} ratios`}
                      </span>
                      <span className={cn("text-xs font-bold", cfg.costColor)}>
                        {model.creditCost} cr
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
