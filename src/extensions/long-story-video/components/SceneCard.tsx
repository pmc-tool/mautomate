import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import { RefreshCw, AlertTriangle, Clock, Eye, MessageSquare } from "lucide-react";

interface Scene {
  id: string;
  sceneIndex: number;
  visualPrompt: string;
  narrationText: string;
  duration: number;
  status: string;
  progress: number;
  videoUrl: string | null;
  errorMessage: string | null;
}

interface SceneCardProps {
  scene: Scene;
  onRegenerate: (sceneId: string) => void;
  projectStatus: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot?: string }> = {
  completed: {
    label: "Done",
    color: "text-emerald-600 dark:text-green-400",
    bg: "bg-emerald-100 dark:bg-green-500/20 border-emerald-200 dark:border-green-500/30",
    dot: "bg-emerald-500",
  },
  generating: {
    label: "Generating",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30",
    dot: "bg-blue-500 animate-pulse",
  },
  failed: {
    label: "Failed",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-500/20 border-red-200 dark:border-red-500/30",
    dot: "bg-red-500",
  },
  pending: {
    label: "Pending",
    color: "text-muted-foreground",
    bg: "bg-muted border-border",
  },
};

export function SceneCard({ scene, onRegenerate, projectStatus }: SceneCardProps) {
  const isGenerating = scene.status === "generating";
  const isFailed = scene.status === "failed";
  const isCompleted = scene.status === "completed";
  const status = STATUS_CONFIG[scene.status] || STATUS_CONFIG.pending;

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {/* Scene number + status */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
            {scene.sceneIndex + 1}
          </div>
          <Badge
            variant="outline"
            className={`${status.bg} ${status.color} border text-[11px]`}
          >
            {status.dot && (
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.dot}`} />
            )}
            {status.label}
          </Badge>
        </div>

        {/* Duration badge */}
        <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {scene.duration}s
        </div>
      </div>

      {/* Content preview */}
      <div className="mt-3 space-y-2.5">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Eye className="h-3 w-3" />
            Visual
          </div>
          <p className="line-clamp-2 text-sm text-foreground/80">{scene.visualPrompt}</p>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            Narration
          </div>
          <p className="line-clamp-2 text-sm text-foreground/80">{scene.narrationText}</p>
        </div>
      </div>

      {/* Progress bar for generating scenes */}
      {isGenerating && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${scene.progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">{scene.progress}% complete</p>
        </div>
      )}

      {/* Video preview for completed scenes */}
      {isCompleted && scene.videoUrl && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          <video
            src={scene.videoUrl}
            className="h-auto w-full"
            controls
            preload="metadata"
          />
        </div>
      )}

      {/* Error + retry for failed scenes */}
      {isFailed && (
        <div className="mt-3 space-y-2">
          {scene.errorMessage && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{scene.errorMessage}</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRegenerate(scene.id)}
            className="border-red-300 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry (30 credits)
          </Button>
        </div>
      )}
    </div>
  );
}
