import type { AvatarOption } from "../modelRegistry";
import { cn } from "../../../client/utils";
import { Badge } from "../../../client/components/ui/badge";
import { Check, Mic, Star } from "lucide-react";

// Avatar images
import emilyImg from "../../../client/static/video-studio/emily-primary.png";
import marcusImg from "../../../client/static/video-studio/marcus-primary.png";
import aishaImg from "../../../client/static/video-studio/aisha-walking.png";
import elenaImg from "../../../client/static/video-studio/elena-primary.png";

const AVATAR_IMAGES: Record<string, string> = {
  emily: emilyImg,
  marcus: marcusImg,
  aisha: aishaImg,
  elena: elenaImg,
};

interface AvatarPickerProps {
  avatars: AvatarOption[];
  selectedId: string | undefined;
  onChange: (id: string) => void;
}

export function AvatarPicker({ avatars, selectedId, onChange }: AvatarPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-foreground text-sm font-medium">Choose Avatar</label>
        <Badge variant="secondary" className="text-[10px]">
          {avatars.length} available
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {avatars.map((avatar) => {
          const isSelected = selectedId === avatar.id;
          const imgSrc = AVATAR_IMAGES[avatar.id];
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onChange(avatar.id)}
              className={cn(
                "relative flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all hover:scale-[1.02]",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40 hover:shadow-sm",
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <span className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}

              {/* Avatar image */}
              <div
                className={cn(
                  "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl",
                  avatar.gender === "female"
                    ? "bg-gradient-to-br from-pink-100 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/30"
                    : "bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30",
                )}
              >
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={avatar.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground/40">
                    {avatar.name[0]}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-foreground text-sm font-semibold">
                    {avatar.name}
                  </p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "px-1.5 py-0 text-[10px]",
                      avatar.gender === "female"
                        ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    )}
                  >
                    {avatar.gender}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {avatar.style}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Mic className="h-3 w-3" />
                    Voice ready
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Star className="h-3 w-3" />
                    HD quality
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
