import { useState, useCallback, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getAllPosts,
  approvePost,
  rejectPost,
  reworkPost,
  schedulePost,
  movePost,
  getPostRevisions,
  restoreRevision,
  publishPostNow,
  getSocialMediaPost,
  getSeoPost,
} from "wasp/client/operations";
import {
  Columns3,
  List,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Share2,
  FileText,
} from "lucide-react";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { Button } from "../../client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../client/components/ui/dropdown-menu";
import { toast } from "../../client/hooks/use-toast";
import { CreatePostDialog } from "./components/CreatePostDialog";
import { FilterBar } from "./components/FilterBar";
import { KanbanBoard } from "./components/KanbanBoard";
import { PostListView } from "./components/PostListView";
import { PostDetailDialog } from "./components/PostDetailDialog";
import type { UnifiedPost } from "./components/KanbanCard";
import type { PostRevision } from "./components/RevisionHistory";

const PAGE_SIZE = 50;

export default function PostHubPage({ user }: { user: AuthUser }) {
  // View toggle
  const [view, setView] = useState<"kanban" | "list">("kanban");

  // Filters
  const [postType, setPostType] = useState("all");
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Detail dialog state
  const [selectedPost, setSelectedPost] = useState<UnifiedPost | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [revisions, setRevisions] = useState<PostRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [postMedia, setPostMedia] = useState<any[]>([]);

  // Action loading
  const [actionLoading, setActionLoading] = useState(false);

  // Create post dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createPostType, setCreatePostType] = useState<"social" | "seo" | null>(null);

  // Sort state (for list view)
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "title" | "status">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Build query args — backend only supports date-based sort fields
  const serverSortBy = (sortBy === "title" || sortBy === "status") ? "createdAt" : sortBy;
  const queryArgs = {
    postType: (postType !== "all" ? postType : undefined) as "social" | "seo" | undefined,
    status: status !== "all" ? status : undefined,
    platform: platform !== "all" ? platform : undefined,
    search: search.trim() || undefined,
    sortBy: serverSortBy,
    sortOrder,
    page,
    limit: PAGE_SIZE,
  };

  const {
    data: postsData,
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useQuery(getAllPosts, queryArgs);

  const posts: UnifiedPost[] = postsData?.posts ?? [];
  const total: number = postsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Fetch revisions when a post is selected
  const fetchRevisions = useCallback(async (post: UnifiedPost) => {
    setRevisionsLoading(true);
    try {
      const result = await getPostRevisions({
        postType: post.postType,
        postId: post.id,
      });
      setRevisions(result ?? []);
    } catch (err) {
      console.error("Failed to fetch revisions:", err);
      setRevisions([]);
    } finally {
      setRevisionsLoading(false);
    }
  }, []);

  // Fetch full post detail (including media)
  const fetchPostDetail = useCallback(async (post: UnifiedPost) => {
    try {
      const detail =
        post.postType === "social"
          ? await getSocialMediaPost({ id: post.id })
          : await getSeoPost({ id: post.id });
      setPostMedia(detail?.media ?? []);
    } catch (err) {
      console.error("Failed to fetch post detail:", err);
      setPostMedia([]);
    }
  }, []);

  // Open detail dialog
  function handleViewDetail(post: UnifiedPost) {
    setSelectedPost(post);
    setDetailOpen(true);
    setPostMedia([]);
    fetchRevisions(post);
    fetchPostDetail(post);
  }

  // Refresh post detail + list (called after edit/media changes)
  async function handlePostUpdated() {
    await refetchPosts();
    if (selectedPost) {
      fetchPostDetail(selectedPost);
      fetchRevisions(selectedPost);
    }
  }

  // Clear filters
  function handleClearFilters() {
    setPostType("all");
    setStatus("all");
    setPlatform("all");
    setSearch("");
    setPage(1);
  }

  // Sort change handler
  function handleSortChange(field: string) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field as "createdAt" | "updatedAt" | "title" | "status");
      setSortOrder("desc");
    }
    setPage(1);
  }

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [postType, status, platform, search]);

  // --- Action handlers ---

  async function handleApprove() {
    if (!selectedPost) return;
    setActionLoading(true);
    try {
      await approvePost({
        postType: selectedPost.postType,
        postId: selectedPost.id,
      });
      await refetchPosts();
      // Update selected post status locally
      setSelectedPost((prev) =>
        prev ? { ...prev, status: "approved" } : null
      );
      await fetchRevisions(selectedPost);
      toast({ title: "Approved", description: "Post has been approved." });
    } catch (err: any) {
      console.error("Failed to approve post:", err);
      toast({ title: "Error", description: err?.message ?? "Failed to approve post.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(notes?: string) {
    if (!selectedPost) return;
    setActionLoading(true);
    try {
      await rejectPost({
        postType: selectedPost.postType,
        postId: selectedPost.id,
        notes,
      });
      await refetchPosts();
      setSelectedPost((prev) =>
        prev ? { ...prev, status: "draft" } : null
      );
      await fetchRevisions(selectedPost);
      toast({ title: "Rejected", description: "Post moved back to draft." });
    } catch (err: any) {
      console.error("Failed to reject post:", err);
      toast({ title: "Error", description: err?.message ?? "Failed to reject post.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSchedule(scheduledAt: string) {
    if (!selectedPost) return;
    setActionLoading(true);
    try {
      await schedulePost({
        postType: selectedPost.postType,
        postId: selectedPost.id,
        scheduledAt,
      });
      await refetchPosts();
      setSelectedPost((prev) =>
        prev ? { ...prev, status: "scheduled", scheduledAt } : null
      );
      await fetchRevisions(selectedPost);
      toast({ title: "Scheduled", description: "Post has been scheduled." });
    } catch (err: any) {
      console.error("Failed to schedule post:", err);
      toast({ title: "Error", description: err?.message ?? "Failed to schedule post.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRework(prompt?: string) {
    if (!selectedPost) return;
    setActionLoading(true);
    try {
      await reworkPost({
        postType: selectedPost.postType,
        postId: selectedPost.id,
        customPrompt: prompt,
      });
      await refetchPosts();
      setSelectedPost((prev) =>
        prev ? { ...prev, status: "draft" } : null
      );
      await fetchRevisions(selectedPost);
      toast({ title: "Reworked", description: "Post has been reworked by AI." });
    } catch (err: any) {
      console.error("Failed to rework post:", err);
      toast({ title: "Error", description: err?.message ?? "Failed to rework post.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMovePost(
    postId: string,
    postType: string,
    targetStatus: string
  ) {
    try {
      await movePost({
        postId,
        postType: postType as "social" | "seo",
        targetStatus: targetStatus as "draft" | "approved" | "scheduled" | "published",
      });
      await refetchPosts();
    } catch (err: any) {
      console.error("Failed to move post:", err);
      toast({ title: "Error", description: err?.message ?? "Failed to move post.", variant: "destructive" });
    }
  }

  async function handleRestore(revisionId: string) {
    if (!selectedPost) return;
    setActionLoading(true);
    try {
      await restoreRevision({
        revisionId,
      });
      await refetchPosts();
      await fetchRevisions(selectedPost);
      toast({ title: "Restored", description: "Revision has been restored." });
    } catch (err: any) {
      console.error("Failed to restore revision:", err);
      toast({ title: "Error", description: err?.message ?? "Failed to restore revision.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePublishNow() {
    if (!selectedPost) return;
    setActionLoading(true);
    try {
      await publishPostNow({
        postType: selectedPost.postType,
        postId: selectedPost.id,
      });
      await refetchPosts();
      setSelectedPost((prev) =>
        prev ? { ...prev, status: "published" } : null
      );
      await fetchRevisions(selectedPost);
      toast({ title: "Published", description: "Post has been published." });
    } catch (err: any) {
      console.error("Failed to publish post:", err);
      toast({ title: "Error", description: err?.message ?? "Failed to publish post.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Columns3 className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">Post Hub</h1>
              <p className="text-muted-foreground text-sm">
                Manage and review all AI-generated content across your agents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
          {/* New Post dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setCreatePostType("social");
                  setCreateDialogOpen(true);
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Social Media Post
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCreatePostType("seo");
                  setCreateDialogOpen(true);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                SEO Article
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border bg-muted p-1">
            <button
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "kanban"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setView("kanban")}
            >
              <Columns3 className="h-4 w-4" />
              Kanban
            </button>
            <button
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>
          </div>
        </div>

        {/* Filter bar */}
        <FilterBar
          postType={postType}
          onPostTypeChange={setPostType}
          status={status}
          onStatusChange={setStatus}
          platform={platform}
          onPlatformChange={setPlatform}
          search={search}
          onSearchChange={setSearch}
          onClearFilters={handleClearFilters}
        />

        {/* Main content */}
        {postsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {view === "kanban" ? (
              <KanbanBoard
                posts={posts}
                onMovePost={handleMovePost}
                onViewDetail={handleViewDetail}
              />
            ) : (
              <PostListView
                posts={posts}
                onViewDetail={handleViewDetail}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-muted-foreground text-sm">
                  Showing {(page - 1) * PAGE_SIZE + 1}
                  {" - "}
                  {Math.min(page * PAGE_SIZE, total)} of {total} posts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Post detail dialog */}
        <PostDetailDialog
          post={selectedPost}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          revisions={revisions}
          onApprove={handleApprove}
          onReject={handleReject}
          onSchedule={handleSchedule}
          onRework={handleRework}
          onRestore={handleRestore}
          onPublishNow={handlePublishNow}
          onPostUpdated={handlePostUpdated}
          loading={actionLoading}
          media={postMedia}
        />

        {/* Create post dialog */}
        <CreatePostDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          defaultPostType={createPostType}
          onPostCreated={() => refetchPosts()}
        />
      </div>
    </UserDashboardLayout>
  );
}
