import { Link } from "react-router";
import type { AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getVideoGenerations,
  getVideoProjects,
} from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { VideoCard } from "./components/VideoCard";
import { Card, CardContent, CardHeader, CardTitle } from "../../client/components/ui/card";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { Separator } from "../../client/components/ui/separator";
import { ScrollArea, ScrollBar } from "../../client/components/ui/scroll-area";
import { Skeleton } from "../../client/components/ui/skeleton";
import {
  Film,
  FolderOpen,
  Grid3X3,
  ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  User,
  Video,
  Wand2,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function VideoStudioPage({ user }: { user: AuthUser }) {
  const { data: genData, isLoading: gensLoading } = useQuery(
    getVideoGenerations,
    { pageSize: 8 },
  );
  const { data: projects, isLoading: projLoading } = useQuery(
    getVideoProjects,
    {},
  );

  const processingCount =
    genData?.generations.filter(
      (g: any) => g.status === "processing" || g.status === "queued",
    ).length ?? 0;
  const completedCount =
    genData?.generations.filter((g: any) => g.status === "completed").length ?? 0;

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-8">
        {/* Hero Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                Video Studio
              </span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              AI-powered video generation — text-to-video, image-to-video, avatars, and upscaling
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/video-studio/gallery">
                <Grid3X3 className="mr-1.5 h-4 w-4" />
                Gallery
              </Link>
            </Button>
            <Button asChild>
              <Link to="/video-studio/generate">
                <Wand2 className="mr-1.5 h-4 w-4" />
                Generate
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <Video className="text-primary h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">Total Videos</p>
                <p className="text-foreground text-2xl font-bold">{genData?.total ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">Processing</p>
                <p className="text-foreground text-2xl font-bold">{processingCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">Completed</p>
                <p className="text-foreground text-2xl font-bold">{completedCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                <FolderOpen className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">Projects</p>
                <p className="text-foreground text-2xl font-bold">{projects?.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Text to Video", icon: Film, type: "ttv", color: "text-blue-500" },
            { label: "Image to Video", icon: ImageIcon, type: "itv", color: "text-green-500" },
            { label: "AI Avatar", icon: User, type: "avatar", color: "text-purple-500" },
            { label: "Upscale Video", icon: Sparkles, type: "upscale", color: "text-amber-500" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.type}
                to={`/video-studio/generate?type=${action.type}`}
              >
                <Card className="transition-all hover:shadow-md hover:border-primary/30">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Icon className={`h-5 w-5 ${action.color}`} />
                    <span className="text-foreground text-sm font-medium">{action.label}</span>
                    <Plus className="text-muted-foreground ml-auto h-4 w-4" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Recent Generations */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-lg font-semibold">Recent Generations</h2>
            {(genData?.total ?? 0) > 8 && (
              <Button variant="link" size="sm" asChild>
                <Link to="/video-studio/gallery">View all</Link>
              </Button>
            )}
          </div>

          {gensLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-video w-full" />
                  <CardContent className="space-y-2 p-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : genData?.generations.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {genData.generations.map((gen: any) => (
                <VideoCard
                  key={gen.id}
                  generation={gen}
                  onClick={() => {
                    window.location.href = `/video-studio/video/${gen.id}`;
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                  <Film className="text-muted-foreground h-8 w-8" />
                </div>
                <p className="text-muted-foreground mb-4 text-sm">
                  No videos yet. Start generating!
                </p>
                <Button asChild>
                  <Link to="/video-studio/generate">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Generate Your First Video
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Projects */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-lg font-semibold">Projects</h2>
          </div>

          {projLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="space-y-2 p-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((proj: any) => (
                <Link
                  key={proj.id}
                  to={`/video-studio/gallery?projectId=${proj.id}`}
                >
                  <Card className="transition-all hover:shadow-md hover:border-primary/30">
                    <CardContent className="p-4">
                      <h3 className="text-foreground font-medium">{proj.name}</h3>
                      {proj.description && (
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                          {proj.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {proj._count?.generations ?? 0} video{(proj._count?.generations ?? 0) !== 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {proj.category}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No projects yet. Projects help you organize your generations.
            </p>
          )}
        </div>
      </div>
    </UserDashboardLayout>
  );
}
