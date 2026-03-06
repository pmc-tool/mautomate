import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { useQuery } from "wasp/client/operations";
import { getSeoAgents, deleteSeoAgent } from "wasp/client/operations";
import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Eye,
  Globe,
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
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";

// Images — reusing social-agent background images + illustration
import agentsBgImg from "../../client/static/social-agent/agents-bg.jpg";
import agentsBgDarkImg from "../../client/static/social-agent/agents-bg-dark.png";
import agentIllustrationImg from "../../client/static/social-agent/agent-illustration.png";

const CONTENT_TYPE_COLORS: Record<string, string> = {
  internal_blog: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  external_blog: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  social: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  blog_post: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  article: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  pillar_content: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  product_page: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  landing_page: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

function formatContentType(ct: string) {
  return ct
    .split("_")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function SeoAgentPage({ user }: { user: AuthUser }) {
  const { data: agents, isLoading } = useQuery(getSeoAgents);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSeoAgent({ id: deleteTarget.id });
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
        {/* Hero Banner — MagicAI-style with background image + illustration */}
        <div
          className="relative flex flex-wrap items-center overflow-hidden rounded-2xl bg-cover bg-top dark:bg-white/[2%] lg:min-h-[280px] lg:flex-nowrap"
          style={{ backgroundImage: `url(${agentsBgImg})` }}
        >
          {/* Dark mode background override */}
          <img
            src={agentsBgDarkImg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover hidden dark:block"
          />

          {/* Left Content */}
          <div className="relative z-10 w-full px-5 py-12 lg:w-[600px] lg:px-11 lg:py-16">
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
              SEO Agent
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground dark:text-white/70 max-w-md">
              Create AI agents that research keywords, analyze competitors, and generate SEO-optimized content that ranks on search engines.
            </p>
            <div className="mt-5">
              <Button
                asChild
                className="bg-[#bd711d] text-white hover:bg-[#a5631a] border border-[#925716] shadow-lg"
              >
                <Link to="/extensions/seo-agent/create">
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Agent
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Illustration */}
          <div className="relative z-10 -order-1 flex justify-end lg:absolute lg:end-0 lg:top-0 lg:h-full lg:max-w-[calc(100%-600px)]">
            <img
              src={agentIllustrationImg}
              alt="SEO Agent"
              className="h-full w-auto object-cover max-lg:max-h-[200px] max-lg:[mask-image:linear-gradient(#000_80%,transparent)]"
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
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#bd711d]/10 mb-4">
              <Search className="h-10 w-10 text-[#bd711d]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No SEO agents yet</h3>
            <p className="text-muted-foreground text-sm max-w-md text-center mb-6">
              Create your first SEO agent to start researching keywords and generating optimized content for your website.
            </p>
            <Button asChild className="rounded-xl bg-[#bd711d] hover:bg-[#a5631a] text-white">
              <Link to="/extensions/seo-agent/create">
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
                <Link to="/extensions/seo-agent/create">
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
                  {/* Card Header */}
                  <div className="flex items-start gap-4 p-5">
                    {/* Agent Icon */}
                    <div className="relative flex-shrink-0">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#bd711d]/10">
                        <Search className="h-7 w-7 text-[#bd711d]" />
                      </div>
                      {/* Status dot */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${
                          agent.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                    </div>

                    {/* Agent Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-foreground font-semibold truncate">{agent.name}</h3>
                          <p className="text-muted-foreground text-xs mt-0.5 truncate">
                            {agent.niche || "General SEO"}
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
                              <Link to={`/extensions/seo-agent/${agent.id}`} className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/extensions/seo-agent/${agent.id}/edit`} className="flex items-center gap-2">
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

                  {/* Keywords & Content Types */}
                  <div className="px-5 pb-2 space-y-2">
                    {agent.seedKeywords && agent.seedKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {agent.seedKeywords.slice(0, 3).map((kw: string) => (
                          <span
                            key={kw}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[#bd711d]/10 text-[#bd711d] font-medium"
                          >
                            {kw}
                          </span>
                        ))}
                        {agent.seedKeywords.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            +{agent.seedKeywords.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {agent.contentTypes && agent.contentTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {agent.contentTypes.map((ct: string) => (
                          <span
                            key={ct}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CONTENT_TYPE_COLORS[ct] ?? "bg-muted text-muted-foreground"}`}
                          >
                            {formatContentType(ct)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t px-5 py-3 mt-2">
                    <div className="flex items-center gap-3">
                      {agent.wpUrl && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <Globe className="h-3 w-3" />
                          WP
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {agent.posts?.length ?? 0} posts
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {agent.targetWordCount ?? 1500}w
                      </span>
                    </div>
                    <Link to={`/extensions/seo-agent/${agent.id}`}>
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
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also remove all associated posts and keyword data. This action cannot be undone.
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
