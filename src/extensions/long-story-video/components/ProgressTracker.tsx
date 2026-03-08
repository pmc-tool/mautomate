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
      return "bg-green-500";
    case "generating":
      return "bg-blue-500 animate-pulse";
    case "failed":
      return "bg-red-500";
    default:
      return "bg-gray-600";
  }
}

export function ProgressTracker({ scenes, projectStatus }: ProgressTrackerProps) {
  const completedCount = scenes.filter((s) => s.status === "completed").length;
  const generatingScene = scenes.find((s) => s.status === "generating");
  const failedCount = scenes.filter((s) => s.status === "failed").length;
  const totalCount = scenes.length;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  let statusText = "";
  if (projectStatus === "generating") {
    statusText = generatingScene
      ? `Scene ${generatingScene.sceneIndex + 1}/${totalCount} generating...`
      : `Generating scenes... ${completedCount}/${totalCount} done`;
  } else if (projectStatus === "narrating") {
    statusText = "Generating narration audio...";
  } else if (projectStatus === "stitching") {
    statusText = "Stitching final video...";
  } else if (projectStatus === "completed") {
    statusText = `All ${totalCount} scenes completed`;
  } else if (projectStatus === "failed") {
    statusText = `${failedCount} scene${failedCount !== 1 ? "s" : ""} failed`;
  }

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            projectStatus === "completed"
              ? "bg-green-500"
              : projectStatus === "failed"
              ? "bg-red-500"
              : "bg-blue-500"
          }`}
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Scene dots */}
      <div className="flex items-center gap-1.5">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            title={`Scene ${scene.sceneIndex + 1}: ${scene.status}`}
            className={`h-3 w-3 rounded-full ${getStatusColor(scene.status)}`}
          />
        ))}
      </div>

      {/* Status text */}
      {statusText && <p className="text-sm text-gray-400">{statusText}</p>}
    </div>
  );
}
