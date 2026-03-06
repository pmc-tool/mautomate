import { type AuthUser } from "wasp/auth";
import { Link, useParams } from "react-router";
import { useQuery } from "wasp/client/operations";
import {
  getSeoAgent,
  getSeoPosts,
  deleteSeoPost,
  generateSeoPost,
  generateSeoBatchPosts,
  researchKeywords,
  getSeoKeywords,
  deleteSeoKeyword,
  createSeoPost,
} from "wasp/client/operations";
import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Globe,
  FileText,
  Target,
  Zap,
  Calendar,
  Palette,
  BarChart3,
  Layers,
  Plus,
  Sparkles,
  X,
  TrendingUp,
  Hash,
  Settings,
  Clock,
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
import { Input } from "../../client/components/ui/input";
import { Textarea } from "../../client/components/ui/textarea";
import { Label } from "../../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import { toast } from "../../client/hooks/use-toast";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const POST_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  scheduled: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

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

export default function SeoAgentDetailPage({ user }: { user: AuthUser }) {
  const params = useParams<{ id: string }>();
  const agentId = params.id!;

  const { data: agent, isLoading: loadingAgent } = useQuery(
    getSeoAgent,
    { id: agentId },
  );

  const { data: posts, isLoading: loadingPosts } = useQuery(
    getSeoPosts,
    { agentId },
  );

  const { data: keywords, isLoading: loadingKeywords } = useQuery(
    getSeoKeywords,
    { agentId },
  );

  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // AI generation state
  const [generating, setGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState(3);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [researching, setResearching] = useState(false);
  const [generatingFromKeyword, setGeneratingFromKeyword] = useState<string | null>(null);
  const [deletingKeyword, setDeletingKeyword] = useState<string | null>(null);

  // Create post dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostContentType, setNewPostContentType] = useState("blog_post");
  const [newPostKeyword, setNewPostKeyword] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);

  async function handleDeletePost() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSeoPost({ id: deleteTarget.id });
      toast({ title: "Deleted", description: "Post has been removed." });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to delete post.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleResearchKeywords() {
    setResearching(true);
    try {
      const result = await researchKeywords({ agentId: agent!.id });
      toast({
        title: "Keywords researched!",
        description: `Found ${(result as any)?.count ?? 0} keyword opportunities.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to research keywords.", variant: "destructive" });
    } finally {
      setResearching(false);
    }
  }

  async function handleGenerateArticle() {
    setGenerating(true);
    try {
      await generateSeoPost({ agentId: agent!.id });
      toast({ title: "Article generated!", description: "A new SEO article has been created." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to generate article.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateFromKeyword(keyword: string) {
    setGeneratingFromKeyword(keyword);
    try {
      await generateSeoPost({ agentId: agent!.id, keyword });
      toast({ title: "Article generated!", description: `Article created for keyword "${keyword}".` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to generate article.", variant: "destructive" });
    } finally {
      setGeneratingFromKeyword(null);
    }
  }

  async function handleDeleteKeyword(kwId: string) {
    setDeletingKeyword(kwId);
    try {
      await deleteSeoKeyword({ id: kwId });
      toast({ title: "Deleted", description: "Keyword has been removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to delete keyword.", variant: "destructive" });
    } finally {
      setDeletingKeyword(null);
    }
  }

  async function handleGenerateBatch() {
    setGeneratingBatch(true);
    try {
      const result = await generateSeoBatchPosts({ agentId: agent!.id, count: batchCount });
      toast({ title: "Batch generated!", description: `${(result as any)?.count ?? batchCount} articles have been created.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to generate batch.", variant: "destructive" });
    } finally {
      setGeneratingBatch(false);
    }
  }

  async function handleCreatePost() {
    if (!newPostTitle.trim()) {
      toast({ title: "Validation", description: "Title is required.", variant: "destructive" });
      return;
    }
    setCreatingPost(true);
    try {
      await createSeoPost({
        agentId: agent!.id,
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        contentType: newPostContentType,
        keyword: newPostKeyword.trim() || undefined,
      });
      toast({ title: "Post created!", description: "Your SEO post has been saved as a draft." });
      setCreateDialogOpen(false);
      setNewPostTitle("");
      setNewPostContent("");
      setNewPostContentType("blog_post");
      setNewPostKeyword("");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to create post.", variant: "destructive" });
    } finally {
      setCreatingPost(false);
    }
  }

  if (loadingAgent) {
    return (
      <UserDashboardLayout user={user}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </UserDashboardLayout>
    );
  }

  if (!agent) {
    return (
      <UserDashboardLayout user={user}>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Agent not found.</p>
          <Link to="/extensions/seo-agent">
            <Button variant="outline" className="mt-4 rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Agents
            </Button>
          </Link>
        </div>
      </UserDashboardLayout>
    );
  }

  const allKeywords = keywords && keywords.length > 0 ? keywords : agent.keywords ?? [];

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="rounded-xl">
              <Link to="/extensions/seo-agent">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#bd711d]/10">
              <Search className="h-7 w-7 text-[#bd711d]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-foreground text-2xl font-bold">{agent.name}</h1>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[agent.status] ?? "bg-muted text-muted-foreground"}`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-muted-foreground text-xs mt-0.5">
                {agent.niche || "General SEO"} {agent.wpUrl && "• WordPress connected"}
              </p>
            </div>
          </div>
          <Button variant="outline" asChild className="rounded-xl">
            <Link to={`/extensions/seo-agent/${agent.id}/edit`}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit Agent
            </Link>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#bd711d]/10">
              <Hash className="h-5 w-5 text-[#bd711d]" />
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Keywords</p>
              <p className="text-foreground text-2xl font-bold">{agent.seedKeywords?.length ?? allKeywords.length ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Posts</p>
              <p className="text-foreground text-2xl font-bold">{posts?.length ?? agent.posts?.length ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <Globe className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">WordPress</p>
              <p className="text-foreground text-2xl font-bold">{agent.wpUrl ? "Yes" : "No"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10">
              <Target className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Target Words</p>
              <p className="text-foreground text-2xl font-bold">{agent.targetWordCount ?? 1500}</p>
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b px-5 py-3">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-foreground font-semibold text-sm">Configuration</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agent.tone && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <Palette className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Tone</p>
                    <p className="text-sm font-medium">{agent.tone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Language</p>
                  <p className="text-sm font-medium">{agent.language ?? "en"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">AI Provider</p>
                  <p className="text-sm font-medium capitalize">{agent.aiProvider ?? "openai"}</p>
                </div>
              </div>
              {agent.scheduleDays && agent.scheduleDays.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Schedule</p>
                    <p className="text-sm font-medium">
                      {agent.scheduleDays
                        .map((d: string) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Content Types */}
            {agent.contentTypes && agent.contentTypes.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Content Types</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.contentTypes.map((ct: string) => (
                    <span
                      key={ct}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${CONTENT_TYPE_COLORS[ct] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {formatContentType(ct)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Seed Keywords */}
            {agent.seedKeywords && agent.seedKeywords.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Seed Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.seedKeywords.map((kw: string) => (
                    <span
                      key={kw}
                      className="text-xs px-2.5 py-1 rounded-full bg-[#bd711d]/10 text-[#bd711d] font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keywords Section */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-foreground font-semibold text-sm">Keywords</h2>
              {allKeywords.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {allKeywords.length}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleResearchKeywords} disabled={researching} className="rounded-xl">
              {researching ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <BarChart3 className="h-3.5 w-3.5 mr-1.5" />}
              Research Keywords
            </Button>
          </div>
          <div className="p-5">
            {loadingKeywords ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : allKeywords.length > 0 ? (
              <div className="space-y-2">
                {allKeywords.map((kw: any) => (
                  <div
                    key={kw.id}
                    className="group flex items-center gap-4 rounded-xl border bg-background p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#bd711d]/10 flex-shrink-0">
                      <Hash className="h-4 w-4 text-[#bd711d]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{kw.keyword}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {kw.searchVolume != null && (
                          <span className="text-[10px] text-muted-foreground">Vol: {kw.searchVolume}</span>
                        )}
                        {kw.difficulty != null && (
                          <span className="text-[10px] text-muted-foreground">Diff: {kw.difficulty}</span>
                        )}
                        {kw.cpc != null && (
                          <span className="text-[10px] text-muted-foreground">CPC: ${kw.cpc}</span>
                        )}
                        {kw.intent && (
                          <span className="text-[10px] text-muted-foreground capitalize">{kw.intent}</span>
                        )}
                        {kw.opportunityScore != null && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                            Score: {kw.opportunityScore}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        title="Generate article from keyword"
                        onClick={() => handleGenerateFromKeyword(kw.keyword)}
                        disabled={generatingFromKeyword === kw.keyword}
                      >
                        {generatingFromKeyword === kw.keyword ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                        title="Delete keyword"
                        onClick={() => handleDeleteKeyword(kw.id)}
                        disabled={deletingKeyword === kw.id}
                      >
                        {deletingKeyword === kw.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  No keyword data yet. Use "Research Keywords" to discover opportunities.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Posts Section */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-foreground font-semibold text-sm">Posts</h2>
              {posts && posts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {posts.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)} className="rounded-xl">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create
              </Button>
              <div className="flex items-center gap-1 border rounded-xl pl-2 bg-background">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-12 h-8 border-0 p-1 text-center text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateBatch}
                  disabled={generatingBatch}
                  className="h-8 rounded-xl"
                >
                  {generatingBatch ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Layers className="h-3.5 w-3.5 mr-1" />}
                  Batch
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerateArticle} disabled={generating} className="rounded-xl">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
                Generate
              </Button>
            </div>
          </div>
          <div className="p-5">
            {loadingPosts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !posts || posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  No posts yet. Generate your first article using the buttons above.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((post: any) => (
                  <div
                    key={post.id}
                    className="group flex items-center gap-4 rounded-xl border bg-background p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                      post.status === "published" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                      post.status === "approved" ? "bg-blue-100 dark:bg-blue-900/30" :
                      post.status === "scheduled" ? "bg-amber-100 dark:bg-amber-900/30" :
                      post.status === "failed" ? "bg-red-100 dark:bg-red-900/30" :
                      "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <FileText className={`h-4 w-4 ${
                        post.status === "published" ? "text-emerald-600 dark:text-emerald-400" :
                        post.status === "approved" ? "text-blue-600 dark:text-blue-400" :
                        post.status === "scheduled" ? "text-amber-600 dark:text-amber-400" :
                        post.status === "failed" ? "text-red-600 dark:text-red-400" :
                        "text-gray-500 dark:text-gray-400"
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {post.title?.length > 80 ? post.title.slice(0, 80) + "..." : post.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${POST_STATUS_COLORS[post.status] ?? "bg-muted text-muted-foreground"}`}>
                          {post.status}
                        </span>
                        {post.contentType && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CONTENT_TYPE_COLORS[post.contentType] ?? "bg-muted text-muted-foreground"}`}>
                            {formatContentType(post.contentType)}
                          </span>
                        )}
                        {post.seoScore != null && (
                          <span className="text-[10px] text-muted-foreground">
                            SEO: {post.seoScore}/100
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: post.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete post confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePost} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create post dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create SEO Post</DialogTitle>
            <DialogDescription>
              Manually create a new SEO article draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="seo-post-title">Title</Label>
              <Input
                id="seo-post-title"
                placeholder="Article title..."
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo-post-content">Content</Label>
              <Textarea
                id="seo-post-content"
                placeholder="Write your article content..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={6}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo-post-type">Content Type</Label>
              <Select value={newPostContentType} onValueChange={setNewPostContentType}>
                <SelectTrigger id="seo-post-type" className="h-11 rounded-xl">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog_post">Blog Post</SelectItem>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="pillar_content">Pillar Content</SelectItem>
                  <SelectItem value="product_page">Product Page</SelectItem>
                  <SelectItem value="landing_page">Landing Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo-post-keyword">Target Keyword (optional)</Label>
              <Input
                id="seo-post-keyword"
                placeholder="e.g. marketing automation"
                value={newPostKeyword}
                onChange={(e) => setNewPostKeyword(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creatingPost} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleCreatePost} disabled={creatingPost} className="rounded-xl">
              {creatingPost && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Create Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserDashboardLayout>
  );
}
