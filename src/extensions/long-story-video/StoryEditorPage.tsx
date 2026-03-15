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
  Share2,
  Link2,
  Check,
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
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Public share URL for the video (no auth token, works for anyone)
  const publicVideoUrl = id ? `${window.location.origin}/api/story-video/share/${id}.mp4` : "";
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

  // Auto-trigger checkStoryStatus every 20s during active generation
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const status = (project?.status as string) || "";
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (isActiveStatus(status) && id) {
      checkStoryStatus({ projectId: id }).catch((err: any) => {
        if (err?.message?.includes("not found") || err?.statusCode === 404) {
          console.warn("Project deleted or not found, stopping poll");
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
        }
      });
      checkIntervalRef.current = setInterval(async () => {
        try {
          await checkStoryStatus({ projectId: id });
        } catch (err: any) {
          if (err?.message?.includes("not found") || err?.statusCode === 404) {
            console.warn("Project deleted or not found, stopping poll");
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
          }
        }
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
              <div className="flex items-center gap-2">
                {/* Share button */}
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  {showShareMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                      <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
                        {/* Copy link */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(publicVideoUrl);
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          {linkCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4" />}
                          {linkCopied ? "Link copied!" : "Copy video link"}
                        </button>
                        <div className="my-1 border-t border-border" />
                        {/* Social share options */}
                        <button
                          onClick={() => {
                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(project.title || "Check out this video!")}&url=${encodeURIComponent(publicVideoUrl)}`, "_blank");
                            setShowShareMenu(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          Share on X
                        </button>
                        <button
                          onClick={() => {
                            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicVideoUrl)}`, "_blank");
                            setShowShareMenu(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          Share on Facebook
                        </button>
                        <button
                          onClick={() => {
                            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicVideoUrl)}`, "_blank");
                            setShowShareMenu(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                          Share on LinkedIn
                        </button>
                        <button
                          onClick={() => {
                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent((project.title || "Check out this video!") + " " + publicVideoUrl)}`, "_blank");
                            setShowShareMenu(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Share on WhatsApp
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {/* Download button */}
                <a
                  href={project.finalVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
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
                          {[5, 10, 15].map((d) => (
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
