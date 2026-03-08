import { SceneCard } from "./SceneCard";

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

export function SceneTimeline({ scenes, onRegenerate, projectStatus }: SceneTimelineProps) {
  if (scenes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
        <p className="text-gray-500">No scenes in this project yet.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {scenes.map((scene, idx) => (
        <div key={scene.id} className="relative flex gap-4">
          {/* Vertical connecting line */}
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 shrink-0 rounded-full ${
                scene.status === "completed"
                  ? "bg-green-500"
                  : scene.status === "generating"
                  ? "bg-blue-500 animate-pulse"
                  : scene.status === "failed"
                  ? "bg-red-500"
                  : "bg-gray-600"
              }`}
            />
            {idx < scenes.length - 1 && (
              <div className="w-0.5 flex-1 bg-gray-700" />
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
