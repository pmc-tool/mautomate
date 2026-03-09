import { SceneCard } from "./SceneCard";
import { Film } from "lucide-react";

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

interface SceneTimelineProps {
  scenes: Scene[];
  onRegenerate: (sceneId: string) => void;
  projectStatus: string;
}

function getDotColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500 ring-emerald-500/20";
    case "generating":
      return "bg-blue-500 ring-blue-500/20 animate-pulse";
    case "failed":
      return "bg-red-500 ring-red-500/20";
    default:
      return "bg-muted-foreground/40 ring-muted-foreground/10";
  }
}

export function SceneTimeline({ scenes, onRegenerate, projectStatus }: SceneTimelineProps) {
  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-center">
        <Film className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-muted-foreground">No scenes in this project yet.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {scenes.map((scene, idx) => (
        <div key={scene.id} className="relative flex gap-4">
          {/* Vertical connecting line + dot */}
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 shrink-0 rounded-full ring-4 ${getDotColor(scene.status)}`}
            />
            {idx < scenes.length - 1 && (
              <div className="w-0.5 flex-1 bg-border" />
            )}
          </div>

          {/* Scene card */}
          <div className="mb-4 flex-1">
            <SceneCard
              scene={scene}
              onRegenerate={onRegenerate}
              projectStatus={projectStatus}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
