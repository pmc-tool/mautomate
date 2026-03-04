import { useState, useRef } from "react";
import { Card, CardContent } from "../../../client/components/ui/card";
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
    <Card
      data-slot="video-card"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group cursor-pointer overflow-hidden transition-all hover:shadow-md"
    >
      {/* Thumbnail / Preview */}
      <div className="bg-muted relative aspect-video overflow-hidden">
        {gen.status === "completed" && gen.videoUrl ? (
          <>
            {gen.thumbnailUrl && !hovering ? (
              <img
                src={gen.thumbnailUrl}
                alt={gen.prompt.slice(0, 60)}
                className="h-full w-full object-cover"
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <Play className="h-5 w-5 text-black" fill="black" />
              </div>
            </div>
            {/* Duration badge */}
            <Badge
              variant="secondary"
              className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px]"
            >
              <Clock className="mr-0.5 h-2.5 w-2.5" />
              {gen.duration}s
            </Badge>
          </>
        ) : gen.status === "processing" || gen.status === "queued" ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <span className="text-muted-foreground text-sm font-medium">{gen.progress}%</span>
            <div className="bg-muted-foreground/20 mx-auto h-1 w-20 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${gen.progress}%` }}
              />
            </div>
          </div>
        ) : gen.status === "failed" ? (
          <div className="flex h-full flex-col items-center justify-center gap-1">
            <span className="text-destructive text-sm font-medium">Failed</span>
            <span className="text-muted-foreground text-xs">Click to retry</span>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Film className="text-muted-foreground h-8 w-8" />
          </div>
        )}

        {/* Type badge */}
        <Badge
          variant="secondary"
          className="absolute left-2 top-2 bg-black/50 text-white text-[10px] uppercase"
        >
          {gen.type}
        </Badge>
      </div>

      {/* Info */}
      <CardContent className="p-3">
        <p className="text-foreground truncate text-sm font-medium">
          {gen.prompt.slice(0, 80) || "No prompt"}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={gen.status} />
          <span className="text-muted-foreground text-xs">{gen.aspectRatio}</span>
        </div>
        <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-xs">
          <span className="font-medium">{model?.name || gen.model}</span>
          <span>{new Date(gen.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
