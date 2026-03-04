import type { AvatarOption } from "../modelRegistry";
import { cn } from "../../../client/utils";
import { Card, CardContent } from "../../../client/components/ui/card";
import { Badge } from "../../../client/components/ui/badge";
import { Check, User } from "lucide-react";

interface AvatarPickerProps {
  avatars: AvatarOption[];
  selectedId: string | undefined;
  onChange: (id: string) => void;
}

export function AvatarPicker({ avatars, selectedId, onChange }: AvatarPickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-foreground text-sm font-medium">Choose Avatar</label>
      <div className="grid gap-3 sm:grid-cols-2">
        {avatars.map((avatar) => {
          const isSelected = selectedId === avatar.id;
          return (
            <Card
              key={avatar.id}
              onClick={() => onChange(avatar.id)}
              className={cn(
                "cursor-pointer border-2 transition-all",
                isSelected
                  ? "border-primary ring-primary/20 ring-2"
                  : "border-border hover:border-muted-foreground/30",
              )}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {/* Avatar preview */}
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
                    avatar.gender === "female"
                      ? "bg-pink-100 dark:bg-pink-900/30"
                      : "bg-blue-100 dark:bg-blue-900/30",
                  )}
                >
                  {avatar.previewUrl ? (
                    <img
                      src={avatar.previewUrl}
                      alt={avatar.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User
                      className={cn(
                        "h-7 w-7",
                        avatar.gender === "female" ? "text-pink-500" : "text-blue-500",
                      )}
                    />
                  )}
                </div>

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
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {avatar.style}
                  </p>
                </div>

                {isSelected && (
                  <div className="bg-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                    <Check className="text-primary-foreground h-3 w-3" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
