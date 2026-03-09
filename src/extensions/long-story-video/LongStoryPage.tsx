import { useQuery } from "wasp/client/operations";
import { getStoryProjects } from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { Link } from "react-router";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  Film,
  Plus,
  CheckCircle2,
  Loader2,
  LayoutGrid,
  Clock,
  Layers,
  ArrowRight,
  GalleryHorizontalEnd,
  PenLine,
  Play,
  AlertCircle,
  Sparkles,
  Music,
} from "lucide-react";

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot?: string }> = {
  completed: {
    label: "Completed",
    color: "text-emerald-600 dark:text-green-400",
    bg: "bg-emerald-100 dark:bg-green-500/20 border-emerald-200 dark:border-green-500/30",
    dot: "bg-emerald-500",
  },
  generating: {
    label: "Generating",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30",
    dot: "bg-blue-500 animate-pulse",
  },
  narrating: {
    label: "Adding Voice",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30",
    dot: "bg-blue-500 animate-pulse",
  },
  narrated: {
    label: "Ready to Finalize",
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-500/20 border-cyan-200 dark:border-cyan-500/30",
    dot: "bg-cyan-500",
  },
  generated: {
    label: "Scenes Ready",
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-500/20 border-cyan-200 dark:border-cyan-500/30",
    dot: "bg-cyan-500",
  },
  stitching: {
    label: "Finalizing",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30",
    dot: "bg-blue-500 animate-pulse",
  },
  planned: {
    label: "Planned",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-500/20 border-purple-200 dark:border-purple-500/30",
    dot: "bg-purple-500",
  },
  draft: {
    label: "Draft",
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
  },
  failed: {
    label: "Failed",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-500/20 border-red-200 dark:border-red-500/30",
    dot: "bg-red-500",
  },
};

const IN_PROGRESS_STATUSES = ["generating", "narrating", "stitching"];

function getStatus(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.draft;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function getTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

// ── Thumbnail helper ───────────────────────────────────────────────────────

interface Thumbnail {
  url: string;
  type: "image" | "video";
}

function getThumbnail(project: any): Thumbnail | null {
  // 1. Extracted reference frame (best — actual jpg)
  if (project.referenceImageUrl) {
    return { url: project.referenceImageUrl, type: "image" };
  }
  // 2. Final stitched video
  if (project.finalVideoUrl) {
    return { url: project.finalVideoUrl, type: "video" };
  }
  // 3. First completed scene's video
  const firstScene = project.scenes
    ?.sort((a: any, b: any) => a.sceneIndex - b.sceneIndex)
    ?.find((s: any) => s.videoUrl);
  if (firstScene?.videoUrl) {
    return { url: firstScene.videoUrl, type: "video" };
  }
  return null;
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function LongStoryPage({ user }: any) {
  const { data: projects, isLoading } = useQuery(getStoryProjects);

  const totalCount = projects?.length ?? 0;
  const completedCount = projects?.filter((p: any) => p.status === "completed").length ?? 0;
  const inProgressCount =
    projects?.filter((p: any) => IN_PROGRESS_STATUSES.includes(p.status)).length ?? 0;

  const draftProjects = projects?.filter((p: any) => ["draft", "planned"].includes(p.status)) ?? [];
  const activeProjects = projects?.filter((p: any) => IN_PROGRESS_STATUSES.includes(p.status)) ?? [];
  const recentProjects = projects
    ? [...projects]
        .filter((p: any) => !["draft", "planned"].includes(p.status))
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6)
    : [];

  return (
    <UserDashboardLayout user={user}>
      <div className="flex flex-col gap-8">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              Long Story Video
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Transform ideas into cinematic narrated videos with AI scenes, voice, music & subtitles
            </p>
          </div>
          <Link to="/long-story/create">
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Create New Story
            </Button>
          </Link>
        </div>

        {/* ── Stats Row ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Layers className="h-5 w-5" />}
            value={isLoading ? "..." : totalCount}
            label="Total Stories"
            gradient="from-indigo-500 to-indigo-600"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            value={isLoading ? "..." : completedCount}
            label="Completed"
            gradient="from-emerald-500 to-green-600"
          />
          <StatCard
            icon={<Loader2 className={`h-5 w-5 ${inProgressCount > 0 ? "animate-spin" : ""}`} />}
            value={isLoading ? "..." : inProgressCount}
            label="In Progress"
            gradient="from-blue-500 to-blue-600"
          />
        </div>

        {/* ── Active / In Progress ───────────────────────────── */}
        {activeProjects.length > 0 && (
          <section>
            <h2 className="text-foreground mb-3 text-base font-semibold">In Progress</h2>
            <div className="space-y-3">
              {activeProjects.map((project: any) => (
                <ActiveProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        )}

        {/* ── Drafts ─────────────────────────────────────────── */}
        {draftProjects.length > 0 && (
          <section>
            <h2 className="text-foreground mb-3 text-base font-semibold">Drafts</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {draftProjects.map((project: any) => (
                <Link
                  key={project.id}
                  to={`/long-story/create?resume=${project.id}`}
                >
                  <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-amber-500/40 hover:shadow-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <PenLine className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-medium">
                        {project.title || project.prompt?.slice(0, 50) || "Untitled Draft"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {project.scenes?.length ?? 0} scenes &middot; {formatDuration(project.targetDuration)}
                        {project.status === "planned" && " \u00b7 Plan ready"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Recent Stories ──────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-base font-semibold">
              {recentProjects.length > 0 ? "Recent Stories" : "Get Started"}
            </h2>
            {totalCount > 6 && (
              <Link to="/long-story/gallery" className="flex items-center gap-1 text-sm text-primary hover:underline">
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-video animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentProjects.map((project: any) => (
                <StoryCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>

        {/* ── Quick Actions ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link to="/long-story/create">
            <div className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-foreground font-semibold">Create New Story</p>
                <p className="text-muted-foreground text-xs">Start from a prompt or idea</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
          <Link to="/long-story/gallery">
            <div className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <GalleryHorizontalEnd className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-foreground font-semibold">View Gallery</p>
                <p className="text-muted-foreground text-xs">Browse all your story projects</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </div>
    </UserDashboardLayout>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  gradient,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  gradient: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-md`}
      >
        <div className="text-white">{icon}</div>
      </div>
      <div>
        <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-foreground text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

// ── ActiveProjectCard (in-progress with live indicator) ────────────────────

function ActiveProjectCard({ project }: { project: any }) {
  const status = getStatus(project.status);
  const completedScenes = project.scenes?.filter((s: any) => s.status === "completed").length ?? 0;
  const totalScenes = project.scenes?.length ?? 0;
  const thumbnail = getThumbnail(project);

  return (
    <Link to={`/long-story/project/${project.id}`}>
      <div className="group flex items-center gap-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 transition-all hover:border-blue-500/40 hover:shadow-md">
        {/* Thumbnail or placeholder */}
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
          {thumbnail?.type === "image" ? (
            <img src={thumbnail.url} alt="" className="h-full w-full object-cover" />
          ) : thumbnail?.type === "video" ? (
            <video src={thumbnail.url} muted preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Film className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
          {/* Pulsing dot */}
          <div className="absolute top-1.5 left-1.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate font-semibold">
            {project.title || "Untitled"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {status.label}
            {totalScenes > 0 && ` \u2022 ${completedScenes}/${totalScenes} scenes`}
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-blue-500/10">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${project.progress ?? 0}%` }}
            />
          </div>
        </div>

        <span className="text-muted-foreground shrink-0 text-xs">{project.progress ?? 0}%</span>
      </div>
    </Link>
  );
}

// ── StoryCard (with thumbnail) ─────────────────────────────────────────────

function StoryCard({ project }: { project: any }) {
  const status = getStatus(project.status);
  const sceneCount = project.scenes?.length ?? 0;
  const isCompleted = project.status === "completed";
  const isFailed = project.status === "failed";
  const thumbnail = getThumbnail(project);

  return (
    <Link to={`/long-story/project/${project.id}`}>
      <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/20 hover:shadow-lg">
        {/* Thumbnail area */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {thumbnail?.type === "image" ? (
            <img
              src={thumbnail.url}
              alt={project.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : thumbnail?.type === "video" ? (
            <video
              src={thumbnail.url}
              muted
              preload="metadata"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <Film className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}

          {/* Play button overlay for completed */}
          {isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg transition-all group-hover:opacity-100 group-hover:scale-100 scale-75">
                <Play className="h-5 w-5 fill-current text-gray-900 ml-0.5" />
              </div>
            </div>
          )}

          {/* Status badge (top-left) */}
          <div className="absolute top-2.5 left-2.5">
            <Badge
              variant="outline"
              className={`${status.bg} ${status.color} border text-[11px] backdrop-blur-sm`}
            >
              {status.dot && (
                <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.dot}`} />
              )}
              {status.label}
            </Badge>
          </div>

          {/* Duration (top-right) */}
          <div className="absolute top-2.5 right-2.5">
            <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {formatDuration(project.targetDuration)}
            </span>
          </div>

          {/* Failed overlay */}
          {isFailed && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-950/40">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col p-3.5">
          <h3 className="text-foreground line-clamp-1 text-sm font-semibold">
            {project.title || "Untitled"}
          </h3>

          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <LayoutGrid className="h-3 w-3" />
              {sceneCount} scene{sceneCount !== 1 ? "s" : ""}
            </span>
            {project.musicMood && (
              <span className="flex items-center gap-1">
                <Music className="h-3 w-3" />
                {project.musicMood}
              </span>
            )}
            <span className="ml-auto">{getTimeAgo(project.updatedAt)}</span>
          </div>

          {/* Progress bar for active */}
          {IN_PROGRESS_STATUSES.includes(project.status) && (
            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${project.progress ?? 0}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
        <Film className="h-8 w-8 text-primary/40" />
      </div>
      <p className="text-foreground mt-5 text-sm font-semibold">No stories yet</p>
      <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">
        Create your first AI-generated story video — just describe an idea and we'll handle the rest.
      </p>
      <Link to="/long-story/create">
        <Button className="mt-5 gap-2" size="sm">
          <Plus className="h-4 w-4" />
          Create Your First Story
        </Button>
      </Link>
    </div>
  );
}
