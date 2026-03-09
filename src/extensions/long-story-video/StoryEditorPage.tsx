import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useQuery } from "wasp/client/operations";
import {
  getStoryProject,
  regenerateScene,
  checkStoryStatus,
  generateNarration,
  stitchStoryVideo,
  updateStoryPlan,
  generateStoryPlan,
} from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { SceneTimeline } from "./components/SceneTimeline";
import { ProgressTracker } from "./components/ProgressTracker";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Mic,
  Film,
  Download,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Save,
  X,
  Wand2,
  Plus,
  Trash2,
  Clock,
  Eye,
  MessageSquare,
  Play,
  LayoutGrid,
  Music,
  Subtitles,
  Monitor,
} from "lucide-react";

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  generating: { label: "Generating", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  narrating: { label: "Adding Voice", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  narrated: { label: "Ready to Finalize", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  generated: { label: "Scenes Ready", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  stitching: { label: "Finalizing", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  planned: { label: "Planned", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  draft: { label: "Draft", color: "text-muted-foreground", bg: "bg-muted border-border" },
  failed: { label: "Failed", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.draft;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function StoryEditorPage({ user }: any) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editScenes, setEditScenes] = useState<Array<{
    id?: string;
    sceneIndex: number;
    visualPrompt: string;
    narrationText: string;
    duration: number;
    shotType: "single" | "multi";
    transitionNote?: string;
  }>>([]);

  const isActiveStatus = (s: string) =>
    ["generating", "narrating", "stitching"].includes(s);

  const {
    data: project,
    isLoading,
    error: queryError,
  } = useQuery(getStoryProject, { id: id! }, {
    enabled: !!id,
    refetchInterval: 4000,
  } as any);

  // Auto-trigger checkStoryStatus every 20s during "generating"
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const status = (project?.status as string) || "";
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (status === "generating" && id) {
      checkStoryStatus({ projectId: id }).catch(() => {});
      checkIntervalRef.current = setInterval(() => {
        checkStoryStatus({ projectId: id }).catch(() => {});
      }, 20000);
    }
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [project?.status, id]);

  const scenes = project?.scenes ?? [];
  const allScenesCompleted =
    scenes.length > 0 && scenes.every((s: any) => s.status === "completed");
  const hasFailed = scenes.some((s: any) => s.status === "failed");

  // ── Actions ────────────────────────────────────────────────
  const handleCheckStatus = useCallback(async () => {
    if (!id) return;
    setError(null);
    setActionLoading("check");
    try { await checkStoryStatus({ projectId: id }); }
    catch (err: any) { setError(err.message || "Failed to check status."); }
    finally { setActionLoading(null); }
  }, [id]);

  const handleGenerateNarration = useCallback(async () => {
    if (!id) return;
    setError(null);
    setActionLoading("narration");
    try { await generateNarration({ projectId: id }); }
    catch (err: any) { setError(err.message || "Failed to start narration generation."); }
    finally { setActionLoading(null); }
  }, [id]);

  const handleStitchVideo = useCallback(async () => {
    if (!id) return;
    setError(null);
    setActionLoading("stitch");
    try { await stitchStoryVideo({ projectId: id }); }
    catch (err: any) { setError(err.message || "Failed to start video stitching."); }
    finally { setActionLoading(null); }
  }, [id]);

  const handleRegenerate = useCallback(async (sceneId: string) => {
    setError(null);
    setActionLoading(`regen-${sceneId}`);
    try { await regenerateScene({ sceneId }); }
    catch (err: any) { setError(err.message || "Failed to regenerate scene."); }
    finally { setActionLoading(null); }
  }, []);

  // ── Edit mode handlers ──────────────────────────────────────
  const enterEditMode = useCallback(() => {
    if (!project) return;
    setEditScenes(
      (project.scenes ?? []).map((s: any) => ({
        id: s.id,
        sceneIndex: s.sceneIndex,
        visualPrompt: s.visualPrompt,
        narrationText: s.narrationText,
        duration: s.duration,
        shotType: s.shotType || "single",
        transitionNote: s.transitionNote || "",
      }))
    );
    setEditMode(true);
    setError(null);
  }, [project]);

  const cancelEditMode = useCallback(() => {
    setEditMode(false);
    setEditScenes([]);
    setError(null);
  }, []);

  const handleSavePlan = useCallback(async () => {
    if (!id) return;
    setError(null);
    setActionLoading("save-plan");
    try {
      await updateStoryPlan({ projectId: id, scenes: editScenes });
      setEditMode(false);
      setEditScenes([]);
    } catch (err: any) { setError(err.message || "Failed to save plan."); }
    finally { setActionLoading(null); }
  }, [id, editScenes]);

  const handleRegeneratePlan = useCallback(async () => {
    if (!id) return;
    setError(null);
    setActionLoading("regen-plan");
    try {
      await generateStoryPlan({ projectId: id });
      setEditMode(false);
      setEditScenes([]);
    } catch (err: any) { setError(err.message || "Failed to regenerate plan."); }
    finally { setActionLoading(null); }
  }, [id]);

  const updateEditScene = useCallback(
    (idx: number, field: string, value: string | number) => {
      setEditScenes((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
      );
    }, []
  );

  const addScene = useCallback(() => {
    setEditScenes((prev) => [
      ...prev,
      { sceneIndex: prev.length, visualPrompt: "", narrationText: "", duration: 5, shotType: "single" as const, transitionNote: "" },
    ]);
  }, []);

  const removeScene = useCallback((idx: number) => {
    setEditScenes((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sceneIndex: i }))
    );
  }, []);

  // ── Loading / Error states ─────────────────────────────────
  if (isLoading) {
    return (
      <UserDashboardLayout user={user}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </UserDashboardLayout>
    );
  }

  if (queryError || !project) {
    return (
      <UserDashboardLayout user={user}>
        <div className="py-20 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
          <p className="text-muted-foreground mt-4">
            {queryError?.message || "Project not found."}
          </p>
          <Link to="/long-story" className="mt-4 inline-block text-primary hover:underline">
            Back to all stories
          </Link>
        </div>
      </UserDashboardLayout>
    );
  }

  const status = project.status as string;
  const statusConfig = getStatusConfig(status);
  const showCheckStatus = status === "generating";
  const showNarration =
    allScenesCompleted && !["narrating", "stitching", "completed"].includes(status);
  const showStitch =
    status === "narrated" ||
    (allScenesCompleted &&
      scenes.every((s: any) => s.narrationUrl) &&
      !["stitching", "completed"].includes(status));
  const showDownload = status === "completed" && project.finalVideoUrl;
  const canEditPlan = status === "planned" && !editMode;
  const totalEditDuration = editScenes.reduce((sum, s) => sum + s.duration, 0);
  const completedScenes = scenes.filter((s: any) => s.status === "completed").length;

  return (
    <UserDashboardLayout user={user}>
      <div className="mx-auto max-w-4xl">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              to="/long-story"
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                {project.title || "Untitled Story"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <LayoutGrid className="h-3 w-3" />
                  {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(project.targetDuration)} target
                </span>
                <span className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  {project.resolution}
                </span>
                {project.musicMood && (
                  <span className="flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    {project.musicMood}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${statusConfig.bg} ${statusConfig.color} border shrink-0`}
          >
            {statusConfig.label}
          </Badge>
        </div>

        {/* ── Final Video Player (top for completed) ─────── */}
        {status === "completed" && project.finalVideoUrl && (
          <div className="mb-6">
            <div className="overflow-hidden rounded-xl border border-border bg-black">
              <video
                src={project.finalVideoUrl}
                className="aspect-video w-full"
                controls
                preload="metadata"
                poster={project.referenceImageUrl || undefined}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Your video is ready</span>
              </div>
              <a
                href={project.finalVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Download Video
              </a>
            </div>
          </div>
        )}

        {/* ── Progress Section (for active/non-completed) ── */}
        {status !== "completed" && scenes.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <ProgressTracker scenes={scenes} projectStatus={status} />
          </div>
        )}

        {/* ── Live Activity Indicator ────────────────────── */}
        {isActiveStatus(status) && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-300">
                {status === "generating" && `Generating scene videos... (${completedScenes}/${scenes.length} done)`}
                {status === "narrating" && "Generating voice narration..."}
                {status === "stitching" && "Stitching final video with music & subtitles..."}
              </p>
              <p className="text-xs text-blue-400/60">Auto-updating every few seconds</p>
            </div>
            {status === "generating" && (
              <span className="shrink-0 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400">
                ~{Math.max(1, (scenes.length - completedScenes) * 3)}min
              </span>
            )}
          </div>
        )}

        {/* ── Error Banners ──────────────────────────────── */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {project.errorMessage && !error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{project.errorMessage}</span>
          </div>
        )}

        {/* ── Action Buttons ─────────────────────────────── */}
        {(canEditPlan || showCheckStatus || showNarration || showStitch || showDownload) && (
          <div className="mb-6 flex flex-wrap gap-3">
            {canEditPlan && (
              <>
                <Button onClick={enterEditMode} disabled={!!actionLoading} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Plan
                </Button>
                <Button
                  onClick={handleRegeneratePlan}
                  disabled={!!actionLoading}
                  variant="outline"
                  className="gap-2"
                >
                  {actionLoading === "regen-plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Regenerate Plan
                </Button>
              </>
            )}

            {showCheckStatus && (
              <Button onClick={handleCheckStatus} disabled={!!actionLoading} variant="outline" className="gap-2">
                {actionLoading === "check" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Check Status
              </Button>
            )}

            {showNarration && (
              <Button onClick={handleGenerateNarration} disabled={!!actionLoading} className="gap-2 bg-purple-600 hover:bg-purple-700">
                {actionLoading === "narration" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                Generate Narration
              </Button>
            )}

            {showStitch && (
              <Button onClick={handleStitchVideo} disabled={!!actionLoading} className="gap-2">
                {actionLoading === "stitch" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                Finalize Video
              </Button>
            )}

            {showDownload && status !== "completed" && (
              <a
                href={project.finalVideoUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Download Video
              </a>
            )}
          </div>
        )}

        {/* ── Scene Timeline / Edit Mode ──────────────────── */}
        <div>
          {editMode ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-foreground text-base font-semibold">Edit Scenes</h2>
                  <p className="text-muted-foreground text-xs">
                    {editScenes.length} scene{editScenes.length !== 1 ? "s" : ""} &middot;{" "}
                    <span className={Math.abs(totalEditDuration - project.targetDuration) > 15 ? "text-amber-400" : "text-emerald-400"}>
                      {totalEditDuration}s
                    </span>{" "}
                    / {project.targetDuration}s target
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={cancelEditMode} variant="outline" size="sm" disabled={!!actionLoading} className="gap-1.5">
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button onClick={handleSavePlan} size="sm" disabled={!!actionLoading} className="gap-1.5">
                    {actionLoading === "save-plan" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Changes
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {editScenes.map((scene, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </div>
                        <span className="text-foreground text-sm font-medium">Scene {idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <select
                          value={scene.duration}
                          onChange={(e) => updateEditScene(idx, "duration", parseInt(e.target.value))}
                          className="rounded-lg border border-border bg-muted px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
                        >
                          {[3, 5, 7, 10, 15, 20, 30].map((d) => (
                            <option key={d} value={d}>{d}s</option>
                          ))}
                        </select>
                        {editScenes.length > 1 && (
                          <button
                            onClick={() => removeScene(idx)}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <Eye className="h-3 w-3" /> Visual Prompt
                      </label>
                      <textarea
                        value={scene.visualPrompt}
                        onChange={(e) => updateEditScene(idx, "visualPrompt", e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                        placeholder="Describe the visual scene..."
                      />
                    </div>
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <MessageSquare className="h-3 w-3" /> Narration Text
                      </label>
                      <textarea
                        value={scene.narrationText}
                        onChange={(e) => updateEditScene(idx, "narrationText", e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                        placeholder="The narrator says..."
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={addScene}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  <Plus className="h-4 w-4" /> Add Scene
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-foreground text-base font-semibold">Scenes</h2>
                {scenes.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {completedScenes}/{scenes.length} completed
                  </span>
                )}
              </div>
              <SceneTimeline
                scenes={scenes}
                onRegenerate={handleRegenerate}
                projectStatus={status}
              />
            </>
          )}
        </div>
      </div>
    </UserDashboardLayout>
  );
}
