import { type AuthUser } from "wasp/auth";
import { useState, useRef, useCallback } from "react";
import { useQuery } from "wasp/client/operations";
import {
  getAllPosts,
  reschedulePost,
  approvePost,
  rejectPost,
  schedulePost,
  reworkPost,
  getPostRevisions,
  restoreRevision,
  publishPostNow,
  getSocialMediaPost,
  getSeoPost,
} from "wasp/client/operations";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Calendar as CalendarIcon, Columns3, Loader2 } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { toast } from "../../client/hooks/use-toast";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { PostDetailDialog } from "./components/PostDetailDialog";
import type { UnifiedPost } from "./components/KanbanCard";
import type { PostRevision } from "./components/RevisionHistory";

export default function ContentCalendarPage({ user }: { user: AuthUser }) {
  // --- State ---
  const [selectedPost, setSelectedPost] = useState<UnifiedPost | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revisions, setRevisions] = useState<PostRevision[]>([]);
  const [postMedia, setPostMedia] = useState<any[]>([]);
  const [calendarView, setCalendarView] = useState<
    "dayGridMonth" | "timeGridWeek"
  >("dayGridMonth");

  const calendarRef = useRef<FullCalendar>(null);

  // --- Data ---
  const {
    data: postsData,
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useQuery(getAllPosts, {
    sortBy: "scheduledAt",
    sortOrder: "asc",
    limit: 200,
  });

  // Transform posts into FullCalendar events
  const events = (postsData?.posts || [])
    .filter(
      (p: UnifiedPost) => p.scheduledAt || p.publishedAt
    )
    .map((p: UnifiedPost) => ({
      id: p.id,
      title: p.title || "Untitled Post",
      start: p.scheduledAt || p.publishedAt,
      backgroundColor: p.postType === "seo" ? "#3b82f6" : "#22c55e",
      borderColor: p.postType === "seo" ? "#2563eb" : "#16a34a",
      textColor: "#ffffff",
      extendedProps: { post: p },
    }));

  // --- Revision fetching ---
  const fetchRevisions = useCallback(async (post: UnifiedPost) => {
    try {
      const result = await getPostRevisions({
        postType: post.postType,
        postId: post.id,
      });
      setRevisions(result ?? []);
    } catch (err) {
      console.error("Failed to fetch revisions:", err);
      setRevisions([]);
    }
  }, []);

  // --- Post detail (media) fetching ---
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

  async function handlePostUpdated() {
    await refetchPosts();
    if (selectedPost) {
      fetchPostDetail(selectedPost);
      fetchRevisions(selectedPost);
    }
  }

  // --- Event handlers ---
  function handleEventClick(info: any) {
    const post = info.event.extendedProps.post as UnifiedPost;
    setSelectedPost(post);
    setDetailOpen(true);
    setPostMedia([]);
    fetchRevisions(post);
    fetchPostDetail(post);
  }

  async function handleEventDrop(info: any) {
    const post = info.event.extendedProps.post as UnifiedPost;
    const newDate = info.event.start;

    if (!newDate) {
      info.revert();
      return;
    }

    try {
      await reschedulePost({
        postType: post.postType,
        postId: post.id,
        scheduledAt: newDate.toISOString(),
      });
      toast({
        title: "Post rescheduled",
        description: `"${post.title || "Untitled Post"}" moved to ${newDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      });
      await refetchPosts();
    } catch (err) {
      console.error("Failed to reschedule post:", err);
      info.revert();
      toast({
        title: "Reschedule failed",
        description: "Could not reschedule this post. Please try again.",
        variant: "destructive",
      });
    }
  }

  // --- View toggle ---
  function handleViewChange(view: "dayGridMonth" | "timeGridWeek") {
    setCalendarView(view);
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
    }
  }

  // --- Approval action handlers ---
  async function handleApprove() {
    if (!selectedPost) return;
    setLoading(true);
    try {
      await approvePost({
        postType: selectedPost.postType,
        postId: selectedPost.id,
      });
      await refetchPosts();
      setSelectedPost((prev) =>
        prev ? { ...prev, status: "approved" } : null
      );
      await fetchRevisions(selectedPost);
      toast({ title: "Post approved" });
    } catch (err) {
      console.error("Failed to approve post:", err);
      toast({
        title: "Approval failed",
        description: "Could not approve this post.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleReject(notes?: string) {
    if (!selectedPost) return;
    setLoading(true);
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
      toast({ title: "Post rejected" });
    } catch (err) {
      console.error("Failed to reject post:", err);
      toast({
        title: "Rejection failed",
        description: "Could not reject this post.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSchedule(scheduledAt: string) {
    if (!selectedPost) return;
    setLoading(true);
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
      toast({ title: "Post scheduled" });
    } catch (err) {
      console.error("Failed to schedule post:", err);
      toast({
        title: "Scheduling failed",
        description: "Could not schedule this post.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRework(prompt?: string) {
    if (!selectedPost) return;
    setLoading(true);
    try {
      const updated = await reworkPost({
        postType: selectedPost.postType,
        postId: selectedPost.id,
        customPrompt: prompt,
      });
      await refetchPosts();
      setSelectedPost((prev) =>
        prev ? { ...prev, ...updated, status: "draft" } : null
      );
      await fetchRevisions(selectedPost);
      toast({ title: "Post sent for rework" });
    } catch (err) {
      console.error("Failed to rework post:", err);
      toast({
        title: "Rework failed",
        description: "Could not send this post for rework.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(revisionId: string) {
    if (!selectedPost) return;
    setLoading(true);
    try {
      await restoreRevision({
        revisionId,
      });
      await refetchPosts();
      await fetchRevisions(selectedPost);
      toast({ title: "Revision restored" });
    } catch (err) {
      console.error("Failed to restore revision:", err);
      toast({
        title: "Restore failed",
        description: "Could not restore this revision.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePublishNow() {
    if (!selectedPost) return;
    setLoading(true);
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
      setLoading(false);
    }
  }

  // --- Render ---
  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">Content Calendar</h1>
              <p className="text-muted-foreground text-sm">
                Visualize and reschedule your content pipeline. Drag posts to
                change their scheduled dates.
              </p>
            </div>
          </div>

          {/* View toggle + Legend */}
          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">SEO</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Social</span>
              </div>
            </div>

            {/* View toggle buttons */}
            <div className="flex items-center rounded-lg border bg-muted p-1">
              <button
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  calendarView === "dayGridMonth"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleViewChange("dayGridMonth")}
              >
                <Columns3 className="h-4 w-4" />
                Month
              </button>
              <button
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  calendarView === "timeGridWeek"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleViewChange("timeGridWeek")}
              >
                <CalendarIcon className="h-4 w-4" />
                Week
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        {postsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="fc-custom rounded-lg border bg-card p-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={calendarView}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek",
              }}
              events={events}
              editable={true}
              droppable={true}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              height="auto"
              eventDisplay="block"
              dayMaxEvents={4}
              nowIndicator={true}
              eventClassNames="cursor-pointer rounded-md text-xs font-medium px-1.5 py-0.5"
            />
          </div>
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
          loading={loading}
          media={postMedia}
        />
      </div>

      {/* FullCalendar custom styles */}
      <style>{`
        .fc-custom .fc {
          --fc-border-color: hsl(var(--border));
          --fc-button-bg-color: hsl(var(--muted));
          --fc-button-border-color: hsl(var(--border));
          --fc-button-text-color: hsl(var(--foreground));
          --fc-button-hover-bg-color: hsl(var(--accent));
          --fc-button-hover-border-color: hsl(var(--border));
          --fc-button-active-bg-color: hsl(var(--primary));
          --fc-button-active-border-color: hsl(var(--primary));
          --fc-button-active-text-color: hsl(var(--primary-foreground));
          --fc-today-bg-color: hsl(var(--accent) / 0.3);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: hsl(var(--muted) / 0.5);
          --fc-event-border-color: transparent;
          font-family: inherit;
        }

        .fc-custom .fc .fc-toolbar-title {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .fc-custom .fc .fc-button {
          font-size: 0.8125rem;
          font-weight: 500;
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          box-shadow: none;
          text-transform: capitalize;
        }

        .fc-custom .fc .fc-button:focus {
          box-shadow: 0 0 0 2px hsl(var(--ring));
        }

        .fc-custom .fc .fc-daygrid-day-number,
        .fc-custom .fc .fc-col-header-cell-cushion {
          color: hsl(var(--foreground));
          font-size: 0.8125rem;
          font-weight: 500;
          text-decoration: none;
        }

        .fc-custom .fc .fc-daygrid-day-number {
          padding: 0.5rem;
        }

        .fc-custom .fc .fc-daygrid-day.fc-day-today {
          background-color: hsl(var(--accent) / 0.15);
        }

        .fc-custom .fc .fc-event {
          border-radius: 0.375rem;
          padding: 0.125rem 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          border: none;
          line-height: 1.4;
        }

        .fc-custom .fc .fc-event:hover {
          filter: brightness(0.9);
        }

        .fc-custom .fc .fc-daygrid-more-link {
          color: hsl(var(--primary));
          font-size: 0.75rem;
          font-weight: 600;
        }

        .fc-custom .fc .fc-scrollgrid {
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .fc-custom .fc th {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          color: hsl(var(--muted-foreground));
        }

        .fc-custom .fc .fc-timegrid-slot-label {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }

        .fc-custom .fc .fc-timegrid-now-indicator-line {
          border-color: hsl(var(--primary));
        }

        .fc-custom .fc .fc-timegrid-now-indicator-arrow {
          border-color: hsl(var(--primary));
        }
      `}</style>
    </UserDashboardLayout>
  );
}
