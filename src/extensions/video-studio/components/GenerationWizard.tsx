import { useState } from "react";
import { type VideoModel, getModelByKey, VIDEO_MODELS } from "../modelRegistry";
import { type PromptTemplate } from "../promptTemplates";
import { ModelSelector } from "./ModelSelector";
import { PromptTemplateSelector } from "./PromptTemplateSelector";
import { ImageUploader } from "./ImageUploader";
import { VoiceSelector } from "./VoiceSelector";
import { AvatarPicker } from "./AvatarPicker";
import { CreditCostDisplay } from "./CreditCostDisplay";
import { Button } from "../../../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../client/components/ui/card";
import { Badge } from "../../../client/components/ui/badge";
import { Textarea } from "../../../client/components/ui/textarea";
import { Label } from "../../../client/components/ui/label";
import { Switch } from "../../../client/components/ui/switch";
import { Slider } from "../../../client/components/ui/slider";
import { Input } from "../../../client/components/ui/input";
import { Separator } from "../../../client/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { cn } from "../../../client/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Film,
  ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  User,
  Wand2,
} from "lucide-react";

// Type card illustrations
import videoCreateImg from "../../../client/static/video-studio/video-create.png";
import socialVideoImg from "../../../client/static/video-studio/social-video-create.png";
import influencerAvatarImg from "../../../client/static/video-studio/influencer-avatar.png";
import aiVideoClipImg from "../../../client/static/video-studio/ai-video-clip.png";

interface GenerationWizardProps {
  onSubmit: (data: {
    modelKey: string;
    prompt: string;
    negativePrompt?: string;
    duration?: number;
    aspectRatio?: string;
    resolution?: string;
    inputImageUrl?: string;
    inputVideoUrl?: string;
    projectId?: string;
    enhancePrompt?: boolean;
    generateAudio?: boolean;
    seed?: number;
    cfgScale?: number;
    avatarId?: string;
    voicePresetId?: string;
    referenceImageUrls?: string[];
    firstFrameImageUrl?: string;
    lastFrameImageUrl?: string;
  }) => Promise<void>;
  projects?: Array<{ id: string; name: string }>;
  isSubmitting: boolean;
  initialType?: "ttv" | "itv" | "upscale" | "avatar";
}

const STEPS = [
  { id: 1, label: "Type" },
  { id: 2, label: "Model" },
  { id: 3, label: "Configure" },
  { id: 4, label: "Review" },
];

type GenType = "ttv" | "itv" | "upscale" | "avatar";

const TYPE_CARDS: Array<{
  type: GenType;
  label: string;
  description: string;
  icon: typeof Film;
  image: string;
  color: string;
}> = [
  { type: "ttv", label: "Text to Video", description: "Generate video from a text prompt", icon: Film, image: videoCreateImg, color: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30" },
  { type: "itv", label: "Image to Video", description: "Animate a still image into video", icon: ImageIcon, image: socialVideoImg, color: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30" },
  { type: "avatar", label: "AI Avatar", description: "Create talking-head avatar videos", icon: User, image: influencerAvatarImg, color: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30" },
  { type: "upscale", label: "Upscale", description: "Enhance video resolution", icon: Sparkles, image: aiVideoClipImg, color: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30" },
];

export function GenerationWizard({
  onSubmit,
  projects,
  isSubmitting,
  initialType,
}: GenerationWizardProps) {
  const [step, setStep] = useState(initialType ? 2 : 1);
  const [genType, setGenType] = useState<GenType>(initialType || "ttv");
  const [selectedModel, setSelectedModel] = useState<VideoModel | null>(null);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [inputImageUrl, setInputImageUrl] = useState("");
  const [inputVideoUrl, setInputVideoUrl] = useState("");
  const [projectId, setProjectId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Expanded params
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [generateAudio, setGenerateAudio] = useState(false);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [cfgScale, setCfgScale] = useState<number>(0.5);
  const [avatarId, setAvatarId] = useState<string | undefined>(undefined);
  const [voicePresetId, setVoicePresetId] = useState<string | undefined>(undefined);
  const [firstFrameImageUrl, setFirstFrameImageUrl] = useState("");
  const [lastFrameImageUrl, setLastFrameImageUrl] = useState("");
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);

  const handleModelSelect = (model: VideoModel) => {
    setSelectedModel(model);
    if (model.durations.length > 0 && !model.durations.includes(duration)) {
      setDuration(model.durations[0]);
    }
    if (model.aspectRatios.length > 0 && !model.aspectRatios.includes(aspectRatio)) {
      setAspectRatio(model.aspectRatios[0]);
    }
    if (model.resolutions.length > 0 && !model.resolutions.includes(resolution)) {
      setResolution(model.resolutions[0]);
    }
  };

  const handleTemplateSelect = (tmpl: PromptTemplate) => {
    setPrompt(tmpl.prompt);
    if (tmpl.negativePrompt) setNegativePrompt(tmpl.negativePrompt);
    if (tmpl.suggestedDuration) setDuration(tmpl.suggestedDuration);
    if (tmpl.suggestedAspectRatio) setAspectRatio(tmpl.suggestedAspectRatio);
    setShowTemplates(false);
  };

  const handleSubmit = async () => {
    if (!selectedModel) return;

    await onSubmit({
      modelKey: selectedModel.key,
      prompt,
      negativePrompt: negativePrompt || undefined,
      duration,
      aspectRatio,
      resolution,
      inputImageUrl: inputImageUrl || undefined,
      inputVideoUrl: inputVideoUrl || undefined,
      projectId: projectId || undefined,
      enhancePrompt: selectedModel.supportsEnhancePrompt ? enhancePrompt : undefined,
      generateAudio: selectedModel.supportsAudio ? generateAudio : undefined,
      seed,
      cfgScale: selectedModel.supportsCfgScale ? cfgScale : undefined,
      avatarId: selectedModel.avatarOptions ? avatarId : undefined,
      voicePresetId: voicePresetId || undefined,
      referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
      firstFrameImageUrl: firstFrameImageUrl || undefined,
      lastFrameImageUrl: lastFrameImageUrl || undefined,
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return !!selectedModel;
      case 3: {
        if (!selectedModel) return false;
        if (selectedModel.type !== "upscale" && !prompt.trim()) return false;
        if (selectedModel.type === "itv" && !selectedModel.supportsFirstLastFrame && !selectedModel.supportsReferenceImages && !inputImageUrl) return false;
        if (selectedModel.supportsFirstLastFrame && !firstFrameImageUrl) return false;
        if (selectedModel.supportsReferenceImages && referenceImageUrls.length === 0 && !inputImageUrl) return false;
        if (selectedModel.type === "upscale" && !inputVideoUrl) return false;
        if (selectedModel.type === "avatar" && !avatarId) return false;
        return true;
      }
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => s.id < step && setStep(s.id)}
              disabled={s.id > step}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                s.id === step
                  ? "bg-primary text-primary-foreground"
                  : s.id < step
                    ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {s.id < step ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full text-xs">
                  {s.id}
                </span>
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-px w-8 sm:w-12",
                  s.id < step ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-foreground text-lg font-semibold">Choose Generation Type</h2>
            <p className="text-muted-foreground text-sm">Select what kind of video you want to create</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {TYPE_CARDS.map((tc) => {
              const isSelected = genType === tc.type;
              const modelCount = VIDEO_MODELS.filter((m) => m.type === tc.type).length;
              return (
                <button
                  key={tc.type}
                  type="button"
                  onClick={() => {
                    setGenType(tc.type);
                    setSelectedModel(null);
                  }}
                  className={cn(
                    "relative flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all hover:scale-[1.02]",
                    isSelected
                      ? "border-primary shadow-md ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40 hover:shadow-sm",
                    `bg-gradient-to-br ${tc.color}`,
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <img
                    src={tc.image}
                    alt={tc.label}
                    className="h-20 w-20 shrink-0 object-contain"
                  />
                  <div>
                    <h3 className="text-foreground font-semibold">{tc.label}</h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">{tc.description}</p>
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {modelCount} model{modelCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-foreground text-lg font-semibold">Select Model</h2>
            <p className="text-muted-foreground text-sm">
              Choose an AI model for your {genType === "ttv" ? "text-to-video" : genType === "itv" ? "image-to-video" : genType === "avatar" ? "avatar" : "upscale"} generation
            </p>
          </div>
          <ModelSelector
            type={genType}
            selectedKey={selectedModel?.key || ""}
            onSelect={handleModelSelect}
          />
        </div>
      )}

      {step === 3 && selectedModel && (
        <div className="space-y-6">
          <div>
            <h2 className="text-foreground text-lg font-semibold">Configure</h2>
            <p className="text-muted-foreground text-sm">
              Set up your generation with {selectedModel.name}
            </p>
          </div>

          {/* Templates */}
          {selectedModel.type !== "upscale" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Templates</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplates(!showTemplates)}
                >
                  {showTemplates ? "Hide" : "Browse templates"}
                </Button>
              </div>
              {showTemplates && (
                <Card className="mb-4">
                  <CardContent className="max-h-72 overflow-y-auto p-4">
                    <PromptTemplateSelector onSelect={handleTemplateSelect} />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Image upload for ITV */}
          {selectedModel.type === "itv" && !selectedModel.supportsFirstLastFrame && !selectedModel.supportsReferenceImages && (
            <ImageUploader
              value={inputImageUrl || undefined}
              onChange={(url) => setInputImageUrl(url || "")}
              label="Input Image *"
              description="Upload the image you want to animate"
            />
          )}

          {/* First/Last frame upload */}
          {selectedModel.supportsFirstLastFrame && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageUploader
                value={firstFrameImageUrl || undefined}
                onChange={(url) => setFirstFrameImageUrl(url || "")}
                label="First Frame *"
                description="Upload the starting frame"
              />
              <ImageUploader
                value={lastFrameImageUrl || undefined}
                onChange={(url) => setLastFrameImageUrl(url || "")}
                label="Last Frame (optional)"
                description="Upload the ending frame"
              />
            </div>
          )}

          {/* Reference images */}
          {selectedModel.supportsReferenceImages && (
            <div className="space-y-3">
              <Label>Reference Images *</Label>
              <ImageUploader
                value={referenceImageUrls[0] || undefined}
                onChange={(url) => {
                  if (url) {
                    setReferenceImageUrls((prev) => [...prev, url]);
                  }
                }}
                description="Upload reference images for style guidance"
              />
              {referenceImageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {referenceImageUrls.map((url, i) => (
                    <div key={i} className="relative">
                      <img
                        src={url}
                        alt={`Reference ${i + 1}`}
                        className="h-16 w-16 rounded border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setReferenceImageUrls((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Avatar picker */}
          {selectedModel.avatarOptions && selectedModel.avatarOptions.length > 0 && (
            <AvatarPicker
              avatars={selectedModel.avatarOptions}
              selectedId={avatarId}
              onChange={setAvatarId}
            />
          )}

          {/* Input Video (Upscale) */}
          {selectedModel.type === "upscale" && (
            <div className="space-y-2">
              <Label>Input Video URL *</Label>
              <Input
                type="url"
                value={inputVideoUrl}
                onChange={(e) => setInputVideoUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
              />
              <p className="text-muted-foreground text-xs">
                Direct URL to the video you want to upscale
              </p>
            </div>
          )}

          {/* Prompt */}
          {selectedModel.type !== "upscale" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prompt *</Label>
                <span className="text-muted-foreground text-xs">{prompt.length} chars</span>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to generate..."
                rows={5}
                className="resize-none"
              />
            </div>
          )}

          {/* Voice selector for audio-capable models */}
          {selectedModel.supportsAudio && (
            <VoiceSelector selectedId={voicePresetId} onChange={setVoicePresetId} />
          )}

          {/* Parameters Row */}
          <div className="grid gap-4 sm:grid-cols-3">
            {selectedModel.durations.length > 0 && (
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={String(duration)}
                  onValueChange={(v) => setDuration(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedModel.durations.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} seconds
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedModel.aspectRatios.length > 0 && (
              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedModel.aspectRatios.map((ar) => (
                      <SelectItem key={ar} value={ar}>
                        {ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedModel.resolutions.length > 0 && (
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedModel.resolutions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-medium"
            >
              Advanced Options
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdvanced && (
              <Card className="mt-3">
                <CardContent className="space-y-5 p-4">
                  {/* Negative Prompt */}
                  {selectedModel.supportsNegativePrompt && selectedModel.type !== "upscale" && (
                    <div className="space-y-2">
                      <Label>Negative Prompt</Label>
                      <Textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="What to avoid (e.g. blurry, low quality, shaky)..."
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  )}

                  {/* Enhance Prompt Toggle */}
                  {selectedModel.supportsEnhancePrompt && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enhance Prompt</Label>
                        <p className="text-muted-foreground text-xs">
                          AI will improve your prompt for better results
                        </p>
                      </div>
                      <Switch
                        checked={enhancePrompt}
                        onCheckedChange={setEnhancePrompt}
                      />
                    </div>
                  )}

                  {/* Generate Audio Toggle */}
                  {selectedModel.supportsAudio && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Generate Audio</Label>
                        <p className="text-muted-foreground text-xs">
                          Generate audio to accompany the video
                        </p>
                      </div>
                      <Switch
                        checked={generateAudio}
                        onCheckedChange={setGenerateAudio}
                      />
                    </div>
                  )}

                  {/* CFG Scale */}
                  {selectedModel.supportsCfgScale && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>CFG Scale</Label>
                        <span className="text-muted-foreground text-xs">
                          {cfgScale.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[cfgScale]}
                        onValueChange={([v]) => setCfgScale(v)}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                      <p className="text-muted-foreground text-xs">
                        Higher values follow prompt more closely
                      </p>
                    </div>
                  )}

                  {/* Seed */}
                  <div className="space-y-2">
                    <Label>Seed (optional)</Label>
                    <Input
                      type="number"
                      value={seed ?? ""}
                      onChange={(e) =>
                        setSeed(e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="Random"
                    />
                    <p className="text-muted-foreground text-xs">
                      Use a specific seed for reproducible results
                    </p>
                  </div>

                  {/* Project */}
                  {projects && projects.length > 0 && (
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select value={projectId} onValueChange={setProjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="No project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No project</SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {step === 4 && selectedModel && (
        <div className="space-y-4">
          <div>
            <h2 className="text-foreground text-lg font-semibold">Review & Generate</h2>
            <p className="text-muted-foreground text-sm">
              Confirm your settings before generating
            </p>
          </div>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewItem label="Type" value={genType === "ttv" ? "Text to Video" : genType === "itv" ? "Image to Video" : genType === "avatar" ? "AI Avatar" : "Upscale"} />
                <ReviewItem label="Model" value={selectedModel.name} />
                {selectedModel.durations.length > 0 && (
                  <ReviewItem label="Duration" value={`${duration}s`} />
                )}
                {selectedModel.aspectRatios.length > 0 && (
                  <ReviewItem label="Aspect Ratio" value={aspectRatio} />
                )}
                <ReviewItem label="Resolution" value={resolution} />
                {avatarId && <ReviewItem label="Avatar" value={avatarId} />}
                {voicePresetId && <ReviewItem label="Voice" value={voicePresetId} />}
                {enhancePrompt && selectedModel.supportsEnhancePrompt && (
                  <ReviewItem label="Enhance Prompt" value="Yes" />
                )}
                {generateAudio && selectedModel.supportsAudio && (
                  <ReviewItem label="Generate Audio" value="Yes" />
                )}
              </div>

              {prompt && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground text-xs">Prompt</Label>
                    <p className="text-foreground mt-1 text-sm">{prompt}</p>
                  </div>
                </>
              )}

              {negativePrompt && (
                <div>
                  <Label className="text-muted-foreground text-xs">Negative Prompt</Label>
                  <p className="text-foreground mt-1 text-sm">{negativePrompt}</p>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm font-medium">Credit Cost</span>
                <CreditCostDisplay cost={selectedModel.creditCost} tier={selectedModel.tier} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>

        {step < 4 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Next
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || isSubmitting}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-1.5 h-4 w-4" />
                Generate Video
                <span className="text-primary-foreground/70 ml-1.5">
                  ({selectedModel?.creditCost} credits)
                </span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="text-foreground text-sm font-medium">{value}</p>
    </div>
  );
}
