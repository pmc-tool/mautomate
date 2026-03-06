import { useState, useRef } from "react";
import { Badge } from "../../../client/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { getModelByKey } from "../modelRegistry";
import { Clock, Film, Loader2, Play } from "lucide-react";

interface VideoCardProps {
  generation: {
    id: string;
    prompt: string;
    model: string;
    type: string;
    status: string;
    progress: number;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    duration: number;
    aspectRatio: string;
    createdAt: string;
    project?: { id: string; name: string } | null;
  };
  onClick?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  ttv: "bg-blue-500/80",
  itv: "bg-emerald-500/80",
  avatar: "bg-[#bd711d]/80",
  upscale: "bg-amber-500/80",
};

const TYPE_LABELS: Record<string, string> = {
  ttv: "Text to Video",
  itv: "Image to Video",
  avatar: "Avatar",
  upscale: "Upscale",
};

export function VideoCard({ generation: gen, onClick }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  const model = getModelByKey(gen.model);

  const handleMouseEnter = () => {
    setHovering(true);
    if (gen.status === "completed" && gen.videoUrl && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group cursor-pointer overflow-hidden rounded-xl border-2 border-transparent bg-card transition-all hover:border-primary/20 hover:shadow-lg"
    >
      {/* Thumbnail / Preview */}
      <div className="bg-muted relative aspect-video overflow-hidden">
        {gen.status === "completed" && gen.videoUrl ? (
          <>
            {gen.thumbnailUrl && !hovering ? (
              <img
                src={gen.thumbnailUrl}
                alt={gen.prompt.slice(0, 60)}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <video
                ref={videoRef}
                src={gen.videoUrl}
                poster={gen.thumbnailUrl || undefined}
                className="h-full w-full object-cover"
                muted
                loop
                playsInline
                preload="metadata"
              />
            )}
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-xl opacity-0 transition-all group-hover:opacity-100 group-hover:scale-100 scale-75">
                <Play className="h-5 w-5 text-black ml-0.5" fill="black" />
              </div>
            </div>
            {/* Duration badge */}
            <Badge
              className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] border-none"
            >
              <Clock className="mr-0.5 h-2.5 w-2.5" />
              {gen.duration}s
            </Badge>
          </>
        ) : gen.status === "processing" || gen.status === "queued" ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/50">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <span className="text-muted-foreground text-sm font-medium">{gen.progress}%</span>
            <div className="bg-muted-foreground/20 mx-auto h-1.5 w-24 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${gen.progress}%` }}
              />
            </div>
          </div>
        ) : gen.status === "failed" ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-destructive/5 to-muted">
            <span className="text-destructive text-sm font-medium">Failed</span>
            <span className="text-muted-foreground text-xs">Click to retry</span>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Film className="text-muted-foreground h-8 w-8" />
          </div>
        )}

        {/* Type badge */}
        <Badge
          className={`absolute left-2 top-2 text-white text-[10px] border-none ${TYPE_COLORS[gen.type] || "bg-black/50"}`}
        >
          {TYPE_LABELS[gen.type] || gen.type.toUpperCase()}
        </Badge>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-foreground truncate text-sm font-medium">
          {gen.prompt.slice(0, 80) || "No prompt"}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={gen.status} />
          <span className="text-muted-foreground text-[11px]">{gen.aspectRatio}</span>
        </div>
        <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-[11px]">
          <span className="font-medium">{model?.name || gen.model}</span>
          <span>{new Date(gen.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
