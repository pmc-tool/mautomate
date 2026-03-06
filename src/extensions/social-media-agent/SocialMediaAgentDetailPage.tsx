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
  Loader2,
  Sparkles,
  Calendar,
  Hash,
  Palette,
  Zap,
  Plus,
  Layers,
  BarChart3,
  Clock,
  Target,
  Globe,
  Eye,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
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
import { toast } from "../../client/hooks/use-toast";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";

import avatarImg from "../../client/static/social-agent/avatar.png";

// Platform icons
import facebookIcon from "../../social-connect/icons/facebook.svg";
import instagramIcon from "../../social-connect/icons/instagram.svg";
import linkedinIcon from "../../social-connect/icons/linkedin.svg";
import xIcon from "../../social-connect/icons/x.svg";

const PLATFORM_ICON_MAP: Record<string, string> = {
  facebook: facebookIcon,
  instagram: instagramIcon,
  linkedin: linkedinIcon,
  x: xIcon,
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const POST_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
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
  const [generating, setGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState(3);
  const [generatingBatch, setGeneratingBatch] = useState(false);
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
            <Button variant="outline" className="mt-4 rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Agents
            </Button>
          </Link>
        </div>
      </UserDashboardLayout>
    );
  }

  const draftCount = posts?.filter((p: any) => p.status === "draft").length ?? 0;
  const publishedCount = posts?.filter((p: any) => p.status === "published").length ?? 0;
  const scheduledCount = posts?.filter((p: any) => p.status === "scheduled").length ?? 0;

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header with Agent Info */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-xl">
              <Link to="/extensions/social-media-agent">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            {/* Agent Avatar */}
            <div className="relative">
              <div className="h-14 w-14 overflow-hidden rounded-full bg-[#bd711d]/10">
                <img src={avatarImg} alt={agent.name} className="h-full w-full object-cover" />
              </div>
              <span
                className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background ${
                  agent.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </div>
            <div>
              <h1 className="text-foreground text-2xl font-bold">{agent.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-[10px] ${STATUS_COLORS[agent.status] ?? "bg-muted text-muted-foreground"}`}>
                  {agent.status}
                </Badge>
                {agent.company && (
                  <span className="text-xs text-muted-foreground">
                    Brand: {agent.company.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" asChild className="rounded-xl">
            <Link to={`/extensions/social-media-agent/${agent.id}/edit`}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit Agent
            </Link>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#bd711d]/10">
              <Globe className="h-5 w-5 text-[#bd711d]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agent.platforms?.length ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">Platforms</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{posts?.length ?? agent.posts?.length ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">Posts</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Clock className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold capitalize">{agent.publishingType ?? "manual"}</p>
              <p className="text-[11px] text-muted-foreground">Publishing</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Target className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agent.dailyPostCount ?? 1}</p>
              <p className="text-[11px] text-muted-foreground">Daily Posts</p>
            </div>
          </div>
        </div>

        {/* Config Summary */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="border-b px-5 py-3">
            <h3 className="text-sm font-semibold">Configuration</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {agent.tone && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <Palette className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tone</p>
                    <p className="text-sm font-medium">{agent.tone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Creativity</p>
                  <p className="text-sm font-medium">{agent.creativityLevel ?? 5}/10</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hashtags</p>
                  <p className="text-sm font-medium">{agent.hashtagCount ?? 5}</p>
                </div>
              </div>
              {agent.scheduleDays && agent.scheduleDays.length > 0 && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Schedule</p>
                    <p className="text-sm font-medium">
                      {agent.scheduleDays
                        .map((d: string) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Platforms */}
            {agent.platforms && agent.platforms.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {agent.platforms.map((p: string) => (
                    <span
                      key={p}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium bg-muted"
                    >
                      <img src={PLATFORM_ICON_MAP[p]} alt={p} className="h-4 w-4 object-contain" />
                      {PLATFORM_LABELS[p] ?? p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Post Types */}
            {agent.postTypes && agent.postTypes.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Post Types</p>
                <div className="flex flex-wrap gap-2">
                  {agent.postTypes.map((t: string) => (
                    <span
                      key={t}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground font-medium"
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
          </div>
        </div>

        {/* Posts Section */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold">Posts</h3>
              <div className="flex gap-1.5">
                {draftCount > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{draftCount} drafts</Badge>
                )}
                {scheduledCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]">{scheduledCount} scheduled</Badge>
                )}
                {publishedCount > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">{publishedCount} published</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)} className="rounded-xl h-8">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create
              </Button>
              <div className="flex items-center gap-1 border rounded-xl overflow-hidden">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-12 h-8 border-0 p-1 text-center text-sm rounded-none"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateBatch}
                  disabled={generatingBatch}
                  className="h-8 rounded-none border-l"
                >
                  {generatingBatch ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Layers className="h-3.5 w-3.5 mr-1" />}
                  Batch
                </Button>
              </div>
              <Button size="sm" onClick={handleGeneratePost} disabled={generating} className="rounded-xl h-8">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                Generate
              </Button>
            </div>
          </div>
          <div className="p-4">
            {loadingPosts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !posts || posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No posts yet</p>
                <p className="text-muted-foreground text-xs">
                  Generate your first post using the buttons above
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((post: any) => (
                  <div
                    key={post.id}
                    className="group flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    {/* Platform icon */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <img src={PLATFORM_ICON_MAP[post.platform]} alt={post.platform} className="h-5 w-5 object-contain" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">
                        {post.content?.length > 100
                          ? post.content.slice(0, 100) + "..."
                          : post.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] ${POST_STATUS_COLORS[post.status] ?? "bg-muted text-muted-foreground"}`}>
                          {post.status}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
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

      {/* Delete post dialog */}
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
                className="rounded-xl resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-platform">Platform</Label>
              <Select value={newPostPlatform} onValueChange={(v) => setNewPostPlatform(v as typeof newPostPlatform)}>
                <SelectTrigger id="post-platform" className="rounded-xl">
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
                className="rounded-xl"
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
