import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { generateVideo, getVideoProjects, improveVideoPrompt } from "wasp/client/operations";
import { VIDEO_MODELS, type VideoModel } from "./modelRegistry";
import { type PromptTemplate } from "./promptTemplates";
import { ModelSelector } from "./components/ModelSelector";
import { PromptTemplateSelector } from "./components/PromptTemplateSelector";
import { ImageUploader } from "./components/ImageUploader";
import { VoiceSelector } from "./components/VoiceSelector";
import { AvatarPicker } from "./components/AvatarPicker";
import { Badge } from "../../client/components/ui/badge";
import { Switch } from "../../client/components/ui/switch";
import { Slider } from "../../client/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import { cn } from "../../client/utils";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Film,
  ImageIcon,
  Loader2,
  Sparkles,
  User,
  Wand2,
  X,
  Zap,
} from "lucide-react";

// Illustrations
import videoCreateImg from "../../client/static/video-studio/video-create.png";
import socialVideoImg from "../../client/static/video-studio/social-video-create.png";
import influencerAvatarImg from "../../client/static/video-studio/influencer-avatar.png";
import aiVideoClipImg from "../../client/static/video-studio/ai-video-clip.png";
import aiAvatarImg from "../../client/static/video-studio/ai-avatar.png";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

type GenType = "ttv" | "itv" | "upscale" | "avatar";
type StepKey =
  | "welcome"
  | "type"
  | "model"
  | "input"
  | "prompt"
  | "settings"
  | "review"
  | "processing"
  | "success";

const TYPE_CARDS: Array<{
  type: GenType;
  label: string;
  description: string;
  icon: typeof Film;
  image: string;
}> = [
  {
    type: "ttv",
    label: "Text to Video",
    description: "Generate video from a text prompt",
    icon: Film,
    image: videoCreateImg,
  },
  {
    type: "itv",
    label: "Image to Video",
    description: "Animate a still image into video",
    icon: ImageIcon,
    image: socialVideoImg,
  },
  {
    type: "avatar",
    label: "AI Avatar",
    description: "Talking-head presenter videos",
    icon: User,
    image: influencerAvatarImg,
  },
  {
    type: "upscale",
    label: "Upscale",
    description: "Enhance video to HD / 4K",
    icon: Sparkles,
    image: aiVideoClipImg,
  },
];

const RECOMMENDED: Record<GenType, string> = {
  ttv: "veo3-fast",
  itv: "kling25-pro",
  avatar: "veed-avatar",
  upscale: "video-upscaler",
};

const ASPECT_VISUALS = [
  { value: "16:9", label: "Landscape", w: 44, h: 25 },
  { value: "9:16", label: "Portrait", w: 25, h: 44 },
  { value: "1:1", label: "Square", w: 34, h: 34 },
];

const inputCls =
  "h-12 rounded-[10px] bg-foreground/5 border-0 text-sm backdrop-blur-sm focus-visible:ring-1 focus-visible:ring-[#bd711d]/30";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStepKeys(genType: GenType): StepKey[] {
  const keys: StepKey[] = ["welcome", "type", "model"];
  if (genType !== "ttv") keys.push("input");
  if (genType !== "upscale") keys.push("prompt");
  keys.push("settings", "review", "processing", "success");
  return keys;
}

function getContentKeys(genType: GenType): StepKey[] {
  return getStepKeys(genType).filter(
    (k) => !["welcome", "processing", "success"].includes(k),
  );
}

function getTypeLabel(t: GenType): string {
  return (
    { ttv: "Text to Video", itv: "Image to Video", avatar: "AI Avatar", upscale: "Upscale" }[t] || t
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function VideoGeneratePage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get("type") as GenType) || undefined;

  const { data: projects } = useQuery(getVideoProjects, {});

  // ---- wizard navigation ----
  const [stepIndex, setStepIndex] = useState(initialType ? 2 : 0);
  const [genType, setGenType] = useState<GenType>(initialType || "ttv");

  // ---- model ----
  const [selectedModel, setSelectedModel] = useState<VideoModel | null>(null);

  // ---- form state ----
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [inputImageUrl, setInputImageUrl] = useState("");
  const [inputVideoUrl, setInputVideoUrl] = useState("");
  const [projectId, setProjectId] = useState("");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [generateAudio, setGenerateAudio] = useState(false);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [cfgScale, setCfgScale] = useState(0.5);
  const [avatarId, setAvatarId] = useState<string | undefined>(undefined);
  const [voicePresetId, setVoicePresetId] = useState<string | undefined>(
    undefined,
  );
  const [firstFrameImageUrl, setFirstFrameImageUrl] = useState("");
  const [lastFrameImageUrl, setLastFrameImageUrl] = useState("");
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);

  // ---- UI toggles ----
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNegative, setShowNegative] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  // ---- derived ----
  const stepKeys = getStepKeys(genType);
  const contentKeys = getContentKeys(genType);
  const currentKey = stepKeys[stepIndex];
  const contentIdx = contentKeys.indexOf(currentKey);
  const progress =
    contentIdx >= 0 ? contentIdx / (contentKeys.length - 1) : 0;
  const isContent = contentKeys.includes(currentKey);

  // ---- handlers ----

  const handleModelSelect = (model: VideoModel) => {
    setSelectedModel(model);
    if (
      model.durations.length > 0 &&
      !model.durations.includes(duration)
    )
      setDuration(model.durations[0]);
    if (
      model.aspectRatios.length > 0 &&
      !model.aspectRatios.includes(aspectRatio)
    )
      setAspectRatio(model.aspectRatios[0]);
    if (
      model.resolutions.length > 0 &&
      !model.resolutions.includes(resolution)
    )
      setResolution(model.resolutions[0]);
  };

  const handleTemplateSelect = (tmpl: PromptTemplate) => {
    setPrompt(tmpl.prompt);
    if (tmpl.negativePrompt) setNegativePrompt(tmpl.negativePrompt);
    if (tmpl.suggestedDuration) setDuration(tmpl.suggestedDuration);
    if (tmpl.suggestedAspectRatio) setAspectRatio(tmpl.suggestedAspectRatio);
    setShowTemplates(false);
  };

  const handleTypeSelect = (type: GenType) => {
    setGenType(type);
    setSelectedModel(null);
    setInputImageUrl("");
    setInputVideoUrl("");
    setAvatarId(undefined);
    setVoicePresetId(undefined);
    setFirstFrameImageUrl("");
    setLastFrameImageUrl("");
    setReferenceImageUrls([]);
  };

  const handleSubmit = async () => {
    if (!selectedModel) return;
    setIsSubmitting(true);
    setError(null);
    setStepIndex(stepKeys.indexOf("processing"));

    try {
      const result = await generateVideo({
        modelKey: selectedModel.key,
        prompt,
        negativePrompt: negativePrompt || undefined,
        duration,
        aspectRatio,
        resolution,
        inputImageUrl: inputImageUrl || undefined,
        inputVideoUrl: inputVideoUrl || undefined,
        projectId: projectId || undefined,
        enhancePrompt: selectedModel.supportsEnhancePrompt
          ? enhancePrompt
          : undefined,
        generateAudio: selectedModel.supportsAudio
          ? generateAudio
          : undefined,
        seed,
        cfgScale: selectedModel.supportsCfgScale ? cfgScale : undefined,
        avatarId: selectedModel.avatarOptions ? avatarId : undefined,
        voicePresetId: voicePresetId || undefined,
        referenceImageUrls:
          referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
        firstFrameImageUrl: firstFrameImageUrl || undefined,
        lastFrameImageUrl: lastFrameImageUrl || undefined,
      });
      setResultId(result.id);
      setStepIndex(stepKeys.indexOf("success"));
    } catch (err: any) {
      const msg = err.message || "Failed to generate video";
      try {
        const parsed = JSON.parse(msg);
        setError(
          parsed.message === "Insufficient credits"
            ? `Insufficient credits. Need ${parsed.required}, have ${parsed.available}.`
            : msg,
        );
      } catch {
        setError(msg);
      }
      setStepIndex(stepKeys.indexOf("review"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = (): boolean => {
    switch (currentKey) {
      case "welcome":
      case "type":
        return true;
      case "model":
        return !!selectedModel;
      case "input": {
        if (!selectedModel) return false;
        if (genType === "itv") {
          if (selectedModel.supportsFirstLastFrame) return !!firstFrameImageUrl;
          if (selectedModel.supportsReferenceImages)
            return referenceImageUrls.length > 0 || !!inputImageUrl;
          return !!inputImageUrl;
        }
        if (genType === "avatar") return !!avatarId;
        if (genType === "upscale") return !!inputVideoUrl;
        return true;
      }
      case "prompt":
        return !!prompt.trim();
      case "settings":
      case "review":
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentKey === "review") {
      handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(stepKeys.length - 1, i + 1));
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));
  const handleClose = () => navigate("/video-studio");

  // ---- render ----

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Keyframes */}
      <style>{`
        @keyframes wizardSlideIn {
          from { opacity: 0; transform: translateX(12px); filter: blur(4px); }
          to   { opacity: 1; transform: translateX(0);    filter: blur(0);   }
        }
        @keyframes wizardSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* ============ TOP BAR ============ */}
      {currentKey !== "processing" && currentKey !== "success" && (
        <div className="flex items-center justify-between px-5 py-4 shrink-0">
          {/* Left — Back */}
          <div className="w-28">
            {stepIndex > 0 && isContent && (
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
          </div>

          {/* Center — Progress */}
          <div className="flex flex-col items-center gap-1.5">
            {isContent && (
              <div className="h-[5px] w-40 rounded-full bg-foreground/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#bd711d] transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(5, progress * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Right — Step counter + Close */}
          <div className="flex w-28 items-center justify-end gap-3">
            {isContent && (
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Step {contentIdx + 1} of {contentKeys.length}
              </span>
            )}
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============ CONTENT AREA ============ */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[540px] px-5 pb-32">
          <div
            key={stepIndex}
            style={{ animation: "wizardSlideIn 300ms ease-out both" }}
          >
            {/* ────────── WELCOME ────────── */}
            {currentKey === "welcome" && (
              <div className="flex flex-col items-center pt-16 sm:pt-24">
                <img
                  src={aiAvatarImg}
                  alt=""
                  className="h-36 sm:h-44 w-auto object-contain mb-6"
                />
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center">
                  Video Studio
                </h1>
                <p className="mt-2 text-center text-sm text-muted-foreground max-w-sm">
                  Create stunning AI-powered videos — text-to-video, image
                  animation, talking-head avatars, and video upscaling.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Badge className="bg-[#bd711d]/10 text-[#bd711d] border-[#bd711d]/20 text-xs">
                    <Zap className="mr-1 h-3 w-3" />
                    21 AI Models
                  </Badge>
                  <Badge className="bg-[#bd711d]/10 text-[#bd711d] border-[#bd711d]/20 text-xs">
                    4 Generation Types
                  </Badge>
                </div>
              </div>
            )}

            {/* ────────── TYPE ────────── */}
            {currentKey === "type" && (
              <div className="pt-8 sm:pt-12">
                <h2 className="text-center text-xl font-bold text-foreground">
                  What would you like to create?
                </h2>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Choose the type of video generation
                </p>
                <div className="mt-8 grid gap-3 grid-cols-2">
                  {TYPE_CARDS.map((tc) => {
                    const isSelected = genType === tc.type;
                    const count = VIDEO_MODELS.filter(
                      (m) => m.type === tc.type,
                    ).length;
                    return (
                      <button
                        key={tc.type}
                        type="button"
                        onClick={() => handleTypeSelect(tc.type)}
                        className={cn(
                          "relative flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition-all hover:scale-[1.02]",
                          isSelected
                            ? "border-[#bd711d] bg-[#bd711d]/5 shadow-md ring-2 ring-[#bd711d]/20"
                            : "border-border hover:border-[#bd711d]/40 hover:shadow-sm",
                        )}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#bd711d]">
                            <Check className="h-3 w-3 text-white" />
                          </span>
                        )}
                        <img
                          src={tc.image}
                          alt={tc.label}
                          className="h-16 w-16 object-contain"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {tc.label}
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {tc.description}
                          </p>
                          <span className="text-[10px] text-[#bd711d] font-medium mt-1 inline-block">
                            {count} model{count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ────────── MODEL ────────── */}
            {currentKey === "model" && (
              <div className="pt-8 sm:pt-12">
                <h2 className="text-center text-xl font-bold text-foreground">
                  Choose your AI model
                </h2>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Select the best model for {getTypeLabel(genType).toLowerCase()}{" "}
                  generation
                </p>
                <div className="mt-8">
                  <ModelSelector
                    type={genType}
                    selectedKey={selectedModel?.key || ""}
                    onSelect={handleModelSelect}
                    recommended={RECOMMENDED[genType]}
                  />
                </div>
              </div>
            )}

            {/* ────────── INPUT (ITV) ────────── */}
            {currentKey === "input" && genType === "itv" && selectedModel && (
              <div className="pt-8 sm:pt-12">
                <h2 className="text-center text-xl font-bold text-foreground">
                  {selectedModel.supportsFirstLastFrame
                    ? "Upload your frames"
                    : selectedModel.supportsReferenceImages
                      ? "Add reference images"
                      : "Upload your image"}
                </h2>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  {selectedModel.supportsFirstLastFrame
                    ? "Provide the first and optionally last frame"
                    : selectedModel.supportsReferenceImages
                      ? "Add images for style guidance"
                      : "Choose the image you want to animate"}
                </p>
                <div className="mt-8">
                  {selectedModel.supportsFirstLastFrame ? (
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
                  ) : selectedModel.supportsReferenceImages ? (
                    <div className="space-y-3">
                      <ImageUploader
                        value={undefined}
                        onChange={(url) => {
                          if (url)
                            setReferenceImageUrls((prev) => [...prev, url]);
                        }}
                        label="Add Reference Image"
                        description="Upload images for style guidance"
                      />
                      {referenceImageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {referenceImageUrls.map((url, i) => (
                            <div key={i} className="relative">
                              <img
                                src={url}
                                alt={`Ref ${i + 1}`}
                                className="h-16 w-16 rounded-lg border object-cover"
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
                  ) : (
                    <ImageUploader
                      value={inputImageUrl || undefined}
                      onChange={(url) => setInputImageUrl(url || "")}
                      label="Input Image *"
                      description="Drag & drop the image you want to animate"
                    />
                  )}
                </div>
              </div>
            )}

            {/* ────────── INPUT (Avatar) ────────── */}
            {currentKey === "input" &&
              genType === "avatar" &&
              selectedModel?.avatarOptions && (
                <div className="pt-8 sm:pt-12">
                  <h2 className="text-center text-xl font-bold text-foreground">
                    Choose your presenter
                  </h2>
                  <p className="mt-1 text-center text-sm text-muted-foreground">
                    Select an AI avatar for your video
                  </p>
                  <div className="mt-8">
                    <AvatarPicker
                      avatars={selectedModel.avatarOptions}
                      selectedId={avatarId}
                      onChange={setAvatarId}
                    />
                  </div>
                </div>
              )}

            {/* ────────── INPUT (Upscale) ────────── */}
            {currentKey === "input" && genType === "upscale" && (
              <div className="pt-8 sm:pt-12">
                <h2 className="text-center text-xl font-bold text-foreground">
                  Provide your video
                </h2>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Enter the URL of the video you want to upscale
                </p>
                <div className="mt-8">
                  <input
                    type="url"
                    value={inputVideoUrl}
                    onChange={(e) => setInputVideoUrl(e.target.value)}
                    placeholder="https://example.com/video.mp4"
                    className={cn(inputCls, "w-full px-4")}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Direct URL to an MP4 or WebM video file
                  </p>
                </div>
              </div>
            )}

            {/* ────────── PROMPT ────────── */}
            {currentKey === "prompt" && (
              <div className="pt-8 sm:pt-12">
                <h2 className="text-center text-xl font-bold text-foreground">
                  {genType === "avatar"
                    ? "Write the script"
                    : genType === "itv"
                      ? "Describe the motion"
                      : "Describe your video"}
                </h2>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  {genType === "avatar"
                    ? "What should the avatar say?"
                    : "Tell the AI what you want to see"}
                </p>
                <div className="mt-8 space-y-4">
                  {/* Template toggle */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="text-xs font-medium text-[#bd711d] hover:text-[#a5631a] transition-colors"
                    >
                      {showTemplates ? "Hide templates" : "Browse templates"}
                    </button>
                  </div>
                  {showTemplates && (
                    <div className="rounded-xl border bg-card p-4 max-h-60 overflow-y-auto">
                      <PromptTemplateSelector
                        onSelect={handleTemplateSelect}
                      />
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        genType === "avatar"
                          ? "Write the script for your AI presenter..."
                          : "Describe the video you want to generate..."
                      }
                      rows={6}
                      className={cn(
                        inputCls,
                        "w-full px-4 py-3 h-auto resize-none scrollbar-hide",
                      )}
                    />
                    {prompt.trim().length >= 5 && (
                      <button
                        type="button"
                        disabled={isEnhancing}
                        onClick={async () => {
                          setIsEnhancing(true);
                          try {
                            const result = await improveVideoPrompt({ prompt });
                            setPrompt(result.improved);
                          } catch (err: any) {
                            setError(err.message || "Failed to enhance prompt");
                          } finally {
                            setIsEnhancing(false);
                          }
                        }}
                        className="absolute bottom-3 right-3 text-[#bd711d]/60 hover:text-[#bd711d] transition-colors disabled:opacity-50"
                        title="Enhance prompt with AI (2 credits)"
                      >
                        {isEnhancing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {prompt.length} characters
                    </span>
                    {selectedModel?.supportsNegativePrompt && (
                      <button
                        type="button"
                        onClick={() => setShowNegative(!showNegative)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        Negative prompt
                        {showNegative ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {showNegative && selectedModel?.supportsNegativePrompt && (
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="What to avoid (e.g. blurry, low quality, shaky)..."
                      rows={2}
                      className={cn(
                        inputCls,
                        "w-full px-4 py-3 h-auto resize-none",
                      )}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ────────── SETTINGS ────────── */}
            {currentKey === "settings" && selectedModel && (
              <div className="pt-8 sm:pt-12">
                <h2 className="text-center text-xl font-bold text-foreground">
                  Customize settings
                </h2>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Fine-tune your generation parameters
                </p>
                <div className="mt-8 space-y-6">
                  {/* Duration — visual buttons */}
                  {selectedModel.durations.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-3 block">
                        Duration
                      </label>
                      <div className="flex gap-3">
                        {selectedModel.durations.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDuration(d)}
                            className={cn(
                              "flex-1 rounded-xl border-2 py-3 text-center transition-all",
                              duration === d
                                ? "border-[#bd711d] bg-[#bd711d]/5 shadow-sm"
                                : "border-border hover:border-[#bd711d]/40",
                            )}
                          >
                            <span className="text-lg font-bold text-foreground block">
                              {d}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              seconds
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aspect Ratio — visual rectangles */}
                  {selectedModel.aspectRatios.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-3 block">
                        Aspect Ratio
                      </label>
                      <div className="flex gap-3">
                        {ASPECT_VISUALS.filter((av) =>
                          selectedModel.aspectRatios.includes(av.value),
                        ).map((av) => (
                          <button
                            key={av.value}
                            type="button"
                            onClick={() => setAspectRatio(av.value)}
                            className={cn(
                              "flex-1 flex flex-col items-center gap-2 rounded-xl border-2 py-4 transition-all",
                              aspectRatio === av.value
                                ? "border-[#bd711d] bg-[#bd711d]/5 shadow-sm"
                                : "border-border hover:border-[#bd711d]/40",
                            )}
                          >
                            <div
                              className={cn(
                                "rounded border-2 transition-colors",
                                aspectRatio === av.value
                                  ? "border-[#bd711d]"
                                  : "border-muted-foreground/30",
                              )}
                              style={{ width: av.w, height: av.h }}
                            />
                            <div className="text-center">
                              <span className="text-xs font-semibold text-foreground block">
                                {av.value}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {av.label}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution */}
                  {selectedModel.resolutions.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-3 block">
                        Resolution
                      </label>
                      <div className="flex gap-3">
                        {selectedModel.resolutions.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setResolution(r)}
                            className={cn(
                              "flex-1 rounded-xl border-2 py-3 text-center transition-all",
                              resolution === r
                                ? "border-[#bd711d] bg-[#bd711d]/5 shadow-sm"
                                : "border-border hover:border-[#bd711d]/40",
                            )}
                          >
                            <span className="text-sm font-bold text-foreground">
                              {r}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Voice selector */}
                  {selectedModel.supportsAudio && (
                    <VoiceSelector
                      selectedId={voicePresetId}
                      onChange={setVoicePresetId}
                    />
                  )}

                  {/* Advanced options */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      Advanced Options
                      {showAdvanced ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {showAdvanced && (
                      <div className="mt-3 space-y-4 rounded-xl border bg-card p-4">
                        {selectedModel.supportsEnhancePrompt && (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-foreground">
                                Enhance Prompt
                              </span>
                              <p className="text-xs text-muted-foreground">
                                AI will improve your prompt
                              </p>
                            </div>
                            <Switch
                              checked={enhancePrompt}
                              onCheckedChange={setEnhancePrompt}
                            />
                          </div>
                        )}
                        {selectedModel.supportsAudio && (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-foreground">
                                Generate Audio
                              </span>
                              <p className="text-xs text-muted-foreground">
                                Add audio to the video
                              </p>
                            </div>
                            <Switch
                              checked={generateAudio}
                              onCheckedChange={setGenerateAudio}
                            />
                          </div>
                        )}
                        {selectedModel.supportsCfgScale && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">
                                CFG Scale
                              </span>
                              <span className="text-xs text-muted-foreground">
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
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <span className="text-sm font-medium text-foreground">
                            Seed
                          </span>
                          <input
                            type="number"
                            value={seed ?? ""}
                            onChange={(e) =>
                              setSeed(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              )
                            }
                            placeholder="Random"
                            className={cn(inputCls, "w-full px-4")}
                          />
                        </div>
                        {projects && projects.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-sm font-medium text-foreground">
                              Project
                            </span>
                            <Select
                              value={projectId}
                              onValueChange={setProjectId}
                            >
                              <SelectTrigger className={inputCls}>
                                <SelectValue placeholder="No project" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">No project</SelectItem>
                                {projects.map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ────────── REVIEW ────────── */}
            {currentKey === "review" && selectedModel && (
              <div className="pt-8 sm:pt-12">
                <h2 className="text-center text-xl font-bold text-foreground">
                  Review & generate
                </h2>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Confirm your settings before generating
                </p>

                {error && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">
                        Generation Failed
                      </p>
                      <p className="text-destructive/80 mt-0.5 text-xs">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 rounded-xl border bg-card overflow-hidden">
                  <div className="p-5 space-y-3">
                    <ReviewRow
                      label="Type"
                      value={getTypeLabel(genType)}
                    />
                    <ReviewRow label="Model" value={selectedModel.name} />
                    {selectedModel.durations.length > 0 && (
                      <ReviewRow label="Duration" value={`${duration}s`} />
                    )}
                    {selectedModel.aspectRatios.length > 0 && (
                      <ReviewRow label="Aspect Ratio" value={aspectRatio} />
                    )}
                    {selectedModel.resolutions.length > 0 && (
                      <ReviewRow label="Resolution" value={resolution} />
                    )}
                    {avatarId && (
                      <ReviewRow
                        label="Avatar"
                        value={
                          selectedModel.avatarOptions?.find(
                            (a) => a.id === avatarId,
                          )?.name || avatarId
                        }
                      />
                    )}
                    {voicePresetId && (
                      <ReviewRow label="Voice" value={voicePresetId} />
                    )}
                    {enhancePrompt &&
                      selectedModel.supportsEnhancePrompt && (
                        <ReviewRow label="Enhance Prompt" value="Yes" />
                      )}
                    {generateAudio && selectedModel.supportsAudio && (
                      <ReviewRow label="Generate Audio" value="Yes" />
                    )}
                  </div>

                  {prompt && (
                    <div className="border-t px-5 py-3">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                        Prompt
                      </span>
                      <p className="text-sm text-foreground mt-1 line-clamp-4">
                        {prompt}
                      </p>
                    </div>
                  )}

                  {negativePrompt && (
                    <div className="border-t px-5 py-3">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                        Negative Prompt
                      </span>
                      <p className="text-sm text-foreground mt-1 line-clamp-2">
                        {negativePrompt}
                      </p>
                    </div>
                  )}

                  <div className="border-t bg-[#bd711d]/5 px-5 py-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Credit Cost
                    </span>
                    <span className="text-lg font-bold text-[#bd711d]">
                      {selectedModel.creditCost} credits
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ────────── PROCESSING ────────── */}
            {currentKey === "processing" && (
              <div className="flex flex-col items-center justify-center min-h-[80vh] px-5">
                <div
                  className="h-16 w-16 rounded-full border-4 border-[#bd711d]/20 border-t-[#bd711d]"
                  style={{ animation: "wizardSpin 1s linear infinite" }}
                />
                <h2 className="mt-6 text-xl font-bold text-foreground">
                  Generating your video...
                </h2>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                  This may take a moment. Your video is being queued for
                  processing.
                </p>
              </div>
            )}

            {/* ────────── SUCCESS ────────── */}
            {currentKey === "success" && (
              <div className="flex flex-col items-center justify-center min-h-[80vh] px-5">
                <img
                  src={videoCreateImg}
                  alt=""
                  className="h-32 w-auto object-contain mb-6 opacity-80"
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                  <Check className="h-6 w-6 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  All done!
                </h2>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                  Your video has been queued and will be ready soon. You can
                  track the progress on the detail page.
                </p>
                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() =>
                      resultId &&
                      navigate(`/video-studio/video/${resultId}`)
                    }
                    className="flex items-center gap-2 rounded-2xl bg-[#bd711d] px-8 py-3 text-sm font-semibold text-white hover:bg-[#a5631a] shadow-lg shadow-[#bd711d]/20 transition-all"
                  >
                    View Video
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate("/video-studio")}
                    className="rounded-2xl border-2 border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-all"
                  >
                    Back to Studio
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ BOTTOM BUTTON ============ */}
      {isContent && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
          <div className="mx-auto max-w-[540px] pointer-events-auto">
            <button
              onClick={goNext}
              disabled={!canProceed() || isSubmitting}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-[18px] rounded-2xl text-sm font-semibold transition-all",
                canProceed() && !isSubmitting
                  ? "bg-[#bd711d] text-white hover:bg-[#a5631a] shadow-lg shadow-[#bd711d]/20"
                  : "bg-foreground/5 text-muted-foreground cursor-not-allowed",
              )}
            >
              {currentKey === "review" ? (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Video
                  {selectedModel && (
                    <span className="text-white/70 ml-1">
                      ({selectedModel.creditCost} credits)
                    </span>
                  )}
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Welcome — custom bottom button */}
      {currentKey === "welcome" && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
          <div className="mx-auto max-w-[540px] pointer-events-auto">
            <button
              onClick={goNext}
              className="w-full flex items-center justify-center gap-2 py-[18px] rounded-2xl text-sm font-semibold bg-[#bd711d] text-white hover:bg-[#a5631a] shadow-lg shadow-[#bd711d]/20 transition-all"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
