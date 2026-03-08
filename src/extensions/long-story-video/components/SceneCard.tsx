import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import { RefreshCw, Play, AlertTriangle, Clock, Film } from "lucide-react";

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

function statusBadgeVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "generating":
      return "secondary" as const;
    case "failed":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-600 text-white hover:bg-green-600";
    case "generating":
      return "bg-blue-600 text-white hover:bg-blue-600 animate-pulse";
    case "failed":
      return "bg-red-600 text-white hover:bg-red-600";
    default:
      return "bg-gray-600 text-gray-300 hover:bg-gray-600";
  }
}

export function SceneCard({ scene, onRegenerate, projectStatus }: SceneCardProps) {
  const isGenerating = scene.status === "generating";
  const isFailed = scene.status === "failed";
  const isCompleted = scene.status === "completed";

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 transition-colors hover:border-gray-600">
      <div className="flex items-start justify-between gap-3">
        {/* Scene number + status */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-white">
            {scene.sceneIndex + 1}
          </div>
          <Badge className={statusBadgeClass(scene.status)}>
            {scene.status}
          </Badge>
        </div>

        {/* Duration badge */}
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          {scene.duration}s
        </div>
      </div>

      {/* Content preview */}
      <div className="mt-3 space-y-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Visual</p>
          <p className="line-clamp-2 text-sm text-gray-300">{scene.visualPrompt}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Narration</p>
          <p className="line-clamp-2 text-sm text-gray-300">{scene.narrationText}</p>
        </div>
      </div>

      {/* Progress bar for generating scenes */}
      {isGenerating && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${scene.progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-blue-400">{scene.progress}% complete</p>
        </div>
      )}

      {/* Video preview for completed scenes */}
      {isCompleted && scene.videoUrl && (
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-700">
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
            <div className="flex items-start gap-2 rounded-lg bg-red-900/20 p-3 text-sm text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{scene.errorMessage}</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRegenerate(scene.id)}
            className="border-red-700 text-red-400 hover:bg-red-900/30 hover:text-red-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry (30 credits)
          </Button>
        </div>
      )}
    </div>
  );
}
