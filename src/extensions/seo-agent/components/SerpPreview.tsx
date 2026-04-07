import { cn } from "../../../client/utils";

interface SerpPreviewProps {
  title: string;
  description: string;
  url?: string;
}

function CharCount({ current, min, max }: { current: number; min: number; max: number }) {
  const inRange = current >= min && current <= max;
  return (
    <span className={cn("text-[10px] tabular-nums", inRange ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
      {current}/{max}
    </span>
  );
}

export default function SerpPreview({ title, description, url }: SerpPreviewProps) {
  const displayUrl = url
    ? url.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : "example.com";

  const truncTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
  const truncDesc = description.length > 160 ? description.slice(0, 157) + "..." : description;

  return (
    <div className="rounded-xl border bg-background p-4 space-y-1">
      <p className="text-[11px] text-muted-foreground font-medium mb-2">Google Preview</p>

      {/* URL breadcrumb */}
      <p className="text-[13px] text-emerald-700 dark:text-emerald-400 truncate">
        {displayUrl}
      </p>

      {/* Title */}
      <h3 className="text-lg text-blue-700 dark:text-blue-400 hover:underline cursor-pointer leading-snug font-medium">
        {truncTitle || "Page Title"}
      </h3>

      {/* Meta description */}
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        {truncDesc || "No meta description provided."}
      </p>

      {/* Character counts */}
      <div className="flex items-center gap-4 pt-2 border-t mt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Title:</span>
          <CharCount current={title.length} min={30} max={60} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Description:</span>
          <CharCount current={description.length} min={120} max={160} />
        </div>
      </div>
    </div>
  );
}
