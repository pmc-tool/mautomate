import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../client/components/ui/dialog";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import { Separator } from "../../../client/components/ui/separator";
import { StatusBadge } from "./StatusBadge";
import { getModelByKey } from "../modelRegistry";
import { Download, ExternalLink, Clock, Monitor } from "lucide-react";
import { Link } from "react-router";

interface VideoModalProps {
  generation: {
    id: string;
    prompt: string;
    model: string;
    type: string;
    status: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    duration: number;
    aspectRatio: string;
    resolution: string;
    creditsCost: number;
    createdAt: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoModal({ generation: gen, open, onOpenChange }: VideoModalProps) {
  if (!gen) return null;

  const model = getModelByKey(gen.model);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Video area */}
          <div className="bg-black flex min-h-[300px] flex-1 items-center justify-center lg:min-h-[400px]">
            {gen.status === "completed" && gen.videoUrl ? (
              <video
                src={gen.videoUrl}
                poster={gen.thumbnailUrl || undefined}
                controls
                autoPlay
                className="h-full w-full"
              />
            ) : (
              <p className="text-muted-foreground text-sm">No video available</p>
            )}
          </div>

          {/* Details sidebar */}
          <div className="w-full space-y-4 p-5 lg:w-72">
            <DialogHeader>
              <DialogTitle className="text-base">{model?.name || gen.model}</DialogTitle>
            </DialogHeader>

            <StatusBadge status={gen.status} />

            <p className="text-muted-foreground line-clamp-4 text-xs">{gen.prompt}</p>

            <Separator />

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Duration
                </span>
                <span className="text-foreground">{gen.duration}s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Monitor className="h-3 w-3" /> Resolution
                </span>
                <span className="text-foreground">{gen.resolution}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Aspect Ratio</span>
                <span className="text-foreground">{gen.aspectRatio}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Credits</span>
                <Badge variant="secondary" className="text-[10px]">
                  {gen.creditsCost}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">
                  {new Date(gen.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              {gen.status === "completed" && gen.videoUrl && (
                <Button asChild size="sm">
                  <a href={gen.videoUrl} target="_blank" rel="noopener noreferrer" download>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link to={`/video-studio/video/${gen.id}`}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Full Details
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
