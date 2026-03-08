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
} from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: "Completed", color: "text-green-400", bg: "bg-green-500/20 border-green-500/30" },
  generating: { label: "Generating", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
  narrating: { label: "Narrating", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
  stitching: { label: "Stitching", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
  planned: { label: "Planned", color: "text-purple-400", bg: "bg-purple-500/20 border-purple-500/30" },
  draft: { label: "Draft", color: "text-gray-400", bg: "bg-gray-500/20 border-gray-500/30" },
  failed: { label: "Failed", color: "text-red-400", bg: "bg-red-500/20 border-red-500/30" },
};

const IN_PROGRESS_STATUSES = ["generating", "narrating", "stitching"];

type FilterTab = "all" | "completed" | "in_progress" | "failed";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "in_progress", label: "In Progress" },
  { key: "failed", label: "Failed" },
];

function getStatusBadge(status: string) {
  return STATUS_BADGE[status] || STATUS_BADGE.draft;
}

function filterProjects(projects: any[], tab: FilterTab): any[] {
  switch (tab) {
    case "completed":
      return projects.filter((p) => p.status === "completed");
    case "in_progress":
      return projects.filter((p) => IN_PROGRESS_STATUSES.includes(p.status));
    case "failed":
      return projects.filter((p) => p.status === "failed");
    default:
      return projects;
  }
}

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  all: "No stories yet. Create your first one!",
  completed: "No completed stories yet.",
  in_progress: "No stories currently in progress.",
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
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/long-story"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Story Gallery</h1>
              <p className="text-sm text-gray-400">Browse and manage all your story projects</p>
            </div>
          </div>
          <Link to="/long-story/create">
            <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Create New Story
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 rounded-lg border border-gray-700 bg-gray-800/50 p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.label}
              {!isLoading && projects && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({filterProjects(sorted, tab.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-400">Loading stories...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 bg-gray-800/50 py-20 text-center">
            <Film className="mb-4 h-12 w-12 text-gray-600" />
            <p className="mb-2 text-lg font-medium text-gray-400">{EMPTY_MESSAGES[activeTab]}</p>
            {activeTab === "all" && (
              <Link to="/long-story/create" className="mt-4">
                <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
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
  const status = getStatusBadge(project.status);
  const sceneCount = project.scenes?.length ?? 0;
  const isActive = IN_PROGRESS_STATUSES.includes(project.status);

  return (
    <Link to={`/long-story/project/${project.id}`}>
      <div className="relative flex h-full flex-col rounded-xl border border-gray-700 bg-gray-800 p-4 transition-colors hover:border-gray-600 cursor-pointer">
        <div className="mb-3 flex items-center justify-between">
          <Badge
            variant="outline"
            className={`${status.bg} ${status.color} border text-xs`}
          >
            {status.label}
          </Badge>
          <span className="text-xs text-gray-500">
            {new Date(project.createdAt).toLocaleDateString()}
          </span>
        </div>

        <h3 className="mb-2 line-clamp-2 font-semibold text-white">
          {project.title || "Untitled"}
        </h3>

        <div className="mt-auto flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <LayoutGrid className="h-3 w-3" />
            {sceneCount} scene{sceneCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {project.targetDuration}s
          </span>
        </div>

        {isActive && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${project.progress ?? 0}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}
