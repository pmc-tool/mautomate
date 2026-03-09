import { CheckCircle2 } from "lucide-react";

interface Scene {
  id: string;
  sceneIndex: number;
  status: string;
  progress: number;
}

interface ProgressTrackerProps {
  scenes: Scene[];
  projectStatus: string;
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500";
    case "generating":
      return "bg-blue-500 animate-pulse";
    case "failed":
      return "bg-red-500";
    default:
      return "bg-muted-foreground/30";
  }
}

export function ProgressTracker({ scenes, projectStatus }: ProgressTrackerProps) {
  const completedCount = scenes.filter((s) => s.status === "completed").length;
  const generatingScene = scenes.find((s) => s.status === "generating");
  const failedCount = scenes.filter((s) => s.status === "failed").length;
  const totalCount = scenes.length;

  // Calculate real overall progress using per-scene progress
  const totalProgress = scenes.reduce((sum, s) => sum + (s.progress || 0), 0);
  const overallProgress = totalCount > 0 ? Math.round(totalProgress / totalCount) : 0;

  let statusText = "";
  let detailText = "";

  if (projectStatus === "generating") {
    if (generatingScene) {
      const sceneProgress = generatingScene.progress || 0;
      statusText = `Scene ${generatingScene.sceneIndex + 1}/${totalCount} generating — ${sceneProgress}%`;
      detailText = `${completedCount} completed, ${totalCount - completedCount - failedCount} remaining`;
    } else {
      statusText = `${completedCount}/${totalCount} scenes done`;
    }
  } else if (projectStatus === "narrating") {
    const narrated = scenes.filter((s: any) => s.narrationUrl).length;
    statusText = narrated > 0
      ? `Generating voice narration — ${narrated}/${totalCount} done`
      : "Generating voice narration...";
  } else if (projectStatus === "stitching") {
    statusText = "Stitching final video — encoding...";
  } else if (projectStatus === "narrated") {
    statusText = "Narration complete — ready to finalize";
  } else if (projectStatus === "generated") {
    statusText = "Scenes generated — ready for narration";
  } else if (projectStatus === "completed") {
    statusText = `All ${totalCount} scenes completed`;
  } else if (projectStatus === "failed") {
    statusText = `${failedCount} scene${failedCount !== 1 ? "s" : ""} failed`;
  }

  // Progress bar value depends on status
  let barProgress = overallProgress;
  if (projectStatus === "narrating") barProgress = Math.max(overallProgress, 50);
  if (projectStatus === "narrated") barProgress = 75;
  if (projectStatus === "stitching") barProgress = 90;
  if (projectStatus === "completed") barProgress = 100;

  const barColor =
    projectStatus === "completed"
      ? "bg-emerald-500"
      : projectStatus === "failed"
      ? "bg-red-500"
      : "bg-blue-500";

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${barProgress}%` }}
          />
        </div>
        <span className="min-w-[3rem] text-right text-sm font-semibold text-foreground">
          {barProgress}%
        </span>
      </div>

      {/* Scene dots with individual progress */}
      <div className="flex items-center gap-2">
        {scenes.map((scene) => (
          <div key={scene.id} className="flex flex-col items-center gap-0.5">
            <div
              title={`Scene ${scene.sceneIndex + 1}: ${scene.status}${scene.status === "generating" ? ` (${scene.progress || 0}%)` : ""}`}
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${getStatusColor(scene.status)}`}
            >
              {scene.status === "completed" && (
                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            {scene.status === "generating" && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400">{scene.progress || 0}%</span>
            )}
          </div>
        ))}
      </div>

      {/* Status text */}
      <div>
        {statusText && <p className="text-sm font-medium text-foreground">{statusText}</p>}
        {detailText && <p className="text-xs text-muted-foreground">{detailText}</p>}
      </div>
    </div>
  );
}
