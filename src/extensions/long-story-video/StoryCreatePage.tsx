import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "wasp/client/operations";
import {
  createStoryProject,
  generateStoryPlan,
  updateStoryPlan,
  startStoryGeneration,
  getStoryProject,
} from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { StoryWizard } from "./components/StoryWizard";
import { VoicePicker } from "./components/VoicePicker";
import { MusicPicker } from "./components/MusicPicker";
import { CostEstimate } from "./components/CostEstimate";
import { VOICE_OPTIONS } from "./ttsService";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Clock,
  Film,
  ImageIcon,
  Monitor,
  Subtitles,
  AlertTriangle,
  Check,
  Eye,
  MessageSquare,
  GripVertical,
  Zap,
  LayoutGrid,
  Mic,
  Music,
  CheckCircle2,
} from "lucide-react";

const STEPS = ["Prompt", "Story Plan", "Style", "Review"];
const STORAGE_KEY = "long-story-wizard-draft";

interface WizardDraft {
  currentStep: number;
  prompt: string;
  targetDuration: number;
  referenceImageUrl: string;
  projectId: string | null;
  scenes: SceneDraft[];
  voiceId: string;
  musicTrackId: string | null;
  resolution: string;
  subtitles: boolean;
  savedAt: number;
}

function saveDraft(draft: Omit<WizardDraft, "savedAt">) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    );
  } catch {}
}

function loadDraft(): WizardDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as WizardDraft;
    if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

interface SceneDraft {
  sceneIndex: number;
  visualPrompt: string;
  narrationText: string;
  duration: number;
  shotType: "single" | "multi";
}

// ── Duration options ──────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  {
    value: 20,
    label: "20 Seconds",
    desc: "Quick spot",
    detail: "2-3 scenes",
    icon: Zap,
  },
  {
    value: 60,
    label: "1 Minute",
    desc: "Concise story",
    detail: "5-8 scenes",
    icon: Film,
  },
  {
    value: 120,
    label: "2 Minutes",
    desc: "Detailed narrative",
    detail: "10-16 scenes",
    icon: LayoutGrid,
  },
];

// ── Main Component ────────────────────────────────────────────────────────

export default function StoryCreatePage({ user }: any) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeProjectId = searchParams.get("resume");

  const saved = useRef(loadDraft());

  const [currentStep, setCurrentStep] = useState(saved.current?.currentStep ?? 1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(!!resumeProjectId);

  // Step 1
  const [prompt, setPrompt] = useState(saved.current?.prompt ?? "");
  const [targetDuration, setTargetDuration] = useState(saved.current?.targetDuration ?? 60);
  const [referenceImageUrl, setReferenceImageUrl] = useState(saved.current?.referenceImageUrl ?? "");

  // Step 2
  const [projectId, setProjectId] = useState<string | null>(saved.current?.projectId ?? null);
  const [scenes, setScenes] = useState<SceneDraft[]>(saved.current?.scenes ?? []);

  // Step 3
  const [voiceId, setVoiceId] = useState(saved.current?.voiceId ?? VOICE_OPTIONS[0].id);
  const [musicTrackId, setMusicTrackId] = useState<string | null>(saved.current?.musicTrackId ?? null);
  const [resolution, setResolution] = useState(saved.current?.resolution ?? "720p");
  const [subtitles, setSubtitles] = useState(saved.current?.subtitles ?? true);

  // Resume
  const { data: resumeProject } = useQuery(
    getStoryProject,
    { id: resumeProjectId! },
    { enabled: !!resumeProjectId }
  );

  useEffect(() => {
    if (resumeProject && isRestoring) {
      setProjectId(resumeProject.id);
      setPrompt(resumeProject.prompt || "");
      setTargetDuration(resumeProject.targetDuration || 60);
      setReferenceImageUrl(resumeProject.referenceImageUrl || "");
      if (resumeProject.scenes?.length > 0) {
        setScenes(
          resumeProject.scenes
            .sort((a: any, b: any) => a.sceneIndex - b.sceneIndex)
            .map((s: any) => ({
              sceneIndex: s.sceneIndex,
              visualPrompt: s.visualPrompt || "",
              narrationText: s.narrationText || "",
              duration: s.duration || 10,
              shotType: (s.shotType as "single" | "multi") || "single",
            }))
        );
        setCurrentStep(2);
      }
      setIsRestoring(false);
    }
  }, [resumeProject, isRestoring]);

  // Auto-save
  useEffect(() => {
    if (isRestoring) return;
    saveDraft({
      currentStep,
      prompt,
      targetDuration,
      referenceImageUrl,
      projectId,
      scenes,
      voiceId,
      musicTrackId,
      resolution,
      subtitles,
    });
  }, [currentStep, prompt, targetDuration, referenceImageUrl, projectId, scenes, voiceId, musicTrackId, resolution, subtitles, isRestoring]);

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleGeneratePlan = useCallback(async () => {
    if (prompt.trim().length < 20) {
      setError("Please enter at least 20 characters for your story idea.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const project = await createStoryProject({
        prompt: prompt.trim(),
        targetDuration,
        referenceImageUrl: referenceImageUrl.trim() || undefined,
      });
      setProjectId(project.id);
      const result = await generateStoryPlan({ projectId: project.id });
      if (result?.scenes && Array.isArray(result.scenes)) {
        setScenes(
          result.scenes.map((s: any, idx: number) => ({
            sceneIndex: idx,
            visualPrompt: s.visualPrompt || "",
            narrationText: s.narrationText || "",
            duration: s.duration || 10,
            shotType: (s.shotType as "single" | "multi") || "single",
          }))
        );
      }
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to generate story plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, targetDuration, referenceImageUrl]);

  const updateScene = (index: number, field: keyof SceneDraft, value: any) => {
    setScenes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const removeScene = (index: number) => {
    setScenes((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sceneIndex: i }))
    );
  };

  const addScene = () => {
    setScenes((prev) => [
      ...prev,
      {
        sceneIndex: prev.length,
        visualPrompt: "",
        narrationText: "",
        duration: 10,
        shotType: "single" as const,
      },
    ]);
  };

  const handleStartFresh = useCallback(() => {
    clearDraft();
    setCurrentStep(1);
    setPrompt("");
    setTargetDuration(60);
    setReferenceImageUrl("");
    setProjectId(null);
    setScenes([]);
    setVoiceId(VOICE_OPTIONS[0].id);
    setMusicTrackId(null);
    setResolution("720p");
    setSubtitles(true);
    setError(null);
  }, []);

  const handleRegeneratePlan = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    setIsLoading(true);
    try {
      const result = await generateStoryPlan({ projectId });
      if (result?.scenes && Array.isArray(result.scenes)) {
        setScenes(
          result.scenes.map((s: any, idx: number) => ({
            sceneIndex: idx,
            visualPrompt: s.visualPrompt || "",
            narrationText: s.narrationText || "",
            duration: s.duration || 10,
            shotType: (s.shotType as "single" | "multi") || "single",
          }))
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to regenerate plan.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const handleStartGeneration = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    setIsLoading(true);
    try {
      await updateStoryPlan({ projectId, scenes });
      await startStoryGeneration({
        projectId,
        voiceId,
        musicTrackId: musicTrackId || undefined,
        resolution: resolution as "720p" | "1080p",
        subtitlesEnabled: subtitles,
      });
      clearDraft();
      navigate(`/long-story/project/${projectId}`);
    } catch (err: any) {
      setError(err.message || "Failed to start generation.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, scenes, voiceId, musicTrackId, resolution, subtitles, navigate]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <UserDashboardLayout user={user}>
      <div className="mx-auto max-w-[640px]">
        <StoryWizard currentStep={currentStep} steps={STEPS}>
          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-300 bg-red-500/10 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-300">
                &times;
              </button>
            </div>
          )}

          {/* ═══════════ STEP 1: PROMPT ═══════════ */}
          {currentStep === 1 && (
            <div className="space-y-7">
              {/* Header */}
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Create Your Story</h1>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Describe your story idea and our AI will generate a full cinematic scene-by-scene plan.
                </p>
              </div>

              {/* Prompt textarea */}
              <div>
                <label className="mb-2 flex items-center justify-between text-sm font-medium text-foreground">
                  Story Idea
                  {(prompt || projectId) && (
                    <button
                      onClick={handleStartFresh}
                      className="text-xs font-normal text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      Clear draft
                    </button>
                  )}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A journey through the evolution of ancient civilizations, from the pyramids of Egypt to the temples of Angkor Wat..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-border bg-card p-4 text-foreground placeholder-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{prompt.length} characters</span>
                  <span className={prompt.length >= 20 ? "text-emerald-500" : ""}>
                    {prompt.length >= 20 ? "Ready" : `${20 - prompt.length} more needed`}
                  </span>
                </div>
              </div>

              {/* Duration selector */}
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">
                  Target Duration
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {DURATION_OPTIONS.map((opt) => {
                    const isSelected = targetDuration === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTargetDuration(opt.value)}
                        className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all hover:scale-[1.02] ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                            : "border-border hover:border-primary/40 hover:shadow-sm"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <Icon
                          className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                        <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {opt.detail}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reference image */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Reference Image{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type="text"
                    value={referenceImageUrl}
                    onChange={(e) => setReferenceImageUrl(e.target.value)}
                    placeholder="Paste image URL for visual style reference..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGeneratePlan}
                disabled={isLoading || prompt.trim().length < 20}
                className="h-12 w-full gap-2 rounded-xl text-base"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    AI is crafting your story...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Story Plan
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ═══════════ STEP 2: STORY PLAN ═══════════ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Header with duration badge */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Story Plan</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review and edit your scenes. Adjust timing, visuals, and narration.
                  </p>
                </div>
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                    Math.abs(totalDuration - targetDuration) > 15
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-green-400"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {totalDuration}s / {targetDuration}s
                </div>
              </div>

              {/* Scene cards */}
              <div className="space-y-3">
                {scenes.map((scene, idx) => (
                  <div
                    key={idx}
                    className="group rounded-xl border border-border bg-card transition-all hover:border-primary/20 hover:shadow-sm"
                  >
                    {/* Scene header */}
                    <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          Scene {idx + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={scene.duration}
                          onChange={(e) =>
                            updateScene(idx, "duration", Number(e.target.value))
                          }
                          className="rounded-lg border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value={5}>5s</option>
                          <option value={10}>10s</option>
                          <option value={15}>15s</option>
                        </select>
                        {scenes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeScene(idx)}
                            className="rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scene body */}
                    <div className="space-y-3 p-4">
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          Visual Prompt
                        </label>
                        <textarea
                          value={scene.visualPrompt}
                          onChange={(e) =>
                            updateScene(idx, "visualPrompt", e.target.value)
                          }
                          rows={2}
                          className="w-full resize-none rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground placeholder-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                          placeholder="Describe the cinematic visual for this scene..."
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          Narration
                        </label>
                        <textarea
                          value={scene.narrationText}
                          onChange={(e) =>
                            updateScene(idx, "narrationText", e.target.value)
                          }
                          rows={2}
                          className="w-full resize-none rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground placeholder-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                          placeholder="Spoken narration text for this scene..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add scene */}
              <button
                type="button"
                onClick={addScene}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-3.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                Add Scene
              </button>

              {/* Bottom actions */}
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegeneratePlan}
                    disabled={isLoading}
                    className="gap-1.5 text-muted-foreground"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Regenerate
                    <Badge variant="secondary" className="ml-0.5 text-[10px]">10 cr</Badge>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartFresh}
                    disabled={isLoading}
                    className="gap-1.5 text-red-500/70 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Start Over
                  </Button>
                </div>
                <Button
                  onClick={() => setCurrentStep(3)}
                  disabled={scenes.length === 0}
                  className="gap-1.5"
                >
                  Next: Style
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════ STEP 3: STYLE ═══════════ */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Mic className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Style & Settings</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Choose a narrator voice, background music, and output quality.
                </p>
              </div>

              <VoicePicker selectedVoiceId={voiceId} onSelect={setVoiceId} />

              <MusicPicker selectedTrackId={musicTrackId} onSelect={setMusicTrackId} />

              {/* Resolution */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Resolution
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "720p", label: "720p HD", desc: "Faster, lower cost", icon: Monitor },
                    { value: "1080p", label: "1080p Full HD", desc: "Higher quality", icon: Monitor },
                  ].map((opt) => {
                    const isSelected = resolution === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setResolution(opt.value)}
                        className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-all hover:scale-[1.02] ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                            : "border-border hover:border-primary/40 hover:shadow-sm"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <opt.icon
                          className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                        <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subtitles */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Subtitles className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Burn Subtitles</p>
                    <p className="text-xs text-muted-foreground">
                      Overlay narration text on the final video
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubtitles(!subtitles)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    subtitles ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      subtitles ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep(2)}
                  className="gap-1.5 text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(4)} className="gap-1.5">
                  Review & Generate
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════ STEP 4: REVIEW ═══════════ */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Ready to Generate</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Review your story settings. Once you start, AI will generate videos, narration, and music.
                </p>
              </div>

              {/* Summary grid */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-y divide-border">
                  <SummaryItem icon={<LayoutGrid className="h-4 w-4" />} label="Scenes" value={`${scenes.length} scenes`} />
                  <SummaryItem icon={<Clock className="h-4 w-4" />} label="Duration" value={`${totalDuration}s`} />
                  <SummaryItem icon={<Monitor className="h-4 w-4" />} label="Resolution" value={resolution} />
                  <SummaryItem
                    icon={<Mic className="h-4 w-4" />}
                    label="Voice"
                    value={VOICE_OPTIONS.find((v) => v.id === voiceId)?.name || voiceId}
                  />
                  <SummaryItem
                    icon={<Music className="h-4 w-4" />}
                    label="Music"
                    value={musicTrackId ? "Selected" : "Auto (by mood)"}
                  />
                  <SummaryItem
                    icon={<Subtitles className="h-4 w-4" />}
                    label="Subtitles"
                    value={subtitles ? "Enabled" : "Disabled"}
                  />
                </div>
              </div>

              <CostEstimate
                sceneCount={scenes.length}
                resolution={resolution}
                targetDuration={targetDuration}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep(3)}
                  className="gap-1.5 text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleStartGeneration}
                  disabled={isLoading}
                  className="h-12 gap-2 rounded-xl px-8 text-base"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Film className="h-5 w-5" />
                      Generate Story Video
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </StoryWizard>
      </div>
    </UserDashboardLayout>
  );
}

// ── Summary Item ──────────────────────────────────────────────────────────

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
