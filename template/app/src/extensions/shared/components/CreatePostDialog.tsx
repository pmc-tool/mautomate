import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "wasp/client/operations";
import {
  getSocialMediaAgents,
  getSeoAgents,
  getSocialAccountsByPlatform,
  createSocialMediaPost,
  createSeoPost,
  generateSocialMediaPost,
  generateSeoPost,
  approvePost,
  schedulePost,
  publishPostNow,
} from "wasp/client/operations";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../../client/components/ui/sheet";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Textarea } from "../../../client/components/ui/textarea";
import { Label } from "../../../client/components/ui/label";
import { Badge } from "../../../client/components/ui/badge";
import { Progress } from "../../../client/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../client/components/ui/tabs";
import { toast } from "../../../client/hooks/use-toast";
import {
  Loader2,
  Sparkles,
  PenLine,
  ArrowLeft,
  Calendar as CalendarIcon,
  Send,
  Save,
  Share2,
  FileText,
  AlertCircle,
  ExternalLink,
  FolderOpen,
  X,
  User as UserIcon,
} from "lucide-react";
import { ContentManagerDialog } from "../../../file-upload/ContentManagerDialog";
import {
  calculateSeoScore,
  calculateAeoScore,
} from "../../seo-agent/seoScoring";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPostType?: "social" | "seo" | null;
  onPostCreated: () => void;
}

const PLATFORMS = ["facebook", "instagram", "linkedin", "x"] as const;
type Platform = (typeof PLATFORMS)[number];

const CONTENT_TYPES = [
  { value: "internal_blog", label: "Internal Blog" },
  { value: "external_blog", label: "External Blog" },
  { value: "social", label: "Social" },
] as const;

function platformLabel(p: string) {
  const map: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    x: "X (Twitter)",
  };
  return map[p] ?? p;
}

function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreatePostDialog({
  open,
  onOpenChange,
  defaultPostType,
  onPostCreated,
}: CreatePostDialogProps) {
  const [postType, setPostType] = useState<"social" | "seo" | null>(
    defaultPostType ?? null
  );

  // Sync postType when defaultPostType changes (dropdown selection)
  useEffect(() => {
    if (open) {
      setPostType(defaultPostType ?? null);
    }
  }, [defaultPostType, open]);

  // Reset all state when dialog closes
  useEffect(() => {
    if (!open) {
      resetAll();
    }
  }, [open]);

  // --- Social state ---
  const [socialAgentId, setSocialAgentId] = useState("");
  const [socialPlatform, setSocialPlatform] = useState("");
  const [socialContent, setSocialContent] = useState("");
  const [socialHashtags, setSocialHashtags] = useState("");
  const [socialImageUrl, setSocialImageUrl] = useState("");
  const [socialAiPrompt, setSocialAiPrompt] = useState("");
  const [socialAccountId, setSocialAccountId] = useState("");
  const [accountsForPlatform, setAccountsForPlatform] = useState<
    { id: string; displayName: string | null; platformUsername: string | null; profileImageUrl: string | null; platform: string }[]
  >([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  // --- SEO state ---
  const [seoAgentId, setSeoAgentId] = useState("");
  const [seoContentType, setSeoContentType] = useState("internal_blog");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoSlug, setSeoSlug] = useState("");
  const [seoMeta, setSeoMeta] = useState("");
  const [seoPrimaryKeyword, setSeoPrimaryKeyword] = useState("");
  const [seoContent, setSeoContent] = useState("");
  const [seoImageUrl, setSeoImageUrl] = useState("");
  const [seoAiKeyword, setSeoAiKeyword] = useState("");
  const [seoAiPrompt, setSeoAiPrompt] = useState("");

  // --- Library state ---
  const [libraryOpen, setLibraryOpen] = useState(false);

  // --- Shared state ---
  const [tab, setTab] = useState("write");
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  // --- Queries ---
  const {
    data: socialAgents,
    isLoading: socialAgentsLoading,
    error: socialAgentsError,
  } = useQuery(getSocialMediaAgents, undefined, { enabled: open && postType === "social" });

  const {
    data: seoAgents,
    isLoading: seoAgentsLoading,
    error: seoAgentsError,
  } = useQuery(getSeoAgents, undefined, { enabled: open && postType === "seo" });

  // Auto-fill platform from selected social agent
  useEffect(() => {
    if (socialAgentId && socialAgents) {
      const agent = socialAgents.find((a: any) => a.id === socialAgentId);
      if (agent?.platforms?.length > 0 && !socialPlatform) {
        setSocialPlatform(agent.platforms[0]);
      }
    }
  }, [socialAgentId, socialAgents]);

  // Fetch social accounts when platform changes
  useEffect(() => {
    if (!socialPlatform) {
      setAccountsForPlatform([]);
      setSocialAccountId("");
      return;
    }
    let cancelled = false;
    setAccountsLoading(true);
    getSocialAccountsByPlatform({ platform: socialPlatform })
      .then((accounts: any[]) => {
        if (cancelled) return;
        setAccountsForPlatform(accounts);
        // Auto-select if only 1 account
        if (accounts.length === 1) {
          setSocialAccountId(accounts[0].id);
        } else {
          setSocialAccountId("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccountsForPlatform([]);
          setSocialAccountId("");
        }
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false);
      });
    return () => { cancelled = true; };
  }, [socialPlatform]);

  // Auto-slug from SEO title
  useEffect(() => {
    if (seoTitle) {
      setSeoSlug(toSlug(seoTitle));
    }
  }, [seoTitle]);

  // --- SEO scoring (debounced) ---
  const [seoScore, setSeoScore] = useState(0);
  const [aeoScore, setAeoScore] = useState(0);

  useEffect(() => {
    if (postType !== "seo" || tab !== "write") return;
    const timer = setTimeout(() => {
      const sResult = calculateSeoScore({
        title: seoTitle,
        content: seoContent,
        metaDescription: seoMeta || null,
        slug: seoSlug || null,
        primaryKeyword: seoPrimaryKeyword || null,
      });
      setSeoScore(sResult.total);

      const aResult = calculateAeoScore({
        content: seoContent,
        title: seoTitle,
        metaDescription: seoMeta || null,
      });
      setAeoScore(aResult.total);
    }, 300);
    return () => clearTimeout(timer);
  }, [seoTitle, seoContent, seoMeta, seoSlug, seoPrimaryKeyword, postType, tab]);

  // --- Reset ---
  function resetAll() {
    setSocialAgentId("");
    setSocialPlatform("");
    setSocialContent("");
    setSocialHashtags("");
    setSocialImageUrl("");
    setSocialAiPrompt("");
    setSocialAccountId("");
    setAccountsForPlatform([]);
    setAccountsLoading(false);
    setSeoAgentId("");
    setSeoContentType("internal_blog");
    setSeoTitle("");
    setSeoSlug("");
    setSeoMeta("");
    setSeoPrimaryKeyword("");
    setSeoContent("");
    setSeoImageUrl("");
    setSeoAiKeyword("");
    setSeoAiPrompt("");
    setTab("write");
    setSaving(false);
    setScheduling(false);
    setPublishing(false);
    setGenerating(false);
    setShowSchedulePicker(false);
    setScheduleDate("");
    setSeoScore(0);
    setAeoScore(0);
    setLibraryOpen(false);
  }

  // --- Available platforms from selected social agent ---
  const agentPlatforms = useMemo(() => {
    if (!socialAgentId || !socialAgents) return PLATFORMS as readonly string[];
    const agent = socialAgents.find((a: any) => a.id === socialAgentId);
    return agent?.platforms?.length > 0 ? agent.platforms : PLATFORMS;
  }, [socialAgentId, socialAgents]);

  // --- Action helpers ---

  function closeDialog() {
    onOpenChange(false);
    onPostCreated();
  }

  // Save Draft (social)
  async function handleSaveSocialDraft() {
    if (!socialAgentId) {
      toast({ title: "Agent required", description: "Please select an agent.", variant: "destructive" });
      return;
    }
    if (!socialContent.trim()) {
      toast({ title: "Content required", description: "Please write some content.", variant: "destructive" });
      return;
    }
    if (!socialPlatform) {
      toast({ title: "Platform required", description: "Please select a platform.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createSocialMediaPost({
        agentId: socialAgentId,
        content: socialContent,
        hashtags: socialHashtags || null,
        platform: socialPlatform as any,
        status: "draft",
        imageUrl: socialImageUrl || null,
        socialAccountId: socialAccountId || null,
      });
      toast({ title: "Saved!", description: "Post saved as draft." });
      closeDialog();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to save post.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // Save Draft (SEO)
  async function handleSaveSeoDraft() {
    if (!seoAgentId) {
      toast({ title: "Agent required", description: "Please select an agent.", variant: "destructive" });
      return;
    }
    if (!seoTitle.trim()) {
      toast({ title: "Title required", description: "Please enter a title.", variant: "destructive" });
      return;
    }
    if (!seoContent.trim()) {
      toast({ title: "Content required", description: "Please write some content.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createSeoPost({
        agentId: seoAgentId,
        contentType: seoContentType as any,
        title: seoTitle,
        content: seoContent,
        metaDescription: seoMeta || undefined,
        slug: seoSlug || undefined,
        primaryKeyword: seoPrimaryKeyword || undefined,
        seoScore: seoScore,
        aeoScore: aeoScore,
        status: "draft",
      });
      toast({ title: "Saved!", description: "SEO article saved as draft." });
      closeDialog();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to save article.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // AI Generate (social)
  async function handleGenerateSocial() {
    if (!socialAgentId) {
      toast({ title: "Agent required", description: "Please select an agent.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      await generateSocialMediaPost({
        agentId: socialAgentId,
        platform: socialPlatform || undefined,
        customPrompt: socialAiPrompt || undefined,
      });
      toast({ title: "Generated!", description: "AI post created as draft." });
      closeDialog();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to generate post.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  // AI Generate (SEO)
  async function handleGenerateSeo() {
    if (!seoAgentId) {
      toast({ title: "Agent required", description: "Please select an agent.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      await generateSeoPost({
        agentId: seoAgentId,
        keyword: seoAiKeyword || undefined,
        contentType: seoContentType as any,
        customPrompt: seoAiPrompt || undefined,
      });
      toast({ title: "Generated!", description: "AI article created as draft." });
      closeDialog();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to generate article.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  // Multi-step: create → approve → schedule
  async function handleSchedulePost() {
    if (!scheduleDate) {
      toast({ title: "Date required", description: "Please pick a schedule date.", variant: "destructive" });
      return;
    }
    setScheduling(true);
    try {
      const post =
        postType === "social"
          ? await createSocialMediaPost({
              agentId: socialAgentId,
              content: socialContent,
              hashtags: socialHashtags || null,
              platform: socialPlatform as any,
              status: "draft",
              imageUrl: socialImageUrl || null,
              socialAccountId: socialAccountId || null,
            })
          : await createSeoPost({
              agentId: seoAgentId,
              contentType: seoContentType as any,
              title: seoTitle,
              content: seoContent,
              metaDescription: seoMeta || undefined,
              slug: seoSlug || undefined,
              primaryKeyword: seoPrimaryKeyword || undefined,
              seoScore: seoScore,
              aeoScore: aeoScore,
              status: "draft",
            });

      try {
        await approvePost({
          postType: postType!,
          postId: post.id,
        });
        await schedulePost({
          postType: postType!,
          postId: post.id,
          scheduledAt: new Date(scheduleDate).toISOString(),
        });
        toast({ title: "Scheduled!", description: "Post created and scheduled." });
        closeDialog();
      } catch (err: any) {
        toast({
          title: "Partially saved",
          description: "Post saved as draft but scheduling failed. You can schedule it from Post Hub.",
          variant: "destructive",
        });
        closeDialog();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to create post.", variant: "destructive" });
    } finally {
      setScheduling(false);
      setShowSchedulePicker(false);
    }
  }

  // Multi-step: create → approve → publishNow
  async function handlePublishNow() {
    setPublishing(true);
    try {
      const post =
        postType === "social"
          ? await createSocialMediaPost({
              agentId: socialAgentId,
              content: socialContent,
              hashtags: socialHashtags || null,
              platform: socialPlatform as any,
              status: "draft",
              imageUrl: socialImageUrl || null,
              socialAccountId: socialAccountId || null,
            })
          : await createSeoPost({
              agentId: seoAgentId,
              contentType: seoContentType as any,
              title: seoTitle,
              content: seoContent,
              metaDescription: seoMeta || undefined,
              slug: seoSlug || undefined,
              primaryKeyword: seoPrimaryKeyword || undefined,
              seoScore: seoScore,
              aeoScore: aeoScore,
              status: "draft",
            });

      try {
        await approvePost({
          postType: postType!,
          postId: post.id,
        });
        await publishPostNow({
          postType: postType!,
          postId: post.id,
        });
        toast({ title: "Published!", description: "Post created and published." });
        closeDialog();
      } catch (err: any) {
        toast({
          title: "Partially saved",
          description: "Post saved as draft but publishing failed. You can publish from Post Hub.",
          variant: "destructive",
        });
        closeDialog();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to create post.", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  }

  // Validation check for Write tab actions
  function isWriteFormValid() {
    if (postType === "social") {
      return !!socialAgentId && !!socialContent.trim() && !!socialPlatform;
    }
    if (postType === "seo") {
      return !!seoAgentId && !!seoTitle.trim() && !!seoContent.trim();
    }
    return false;
  }

  const anyLoading = saving || scheduling || publishing || generating;

  // --- Score helpers ---
  function scoreColor(score: number) {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
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

  // --- Error states for agent queries ---
  function renderAgentError(error: any, type: string) {
    const is403 = error?.message?.includes("403") || error?.message?.toLowerCase()?.includes("extension");
    if (is403) {
      return (
        <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            This extension is not active.{" "}
            <a href="/marketplace" className="inline-flex items-center gap-1 font-medium underline">
              Activate in Marketplace <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Failed to load agents: {error?.message ?? "Unknown error"}</span>
      </div>
    );
  }

  function renderEmptyAgents(type: string) {
    const href = type === "social" ? "/extensions/social-media-agent" : "/extensions/seo-agent";
    return (
      <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          No {type === "social" ? "social media" : "SEO"} agents found.{" "}
          <a href={href} className="inline-flex items-center gap-1 font-medium underline">
            Create one first <ExternalLink className="h-3 w-3" />
          </a>
        </span>
      </div>
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {postType && (
              <button
                onClick={() => setPostType(null)}
                className="text-muted-foreground hover:text-foreground -ml-1 mr-1 rounded p-0.5 transition-colors"
                title="Back to type selection"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {postType === "social" && (
              <>
                <Share2 className="h-5 w-5" />
                New Social Media Post
              </>
            )}
            {postType === "seo" && (
              <>
                <FileText className="h-5 w-5" />
                New SEO Article
              </>
            )}
            {!postType && "New Post"}
          </SheetTitle>
          <SheetDescription className="sr-only">Create a new post</SheetDescription>
        </SheetHeader>

        {/* Type selector (only if not pre-set) */}
        {!postType && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary hover:bg-muted/50"
              onClick={() => setPostType("social")}
            >
              <Share2 className="h-8 w-8 text-blue-500" />
              <span className="font-medium">Social Media Post</span>
              <span className="text-muted-foreground text-xs">
                Facebook, Instagram, LinkedIn, X
              </span>
            </button>
            <button
              className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary hover:bg-muted/50"
              onClick={() => setPostType("seo")}
            >
              <FileText className="h-8 w-8 text-green-500" />
              <span className="font-medium">SEO Article</span>
              <span className="text-muted-foreground text-xs">
                Blog posts, articles, content
              </span>
            </button>
          </div>
        )}

        {/* ============== Social Post Form ============== */}
        {postType === "social" && (
          <div className="space-y-4">
            {/* Agent error/empty states */}
            {socialAgentsError && renderAgentError(socialAgentsError, "social")}
            {!socialAgentsError && !socialAgentsLoading && socialAgents?.length === 0 && renderEmptyAgents("social")}

            {/* Agent select */}
            {!socialAgentsError && (socialAgentsLoading || (socialAgents && socialAgents.length > 0)) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Agent *</Label>
                    <Select value={socialAgentId} onValueChange={(v) => { setSocialAgentId(v); setSocialPlatform(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder={socialAgentsLoading ? "Loading..." : "Select agent"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(socialAgents ?? []).map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Platform *</Label>
                    <Select value={socialPlatform} onValueChange={setSocialPlatform}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {(agentPlatforms as readonly string[]).map((p) => (
                          <SelectItem key={p} value={p}>
                            {platformLabel(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Social Account Picker */}
                {socialPlatform && (
                  <div className="space-y-1.5">
                    <Label>Account</Label>
                    {accountsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading accounts...
                      </div>
                    ) : accountsForPlatform.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-2.5 text-sm text-yellow-800">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>
                          No connected {platformLabel(socialPlatform)} accounts.{" "}
                          <a href="/social-connect" className="font-medium underline">
                            Connect one
                          </a>
                        </span>
                      </div>
                    ) : (
                      <Select value={socialAccountId} onValueChange={setSocialAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {accountsForPlatform.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              <span className="flex items-center gap-2">
                                {acc.profileImageUrl ? (
                                  <img src={acc.profileImageUrl} alt="" className="h-4 w-4 rounded-full" />
                                ) : (
                                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                                )}
                                {acc.displayName || acc.platformUsername || "Unnamed Account"}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Write / AI tabs */}
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="write" className="flex-1 gap-1.5">
                      <PenLine className="h-3.5 w-3.5" />
                      Write
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex-1 gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Generate
                    </TabsTrigger>
                  </TabsList>

                  {/* Write tab */}
                  <TabsContent value="write" className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label>Content *</Label>
                      <Textarea
                        placeholder="Write your post content..."
                        value={socialContent}
                        onChange={(e) => setSocialContent(e.target.value)}
                        rows={5}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hashtags</Label>
                      <Input
                        placeholder="#marketing #ai"
                        value={socialHashtags}
                        onChange={(e) => setSocialHashtags(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Image</Label>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="https://... or use Library"
                          value={socialImageUrl}
                          onChange={(e) => setSocialImageUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() => setLibraryOpen(true)}
                          title="Browse Library"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        {socialImageUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => setSocialImageUrl("")}
                            title="Clear image"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {socialImageUrl && (
                        <ImagePreview src={socialImageUrl} />
                      )}
                    </div>
                  </TabsContent>

                  {/* AI tab */}
                  <TabsContent value="ai" className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label>Prompt (optional)</Label>
                      <Textarea
                        placeholder="Describe what the post should be about..."
                        value={socialAiPrompt}
                        onChange={(e) => setSocialAiPrompt(e.target.value)}
                        rows={4}
                      />
                      <p className="text-muted-foreground text-xs">
                        Leave empty to let the AI use the agent's default settings.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateSocial}
                      disabled={!socialAgentId || generating}
                      className="w-full"
                    >
                      {generating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {generating ? "Generating..." : "Generate Post"}
                    </Button>
                  </TabsContent>
                </Tabs>

                {/* Action buttons (Write tab only) */}
                {tab === "write" && (
                  <div className="flex items-center gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      onClick={handleSaveSocialDraft}
                      disabled={anyLoading || !isWriteFormValid()}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Draft
                    </Button>

                    {!showSchedulePicker ? (
                      <Button
                        variant="outline"
                        onClick={() => setShowSchedulePicker(true)}
                        disabled={anyLoading || !isWriteFormValid()}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Schedule
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="datetime-local"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-auto"
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        <Button
                          onClick={handleSchedulePost}
                          disabled={anyLoading || !scheduleDate}
                          size="sm"
                        >
                          {scheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setShowSchedulePicker(false); setScheduleDate(""); }}
                          disabled={anyLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    <Button
                      onClick={handlePublishNow}
                      disabled={anyLoading || !isWriteFormValid()}
                    >
                      {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Publish Now
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ============== SEO Article Form ============== */}
        {postType === "seo" && (
          <div className="space-y-4">
            {/* Agent error/empty states */}
            {seoAgentsError && renderAgentError(seoAgentsError, "seo")}
            {!seoAgentsError && !seoAgentsLoading && seoAgents?.length === 0 && renderEmptyAgents("seo")}

            {/* Agent select */}
            {!seoAgentsError && (seoAgentsLoading || (seoAgents && seoAgents.length > 0)) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Agent *</Label>
                    <Select value={seoAgentId} onValueChange={setSeoAgentId}>
                      <SelectTrigger>
                        <SelectValue placeholder={seoAgentsLoading ? "Loading..." : "Select agent"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(seoAgents ?? []).map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Content Type</Label>
                    <Select value={seoContentType} onValueChange={setSeoContentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((ct) => (
                          <SelectItem key={ct.value} value={ct.value}>
                            {ct.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Write / AI tabs */}
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="write" className="flex-1 gap-1.5">
                      <PenLine className="h-3.5 w-3.5" />
                      Write
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex-1 gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Generate
                    </TabsTrigger>
                  </TabsList>

                  {/* Write tab */}
                  <TabsContent value="write" className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label>Title *</Label>
                      <Input
                        placeholder="Article title"
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Slug</Label>
                        <Input
                          placeholder="article-slug"
                          value={seoSlug}
                          onChange={(e) => setSeoSlug(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Primary Keyword</Label>
                        <Input
                          placeholder="main keyword"
                          value={seoPrimaryKeyword}
                          onChange={(e) => setSeoPrimaryKeyword(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Meta Description</Label>
                      <Input
                        placeholder="Brief description for search engines..."
                        value={seoMeta}
                        onChange={(e) => setSeoMeta(e.target.value)}
                        maxLength={160}
                      />
                      <p className="text-muted-foreground text-xs text-right">
                        {seoMeta.length}/160
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Content *</Label>
                      <Textarea
                        placeholder="Write your article content..."
                        value={seoContent}
                        onChange={(e) => setSeoContent(e.target.value)}
                        rows={8}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Featured Image</Label>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="https://... or use Library"
                          value={seoImageUrl}
                          onChange={(e) => setSeoImageUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() => setLibraryOpen(true)}
                          title="Browse Library"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        {seoImageUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => setSeoImageUrl("")}
                            title="Clear image"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {seoImageUrl && (
                        <ImagePreview src={seoImageUrl} />
                      )}
                    </div>

                    {/* Live SEO/AEO scores */}
                    {(seoTitle || seoContent) && (
                      <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">SEO Score</span>
                            <Badge variant={scoreBadgeVariant(seoScore)}>
                              {seoScore}/100
                            </Badge>
                          </div>
                          <Progress value={seoScore} className={scoreProgressColor(seoScore)} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">AEO Score</span>
                            <Badge variant={scoreBadgeVariant(aeoScore)}>
                              {aeoScore}/100
                            </Badge>
                          </div>
                          <Progress value={aeoScore} className={scoreProgressColor(aeoScore)} />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* AI tab */}
                  <TabsContent value="ai" className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label>Target Keyword</Label>
                      <Input
                        placeholder="e.g. marketing automation"
                        value={seoAiKeyword}
                        onChange={(e) => setSeoAiKeyword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Custom Prompt (optional)</Label>
                      <Textarea
                        placeholder="Additional instructions for the AI..."
                        value={seoAiPrompt}
                        onChange={(e) => setSeoAiPrompt(e.target.value)}
                        rows={3}
                      />
                      <p className="text-muted-foreground text-xs">
                        Leave empty to let the AI use the agent's default settings.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateSeo}
                      disabled={!seoAgentId || generating}
                      className="w-full"
                    >
                      {generating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {generating ? "Generating..." : "Generate Article"}
                    </Button>
                  </TabsContent>
                </Tabs>

                {/* Action buttons (Write tab only) */}
                {tab === "write" && (
                  <div className="flex items-center gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      onClick={handleSaveSeoDraft}
                      disabled={anyLoading || !isWriteFormValid()}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Draft
                    </Button>

                    {!showSchedulePicker ? (
                      <Button
                        variant="outline"
                        onClick={() => setShowSchedulePicker(true)}
                        disabled={anyLoading || !isWriteFormValid()}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Schedule
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="datetime-local"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-auto"
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        <Button
                          onClick={handleSchedulePost}
                          disabled={anyLoading || !scheduleDate}
                          size="sm"
                        >
                          {scheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setShowSchedulePicker(false); setScheduleDate(""); }}
                          disabled={anyLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    <Button
                      onClick={handlePublishNow}
                      disabled={anyLoading || !isWriteFormValid()}
                    >
                      {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Publish Now
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {/* Shared file library dialog */}
        <ContentManagerDialog
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          mode="url"
          acceptTypes={["image"]}
          onFileSelected={(url) => {
            if (postType === "social") setSocialImageUrl(url);
            else if (postType === "seo") setSeoImageUrl(url);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// ImagePreview — manages its own load/error state so React stays in control
// ---------------------------------------------------------------------------

function ImagePreview({ src }: { src: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  // Reset status whenever src changes
  useEffect(() => {
    setStatus("loading");
  }, [src]);

  return (
    <div className="mt-1.5">
      {status !== "error" && (
        <img
          key={src}
          src={src}
          alt="Preview"
          className={`h-20 w-20 rounded-md border object-cover ${status === "loading" ? "animate-pulse bg-muted" : ""}`}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}
      {status === "error" && (
        <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">
          Preview unavailable
        </div>
      )}
    </div>
  );
}
