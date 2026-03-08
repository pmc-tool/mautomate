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
    // Expire drafts older than 24 hours
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

export default function StoryCreatePage({ user }: any) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeProjectId = searchParams.get("resume");

  // Load saved draft on mount
  const saved = useRef(loadDraft());

  const [currentStep, setCurrentStep] = useState(saved.current?.currentStep ?? 1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(!!resumeProjectId);

  // Step 1 state
  const [prompt, setPrompt] = useState(saved.current?.prompt ?? "");
  const [targetDuration, setTargetDuration] = useState(saved.current?.targetDuration ?? 60);
  const [referenceImageUrl, setReferenceImageUrl] = useState(saved.current?.referenceImageUrl ?? "");

  // Step 2 state
  const [projectId, setProjectId] = useState<string | null>(saved.current?.projectId ?? null);
  const [scenes, setScenes] = useState<SceneDraft[]>(saved.current?.scenes ?? []);

  // Step 3 state
  const [voiceId, setVoiceId] = useState(saved.current?.voiceId ?? VOICE_OPTIONS[0].id);
  const [musicTrackId, setMusicTrackId] = useState<string | null>(saved.current?.musicTrackId ?? null);
  const [resolution, setResolution] = useState(saved.current?.resolution ?? "720p");
  const [subtitles, setSubtitles] = useState(saved.current?.subtitles ?? true);

  // Resume from URL param (?resume=projectId) — fetch project from DB
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
        setCurrentStep(2); // Jump to plan editing
      }
      setIsRestoring(false);
    }
  }, [resumeProject, isRestoring]);

  // Auto-save draft to localStorage on every state change
  useEffect(() => {
    // Don't save while restoring
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

  // ── Step 1: Generate Plan ──────────────────────────────────
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

      // result should contain scenes array from the server
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

  // ── Step 2: Scene editing helpers ──────────────────────────
  const updateScene = (index: number, field: keyof SceneDraft, value: any) => {
    setScenes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const removeScene = (index: number) => {
    setScenes((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, sceneIndex: i }))
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

  // ── Step 4: Start Generation ───────────────────────────────
  const handleStartGeneration = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    setIsLoading(true);

    try {
      // Save the updated plan first
      await updateStoryPlan({
        projectId,
        scenes,
      });

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

  // ── Render ─────────────────────────────────────────────────
  return (
    <UserDashboardLayout user={user}>
      <div className="mx-auto max-w-3xl">
        <StoryWizard currentStep={currentStep} steps={STEPS}>
          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ─── STEP 1: Prompt ──────────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">Create Your Story</h1>
                  <p className="mt-1 text-gray-400">
                    Describe your story idea and our AI will generate a full scene-by-scene plan.
                  </p>
                </div>
                {(prompt || projectId) && (
                  <button
                    onClick={handleStartFresh}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Clear draft
                  </button>
                )}
              </div>

              {/* Prompt textarea */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Story Idea
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A journey through the evolution of ancient civilizations, from the pyramids of Egypt to the temples of Angkor Wat..."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-gray-700 bg-gray-800 p-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {prompt.length}/20 characters minimum
                </p>
              </div>

              {/* Duration selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Target Duration
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 20, label: "20 Seconds", desc: "2-3 scenes, quick spot" },
                    { value: 60, label: "1 Minute", desc: "5-8 scenes, concise" },
                    { value: 120, label: "2 Minutes", desc: "10-16 scenes, detailed" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTargetDuration(opt.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-4 transition-all ${
                        targetDuration === opt.value
                          ? "border-blue-500 bg-blue-600/10 ring-1 ring-blue-500"
                          : "border-gray-700 bg-gray-800 hover:border-gray-600"
                      }`}
                    >
                      <Clock
                        className={`h-5 w-5 ${
                          targetDuration === opt.value ? "text-blue-400" : "text-gray-500"
                        }`}
                      />
                      <span className="font-medium text-white">{opt.label}</span>
                      <span className="text-xs text-gray-400">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference image */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Reference Image URL{" "}
                  <span className="text-gray-500">(optional)</span>
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2">
                  <ImageIcon className="h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={referenceImageUrl}
                    onChange={(e) => setReferenceImageUrl(e.target.value)}
                    placeholder="https://example.com/reference.jpg"
                    className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGeneratePlan}
                disabled={isLoading || prompt.trim().length < 20}
                className="w-full bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating your story plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Story Plan
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ─── STEP 2: Story Plan ─────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Story Plan</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Edit scenes, adjust timing, or regenerate the entire plan.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span
                    className={`font-medium ${
                      Math.abs(totalDuration - targetDuration) > 15
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {totalDuration}s
                  </span>
                  <span className="text-gray-500">/ {targetDuration}s target</span>
                </div>
              </div>

              {/* Scene cards */}
              <div className="space-y-4">
                {scenes.map((scene, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-gray-700 bg-gray-800 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-300">
                          Scene {idx + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={scene.duration}
                          onChange={(e) =>
                            updateScene(idx, "duration", Number(e.target.value))
                          }
                          className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value={5}>5s</option>
                          <option value={10}>10s</option>
                          <option value={15}>15s</option>
                        </select>
                        {scenes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeScene(idx)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                          Visual Prompt
                        </label>
                        <textarea
                          value={scene.visualPrompt}
                          onChange={(e) =>
                            updateScene(idx, "visualPrompt", e.target.value)
                          }
                          rows={2}
                          className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                          placeholder="Describe the visual for this scene..."
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                          Narration Text
                        </label>
                        <textarea
                          value={scene.narrationText}
                          onChange={(e) =>
                            updateScene(idx, "narrationText", e.target.value)
                          }
                          rows={2}
                          className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                          placeholder="Narration text for this scene..."
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
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-700 p-3 text-sm text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-300"
              >
                <Plus className="h-4 w-4" />
                Add Scene
              </button>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRegeneratePlan}
                    disabled={isLoading}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Regenerate Plan
                    <span className="ml-1 text-xs text-gray-500">(10 credits)</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleStartFresh}
                    disabled={isLoading}
                    className="border-red-800 text-red-400 hover:bg-red-900/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    Start Fresh
                  </Button>
                </div>
                <Button
                  onClick={() => setCurrentStep(3)}
                  disabled={scenes.length === 0}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Style ──────────────────────────── */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white">Style & Settings</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Choose a voice, background music, and output settings.
                </p>
              </div>

              <VoicePicker selectedVoiceId={voiceId} onSelect={setVoiceId} />

              <MusicPicker selectedTrackId={musicTrackId} onSelect={setMusicTrackId} />

              {/* Resolution */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Resolution
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "720p", label: "720p HD", desc: "Faster, lower cost" },
                    { value: "1080p", label: "1080p Full HD", desc: "Higher quality" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setResolution(opt.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-4 transition-all ${
                        resolution === opt.value
                          ? "border-blue-500 bg-blue-600/10 ring-1 ring-blue-500"
                          : "border-gray-700 bg-gray-800 hover:border-gray-600"
                      }`}
                    >
                      <Monitor
                        className={`h-5 w-5 ${
                          resolution === opt.value ? "text-blue-400" : "text-gray-500"
                        }`}
                      />
                      <span className="font-medium text-white">{opt.label}</span>
                      <span className="text-xs text-gray-400">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtitles */}
              <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800 p-4">
                <div className="flex items-center gap-3">
                  <Subtitles className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-white">Subtitles</p>
                    <p className="text-xs text-gray-400">
                      Burn subtitles into the final video
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubtitles(!subtitles)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    subtitles ? "bg-blue-600" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      subtitles ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(4)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: Review & Generate ──────────────── */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Review & Generate</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Review your settings before starting generation.
                </p>
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                <h3 className="mb-4 font-semibold text-white">Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Scenes</span>
                    <p className="font-medium text-white">{scenes.length}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Duration</span>
                    <p className="font-medium text-white">{totalDuration}s</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Resolution</span>
                    <p className="font-medium text-white">{resolution}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Voice</span>
                    <p className="font-medium text-white">
                      {VOICE_OPTIONS.find((v) => v.id === voiceId)?.name || voiceId}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Music</span>
                    <p className="font-medium text-white">
                      {musicTrackId ? musicTrackId : "None selected"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Subtitles</span>
                    <p className="font-medium text-white">
                      {subtitles ? "Enabled" : "Disabled"}
                    </p>
                  </div>
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
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleStartGeneration}
                  disabled={isLoading}
                  className="bg-blue-600 px-8 text-white hover:bg-blue-700"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting generation...
                    </>
                  ) : (
                    <>
                      <Film className="h-4 w-4" />
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
