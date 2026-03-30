import { useState, useRef } from "react";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Switch } from "../../client/components/ui/switch";
import { cn } from "../../client/utils";
import { Check, Plus, Upload, Loader2 } from "lucide-react";
import { uploadFile } from "wasp/client/operations";
import chatbotDefaultImg from "../../client/static/chatbot/chatbot-default.png";

interface WizardStepCustomizeProps {
  draft: Record<string, any>;
  onUpdate: (updates: Record<string, any>) => void;
}

const PRESET_COLORS = [
  "#272733",
  "#67D97C",
  "#E7AC47",
  "#9D74C9",
  "#017BE5",
];

const TOGGLES = [
  { key: "isEmailCollect", label: "Email Collect", desc: "Collect user email before chat" },
  { key: "isContact", label: "Contact Us", desc: "Show contact form button" },
  { key: "isEmoji", label: "Enable Emoji", desc: "Allow emoji in messages" },
  { key: "isAttachment", label: "Attachment", desc: "Allow file attachments" },
  { key: "showLogo", label: "Show Logo", desc: "Display logo in header" },
  { key: "showDateTime", label: "Show Date & Time", desc: "Display timestamps on messages" },
];

export default function WizardStepCustomize({ draft, onUpdate }: WizardStepCustomizeProps) {
  const currentColor = draft.color || "#017BE5";
  const triggerSize = draft.triggerSize || 60;
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isCustomImage = draft.avatar && !draft.avatar.startsWith("color:") && draft.avatar !== "";

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const uploaded = await uploadFile({
        data: base64,
        fileName: file.name,
        fileType: file.type,
      });

      const keyWithoutExt = uploaded.s3Key.replace(/\.[^.]+$/, '');
      onUpdate({ avatar: `/api/files/${keyWithoutExt}` });
    } catch (err: any) {
      alert(err?.message || "Failed to upload image.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* Avatar Selection */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">Avatar</Label>
        <div className="flex flex-wrap gap-3">
          {/* Default avatar */}
          <button
            onClick={() => onUpdate({ avatar: "" })}
            className={cn(
              "group relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all hover:scale-110",
              !draft.avatar || draft.avatar === ""
                ? "border-primary ring-2 ring-primary/20"
                : "border-transparent hover:border-primary/50"
            )}
          >
            <img src={chatbotDefaultImg} alt="Default" className="h-10 w-10 rounded-full object-cover" />
            {(!draft.avatar || draft.avatar === "") && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>

          {/* Color avatars with initials */}
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate({ avatar: `color:${color}` })}
              className={cn(
                "group relative flex h-14 w-14 items-center justify-center rounded-full border-2 text-white text-lg font-bold transition-all hover:scale-110",
                draft.avatar === `color:${color}`
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-primary/50"
              )}
              style={{ backgroundColor: color }}
            >
              AI
              {draft.avatar === `color:${color}` && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}

          {/* Custom image avatar (shows when one is uploaded) */}
          {isCustomImage && (
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="group relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary ring-2 ring-primary/20 transition-all hover:scale-110"
            >
              <img src={draft.avatar} alt="Custom" className="h-10 w-10 rounded-full object-cover" />
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                <Check className="h-3 w-3" />
              </span>
            </button>
          )}

          {/* Upload custom image button */}
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed transition-all hover:scale-110 hover:border-primary/50",
              "text-muted-foreground hover:text-primary"
            )}
            title="Upload custom avatar"
          >
            {uploadingAvatar ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
      </div>

      {/* Color Selection */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">Accent Color</Label>
        <div className="grid grid-cols-6 gap-3">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate({ color })}
              className={cn(
                "relative h-10 w-10 rounded-full shadow-md transition-all hover:scale-110",
                currentColor === color
                  ? "ring-2 ring-primary ring-offset-2"
                  : ""
              )}
              style={{ backgroundColor: color }}
            >
              {currentColor === color && (
                <Check className="h-4 w-4 text-white absolute inset-0 m-auto" />
              )}
            </button>
          ))}

          {/* Custom Color Picker */}
          <label
            className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full shadow-md transition-all hover:scale-110"
            style={{
              background: "conic-gradient(from 90deg, #9b59b6, #3498db, #2ecc71, #f1c40f, #e67e22, #e74c3c, #9b59b6)",
            }}
          >
            <Plus className="h-4 w-4 text-white drop-shadow-md" />
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>

        {/* Color hex display */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full shadow-sm border" style={{ backgroundColor: currentColor }} />
          <span className="text-xs font-mono text-muted-foreground uppercase">{currentColor}</span>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-1">
        <Label className="text-foreground font-medium mb-3 block">Features</Label>
        <div className="space-y-0 divide-y rounded-xl border">
          {TOGGLES.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <span className="text-sm font-medium">{label}</span>
                <p className="text-[11px] text-muted-foreground/60">{desc}</p>
              </div>
              <Switch
                checked={draft[key] ?? true}
                onCheckedChange={(checked) => onUpdate({ [key]: checked })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Trigger Size */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-foreground font-medium">Trigger Size</Label>
          <span className="text-xs font-mono text-muted-foreground">{triggerSize}px</span>
        </div>
        <input
          type="range"
          min={30}
          max={100}
          step={1}
          value={triggerSize}
          onChange={(e) => onUpdate({ triggerSize: parseInt(e.target.value) })}
          className="w-full accent-primary h-2 rounded-full appearance-none bg-muted cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* Position */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">Position</Label>
        <div className="flex gap-4">
          {(["left", "right"] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => onUpdate({ position: pos })}
              className={cn(
                "group relative flex flex-1 flex-col items-center gap-2.5 rounded-xl border-2 p-5 transition-all hover:scale-[1.03]",
                draft.position === pos
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-muted hover:border-primary/40"
              )}
            >
              {draft.position === pos && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              {/* Device mockup */}
              <svg
                width="50"
                height="65"
                viewBox="0 0 50 65"
                fill="none"
                className={cn(pos === "right" && "-scale-x-100")}
              >
                {/* Phone frame */}
                <rect x="1" y="1" width="48" height="63" rx="8" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/30" />
                {/* Screen */}
                <rect x="4" y="8" width="42" height="49" rx="2" className="fill-muted/50" />
                {/* Status bar */}
                <rect x="15" y="3" width="20" height="3" rx="1.5" className="fill-muted-foreground/20" />
                {/* Home indicator */}
                <rect x="17" y="60" width="16" height="2" rx="1" className="fill-muted-foreground/20" />
                {/* Chat bubble trigger */}
                <circle cx="12" cy="50" r="5" className="fill-primary" />
              </svg>
              <span className="text-xs font-medium capitalize">{pos}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Embed Dimensions */}
      <div className="space-y-4">
        <Label className="text-foreground font-medium">Widget Dimensions</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Width</span>
              <span className="text-xs font-mono text-muted-foreground">{draft.embedWidth || 400}px</span>
            </div>
            <input
              type="range"
              min={200}
              max={600}
              step={25}
              value={draft.embedWidth || 400}
              onChange={(e) => onUpdate({ embedWidth: parseInt(e.target.value) })}
              className="w-full accent-primary h-1.5 rounded-full appearance-none bg-muted cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Height</span>
              <span className="text-xs font-mono text-muted-foreground">{draft.embedHeight || 600}px</span>
            </div>
            <input
              type="range"
              min={300}
              max={800}
              step={25}
              value={draft.embedHeight || 600}
              onChange={(e) => onUpdate({ embedHeight: parseInt(e.target.value) })}
              className="w-full accent-primary h-1.5 rounded-full appearance-none bg-muted cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
