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
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../client/components/ui/card";
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
import { Separator } from "../../client/components/ui/separator";
import { toast } from "../../client/hooks/use-toast";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

const POST_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  scheduled: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

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
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Agents
            </Button>
          </Link>
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/extensions/seo-agent">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-foreground text-2xl font-bold flex items-center gap-2">
                <Search className="h-6 w-6 text-primary" />
                {agent.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[agent.status] ?? "bg-muted text-muted-foreground"}`}>
                  {agent.status}
                </span>
                {agent.niche && (
                  <span className="text-xs text-muted-foreground">
                    {agent.niche}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link to={`/extensions/seo-agent/${agent.id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit Agent
            </Button>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{agent.seedKeywords?.length ?? agent.keywords?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground">Keywords</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{posts?.length ?? agent.posts?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground">Posts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-1.5">
                {agent.wpUrl ? (
                  <Globe className="h-5 w-5 text-green-500" />
                ) : (
                  <Globe className="h-5 w-5 text-muted-foreground/40" />
                )}
                <span className="text-2xl font-bold">{agent.wpUrl ? "Yes" : "No"}</span>
              </div>
              <p className="text-xs text-muted-foreground">WP Connected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{agent.targetWordCount ?? 1500}</div>
              <p className="text-xs text-muted-foreground">Target Words</p>
            </CardContent>
          </Card>
        </div>

        {/* Config Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {agent.tone && (
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tone:</span>
                  <span className="font-medium">{agent.tone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Language:</span>
                <span className="font-medium">{agent.language ?? "en"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">AI Provider:</span>
                <span className="font-medium capitalize">{agent.aiProvider ?? "openai"}</span>
              </div>
              {agent.scheduleDays && agent.scheduleDays.length > 0 && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Schedule:</span>
                  <span className="font-medium">
                    {agent.scheduleDays
                      .map((d: string) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>

            {agent.contentTypes && agent.contentTypes.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Content Types</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.contentTypes.map((ct: string) => (
                      <span
                        key={ct}
                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                      >
                        {ct
                          .split("_")
                          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {agent.seedKeywords && agent.seedKeywords.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Seed Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.seedKeywords.map((kw: string) => (
                    <span
                      key={kw}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keywords Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Keywords</CardTitle>
              <Button variant="outline" size="sm" onClick={handleResearchKeywords} disabled={researching}>
                {researching ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <BarChart3 className="h-3.5 w-3.5 mr-1" />}
                Research Keywords
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingKeywords ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : keywords && keywords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Keyword</th>
                      <th className="pb-2 font-medium text-muted-foreground">Search Volume</th>
                      <th className="pb-2 font-medium text-muted-foreground">Difficulty</th>
                      <th className="pb-2 font-medium text-muted-foreground">CPC</th>
                      <th className="pb-2 font-medium text-muted-foreground">Intent</th>
                      <th className="pb-2 font-medium text-muted-foreground">Opportunity</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw: any) => (
                      <tr key={kw.id} className="border-b last:border-0 group">
                        <td className="py-3 pr-4 font-medium">{kw.keyword}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{kw.searchVolume ?? "-"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{kw.difficulty ?? "-"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{kw.cpc != null ? `$${kw.cpc}` : "-"}</td>
                        <td className="py-3 pr-4 text-muted-foreground capitalize">{kw.intent ?? "-"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{kw.opportunityScore ?? "-"}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Generate article from keyword"
                              onClick={() => handleGenerateFromKeyword(kw.keyword)}
                              disabled={generatingFromKeyword === kw.keyword}
                            >
                              {generatingFromKeyword === kw.keyword ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : agent.keywords && agent.keywords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Keyword</th>
                      <th className="pb-2 font-medium text-muted-foreground">Search Volume</th>
                      <th className="pb-2 font-medium text-muted-foreground">Difficulty</th>
                      <th className="pb-2 font-medium text-muted-foreground">CPC</th>
                      <th className="pb-2 font-medium text-muted-foreground">Intent</th>
                      <th className="pb-2 font-medium text-muted-foreground">Opportunity</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agent.keywords.map((kw: any) => (
                      <tr key={kw.id} className="border-b last:border-0 group">
                        <td className="py-3 pr-4 font-medium">{kw.keyword}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{kw.searchVolume ?? "-"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{kw.difficulty ?? "-"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{kw.cpc != null ? `$${kw.cpc}` : "-"}</td>
                        <td className="py-3 pr-4 text-muted-foreground capitalize">{kw.intent ?? "-"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{kw.opportunityScore ?? "-"}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Generate article from keyword"
                              onClick={() => handleGenerateFromKeyword(kw.keyword)}
                              disabled={generatingFromKeyword === kw.keyword}
                            >
                              {generatingFromKeyword === kw.keyword ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No keyword data yet. Use the "Research Keywords" button to discover keyword opportunities.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Posts Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Posts</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Create Post
                </Button>
                <div className="flex items-center gap-1 border rounded-md pl-2">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    className="w-14 h-8 border-0 p-1 text-center text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateBatch}
                    disabled={generatingBatch}
                    className="h-8"
                  >
                    {generatingBatch ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Layers className="h-3.5 w-3.5 mr-1" />}
                    Batch
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={handleGenerateArticle} disabled={generating}>
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                  Generate Article
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPosts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !posts || posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No posts yet. Generate your first article using the button above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Title</th>
                      <th className="pb-2 font-medium text-muted-foreground">Content Type</th>
                      <th className="pb-2 font-medium text-muted-foreground">Status</th>
                      <th className="pb-2 font-medium text-muted-foreground">SEO Score</th>
                      <th className="pb-2 font-medium text-muted-foreground">Created</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post: any) => (
                      <tr key={post.id} className="border-b last:border-0 group">
                        <td className="py-3 pr-4 max-w-xs">
                          <p className="truncate font-medium">
                            {post.title?.length > 80
                              ? post.title.slice(0, 80) + "..."
                              : post.title}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                            {(post.contentType ?? "")
                              .split("_")
                              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                              .join(" ")}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POST_STATUS_COLORS[post.status] ?? "bg-muted text-muted-foreground"}`}>
                            {post.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {post.seoScore != null ? `${post.seoScore}/100` : "-"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ id: post.id })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo-post-type">Content Type</Label>
              <Select value={newPostContentType} onValueChange={setNewPostContentType}>
                <SelectTrigger id="seo-post-type">
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creatingPost}>
              Cancel
            </Button>
            <Button onClick={handleCreatePost} disabled={creatingPost}>
              {creatingPost && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Create Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserDashboardLayout>
  );
}
