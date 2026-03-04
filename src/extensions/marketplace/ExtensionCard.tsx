import { ImagePlus, type LucideIcon, Crown, ShoppingCart } from "lucide-react";
import { Switch } from "../../client/components/ui/switch";
import type { ExtensionDefinition } from "../registry";

const ICON_MAP: Record<string, LucideIcon> = {
  ImagePlus: ImagePlus,
};

interface ExtensionCardProps {
  extension: ExtensionDefinition;
  isActive: boolean;
  onToggle: (extensionId: string, isActive: boolean) => void;
  isToggling: boolean;
  isPurchased: boolean;
  price: number;
  onPurchase: (extensionId: string) => void;
  isPurchasing: boolean;
}

const CATEGORY_STYLES: Record<string, string> = {
  ai: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  marketing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  productivity: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function ExtensionCard({
  extension,
  isActive,
  onToggle,
  isToggling,
  isPurchased,
  price,
  onPurchase,
  isPurchasing,
}: ExtensionCardProps) {
  const Icon = ICON_MAP[extension.icon] || ImagePlus;
  const isFree = extension.isFree || price <= 0;
  const canToggle = isFree || isPurchased;

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-6 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg">
          <Icon className="h-6 w-6" />
        </div>
        {canToggle ? (
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => onToggle(extension.id, checked)}
            disabled={isToggling}
          />
        ) : (
          <button
            onClick={() => onPurchase(extension.id)}
            disabled={isPurchasing}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" />
            {isPurchasing ? "Processing..." : `Purchase — $${price}`}
          </button>
        )}
      </div>

      <h3 className="text-lg font-semibold mb-1">{extension.name}</h3>
      <p className="text-muted-foreground text-sm mb-3 flex-1">
        {extension.description}
      </p>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            CATEGORY_STYLES[extension.category] || CATEGORY_STYLES.ai
          }`}
        >
          {extension.category.toUpperCase()}
        </span>
        {isFree ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Free
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <Crown className="h-3 w-3" />
            Premium
          </span>
        )}
        {!isFree && isPurchased && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Purchased
          </span>
        )}
      </div>
    </div>
  );
}
