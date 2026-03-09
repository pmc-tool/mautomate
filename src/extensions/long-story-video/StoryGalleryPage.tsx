import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getStoryProjects } from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { Link } from "react-router";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  Film,
  Plus,
  ArrowLeft,
  LayoutGrid,
  Clock,
  Loader2,
  Play,
  AlertCircle,
  Music,
} from "lucide-react";

// ── Status config (shared with LongStoryPage) ─────────────────────────────

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

type FilterTab = "all" | "completed" | "in_progress" | "drafts" | "failed";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "in_progress", label: "In Progress" },
  { key: "drafts", label: "Drafts" },
  { key: "failed", label: "Failed" },
];

function filterProjects(projects: any[], tab: FilterTab): any[] {
  switch (tab) {
    case "completed":
      return projects.filter((p) => p.status === "completed");
    case "in_progress":
      return projects.filter((p) => IN_PROGRESS_STATUSES.includes(p.status));
    case "drafts":
      return projects.filter((p) => ["draft", "planned"].includes(p.status));
    case "failed":
      return projects.filter((p) => p.status === "failed");
    default:
      return projects;
  }
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

interface Thumbnail {
  url: string;
  type: "image" | "video";
}

function getThumbnail(project: any): Thumbnail | null {
  if (project.referenceImageUrl) return { url: project.referenceImageUrl, type: "image" };
  if (project.finalVideoUrl) return { url: project.finalVideoUrl, type: "video" };
  const firstScene = project.scenes
    ?.sort((a: any, b: any) => a.sceneIndex - b.sceneIndex)
    ?.find((s: any) => s.videoUrl);
  if (firstScene?.videoUrl) return { url: firstScene.videoUrl, type: "video" };
  return null;
}

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  all: "No stories yet. Create your first one!",
  completed: "No completed stories yet.",
  in_progress: "No stories currently in progress.",
  drafts: "No drafts.",
  failed: "No failed stories. Great!",
};

export default function StoryGalleryPage({ user }: any) {
  const { data: projects, isLoading } = useQuery(getStoryProjects);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const sorted = projects
    ? [...projects].sort(
        (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    : [];

  const filtered = filterProjects(sorted, activeTab);

  return (
    <UserDashboardLayout user={user}>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/long-story"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-foreground text-2xl font-bold tracking-tight">Story Gallery</h1>
              <p className="text-muted-foreground text-sm">Browse and manage all your story projects</p>
            </div>
          </div>
          <Link to="/long-story/create">
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Create New Story
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {!isLoading && projects && (
                <span className="ml-1.5 text-xs opacity-50">
                  ({filterProjects(sorted, tab.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading stories...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-20 text-center">
            <Film className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-foreground text-base font-medium">{EMPTY_MESSAGES[activeTab]}</p>
            {activeTab === "all" && (
              <Link to="/long-story/create" className="mt-5">
                <Button className="gap-2" size="sm">
                  <Plus className="h-4 w-4" />
                  Create New Story
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((project: any) => (
              <GalleryCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}

function GalleryCard({ project }: { project: any }) {
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
  const sceneCount = project.scenes?.length ?? 0;
  const isActive = IN_PROGRESS_STATUSES.includes(project.status);
  const isCompleted = project.status === "completed";
  const isFailed = project.status === "failed";
  const thumbnail = getThumbnail(project);

  const linkTarget =
    ["draft", "planned"].includes(project.status)
      ? `/long-story/create?resume=${project.id}`
      : `/long-story/project/${project.id}`;

  return (
    <Link to={linkTarget}>
      <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/20 hover:shadow-lg">
        {/* Thumbnail */}
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

          {/* Play overlay */}
          {isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg transition-all group-hover:opacity-100 group-hover:scale-100 scale-75">
                <Play className="h-5 w-5 fill-current text-gray-900 ml-0.5" />
              </div>
            </div>
          )}

          {/* Failed overlay */}
          {isFailed && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-950/40">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          )}

          {/* Status badge */}
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

          {/* Duration */}
          <div className="absolute top-2.5 right-2.5">
            <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {formatDuration(project.targetDuration)}
            </span>
          </div>
        </div>

        {/* Body */}
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

          {isActive && (
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
