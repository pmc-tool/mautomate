import { Link } from "react-router";
import type { AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getVideoGenerations,
  getVideoProjects,
} from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { VideoCard } from "./components/VideoCard";
import { Card, CardContent } from "../../client/components/ui/card";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { Skeleton } from "../../client/components/ui/skeleton";
import {
  Film,
  FolderOpen,
  Grid3X3,
  ImageIcon,
  Plus,
  Sparkles,
  User,
  Video,
  Wand2,
  CheckCircle,
  Clock,
  ArrowRight,
  Play,
  Zap,
} from "lucide-react";

// Hero illustrations from MagicAI
import aiAvatarImg from "../../client/static/video-studio/ai-avatar.png";
import videoCreateImg from "../../client/static/video-studio/video-create.png";
import influencerAvatarImg from "../../client/static/video-studio/influencer-avatar.png";
import socialVideoImg from "../../client/static/video-studio/social-video-create.png";
import aiVideoClipImg from "../../client/static/video-studio/ai-video-clip.png";

// Banner background images
import bannerBgImg from "../../client/static/video-studio/banner-bg.jpg";
import bannerBgDarkImg from "../../client/static/video-studio/banner-bg-dark.png";

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
        {/* Hero Banner — MagicAI-style with background image */}
        <div
          className="relative flex flex-wrap items-center overflow-hidden rounded-2xl bg-cover bg-top dark:bg-white/[3%]"
          style={{ backgroundImage: `url(${bannerBgImg})` }}
        >
          {/* Dark mode background override */}
          <img
            src={bannerBgDarkImg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover hidden dark:block"
          />

          {/* Left Content */}
          <div className="relative z-10 w-full py-12 px-5 sm:py-16 lg:w-1/2 lg:px-12">
            <div className="mb-3 flex items-center gap-2">
              <Badge className="bg-[#bd711d]/20 text-[#bd711d] border-[#bd711d]/30 text-xs dark:bg-white/20 dark:text-white dark:border-white/30">
                <Zap className="mr-1 h-3 w-3" />
                21 AI Models
              </Badge>
              <Badge className="bg-[#bd711d]/20 text-[#bd711d] border-[#bd711d]/30 text-xs dark:bg-white/20 dark:text-white dark:border-white/30">
                4 Generation Types
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl dark:text-white">
              Video Studio
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground dark:text-white/80">
              Create stunning AI videos — text-to-video, image animation, talking-head avatars, and video upscaling. All powered by the latest AI models.
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                asChild
                className="bg-[#bd711d] text-white hover:bg-[#a5631a] border border-[#925716] shadow-lg"
              >
                <Link to="/video-studio/generate">
                  <Wand2 className="mr-1.5 h-4 w-4" />
                  Generate Video
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="rounded-xl"
              >
                <Link to="/video-studio/gallery">
                  <Grid3X3 className="mr-1.5 h-4 w-4" />
                  Gallery
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Illustration */}
          <div className="relative z-10 hidden w-1/2 lg:flex items-center justify-center py-8">
            <img
              src={aiAvatarImg}
              alt="AI Video Studio"
              className="h-52 w-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/20">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Total Videos</p>
              <p className="text-foreground text-2xl font-bold">{genData?.total ?? 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-md shadow-amber-500/20">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Processing</p>
              <p className="text-foreground text-2xl font-bold">{processingCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-500/20">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Completed</p>
              <p className="text-foreground text-2xl font-bold">{completedCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#bd711d] to-[#a5631a] shadow-md shadow-[#bd711d]/20">
              <FolderOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Projects</p>
              <p className="text-foreground text-2xl font-bold">{projects?.length ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Action Cards — MagicAI style with illustrations */}
        <div>
          <h2 className="text-foreground mb-4 text-lg font-semibold">Create Video</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Text to Video */}
            <Link to="/video-studio/generate?type=ttv">
              <div className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border-2 border-transparent bg-gradient-to-br from-blue-50 to-indigo-50 p-5 transition-all hover:border-blue-300 hover:shadow-lg dark:from-blue-950/30 dark:to-indigo-950/30 dark:hover:border-blue-700">
                <img
                  src={videoCreateImg}
                  alt="Text to Video"
                  className="h-24 w-24 object-contain transition-transform group-hover:scale-110"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-foreground font-semibold">Text to Video</h3>
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-[10px]">8 models</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    Generate stunning videos from text descriptions with Veo 3, Minimax, and more
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Image to Video */}
            <Link to="/video-studio/generate?type=itv">
              <div className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border-2 border-transparent bg-gradient-to-br from-emerald-50 to-teal-50 p-5 transition-all hover:border-emerald-300 hover:shadow-lg dark:from-emerald-950/30 dark:to-teal-950/30 dark:hover:border-emerald-700">
                <img
                  src={socialVideoImg}
                  alt="Image to Video"
                  className="h-24 w-24 object-contain transition-transform group-hover:scale-110"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-foreground font-semibold">Image to Video</h3>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px]">10 models</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    Animate still images into smooth videos with Kling, Veo 3.1, Luma Dream
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
              </div>
            </Link>

            {/* AI Avatar */}
            <Link to="/video-studio/generate?type=avatar">
              <div className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border-2 border-transparent bg-gradient-to-br from-orange-50 to-amber-50 p-5 transition-all hover:border-[#bd711d]/40 hover:shadow-lg dark:from-orange-950/30 dark:to-amber-950/30 dark:hover:border-[#bd711d]/60">
                <img
                  src={influencerAvatarImg}
                  alt="AI Avatar"
                  className="h-24 w-24 object-contain transition-transform group-hover:scale-110"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-foreground font-semibold">AI Avatar</h3>
                    <Badge className="bg-[#bd711d]/10 text-[#bd711d] dark:bg-[#bd711d]/20 dark:text-[#d4923e] text-[10px]">Premium</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    Create realistic talking-head videos with AI presenters and voice synthesis
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Upscale */}
            <Link to="/video-studio/generate?type=upscale">
              <div className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border-2 border-transparent bg-gradient-to-br from-amber-50 to-yellow-50 p-5 transition-all hover:border-amber-300 hover:shadow-lg dark:from-amber-950/30 dark:to-yellow-950/30 dark:hover:border-amber-700">
                <img
                  src={aiVideoClipImg}
                  alt="Upscale Video"
                  className="h-24 w-24 object-contain transition-transform group-hover:scale-110"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-foreground font-semibold">Upscale Video</h3>
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-[10px]">Budget</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    Enhance any video to 1080p or 4K resolution with AI upscaling
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Generations */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Play className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-foreground text-lg font-semibold">Recent Generations</h2>
                <p className="text-muted-foreground text-xs">
                  {genData?.total ?? 0} total video{(genData?.total ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {(genData?.total ?? 0) > 8 && (
              <Button variant="outline" size="sm" asChild className="rounded-xl">
                <Link to="/video-studio/gallery">
                  View all
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {gensLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
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
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16">
              <div className="mb-4">
                <img
                  src={videoCreateImg}
                  alt="No videos yet"
                  className="h-28 w-auto object-contain opacity-60"
                />
              </div>
              <p className="text-foreground mb-1 text-sm font-medium">
                No videos generated yet
              </p>
              <p className="text-muted-foreground mb-5 text-xs">
                Start creating stunning AI-powered videos
              </p>
              <Button asChild className="rounded-xl">
                <Link to="/video-studio/generate">
                  <Wand2 className="mr-1.5 h-4 w-4" />
                  Generate Your First Video
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Projects */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#bd711d]/10">
                <FolderOpen className="h-4 w-4 text-[#bd711d]" />
              </div>
              <div>
                <h2 className="text-foreground text-lg font-semibold">Projects</h2>
                <p className="text-muted-foreground text-xs">
                  Organize your generations into projects
                </p>
              </div>
            </div>
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
                  <Card className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/30">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#bd711d]/10 dark:bg-[#bd711d]/20">
                          <FolderOpen className="h-5 w-5 text-[#bd711d]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-foreground font-semibold truncate">{proj.name}</h3>
                          {proj.description && (
                            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                              {proj.description}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              <Video className="mr-1 h-3 w-3" />
                              {proj._count?.generations ?? 0} video{(proj._count?.generations ?? 0) !== 1 ? "s" : ""}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {proj.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
              No projects yet. Projects help you organize your generations.
            </p>
          )}
        </div>
      </div>
    </UserDashboardLayout>
  );
}
