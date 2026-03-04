import {
  Eye,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  BarChart3,
  Calendar,
} from "lucide-react";
import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import type { UnifiedPost } from "./KanbanCard";

interface PostListViewProps {
  posts: UnifiedPost[];
  onViewDetail: (post: UnifiedPost) => void;
  sortBy: string;
  sortOrder: string;
  onSortChange: (field: string) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

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
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

interface SortHeaderProps {
  label: string;
  field: string;
  sortBy: string;
  sortOrder: string;
  onSortChange: (field: string) => void;
}

function SortHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSortChange,
}: SortHeaderProps) {
  const isActive = sortBy === field;

  return (
    <button
      className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider hover:text-foreground"
      onClick={() => onSortChange(field)}
    >
      {label}
      {isActive ? (
        sortOrder === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

export function PostListView({
  posts,
  onViewDetail,
  sortBy,
  sortOrder,
  onSortChange,
}: PostListViewProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-muted-foreground text-sm">No posts found</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Adjust your filters or create new posts via your agents.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b bg-muted/50">
            <th className="px-4 py-3 text-left">
              <SortHeader
                label="Type"
                field="postType"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader
                label="Title"
                field="title"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader
                label="Platform"
                field="platform"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader
                label="Agent"
                field="agentName"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader
                label="Status"
                field="status"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader
                label="SEO"
                field="seoScore"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader
                label="Scheduled"
                field="scheduledAt"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader
                label="Created"
                field="createdAt"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
            </th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {posts.map((post) => (
            <tr
              key={post.id}
              className="hover:bg-muted/30 transition-colors"
            >
              {/* Type */}
              <td className="px-4 py-3">
                <Badge
                  variant={post.postType === "seo" ? "info" : "success"}
                  className="text-[10px] uppercase"
                >
                  {post.postType}
                </Badge>
              </td>

              {/* Title */}
              <td className="max-w-[250px] px-4 py-3 font-medium">
                {truncate(post.title || post.content, 60)}
              </td>

              {/* Platform */}
              <td className="px-4 py-3">
                {post.platform ? (
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {post.platform}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </td>

              {/* Agent */}
              <td className="text-muted-foreground px-4 py-3 text-xs">
                {post.agentName}
              </td>

              {/* Status */}
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLES[post.status] || STATUS_STYLES.draft}`}
                >
                  {post.status}
                </span>
              </td>

              {/* SEO Score */}
              <td className="px-4 py-3">
                {post.postType === "seo" && post.seoScore != null ? (
                  <div
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${getScoreColor(post.seoScore)}`}
                  >
                    <BarChart3 className="h-3 w-3" />
                    {post.seoScore}
                  </div>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </td>

              {/* Scheduled */}
              <td className="px-4 py-3">
                {post.scheduledAt ? (
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    {formatDateTime(post.scheduledAt)}
                  </div>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </td>

              {/* Created */}
              <td className="text-muted-foreground px-4 py-3 text-xs">
                {formatDate(post.createdAt)}
              </td>

              {/* Actions */}
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewDetail(post)}
                  title="View details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
