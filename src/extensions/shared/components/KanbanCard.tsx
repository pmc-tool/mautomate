import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, User, BarChart3 } from "lucide-react";
import { Badge } from "../../../client/components/ui/badge";

export interface UnifiedPost {
  id: string;
  postType: "social" | "seo";
  title: string;
  content: string;
  status: string;
  platform: string | null;
  agentId: string;
  agentName: string;
  seoScore: number | null;
  aeoScore: number | null;
  socialAccountId?: string | null;
  socialAccountName?: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KanbanCardProps {
  post: UnifiedPost;
  onViewDetail: (post: UnifiedPost) => void;
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 bg-emerald-500/15";
  if (score >= 60) return "text-yellow-600 bg-yellow-500/15";
  return "text-red-600 bg-red-500/15";
}

export function KanbanCard({ post, onViewDetail }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
      onClick={(e) => {
        // Only fire on click, not on drag
        if (!isDragging) {
          onViewDetail(post);
        }
      }}
    >
      {/* Type and platform badges */}
      <div className="mb-2 flex items-center gap-2">
        <Badge
          variant={post.postType === "seo" ? "info" : "success"}
          className="text-[10px] uppercase"
        >
          {post.postType}
        </Badge>
        {post.platform && (
          <Badge variant="outline" className="text-[10px]">
            {post.platform}
          </Badge>
        )}
      </div>

      {/* Title / content preview */}
      <p className="mb-2 text-sm font-medium leading-snug">
        {truncate(post.title || post.content, 80)}
      </p>

      {/* Agent name */}
      <div className="text-muted-foreground mb-2 flex items-center gap-1 text-xs">
        <User className="h-3 w-3" />
        <span>{post.agentName}</span>
      </div>

      {/* Bottom row: SEO score and/or scheduled date */}
      <div className="flex items-center justify-between gap-2">
        {post.postType === "seo" && post.seoScore != null && (
          <div
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getScoreColor(post.seoScore)}`}
          >
            <BarChart3 className="h-3 w-3" />
            SEO {post.seoScore}
          </div>
        )}
        {post.scheduledAt && (
          <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
            <Calendar className="h-3 w-3" />
            {formatDate(post.scheduledAt)}
          </div>
        )}
      </div>
    </div>
  );
}
