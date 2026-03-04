import { VOICE_PRESETS, VOICE_STYLES, type VoicePreset } from "../voicePresets";
import { cn } from "../../../client/utils";
import { Card, CardContent } from "../../../client/components/ui/card";
import { Badge } from "../../../client/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../client/components/ui/tabs";
import { Check, Mic, MicOff, User } from "lucide-react";

interface VoiceSelectorProps {
  selectedId: string | undefined;
  onChange: (id: string | undefined) => void;
}

export function VoiceSelector({ selectedId, onChange }: VoiceSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-foreground text-sm font-medium">Voice</label>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-3 w-full justify-start">
          <TabsTrigger value="all">All</TabsTrigger>
          {VOICE_STYLES.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <VoiceGrid
            presets={VOICE_PRESETS}
            selectedId={selectedId}
            onChange={onChange}
          />
        </TabsContent>

        {VOICE_STYLES.map((s) => (
          <TabsContent key={s.id} value={s.id}>
            <VoiceGrid
              presets={VOICE_PRESETS.filter((v) => v.style === s.id)}
              selectedId={selectedId}
              onChange={onChange}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function VoiceGrid({
  presets,
  selectedId,
  onChange,
}: {
  presets: VoicePreset[];
  selectedId: string | undefined;
  onChange: (id: string | undefined) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {/* None option */}
      <Card
        onClick={() => onChange(undefined)}
        className={cn(
          "cursor-pointer border-2 transition-all",
          !selectedId
            ? "border-primary ring-primary/20 ring-2"
            : "border-border hover:border-muted-foreground/30",
        )}
      >
        <CardContent className="flex items-center gap-3 p-3">
          <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <MicOff className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-foreground text-sm font-medium">No Voice</p>
            <p className="text-muted-foreground text-xs">Default audio or none</p>
          </div>
          {!selectedId && (
            <div className="bg-primary ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
              <Check className="text-primary-foreground h-3 w-3" />
            </div>
          )}
        </CardContent>
      </Card>

      {presets.map((preset) => {
        const isSelected = selectedId === preset.id;
        return (
          <Card
            key={preset.id}
            onClick={() => onChange(preset.id)}
            className={cn(
              "cursor-pointer border-2 transition-all",
              isSelected
                ? "border-primary ring-primary/20 ring-2"
                : "border-border hover:border-muted-foreground/30",
            )}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                {preset.gender === "male" ? (
                  <User className="text-blue-500 h-4 w-4" />
                ) : preset.gender === "female" ? (
                  <User className="text-pink-500 h-4 w-4" />
                ) : (
                  <Mic className="text-muted-foreground h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-foreground truncate text-sm font-medium">
                    {preset.name}
                  </p>
                  <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                    {preset.accent}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {preset.description}
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
  );
}
