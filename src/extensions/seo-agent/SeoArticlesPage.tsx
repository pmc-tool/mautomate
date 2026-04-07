import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getSeoPosts, getSeoAgents } from "wasp/client/operations";
import { useState } from "react";
import { FileText, Loader2, Clock, Search, Filter, Eye } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import { Input } from "../../client/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../client/components/ui/select";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import SerpPreview from "./components/SerpPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../client/components/ui/dialog";

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

function statusIconBg(status: string) {
  switch (status) {
    case "published": return "bg-emerald-100 dark:bg-emerald-900/30";
    case "approved": return "bg-blue-100 dark:bg-blue-900/30";
    case "scheduled": return "bg-amber-100 dark:bg-amber-900/30";
    case "failed": return "bg-red-100 dark:bg-red-900/30";
    default: return "bg-gray-100 dark:bg-gray-800";
  }
}

function statusIconColor(status: string) {
  switch (status) {
    case "published": return "text-emerald-600 dark:text-emerald-400";
    case "approved": return "text-blue-600 dark:text-blue-400";
    case "scheduled": return "text-amber-600 dark:text-amber-400";
    case "failed": return "text-red-600 dark:text-red-400";
    default: return "text-gray-500 dark:text-gray-400";
  }
}

export default function SeoArticlesPage({ user }: { user: AuthUser }) {
  const [agentFilter, setAgentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingPost, setViewingPost] = useState<any>(null);

  const { data: posts, isLoading: loadingPosts } = useQuery(getSeoPosts, {});
  const { data: agents, isLoading: loadingAgents } = useQuery(getSeoAgents);

  const filteredPosts = (posts ?? []).filter((post: any) => {
    if (agentFilter !== "all" && post.agent?.id !== agentFilter) return false;
    if (statusFilter !== "all" && post.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!post.title?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const isLoading = loadingPosts || loadingAgents;

  return (
    <UserDashboardLayout user={user}>
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">All SEO Articles</h1>
              <p className="text-sm text-muted-foreground">
                View and manage all your SEO content across all projects.
              </p>
            </div>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {(agents ?? []).map((agent: any) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No SEO articles found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery || agentFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "Generate your first article from an SEO project."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPosts.map((post: any) => (
              <div
                key={post.id}
                className="group flex items-center gap-4 rounded-xl border bg-background p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => setViewingPost(post)}
              >
                {/* Status icon */}
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${statusIconBg(post.status)}`}>
                  <FileText className={`h-4 w-4 ${statusIconColor(post.status)}`} />
                </div>

                {/* Title + meta */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {post.title?.length > 80 ? post.title.slice(0, 80) + "..." : post.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {post.agent?.name && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                        {post.agent.name}
                      </Badge>
                    )}
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

                {/* View button */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    title="View post"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingPost(post);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post viewer dialog */}
      <Dialog open={!!viewingPost} onOpenChange={(open) => !open && setViewingPost(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg leading-tight pr-8">{viewingPost?.title ?? "Post"}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-1">
                {viewingPost?.agent?.name && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                    {viewingPost.agent.name}
                  </Badge>
                )}
                {viewingPost?.status && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${POST_STATUS_COLORS[viewingPost.status] ?? "bg-muted text-muted-foreground"}`}>
                    {viewingPost.status}
                  </span>
                )}
                {viewingPost?.contentType && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CONTENT_TYPE_COLORS[viewingPost.contentType] ?? "bg-muted text-muted-foreground"}`}>
                    {formatContentType(viewingPost.contentType)}
                  </span>
                )}
                {viewingPost?.seoScore != null && (
                  <span className="text-[10px] text-muted-foreground">SEO: {viewingPost.seoScore}/100</span>
                )}
                {viewingPost?.aeoScore != null && (
                  <span className="text-[10px] text-muted-foreground">AEO: {viewingPost.aeoScore}/100</span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* SERP Preview */}
            {viewingPost?.title && (
              <SerpPreview
                title={viewingPost.title}
                description={viewingPost.metaDescription ?? ""}
              />
            )}
            {/* Meta description */}
            {viewingPost?.metaDescription && (
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Meta Description</p>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{viewingPost.metaDescription}</p>
              </div>
            )}
            {/* Primary keyword */}
            {viewingPost?.primaryKeyword && (
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Primary Keyword</p>
                <Badge variant="secondary">{viewingPost.primaryKeyword}</Badge>
              </div>
            )}
            {/* Content */}
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Content</p>
              <div
                className="prose prose-sm dark:prose-invert max-w-none rounded-lg border p-4 max-h-[400px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: viewingPost?.content ?? "<p>No content</p>" }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </UserDashboardLayout>
  );
}
