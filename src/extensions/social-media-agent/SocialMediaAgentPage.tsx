import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { useQuery } from "wasp/client/operations";
import { getSocialMediaAgents, deleteSocialMediaAgent } from "wasp/client/operations";
import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Zap,
  MoreVertical,
  Users,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../client/components/ui/dropdown-menu";
import { toast } from "../../client/hooks/use-toast";

// Platform icons
import facebookIcon from "../../social-connect/icons/facebook.svg";
import instagramIcon from "../../social-connect/icons/instagram.svg";
import linkedinIcon from "../../social-connect/icons/linkedin.svg";
import xIcon from "../../social-connect/icons/x.svg";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";

// Images
import agentIllustrationImg from "../../client/static/social-agent/agent-illustration.png";
import avatarImg from "../../client/static/social-agent/avatar.png";
import bannerBgImg from "../../client/static/social-agent/banner-bg.jpg";
import bannerBgDarkImg from "../../client/static/social-agent/banner-bg-dark.png";

const TONE_COLORS: Record<string, string> = {
  Professional: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Casual: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Funny: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  Excited: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Witty: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Bold: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  Sarcastic: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  Dramatic: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const PLATFORM_ICONS: Record<string, string> = {
  facebook: facebookIcon,
  instagram: instagramIcon,
  linkedin: linkedinIcon,
  x: xIcon,
};

export default function SocialMediaAgentPage({ user }: { user: AuthUser }) {
  const { data: agents, isLoading } = useQuery(getSocialMediaAgents);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSocialMediaAgent({ id: deleteTarget.id });
      toast({ title: "Deleted", description: `${deleteTarget.name} has been removed.` });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to delete.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  const totalPosts = agents?.reduce((sum: number, a: any) => sum + (a.posts?.length ?? 0), 0) ?? 0;
  const activeAgents = agents?.filter((a: any) => a.status === "active").length ?? 0;

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-8">
        {/* Hero Banner — MagicAI-style with background image + video */}
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
                AI-Powered
              </Badge>
              {activeAgents > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-xs dark:bg-emerald-500/30 dark:text-white dark:border-emerald-400/30">
                  {activeAgents} Active
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl dark:text-white">
              We're your social media agents.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground dark:text-white/70">
              We learn and improve over time. Create AI agents that generate, schedule, and manage social media content across multiple platforms.
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                asChild
                className="bg-[#bd711d] text-white hover:bg-[#a5631a] border border-[#925716] shadow-lg"
              >
                <Link to="/extensions/social-media-agent/create">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Agent
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Video */}
          <div className="relative z-10 flex w-full justify-center max-lg:order-first lg:w-1/2">
            <video
              className="max-w-[min(100%,650px)] mix-blend-darken dark:hidden"
              width="1200"
              height="1050"
              src="/social-agent/banner-video.mp4"
              autoPlay
              playsInline
              muted
              loop
            />
            <video
              className="hidden max-w-[min(100%,650px)] mix-blend-plus-lighter brightness-[0.85] contrast-[1.15] saturate-[1.1] dark:block"
              width="1200"
              height="1050"
              src="/social-agent/banner-video-dark.mp4"
              autoPlay
              playsInline
              muted
              loop
            />
          </div>
        </div>

        {/* Stats Row */}
        {agents && agents.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#bd711d]/10">
                <Users className="h-5 w-5 text-[#bd711d]" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Agents</p>
                <p className="text-foreground text-2xl font-bold">{agents.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Total Posts</p>
                <p className="text-foreground text-2xl font-bold">{totalPosts}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Active</p>
                <p className="text-foreground text-2xl font-bold">{activeAgents}</p>
              </div>
            </div>
          </div>
        )}

        {/* Agent Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !agents || agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16">
            <img
              src={agentIllustrationImg}
              alt="No agents"
              className="h-32 w-auto object-contain opacity-50 mb-4"
            />
            <h3 className="text-lg font-semibold text-foreground mb-1">No social media agents yet</h3>
            <p className="text-muted-foreground text-sm max-w-md text-center mb-6">
              Create your first AI agent to start generating social media content across multiple platforms.
            </p>
            <Button asChild className="rounded-xl bg-[#bd711d] hover:bg-[#a5631a] text-white">
              <Link to="/extensions/social-media-agent/create">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Your First Agent
              </Link>
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground text-lg font-semibold">Your Agents</h2>
              <Button variant="outline" size="sm" asChild className="rounded-xl">
                <Link to="/extensions/social-media-agent/create">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Agent
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent: any) => (
                <div
                  key={agent.id}
                  className="group relative overflow-hidden rounded-2xl border-2 border-transparent bg-card transition-all hover:border-[#bd711d]/20 hover:shadow-lg"
                >
                  {/* Card Header with Avatar */}
                  <div className="flex items-start gap-4 p-5">
                    {/* Agent Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="h-16 w-16 overflow-hidden rounded-full bg-[#bd711d]/10">
                        <img
                          src={avatarImg}
                          alt={agent.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      {/* Status dot */}
                      <span
                        className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background ${
                          agent.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                    </div>

                    {/* Agent Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-foreground font-semibold truncate">{agent.name}</h3>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {agent.publishingType === "auto" ? "Auto-publishing" : "Manual review"}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/extensions/social-media-agent/${agent.id}`} className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/extensions/social-media-agent/${agent.id}/edit`} className="flex items-center gap-2">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget({ id: agent.id, name: agent.name })}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  {/* Platforms */}
                  <div className="px-5 pb-2">
                    <div className="flex items-center gap-1.5">
                      {agent.platforms?.map((platform: string) => {
                        const iconSrc = PLATFORM_ICONS[platform];
                        return iconSrc ? (
                          <img
                            key={platform}
                            src={iconSrc}
                            alt={platform}
                            className="h-7 w-7 object-contain"
                          />
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t px-5 py-3 mt-2">
                    <div className="flex items-center gap-3">
                      {agent.tone && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TONE_COLORS[agent.tone] ?? "bg-muted text-muted-foreground"}`}>
                          {agent.tone}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {agent.posts?.length ?? 0} posts
                      </span>
                    </div>
                    <Link to={`/extensions/social-media-agent/${agent.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg">
                        View
                        <Eye className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also remove all associated posts. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserDashboardLayout>
  );
}
