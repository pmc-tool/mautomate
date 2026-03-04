import { type AuthUser } from "wasp/auth";
import { Link, useParams } from "react-router";
import { useQuery } from "wasp/client/operations";
import {
  getSocialMediaAgent,
  getSocialMediaPosts,
  deleteSocialMediaPost,
  generateSocialMediaPost,
  generateSocialBatchPosts,
  createSocialMediaPost,
} from "wasp/client/operations";
import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Share2,
  Loader2,
  Eye,
  Sparkles,
  Calendar,
  Hash,
  Palette,
  Zap,
  Plus,
  Layers,
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

export default function SocialMediaAgentDetailPage({ user }: { user: AuthUser }) {
  const params = useParams<{ id: string }>();
  const agentId = params.id!;

  const { data: agent, isLoading: loadingAgent } = useQuery(
    getSocialMediaAgent,
    { id: agentId },
  );

  const { data: posts, isLoading: loadingPosts } = useQuery(
    getSocialMediaPosts,
    { agentId },
  );

  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // AI generation state
  const [generating, setGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState(3);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  // Create post dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostPlatform, setNewPostPlatform] = useState<"facebook" | "instagram" | "linkedin" | "x">("facebook");
  const [newPostHashtags, setNewPostHashtags] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);

  async function handleDeletePost() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSocialMediaPost({ id: deleteTarget.id });
      toast({ title: "Deleted", description: "Post has been removed." });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to delete post.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleGeneratePost() {
    setGenerating(true);
    try {
      await generateSocialMediaPost({ agentId: agent!.id });
      toast({ title: "Post generated!", description: "A new post has been created by AI." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to generate post.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateBatch() {
    setGeneratingBatch(true);
    try {
      const result = await generateSocialBatchPosts({ agentId: agent!.id, count: batchCount });
      toast({ title: "Batch generated!", description: `${(result as any)?.count ?? batchCount} posts have been created.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to generate batch.", variant: "destructive" });
    } finally {
      setGeneratingBatch(false);
    }
  }

  async function handleCreatePost() {
    if (!newPostContent.trim()) {
      toast({ title: "Validation", description: "Content is required.", variant: "destructive" });
      return;
    }
    setCreatingPost(true);
    try {
      await createSocialMediaPost({
        agentId: agent!.id,
        content: newPostContent.trim(),
        platform: newPostPlatform,
        hashtags: newPostHashtags.trim(),
        status: "draft",
      });
      toast({ title: "Post created!", description: "Your post has been saved as a draft." });
      setCreateDialogOpen(false);
      setNewPostContent("");
      setNewPostPlatform("facebook");
      setNewPostHashtags("");
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
          <Link to="/extensions/social-media-agent">
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
            <Link to="/extensions/social-media-agent">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-foreground text-2xl font-bold flex items-center gap-2">
                <Share2 className="h-6 w-6 text-primary" />
                {agent.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[agent.status] ?? "bg-muted text-muted-foreground"}`}>
                  {agent.status}
                </span>
                {agent.company && (
                  <span className="text-xs text-muted-foreground">
                    Brand: {agent.company.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link to={`/extensions/social-media-agent/${agent.id}/edit`}>
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
              <div className="text-2xl font-bold">{agent.platforms?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground">Platforms</p>
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
              <div className="text-2xl font-bold capitalize">{agent.publishingType ?? "manual"}</div>
              <p className="text-xs text-muted-foreground">Publishing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{agent.dailyPostCount ?? 1}</div>
              <p className="text-xs text-muted-foreground">Daily Posts</p>
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
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Creativity:</span>
                <span className="font-medium">{agent.creativityLevel ?? 5}/10</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Hashtags:</span>
                <span className="font-medium">{agent.hashtagCount ?? 5}</span>
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

            {agent.platforms && agent.platforms.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Platforms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.platforms.map((p: string) => (
                      <span
                        key={p}
                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {agent.postTypes && agent.postTypes.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Post Types</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.postTypes.map((t: string) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
                    >
                      {t
                        .split("_")
                        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </span>
                  ))}
                </div>
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
                <Button variant="outline" size="sm" onClick={handleGeneratePost} disabled={generating}>
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                  Generate Post
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
                No posts yet. Generate your first post using the button above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Content</th>
                      <th className="pb-2 font-medium text-muted-foreground">Platform</th>
                      <th className="pb-2 font-medium text-muted-foreground">Status</th>
                      <th className="pb-2 font-medium text-muted-foreground">Created</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post: any) => (
                      <tr key={post.id} className="border-b last:border-0 group">
                        <td className="py-3 pr-4 max-w-xs">
                          <p className="truncate">
                            {post.content?.length > 80
                              ? post.content.slice(0, 80) + "..."
                              : post.content}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {post.platform?.charAt(0).toUpperCase() + post.platform?.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POST_STATUS_COLORS[post.status] ?? "bg-muted text-muted-foreground"}`}>
                            {post.status}
                          </span>
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
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>
              Manually create a new social media post draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="post-content">Content</Label>
              <Textarea
                id="post-content"
                placeholder="Write your post content..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-platform">Platform</Label>
              <Select value={newPostPlatform} onValueChange={(v) => setNewPostPlatform(v as typeof newPostPlatform)}>
                <SelectTrigger id="post-platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="x">X (Twitter)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-hashtags">Hashtags</Label>
              <Input
                id="post-hashtags"
                placeholder="#marketing #ai #socialmedia"
                value={newPostHashtags}
                onChange={(e) => setNewPostHashtags(e.target.value)}
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
