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
} from "lucide-react";

function statusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-600 text-white hover:bg-green-600";
    case "generating":
    case "narrating":
    case "stitching":
      return "bg-blue-600 text-white hover:bg-blue-600 animate-pulse";
    case "narrated":
      return "bg-cyan-600 text-white hover:bg-cyan-600";
    case "generated":
      return "bg-emerald-600 text-white hover:bg-emerald-600";
    case "failed":
      return "bg-red-600 text-white hover:bg-red-600";
    case "planned":
      return "bg-purple-600 text-white hover:bg-purple-600";
    default:
      return "bg-gray-600 text-gray-300 hover:bg-gray-600";
  }
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

  // Always poll every 4s — Wasp's useQuery caches results, so this is cheap when idle
  const {
    data: project,
    isLoading,
    error: queryError,
  } = useQuery(getStoryProject, { id: id! }, {
    enabled: !!id,
    refetchInterval: 4000,
  } as any);

  // Auto-trigger checkStoryStatus every 20s during "generating" to poll Novita
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const status = (project?.status as string) || "";

    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    if (status === "generating" && id) {
      // Trigger an immediate check
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
    try {
      await checkStoryStatus({ projectId: id });
    } catch (err: any) {
      setError(err.message || "Failed to check status.");
    } finally {
      setActionLoading(null);
    }
  }, [id]);

  const handleGenerateNarration = useCallback(async () => {
    if (!id) return;
    setError(null);
    setActionLoading("narration");
    try {
      await generateNarration({ projectId: id });
    } catch (err: any) {
      setError(err.message || "Failed to start narration generation.");
    } finally {
      setActionLoading(null);
    }
  }, [id]);

  const handleStitchVideo = useCallback(async () => {
    if (!id) return;
    setError(null);
    setActionLoading("stitch");
    try {
      await stitchStoryVideo({ projectId: id });
    } catch (err: any) {
      setError(err.message || "Failed to start video stitching.");
    } finally {
      setActionLoading(null);
    }
  }, [id]);

  const handleRegenerate = useCallback(
    async (sceneId: string) => {
      setError(null);
      setActionLoading(`regen-${sceneId}`);
      try {
        await regenerateScene({ sceneId });
      } catch (err: any) {
        setError(err.message || "Failed to regenerate scene.");
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  // ── Edit mode handlers ──────────────────────────────────────
  const enterEditMode = useCallback(() => {
    if (!project) return;
    const currentScenes = project.scenes ?? [];
    setEditScenes(
      currentScenes.map((s: any) => ({
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
    } catch (err: any) {
      setError(err.message || "Failed to save plan.");
    } finally {
      setActionLoading(null);
    }
  }, [id, editScenes]);

  const handleRegeneratePlan = useCallback(async () => {
    if (!id) return;
    setError(null);
    setActionLoading("regen-plan");
    try {
      await generateStoryPlan({ projectId: id });
      setEditMode(false);
      setEditScenes([]);
    } catch (err: any) {
      setError(err.message || "Failed to regenerate plan.");
    } finally {
      setActionLoading(null);
    }
  }, [id]);

  const updateEditScene = useCallback(
    (idx: number, field: string, value: string | number) => {
      setEditScenes((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const addScene = useCallback(() => {
    setEditScenes((prev) => [
      ...prev,
      {
        sceneIndex: prev.length,
        visualPrompt: "",
        narrationText: "",
        duration: 5,
        shotType: "single" as const,
        transitionNote: "",
      },
    ]);
  }, []);

  const removeScene = useCallback((idx: number) => {
    setEditScenes((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, sceneIndex: i }))
    );
  }, []);

  // ── Loading / Error states ─────────────────────────────────
  if (isLoading) {
    return (
      <UserDashboardLayout user={user}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </UserDashboardLayout>
    );
  }

  if (queryError || !project) {
    return (
      <UserDashboardLayout user={user}>
        <div className="py-20 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-4 text-gray-400">
            {queryError?.message || "Project not found."}
          </p>
          <Link to="/long-story" className="mt-4 inline-block text-blue-400 hover:underline">
            Back to all stories
          </Link>
        </div>
      </UserDashboardLayout>
    );
  }

  const status = project.status as string;

  // Determine which action buttons to show
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

  return (
    <UserDashboardLayout user={user}>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* ── Top section ──────────────────────────────── */}
        <div className="space-y-4">
          {/* Back + title */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Link
                to="/long-story"
                className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">{project.title}</h1>
                <p className="mt-0.5 text-sm text-gray-400">
                  {scenes.length} scene{scenes.length !== 1 ? "s" : ""} &middot;{" "}
                  {project.targetDuration}s target &middot; {project.resolution}
                </p>
              </div>
            </div>
            <Badge className={statusBadgeClass(status)}>{status}</Badge>
          </div>

          {/* Progress tracker */}
          {scenes.length > 0 && (
            <ProgressTracker scenes={scenes} projectStatus={status} />
          )}

          {/* Live activity indicator */}
          {isActiveStatus(status) && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-800/50 bg-blue-900/20 p-3">
              <div className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-300">
                  {status === "generating" && (
                    <>Generating scene videos... ({scenes.filter((s: any) => s.status === "completed").length}/{scenes.length} done)</>
                  )}
                  {status === "narrating" && "Generating voice narration..."}
                  {status === "stitching" && "Stitching final video..."}
                </p>
                <p className="text-xs text-blue-400/70">Auto-updating every few seconds</p>
              </div>
              {status === "generating" && (
                <span className="text-xs text-blue-400/60">
                  ~{Math.max(1, (scenes.filter((s: any) => s.status === "pending" || s.status === "generating").length) * 3)}min left
                </span>
              )}
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project-level error */}
          {project.errorMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{project.errorMessage}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {canEditPlan && (
              <Button
                onClick={enterEditMode}
                disabled={!!actionLoading}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                <Pencil className="h-4 w-4" />
                Edit Plan
              </Button>
            )}

            {canEditPlan && (
              <Button
                onClick={handleRegeneratePlan}
                disabled={!!actionLoading}
                variant="outline"
                className="border-amber-700 text-amber-400 hover:bg-amber-900/30"
              >
                {actionLoading === "regen-plan" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Regenerate Plan
              </Button>
            )}

            {showCheckStatus && (
              <Button
                onClick={handleCheckStatus}
                disabled={!!actionLoading}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                {actionLoading === "check" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Check Status
              </Button>
            )}

            {showNarration && (
              <Button
                onClick={handleGenerateNarration}
                disabled={!!actionLoading}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                {actionLoading === "narration" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                Generate Narration
              </Button>
            )}

            {showStitch && (
              <Button
                onClick={handleStitchVideo}
                disabled={!!actionLoading}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {actionLoading === "stitch" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Film className="h-4 w-4" />
                )}
                Finalize Video
              </Button>
            )}

            {showDownload && (
              <a
                href={project.finalVideoUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Download Video
              </a>
            )}
          </div>
        </div>

        {/* ── Scene Timeline / Edit Mode ────────────────── */}
        <div>
          {editMode ? (
            <>
              {/* Edit mode header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Edit Scenes</h2>
                  <p className="text-sm text-gray-400">
                    {editScenes.length} scene{editScenes.length !== 1 ? "s" : ""} &middot;{" "}
                    {totalEditDuration}s / {project.targetDuration}s target
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={cancelEditMode}
                    variant="outline"
                    size="sm"
                    disabled={!!actionLoading}
                    className="border-gray-700 text-gray-400 hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSavePlan}
                    size="sm"
                    disabled={!!actionLoading}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {actionLoading === "save-plan" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>

              {/* Editable scene cards */}
              <div className="space-y-4">
                {editScenes.map((scene, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3"
                  >
                    {/* Scene header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-white">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium text-white">
                          Scene {idx + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Duration selector */}
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <select
                            value={scene.duration}
                            onChange={(e) =>
                              updateEditScene(idx, "duration", parseInt(e.target.value))
                            }
                            className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
                          >
                            {[3, 5, 7, 10, 15, 20, 30].map((d) => (
                              <option key={d} value={d}>
                                {d}s
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* Remove scene */}
                        {editScenes.length > 1 && (
                          <button
                            onClick={() => removeScene(idx)}
                            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
                            title="Remove scene"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Visual Prompt */}
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                        <Eye className="h-3 w-3" />
                        Visual Prompt
                      </label>
                      <textarea
                        value={scene.visualPrompt}
                        onChange={(e) =>
                          updateEditScene(idx, "visualPrompt", e.target.value)
                        }
                        rows={3}
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Describe the visual scene..."
                      />
                    </div>

                    {/* Narration Text */}
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                        <MessageSquare className="h-3 w-3" />
                        Narration Text
                      </label>
                      <textarea
                        value={scene.narrationText}
                        onChange={(e) =>
                          updateEditScene(idx, "narrationText", e.target.value)
                        }
                        rows={2}
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="The narrator says..."
                      />
                    </div>
                  </div>
                ))}

                {/* Add scene button */}
                <button
                  onClick={addScene}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-700 py-3 text-sm text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-300"
                >
                  <Plus className="h-4 w-4" />
                  Add Scene
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-semibold text-white">Scenes</h2>
              <SceneTimeline
                scenes={scenes}
                onRegenerate={handleRegenerate}
                projectStatus={status}
              />
            </>
          )}
        </div>

        {/* ── Final Video ──────────────────────────────── */}
        {status === "completed" && project.finalVideoUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold text-white">Final Video</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-700">
              <video
                src={project.finalVideoUrl}
                className="h-auto w-full"
                controls
                preload="metadata"
              />
            </div>
            <a
              href={project.finalVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:underline"
            >
              <Download className="h-4 w-4" />
              Download full video
            </a>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}
