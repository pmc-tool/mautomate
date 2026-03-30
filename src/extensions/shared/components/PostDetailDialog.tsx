import { useState, useEffect, useCallback } from "react";
import {
  updateSocialMediaPost,
  updateSeoPost,
  uploadPostMedia,
  generatePostImage,
  deletePostMedia,
} from "wasp/client/operations";
import {
  CheckCircle,
  XCircle,
  CalendarClock,
  RefreshCw,
  AlertTriangle,
  User,
  BarChart3,
  Loader2,
  Send,
  Pencil,
  Save,
  X,
  ImagePlus,
  Sparkles,
  Trash2,
  Link,
  FolderOpen,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../client/components/ui/dialog";
import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Textarea } from "../../../client/components/ui/textarea";
import { Label } from "../../../client/components/ui/label";
import { Progress } from "../../../client/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../client/components/ui/tabs";
import { toast } from "../../../client/hooks/use-toast";
import { RevisionHistory, type PostRevision } from "./RevisionHistory";
import type { UnifiedPost } from "./KanbanCard";
import {
  calculateSeoScore,
  calculateAeoScore,
} from "../../seo-agent/seoScoring";
import { ContentManagerDialog } from "../../../file-upload/ContentManagerDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MediaItem {
  id: string;
  type: string;
  source: string;
  fileUrl: string | null;
  aiPrompt: string | null;
  aiStatus: string | null;
  sortOrder: number;
}

interface PostDetailDialogProps {
  post: UnifiedPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: PostRevision[];
  onApprove: () => void;
  onReject: (notes?: string) => void;
  onSchedule: (scheduledAt: string) => void;
  onRework: (prompt?: string) => void;
  onRestore: (revisionId: string) => void;
  onPublishNow?: () => void;
  onPostUpdated?: () => void;
  loading?: boolean;
  media?: MediaItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  scheduled:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  published:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Poor";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "destructive";
}

function scoreProgressColor(score: number) {
  if (score >= 80) return "[&>div]:bg-green-500";
  if (score >= 60) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-red-500";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostDetailDialog({
  post,
  open,
  onOpenChange,
  revisions,
  onApprove,
  onReject,
  onSchedule,
  onRework,
  onRestore,
  onPublishNow,
  onPostUpdated,
  loading = false,
  media = [],
}: PostDetailDialogProps) {
  // --- Workflow state ---
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showReworkInput, setShowReworkInput] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [reworkPrompt, setReworkPrompt] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");

  // --- Edit mode state ---
  const [editing, setEditing] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Social fields
  const [editContent, setEditContent] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

  // SEO fields
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editMeta, setEditMeta] = useState("");
  const [editKeyword, setEditKeyword] = useState("");
  const [editSeoContent, setEditSeoContent] = useState("");

  // Live SEO scores
  const [liveSeoScore, setLiveSeoScore] = useState(0);
  const [liveAeoScore, setLiveAeoScore] = useState(0);

  // --- Media state ---
  const [mediaTab, setMediaTab] = useState("url");
  const [mediaUrl, setMediaUrl] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [mediaUploading, setMediaUploading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);

  // --- Content Manager state ---
  const [contentManagerOpen, setContentManagerOpen] = useState(false);
  const [contentManagerDefaultTab, setContentManagerDefaultTab] = useState<"upload" | "images">("images");

  // Populate edit fields when entering edit mode
  useEffect(() => {
    if (editing && post) {
      if (post.postType === "social") {
        setEditContent(post.content ?? "");
        setEditHashtags((post as any).hashtags ?? "");
        setEditImageUrl((post as any).imageUrl ?? "");
      } else {
        setEditTitle(post.title ?? "");
        setEditSlug((post as any).slug ?? "");
        setEditMeta((post as any).metaDescription ?? "");
        setEditKeyword((post as any).primaryKeyword ?? "");
        setEditSeoContent(post.content ?? "");
      }
    }
  }, [editing, post]);

  // Live SEO scoring (debounced)
  useEffect(() => {
    if (!editing || post?.postType !== "seo") return;
    const timer = setTimeout(() => {
      const sResult = calculateSeoScore({
        title: editTitle,
        content: editSeoContent,
        metaDescription: editMeta || null,
        slug: editSlug || null,
        primaryKeyword: editKeyword || null,
      });
      setLiveSeoScore(sResult.total);
      const aResult = calculateAeoScore({
        content: editSeoContent,
        title: editTitle,
        metaDescription: editMeta || null,
      });
      setLiveAeoScore(aResult.total);
    }, 300);
    return () => clearTimeout(timer);
  }, [editTitle, editSeoContent, editMeta, editSlug, editKeyword, editing, post?.postType]);

  // --- Reset ---
  function resetAll() {
    setShowRejectInput(false);
    setShowReworkInput(false);
    setRejectNotes("");
    setReworkPrompt("");
    setScheduleDate("");
    setEditing(false);
    setEditSaving(false);
    setMediaUrl("");
    setAiPrompt("");
    setMediaTab("");
    setContentManagerOpen(false);
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) resetAll();
    onOpenChange(isOpen);
  }

  function handleReject() {
    if (showRejectInput) {
      onReject(rejectNotes || undefined);
      setShowRejectInput(false);
      setRejectNotes("");
    } else {
      setShowRejectInput(true);
      setShowReworkInput(false);
    }
  }

  function handleRework() {
    if (showReworkInput) {
      onRework(reworkPrompt || undefined);
      setShowReworkInput(false);
      setReworkPrompt("");
    } else {
      setShowReworkInput(true);
      setShowRejectInput(false);
    }
  }

  function handleSchedule() {
    if (scheduleDate) {
      onSchedule(new Date(scheduleDate).toISOString());
      setScheduleDate("");
    }
  }

  // --- Save edit ---
  async function handleSaveEdit() {
    if (!post) return;
    setEditSaving(true);
    try {
      if (post.postType === "social") {
        await updateSocialMediaPost({
          id: post.id,
          content: editContent,
          hashtags: editHashtags || null,
          imageUrl: editImageUrl || null,
        });
      } else {
        await updateSeoPost({
          id: post.id,
          title: editTitle,
          content: editSeoContent,
          metaDescription: editMeta || null,
          slug: editSlug || null,
          primaryKeyword: editKeyword || null,
          seoScore: liveSeoScore,
          aeoScore: liveAeoScore,
        });
      }
      toast({ title: "Saved", description: "Post updated successfully." });
      setEditing(false);
      onPostUpdated?.();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to save.", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  }

  // --- Media: upload by URL ---
  async function handleUploadMedia() {
    if (!post || !mediaUrl.trim()) return;
    setMediaUploading(true);
    try {
      await uploadPostMedia({
        postType: post.postType,
        postId: post.id,
        type: "image",
        fileUrl: mediaUrl.trim(),
      });
      toast({ title: "Added", description: "Image added to post." });
      setMediaUrl("");
      onPostUpdated?.();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to add image.", variant: "destructive" });
    } finally {
      setMediaUploading(false);
    }
  }

  // --- Media: AI generate ---
  async function handleGenerateImage() {
    if (!post || !aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      await generatePostImage({
        postType: post.postType,
        postId: post.id,
        prompt: aiPrompt.trim(),
      });
      toast({ title: "Generating", description: "AI image is being generated..." });
      setAiPrompt("");
      onPostUpdated?.();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to generate image.", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  }

  // --- Media: delete ---
  async function handleDeleteMedia(mediaId: string) {
    setDeletingMediaId(mediaId);
    try {
      await deletePostMedia({ id: mediaId });
      toast({ title: "Deleted", description: "Image removed." });
      onPostUpdated?.();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to delete.", variant: "destructive" });
    } finally {
      setDeletingMediaId(null);
    }
  }

  if (!post) return null;

  const canEdit = post.status === "draft" || post.status === "approved" || post.status === "failed";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="flex-1">
              {post.title || "Untitled Post"}
            </span>
            <Badge
              variant={post.postType === "seo" ? "info" : "success"}
              className="text-[10px] uppercase"
            >
              {post.postType}
            </Badge>
            {canEdit && !editing && (
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)} title="Edit post">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Meta info bar */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[post.status] || STATUS_STYLES.draft}`}
          >
            {post.status}
          </span>
          {post.platform && (
            <Badge variant="outline" className="capitalize">
              {post.platform}
            </Badge>
          )}
          {post.postType === "social" && (post as any).socialAccountName && (
            <Badge variant="secondary" className="text-xs">
              Account: {(post as any).socialAccountName}
            </Badge>
          )}
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <User className="h-3 w-3" />
            {post.agentName}
          </div>
          <div className="text-muted-foreground text-xs">
            Created: {formatDate(post.createdAt)}
          </div>
          {post.scheduledAt && (
            <div className="text-muted-foreground text-xs">
              Scheduled: {formatDate(post.scheduledAt)}
            </div>
          )}
          {post.publishedAt && (
            <div className="text-muted-foreground text-xs">
              Published: {formatDate(post.publishedAt)}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* EDIT MODE                                                       */}
        {/* ============================================================== */}
        {editing ? (
          <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/30 p-4 dark:border-blue-800 dark:bg-blue-900/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Editing Post</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={editSaving}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </div>

            {/* Social edit fields */}
            {post.postType === "social" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Content</Label>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={5}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Hashtags</Label>
                    <Input
                      placeholder="#marketing #ai"
                      value={editHashtags}
                      onChange={(e) => setEditHashtags(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Image URL</Label>
                    <Input
                      placeholder="https://..."
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SEO edit fields */}
            {post.postType === "seo" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Slug</Label>
                    <Input
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Primary Keyword</Label>
                    <Input
                      value={editKeyword}
                      onChange={(e) => setEditKeyword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Meta Description</Label>
                  <Input
                    value={editMeta}
                    onChange={(e) => setEditMeta(e.target.value)}
                    maxLength={160}
                  />
                  <p className="text-muted-foreground text-right text-xs">{editMeta.length}/160</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Content</Label>
                  <Textarea
                    value={editSeoContent}
                    onChange={(e) => setEditSeoContent(e.target.value)}
                    rows={10}
                  />
                </div>

                {/* Live SEO / AEO scores */}
                {(editTitle || editSeoContent) && (
                  <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">SEO</span>
                        <Badge variant={scoreBadgeVariant(liveSeoScore)}>{liveSeoScore}/100</Badge>
                      </div>
                      <Progress value={liveSeoScore} className={scoreProgressColor(liveSeoScore)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">AEO</span>
                        <Badge variant={scoreBadgeVariant(liveAeoScore)}>{liveAeoScore}/100</Badge>
                      </div>
                      <Progress value={liveAeoScore} className={scoreProgressColor(liveAeoScore)} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* READ-ONLY VIEW                                                  */}
            {/* ============================================================== */}

            {/* SEO / AEO Scores */}
            {post.postType === "seo" && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="h-4 w-4" />
                  Performance Scores
                </div>
                {post.seoScore != null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>SEO Score</span>
                      <span className="font-semibold">
                        {post.seoScore}/100 - {getScoreLabel(post.seoScore)}
                      </span>
                    </div>
                    <Progress
                      value={post.seoScore}
                      className={`h-2 [&>[data-slot=progress-indicator]]:${getScoreColor(post.seoScore)}`}
                    />
                  </div>
                )}
                {post.aeoScore != null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>AEO Score</span>
                      <span className="font-semibold">
                        {post.aeoScore}/100 - {getScoreLabel(post.aeoScore)}
                      </span>
                    </div>
                    <Progress
                      value={post.aeoScore}
                      className={`h-2 [&>[data-slot=progress-indicator]]:${getScoreColor(post.aeoScore)}`}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Post content */}
            <div className="rounded-lg border p-4">
              {post.postType === "seo" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {post.title && (
                    <h2 className="mb-3 text-lg font-semibold">{post.title}</h2>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: post.content }} />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {post.content}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* MEDIA SECTION                                                   */}
        {/* ============================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <ImagePlus className="h-4 w-4" />
              Images ({media.length})
            </span>
          </div>

          {/* Existing media gallery */}
          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {media.map((m) => (
                <div key={m.id} className="group relative overflow-hidden rounded-lg border">
                  {m.fileUrl ? (
                    <img
                      src={m.fileUrl}
                      alt={m.aiPrompt || "Post image"}
                      className="h-24 w-full object-cover"
                    />
                  ) : m.aiStatus === "processing" ? (
                    <div className="flex h-24 items-center justify-center bg-muted">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center bg-muted text-xs text-muted-foreground">
                      {m.aiStatus === "failed" ? "Generation failed" : "No image"}
                    </div>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteMedia(m.id)}
                      disabled={deletingMediaId === m.id}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                      title="Remove image"
                    >
                      {deletingMediaId === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  )}
                  {m.source === "ai_generated" && m.aiStatus && (
                    <Badge
                      variant={m.aiStatus === "completed" ? "default" : m.aiStatus === "processing" ? "secondary" : "destructive"}
                      className="absolute bottom-1 left-1 text-[9px]"
                    >
                      AI {m.aiStatus}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add media (only when editable) */}
          {canEdit && (
            <div className="space-y-3">
              {/* Action buttons row */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setContentManagerDefaultTab("images");
                    setContentManagerOpen(true);
                  }}
                >
                  <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                  Add from Library
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setContentManagerDefaultTab("upload");
                    setContentManagerOpen(true);
                  }}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaTab(mediaTab === "ai" ? "" : "ai")}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  AI Generate
                </Button>
              </div>

              {/* AI Generate inline panel */}
              {mediaTab === "ai" && (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Describe the image to generate..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleGenerateImage}
                      disabled={aiGenerating || !aiPrompt.trim()}
                    >
                      {aiGenerating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                      Generate
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    AI-generated image. Generation may take up to a minute.
                  </p>
                </div>
              )}

              {/* Content Manager Dialog */}
              <ContentManagerDialog
                open={contentManagerOpen}
                onOpenChange={setContentManagerOpen}
                mode="postMedia"
                postType={post.postType as "social" | "seo"}
                postId={post.id}
                defaultTab={contentManagerDefaultTab}
                onPostMediaCreated={() => {
                  onPostUpdated?.();
                }}
              />
            </div>
          )}
        </div>

        {/* Failed status: error message */}
        {post.status === "failed" && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Publishing failed</p>
              <p className="mt-1 text-xs">
                This post failed to publish. You can edit and rework it, then try again.
              </p>
            </div>
          </div>
        )}

        {/* Reject notes input */}
        {showRejectInput && (
          <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-800 dark:bg-red-900/10">
            <label className="text-sm font-medium text-red-700 dark:text-red-400">
              Rejection Notes (optional)
            </label>
            <Textarea
              placeholder="Explain why this post is being rejected..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Confirm Reject
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRejectInput(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Rework prompt input */}
        {showReworkInput && (
          <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-800 dark:bg-purple-900/10">
            <label className="text-sm font-medium text-purple-700 dark:text-purple-400">
              Rework Instructions (optional)
            </label>
            <Textarea
              placeholder="Describe what changes should be made..."
              value={reworkPrompt}
              onChange={(e) => setReworkPrompt(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleRework}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Send for Rework
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReworkInput(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Revision history */}
        <RevisionHistory revisions={revisions} onRestore={onRestore} />

        {/* Action buttons footer */}
        <DialogFooter className="flex-wrap gap-2">
          {/* Draft actions */}
          {post.status === "draft" && (
            <>
              <Button onClick={onApprove} disabled={loading}>
                {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                <CheckCircle className="mr-1 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={handleRework}
                disabled={loading}
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                Rework
              </Button>
            </>
          )}

          {/* Approved actions */}
          {post.status === "approved" && (
            <>
              {onPublishNow && (
                <Button onClick={onPublishNow} disabled={loading}>
                  {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  <Send className="mr-1 h-4 w-4" />
                  Publish Now
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-auto"
                />
                <Button
                  variant="outline"
                  onClick={handleSchedule}
                  disabled={loading || !scheduleDate}
                >
                  {loading && (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  )}
                  <CalendarClock className="mr-1 h-4 w-4" />
                  Schedule
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={loading}
              >
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
            </>
          )}

          {/* Scheduled actions */}
          {post.status === "scheduled" && (
            <>
              {onPublishNow && (
                <Button onClick={onPublishNow} disabled={loading}>
                  {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  <Send className="mr-1 h-4 w-4" />
                  Publish Now
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-auto"
                />
                <Button
                  variant="outline"
                  onClick={handleSchedule}
                  disabled={loading || !scheduleDate}
                >
                  {loading && (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  )}
                  <CalendarClock className="mr-1 h-4 w-4" />
                  Reschedule
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={loading}
              >
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
            </>
          )}

          {/* Failed actions */}
          {post.status === "failed" && (
            <Button
              variant="outline"
              onClick={handleRework}
              disabled={loading}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Rework
            </Button>
          )}

          {/* Published: view only, no special actions */}
          {post.status === "published" && (
            <p className="text-muted-foreground text-sm italic">
              This post has been published. No further actions available.
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
