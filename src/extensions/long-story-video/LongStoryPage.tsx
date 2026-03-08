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
} from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: "Completed", color: "text-green-400", bg: "bg-green-500/20 border-green-500/30" },
  generating: { label: "Generating", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
  narrating: { label: "Narrating", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
  narrated: { label: "Ready to Stitch", color: "text-cyan-400", bg: "bg-cyan-500/20 border-cyan-500/30" },
  stitching: { label: "Stitching", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
  planned: { label: "Planned", color: "text-purple-400", bg: "bg-purple-500/20 border-purple-500/30" },
  draft: { label: "Draft", color: "text-gray-400", bg: "bg-gray-500/20 border-gray-500/30" },
  failed: { label: "Failed", color: "text-red-400", bg: "bg-red-500/20 border-red-500/30" },
};

const IN_PROGRESS_STATUSES = ["generating", "narrating", "stitching"];

function getStatusBadge(status: string) {
  const config = STATUS_BADGE[status] || STATUS_BADGE.draft;
  return config;
}

export default function LongStoryPage({ user }: any) {
  const { data: projects, isLoading } = useQuery(getStoryProjects);

  const totalCount = projects?.length ?? 0;
  const completedCount = projects?.filter((p: any) => p.status === "completed").length ?? 0;
  const inProgressCount =
    projects?.filter((p: any) => IN_PROGRESS_STATUSES.includes(p.status)).length ?? 0;

  const draftProjects = projects?.filter((p: any) => ["draft", "planned"].includes(p.status)) ?? [];
  const recentProjects = projects
    ? [...projects]
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6)
    : [];

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-8 p-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 p-8 md:p-12">
          <div className="absolute right-6 top-6 opacity-10">
            <Film className="h-32 w-32 text-white" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Film className="h-6 w-6 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">Long Story Video</h1>
            </div>
            <p className="mb-6 text-lg text-gray-300">
              Transform any idea into a cinematic narrated video with AI-generated scenes, voice,
              music &amp; subtitles.
            </p>
            <Link to="/long-story/create">
              <Button className="gap-2 bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Create New Story
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Layers className="h-5 w-5 text-indigo-400" />}
            value={isLoading ? "..." : totalCount}
            label="Total Stories"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
            value={isLoading ? "..." : completedCount}
            label="Completed"
          />
          <StatCard
            icon={<Loader2 className={`h-5 w-5 text-blue-400 ${inProgressCount > 0 ? "animate-spin" : ""}`} />}
            value={isLoading ? "..." : inProgressCount}
            label="In Progress"
          />
        </div>

        {/* Draft Projects */}
        {draftProjects.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Continue Working</h2>
            {draftProjects.map((project: any) => (
              <Link
                key={project.id}
                to={`/long-story/create?resume=${project.id}`}
                className="block"
              >
                <div className="flex items-center gap-4 rounded-xl border border-yellow-700/50 bg-yellow-900/10 p-4 transition-colors hover:border-yellow-600">
                  <div className="rounded-lg bg-yellow-500/20 p-2.5">
                    <PenLine className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {project.title || "Untitled Draft"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {project.scenes?.length ?? 0} scenes &middot;{" "}
                      {project.targetDuration}s &middot;{" "}
                      {project.status === "planned" ? "Plan ready" : "Draft"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 bg-yellow-600 text-white hover:bg-yellow-700"
                  >
                    Continue
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Recent Stories */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recent Stories</h2>
            {totalCount > 6 && (
              <Link to="/long-story/gallery" className="text-sm text-blue-400 hover:text-blue-300">
                View all <ArrowRight className="ml-1 inline h-3 w-3" />
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-xl border border-gray-700 bg-gray-800"
                />
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 bg-gray-800/50 py-16 text-center">
              <Film className="mb-4 h-12 w-12 text-gray-600" />
              <p className="mb-2 text-lg font-medium text-gray-400">No stories yet</p>
              <p className="mb-6 text-sm text-gray-500">
                Create your first AI-generated story video
              </p>
              <Link to="/long-story/create">
                <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                  Create New Story
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentProjects.map((project: any) => (
                <StoryCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link to="/long-story/create" className="block">
            <div className="group flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 p-5 transition-colors hover:border-blue-600">
              <div className="rounded-lg bg-blue-500/20 p-3">
                <Plus className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Create New Story</p>
                <p className="text-sm text-gray-400">Start from a prompt or idea</p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-gray-600 transition-colors group-hover:text-blue-400" />
            </div>
          </Link>
          <Link to="/long-story/gallery" className="block">
            <div className="group flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 p-5 transition-colors hover:border-purple-600">
              <div className="rounded-lg bg-purple-500/20 p-3">
                <GalleryHorizontalEnd className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-white">View Gallery</p>
                <p className="text-sm text-gray-400">Browse all your story projects</p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-gray-600 transition-colors group-hover:text-purple-400" />
            </div>
          </Link>
        </div>
      </div>
    </UserDashboardLayout>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 p-5">
      <div className="rounded-lg bg-gray-700/50 p-3">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function StoryCard({ project }: { project: any }) {
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

        <h3 className="mb-2 line-clamp-2 font-semibold text-white">{project.title || "Untitled"}</h3>

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
